import logging
from fastapi import FastAPI, UploadFile, File
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn


# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verdikt")

app = FastAPI(
    title="Test",
    version="1.0.0",
    description="DeepDeckGigaByte"
)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
@app.get("/")
async def home():
    return FileResponse("app/static/index.html")

@app.post("/api/process")
async def process_meeting(file: UploadFile = File(...)):
    return {
        "success": True,
        "filename": file.filename,
        "summary": "Meeting processed successfully."
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=12000, reload=True)