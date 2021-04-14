"""LCOE endpoints."""

from fastapi import APIRouter, Depends
import numpy as np

from rezoning_api.models.zone import ZoneRequest, ZoneResponse, Filters, Weights
from rezoning_api.utils import calc_score

router = APIRouter()


@router.post(
    "/zone/",
    responses={200: dict(description="return an LCOE calculation for a given area")},
    response_model=ZoneResponse,
)
@router.post(
    "/zone/{country_id}",
    responses={200: dict(description="return an LCOE calculation for a given area")},
    response_model=ZoneResponse,
)
def zone(query: ZoneRequest, country_id: str = "AFG", filters: Filters = Depends()):
    """calculate LCOE and weight for zone score"""
    data, mask, extras = calc_score(
        country_id,
        query.aoi.dict(),
        query.lcoe,
        query.weights,
        filters,
        tilesize=256,
        ret_extras=True,
    )

    lcoe = extras["lcoe"]
    cf = extras["cf"]

    zs = data.mean()
    zs = 0.01 if np.isnan(zs) else zs

    return dict(
        lcoe=lcoe.mean(),
        zone_score=zs,
        zone_output=cf.sum(),
        zone_output_density=cf.sum() / (500 ** 2),
    )


@router.get("/zone/schema", name="weights_schema")
def get_filter_schema():
    """Return weights schema"""
    return Weights.schema()["properties"]