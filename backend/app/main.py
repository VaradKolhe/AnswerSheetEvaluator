from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.routes import auth, exams, questions, submissions, grading, reports, analytics

app = FastAPI(
    title="Smart Grading API V2 - Teacher Centric",
    root_path="/api"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount uploads directory to serve PDF files
app.mount("/files", StaticFiles(directory=UPLOAD_DIR), name="files")

# Register Routers
app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(questions.router)
app.include_router(submissions.router)
app.include_router(grading.router)
app.include_router(reports.router)
app.include_router(analytics.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Smart Grading API V2 - Teacher Centric"}
