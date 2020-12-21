"""Construct App."""

from typing import Any, Union

import os

from aws_cdk import (
    core,
    aws_iam as iam,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_lambda,
    aws_apigatewayv2 as apigw,
    aws_logs as logs,
    aws_ecr as ecr,
    # aws_elasticache as escache,
)
import docker
import config

iam_policy_statement = iam.PolicyStatement(
    actions=["s3:*"], resources=[f"arn:aws:s3:::{config.BUCKET}*"]
)

DEFAULT_ENV = dict(
    CPL_TMPDIR="/tmp",
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
    GDAL_CACHEMAX="75%",
    GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
    GDAL_HTTP_MERGE_CONSECUTIVE_RANGES="YES",
    GDAL_HTTP_MULTIPLEX="YES",
    GDAL_HTTP_VERSION="2",
    PYTHONWARNINGS="ignore",
    VSI_CACHE="TRUE",
    VSI_CACHE_SIZE="1000000",
)


class rezoningApiLambdaStack(core.Stack):
    """
    rezoning API Lambda Stack
    This code is freely adapted from
    - https://github.com/leothomas/titiler/blob/10df64fbbdd342a0762444eceebaac18d8867365/stack/app.py author: @leothomas
    - https://github.com/ciaranevans/titiler/blob/3a4e04cec2bd9b90e6f80decc49dc3229b6ef569/stack/app.py author: @ciaranevans
    """

    def __init__(
        self,
        scope: core.Construct,
        id: str,
        memory: int = 1024,
        timeout: int = 30,
        concurrent: int = 100,
        env: dict = {},
        code_dir: str = "./",
        **kwargs: Any,
    ) -> None:
        """Define stack."""
        super().__init__(scope, id, *kwargs)

        # create ECS Cluster + Fargate Task Definition
        vpc = ec2.Vpc(self, f"{id}-vpc")

        base_ecs_policy = iam.PolicyStatement(
            actions=[
                "ecr:GetAuthorizationToken",
                "ecr:BatchCheckLayerAvailability",
                "ecr:GetDownloadUrlForLayer",
                "ecr:BatchGetImage",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
            ],
            resources=["*"],
        )

        s3_access_policy = iam.PolicyStatement(
            actions=["s3:*"],
            resources=[
                "arn:aws:s3:::gre-processed-data",
                "arn:aws:s3:::gre-processed-data/*",
            ],
        )

        fargate_role = iam.Role(
            self,
            id=f"{id}-fargate-execution-role",
            assumed_by=iam.ServicePrincipal("ecs.amazonaws.com"),
        )

        fargate_role.add_to_policy(base_ecs_policy)
        fargate_role.add_to_policy(s3_access_policy)

        ecs.Cluster(
            self,
            f"{id}-ExportProcessingCluster",
            vpc=vpc,
            cluster_name=config.CLUSTER_NAME,
        )
        fargate_task = ecs.FargateTaskDefinition(
            self,
            f"{id}-ExportProcessingTask",
            cpu=2048,
            memory_limit_mib=4096,
            execution_role=fargate_role,
            family=config.TASK_NAME,
        )

        log_driver = ecs.AwsLogDriver(
            stream_prefix=f"remote-workstation/{id}",
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        image = ecs.ContainerImage.from_ecr_repository(
            ecr.Repository.from_repository_name(
                self, f"{id}-export-repo", repository_name="export-fargate"
            )
        )
        fargate_task.add_container(
            f"container-definition-{id}",
            image=image,
            logging=log_driver,
            environment=DEFAULT_ENV,
        )

        # add cache
        # vpc = ec2.Vpc(self, f"{id}-vpc")
        # sb_group = escache.CfnSubnetGroup(
        #     self,
        #     f"{id}-subnet-group",
        #     description=f"{id} subnet group",
        #     subnet_ids=[sb.subnet_id for sb in vpc.private_subnets],
        # )

        # sg = ec2.SecurityGroup(self, f"{id}-cache-sg", vpc=vpc)
        # cache = escache.CfnCacheCluster(
        #     self,
        #     f"{id}-cache",
        #     cache_node_type=config.CACHE_NODE_TYPE,
        #     engine=config.CACHE_ENGINE,
        #     num_cache_nodes=config.CACHE_NODE_NUM,
        #     vpc_security_group_ids=[sg.security_group_id],
        #     cache_subnet_group_name=sb_group.ref,
        # )

        # vpc_access_policy_statement = iam.PolicyStatement(
        #     actions=[
        #         "logs:CreateLogGroup",
        #         "logs:CreateLogStream",
        #         "logs:PutLogEvents",
        #         "ec2:CreateNetworkInterface",
        #         "ec2:DescribeNetworkInterfaces",
        #         "ec2:DeleteNetworkInterface",
        #     ],
        #     resources=["*"],
        # )

        lambda_env = DEFAULT_ENV.copy()
        lambda_env.update(
            dict(
                MODULE_NAME="rezoning_api.main",
                VARIABLE_NAME="app",
                WORKERS_PER_CORE="1",
                LOG_LEVEL="error",
                # MEMCACHE_HOST=cache.attr_configuration_endpoint_address,
                # MEMCACHE_PORT=cache.attr_configuration_endpoint_port,
            )
        )

        lambda_function = aws_lambda.Function(
            self,
            f"{id}-lambda",
            runtime=aws_lambda.Runtime.PYTHON_3_7,
            code=self.create_package(code_dir),
            handler="handler.handler",
            memory_size=memory,
            reserved_concurrent_executions=concurrent,
            timeout=core.Duration.seconds(timeout),
            environment=lambda_env,
            # vpc=vpc,
        )
        lambda_function.add_to_role_policy(iam_policy_statement)
        # lambda_function.add_to_role_policy(vpc_access_policy_statement)

        # defines an API Gateway Http API resource backed by our "dynamoLambda" function.
        apigw.HttpApi(
            self,
            f"{id}-endpoint",
            default_integration=apigw.LambdaProxyIntegration(handler=lambda_function),
        )

    def create_package(self, code_dir: str) -> aws_lambda.Code:
        """Build docker image and create package."""
        # print('building lambda package via docker')
        print(f"code dir: {code_dir}")
        client = docker.from_env()
        print("docker client up")
        client.images.build(
            path=code_dir,
            dockerfile="Dockerfiles/lambda/Dockerfile",
            tag="lambda:latest",
        )
        print("docker image built")
        client.containers.run(
            image="lambda:latest",
            command="/bin/sh -c 'cp /tmp/package.zip /local/package.zip'",
            remove=True,
            volumes={os.path.abspath(code_dir): {"bind": "/local/", "mode": "rw"}},
            user=0,
        )

        return aws_lambda.Code.asset(os.path.join(code_dir, "package.zip"))


class rezoningApiECSStack(core.Stack):
    """rezoning API ECS Fargate Stack."""

    def __init__(
        self,
        scope: core.Construct,
        id: str,
        cpu: Union[int, float] = 256,
        memory: Union[int, float] = 512,
        mincount: int = 1,
        maxcount: int = 50,
        env: dict = {},
        code_dir: str = "./",
        **kwargs: Any,
    ) -> None:
        """Define stack."""
        super().__init__(scope, id, *kwargs)

        vpc = ec2.Vpc(self, f"{id}-vpc", max_azs=2)

        cluster = ecs.Cluster(self, f"{id}-cluster", vpc=vpc)

        task_env = DEFAULT_ENV.copy()
        task_env.update(
            dict(
                MODULE_NAME="rezoning_api.main",
                VARIABLE_NAME="app",
                WORKERS_PER_CORE="1",
                LOG_LEVEL="error",
            )
        )
        task_env.update(env)

        fargate_service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self,
            f"{id}-service",
            cluster=cluster,
            cpu=cpu,
            memory_limit_mib=memory,
            desired_count=mincount,
            public_load_balancer=True,
            listener_port=80,
            task_image_options=dict(
                image=ecs.ContainerImage.from_asset(
                    code_dir,
                    exclude=["cdk.out", ".git"],
                    file="Dockerfiles/ecs/Dockerfile",
                ),
                container_port=80,
                environment=task_env,
            ),
        )

        scalable_target = fargate_service.service.auto_scale_task_count(
            min_capacity=mincount, max_capacity=maxcount
        )

        # https://github.com/awslabs/aws-rails-provisioner/blob/263782a4250ca1820082bfb059b163a0f2130d02/lib/aws-rails-provisioner/scaling.rb#L343-L387
        scalable_target.scale_on_request_count(
            "RequestScaling",
            requests_per_target=50,
            scale_in_cooldown=core.Duration.seconds(240),
            scale_out_cooldown=core.Duration.seconds(30),
            target_group=fargate_service.target_group,
        )

        # scalable_target.scale_on_cpu_utilization(
        #     "CpuScaling", target_utilization_percent=70,
        # )

        fargate_service.service.connections.allow_from_any_ipv4(
            port_range=ec2.Port(
                protocol=ec2.Protocol.ALL,
                string_representation="All port 80",
                from_port=80,
            ),
            description="Allows traffic on port 80 from NLB",
        )


app = core.App()

# Tag infrastructure
for key, value in {
    "Project": config.PROJECT_NAME,
    "Stack": config.STAGE,
    "Owner": os.environ.get("OWNER"),
    "Client": os.environ.get("CLIENT"),
}.items():
    if value:
        core.Tag.add(app, key, value)

ecs_stackname = f"{config.PROJECT_NAME}-ecs-{config.STAGE}"
rezoningApiECSStack(
    app,
    ecs_stackname,
    cpu=config.TASK_CPU,
    memory=config.TASK_MEMORY,
    mincount=config.MIN_ECS_INSTANCES,
    maxcount=config.MAX_ECS_INSTANCES,
    env=config.ENV,
)

lambda_stackname = f"{config.PROJECT_NAME}-lambda-{config.STAGE}"
rezoningApiLambdaStack(
    app,
    lambda_stackname,
    memory=config.MEMORY,
    timeout=config.TIMEOUT,
    concurrent=config.MAX_CONCURRENT,
    env=config.ENV,
)

app.synth()