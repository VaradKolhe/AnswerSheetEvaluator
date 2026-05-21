from fastapi import APIRouter, Depends, HTTPException
from app.schemas.schemas import GradingResultResponse, BatchGradingOverride
from app.routes.auth import get_current_user
from app.routes.submissions import get_owned_submission
from app.database import db
from app.services.ml_models import process_full_grading
import uuid
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/grading", tags=["grading"])

async def get_owned_grading_result(submission_id: str, current_user: dict):
    await get_owned_submission(submission_id, current_user)
    res = await db.grading_results.find_one({"submission_id": submission_id})
    if not res:
        raise HTTPException(status_code=404, detail="Grading result not found")
    
    # Proactively inject question_text if missing (for legacy records)
    needs_update = any("question_text" not in q for q in res.get("question_results", []))
    if needs_update:
        questions_cursor = db.questions.find({"exam_id": res["exam_id"]})
        questions_map = {q["question_id"]: q["question_text"] for q in await questions_cursor.to_list(length=100)}
        
        for q_res in res["question_results"]:
            if "question_text" not in q_res:
                q_res["question_text"] = questions_map.get(q_res["question_id"], "Question text not found.")
    
    return res

@router.post("/run/{submission_id}", response_model=GradingResultResponse)
async def run_grading(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await get_owned_submission(submission_id, current_user)
        
    questions_cursor = db.questions.find({"exam_id": submission["exam_id"]}).sort("question_no", 1)
    questions = await questions_cursor.to_list(length=100)
    
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this exam")

    # Run the REAL ML pipeline
    # This might take a few minutes on CPU, but AWS GPU will be fast.
    try:
        grading_data = await process_full_grading(
            submission["file_path"], 
            submission_id, 
            questions
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Pipeline failed: {str(e)}")

    grading_id = str(uuid.uuid4())
    grading_result = {
        "grading_id": grading_id,
        "submission_id": submission_id,
        "exam_id": submission["exam_id"],
        "student_name": submission["student_name"],
        "question_results": grading_data["question_results"],
        "total_ai_marks": grading_data["total_ai_marks"],
        "total_final_marks": grading_data["total_ai_marks"],
        "status": "graded",
        "updated_at": datetime.now(timezone.utc),
        "metadata": {
            "aggregated_text": grading_data["aggregated_text"],
            "page_images": grading_data["page_images"]
        }
    }
    
    await db.grading_results.update_one(
        {"submission_id": submission_id},
        {"$set": grading_result},
        upsert=True
    )
    
    await db.submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "graded"}}
    )
    
    return grading_result

@router.get("/{submission_id}", response_model=GradingResultResponse)
async def get_grading_result(submission_id: str, current_user: dict = Depends(get_current_user)):
    return await get_owned_grading_result(submission_id, current_user)

@router.put("/override/{submission_id}", response_model=GradingResultResponse)
async def override_grading(submission_id: str, batch_override: BatchGradingOverride, current_user: dict = Depends(get_current_user)):
    res = await get_owned_grading_result(submission_id, current_user)

    new_results = res["question_results"]
    audit_logs = []
    
    for override in batch_override.overrides:
        for idx, q_res in enumerate(new_results):
            if q_res["question_id"] == override.question_id:
                # Log the change
                audit_logs.append({
                    "audit_id": str(uuid.uuid4()),
                    "submission_id": submission_id,
                    "question_id": override.question_id,
                    "old_marks": q_res["final_marks"],
                    "new_marks": override.final_marks,
                    "teacher_comment": override.teacher_comment,
                    "modified_by": current_user["id"],
                    "timestamp": datetime.now(timezone.utc)
                })
                
                new_results[idx]["final_marks"] = override.final_marks
                new_results[idx]["teacher_comment"] = override.teacher_comment

    total_final_marks = sum(q["final_marks"] for q in new_results)
    
    await db.grading_results.update_one(
        {"submission_id": submission_id},
        {"$set": {
            "question_results": new_results,
            "total_final_marks": round(total_final_marks, 2),
            "status": "reviewed",
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if audit_logs:
        await db.audit_logs.insert_many(audit_logs)
        
    await db.submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "reviewed"}}
    )
    
    return await db.grading_results.find_one({"submission_id": submission_id})

@router.post("/finalize/{submission_id}")
async def finalize_grading(submission_id: str, current_user: dict = Depends(get_current_user)):
    await get_owned_grading_result(submission_id, current_user)
        
    await db.grading_results.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "finalized", "updated_at": datetime.now(timezone.utc)}}
    )
    
    await db.submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "finalized"}}
    )
    
    return {"status": "finalized"}
