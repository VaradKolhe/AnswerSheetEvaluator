from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.schemas.schemas import SubmissionResponse, StudentUpdate
from app.routes.auth import get_current_user
from app.database import db
import uuid
import os
import shutil
from datetime import datetime
from typing import List

router = APIRouter(prefix="/submissions", tags=["submissions"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

async def get_owned_submission(submission_id: str, current_user: dict):
    submission = await db.submissions.find_one({"submission_id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    exam = await db.exams.find_one({
        "exam_id": submission["exam_id"],
        "teacher_id": current_user["id"]
    })
    if not exam:
        raise HTTPException(status_code=404, detail="Submission not found or unauthorized")

    return submission

@router.get("/file/{submission_id}", response_class=FileResponse)
async def get_submission_file(
    submission_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Explicitly serve the PDF file for a submission.
    This bypasses static mounting issues with root_path.
    """
    print(f"DEBUG: Request for submission file: {submission_id}")
    submission = await get_owned_submission(submission_id, current_user)
    file_path = submission.get("file_path") or os.path.join(UPLOAD_DIR, f"{submission_id}.pdf")
    print(f"DEBUG: Checking file path: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"DEBUG: File NOT FOUND: {file_path}")
        # List files in directory for debugging
        print(f"DEBUG: Files in {UPLOAD_DIR}: {os.listdir(UPLOAD_DIR)}")
        raise HTTPException(status_code=404, detail="File not found")
    
    print(f"DEBUG: File found, serving: {file_path}")
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=submission.get("original_filename") or f"{submission_id}.pdf"
    )

@router.post("/upload/{exam_id}", response_model=List[SubmissionResponse])
async def upload_submissions(
    exam_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    submissions = []
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            continue
            
        submission_id = str(uuid.uuid4())
        
        # Student name from filename
        base_name = os.path.splitext(file.filename)[0]
        student_name = base_name.replace('_', ' ').replace('-', ' ').title()
        
        # Force .pdf extension to match frontend expectations
        stored_filename = f"{submission_id}.pdf"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        submission_dict = {
            "submission_id": submission_id,
            "exam_id": exam_id,
            "student_name": student_name,
            "original_filename": file.filename,
            "file_path": file_path,
            "status": "pending",
            "uploaded_at": datetime.utcnow()
        }
        
        await db.submissions.insert_one(submission_dict)
        submissions.append(submission_dict)
        
    return submissions

@router.put("/{submission_id}", response_model=SubmissionResponse)
async def update_student(
    submission_id: str,
    update_in: StudentUpdate,
    current_user: dict = Depends(get_current_user)
):
    await get_owned_submission(submission_id, current_user)
    
    await db.submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"student_name": update_in.student_name}}
    )
    
    # Also update grading results if they exist
    await db.grading_results.update_one(
        {"submission_id": submission_id},
        {"$set": {"student_name": update_in.student_name}}
    )
    
    return await db.submissions.find_one({"submission_id": submission_id})

@router.get("/exam/{exam_id}", response_model=List[SubmissionResponse])
async def list_submissions(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({"exam_id": exam_id, "teacher_id": current_user["id"]})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    cursor = db.submissions.find({"exam_id": exam_id})
    return await cursor.to_list(length=100)

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    return await get_owned_submission(submission_id, current_user)

@router.delete("/{submission_id}")
async def delete_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await get_owned_submission(submission_id, current_user)
    
    # 1. Delete physical file
    file_path = submission.get("file_path") or os.path.join(UPLOAD_DIR, f"{submission_id}.pdf")
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # 2. Delete from database
    await db.submissions.delete_one({"submission_id": submission_id})
    
    # 3. Delete grading results
    await db.grading_results.delete_one({"submission_id": submission_id})
    
    return {"message": "Submission deleted successfully"}
