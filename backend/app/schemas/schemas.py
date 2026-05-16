from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- AUTH SCHEMAS ---

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr

# --- EXAM SCHEMAS ---

class ExamBase(BaseModel):
    exam_name: str
    subject: str
    total_marks: float

class ExamCreate(ExamBase):
    pass

class ExamResponse(ExamBase):
    exam_id: str
    teacher_id: str
    created_at: datetime

# --- QUESTION SCHEMAS ---

class QuestionBase(BaseModel):
    question_no: int
    question_text: str
    expected_answer: str
    keywords: List[str]
    max_marks: float

class QuestionCreate(QuestionBase):
    exam_id: str

class QuestionResponse(QuestionBase):
    question_id: str
    exam_id: str

# --- SUBMISSION SCHEMAS ---

class SubmissionResponse(BaseModel):
    submission_id: str
    exam_id: str
    student_name: str
    original_filename: str
    file_path: str
    status: str
    uploaded_at: datetime

class StudentUpdate(BaseModel):
    student_name: str

# --- GRADING SCHEMAS ---

class QuestionGradingResult(BaseModel):
    question_id: str
    question_no: int
    extracted_answer: str
    matched_keywords: List[str]
    missing_keywords: List[str]
    ai_marks: float
    final_marks: float
    max_marks: float
    confidence: float
    teacher_comment: str

class GradingResultResponse(BaseModel):
    grading_id: str
    submission_id: str
    exam_id: str
    student_name: str
    question_results: List[QuestionGradingResult]
    total_ai_marks: float
    total_final_marks: float
    status: str
    updated_at: datetime
    metadata: Optional[dict] = None

class GradingOverride(BaseModel):
    question_id: str
    final_marks: float
    teacher_comment: str

class BatchGradingOverride(BaseModel):
    overrides: List[GradingOverride]

# --- AUDIT LOG SCHEMAS ---

class AuditLogResponse(BaseModel):
    audit_id: str
    submission_id: str
    question_id: str
    old_marks: float
    new_marks: float
    teacher_comment: str
    modified_by: str
    timestamp: datetime

# --- ANALYTICS SCHEMAS ---

class ExamAnalytics(BaseModel):
    average_marks: float
    highest_marks: float
    lowest_marks: float
    pass_percentage: float
    question_averages: List[dict] # { "question_no": int, "avg": float }
    score_distribution: List[dict] # { "range": str, "count": int }
