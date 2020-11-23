"""Filter endpoints."""

from rezoning_api.utils import read_dataset
from fastapi import APIRouter, Depends
from rio_tiler.utils import render
import numpy as np
from mercantile import feature, Tile
from geojson_pydantic.geometries import Polygon
import xarray as xr
from typing import Optional

from rezoning_api.core.config import BUCKET
from rezoning_api.models.tiles import TileResponse
from rezoning_api.models.zone import Filters
from rezoning_api.api.utils import _filter, LAYERS, filter_to_layer_name
from rezoning_api.db.country import get_country_min_max, get_country_geojson

router = APIRouter()


@router.get(
    "/filter/{z}/{x}/{y}.png",
    responses={
        200: dict(description="return a filtered tile given certain parameters")
    },
    response_class=TileResponse,
    name="filter",
)
@router.get(
    "/filter/{country_id}/{z}/{x}/{y}.png",
    responses={
        200: dict(
            description="return a filtered tile given certain parameters and country code"
        )
    },
    response_class=TileResponse,
    name="filter_country",
)
def filter(
    z: int,
    x: int,
    y: int,
    color: str,
    country_id: Optional[str] = None,
    filters: Filters = Depends(),
):
    """Return filtered tile."""
    # find the required datasets to open
    sent_filters = [filter_to_layer_name(k) for k, v in filters.dict().items() if v]
    datasets = [
        k for k, v in LAYERS.items() if any([layer in sent_filters for layer in v])
    ]

    # find the tile
    aoi = Polygon(**feature(Tile(x, y, z))["geometry"]).dict()

    # potentiall mask by country
    extra_mask_geometry = None
    if country_id:
        # TODO: early return for tiles outside country bounds
        feat = get_country_geojson(country_id)
        extra_mask_geometry = feat.geometry.dict()

    arrays = []
    for dataset in datasets:
        if "raster" in dataset:
            ext = "vrt"
        else:
            ext = "tif"
        data, _ = read_dataset(
            f"s3://{BUCKET}/{dataset}.{ext}",
            LAYERS[dataset],
            aoi=aoi,
            tilesize=256,
            extra_mask_geometry=extra_mask_geometry,
        )
        arrays.append(data)

    arr = xr.concat(arrays, dim="layer")
    # color like 45,39,88,178 (RGBA)
    color_list = list(map(lambda x: int(x), color.split(",")))

    tile, new_mask = _filter(arr, filters)

    color_tile = np.stack(
        [
            tile * color_list[0],
            tile * color_list[1],
            tile * color_list[2],
            (new_mask * color_list[3]).astype(np.uint8),
        ]
    )

    content = render(color_tile)
    return TileResponse(content=content)


@router.get("/filter/{country_id}/layers")
def get_country_layers(country_id: str):
    """Return min/max for country layers"""
    minmax = get_country_min_max(country_id)
    keys = list(minmax.keys())
    [minmax.pop(key) for key in keys if key.startswith(("gwa", "gsa"))]
    return minmax


@router.get("/filter/schema", name="filter_schema")
def get_filter_schema():
    """Return filter schema"""
    return Filters.schema()["properties"]