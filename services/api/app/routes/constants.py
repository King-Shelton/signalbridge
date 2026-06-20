from fastapi import APIRouter

from app.constants import SHARED_CONSTANTS
from app.schemas.constants import ConstantsResponse

router = APIRouter(prefix="/constants", tags=["constants"])


@router.get("", response_model=ConstantsResponse)
def constants() -> ConstantsResponse:
    return ConstantsResponse(**SHARED_CONSTANTS)
