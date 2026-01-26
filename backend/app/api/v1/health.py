from fastapi import APIRouter

router = APIRouter()

@router.get("/", summary="health check")
def health_check():
    return {"status":"api working"}