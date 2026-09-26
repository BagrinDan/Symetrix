import logging
from fastapi import FastAPI
import uvicorn
from app.core.controllers import upload_audio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("abobus")

app = FastAPI(
    title="Test",
    version="1.0.0",
    description="DeepDeckGigaByte"
)

# Frontend

# Controllers
app.include_router(upload_audio.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=12000, reload=True)