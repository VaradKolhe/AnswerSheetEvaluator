# Project: Smart Exam Answer Sheet Auto-Grading System

This project is a production-ready full-stack application designed for AI-assisted grading of exam answer sheets. It leverages OCR and ML models (currently placeholders) to automate the grading process while allowing for teacher review and finalization.

## 🏗 Architecture Overview

### Backend (Python/FastAPI)
- **Framework:** FastAPI for high-performance async API development.
- **Database:** MongoDB via `Motor` (Async IO Motor).
- **Validation:** Pydantic models for request/response schemas.
- **Authentication:** JWT-based OAuth2.
- **PDF Processing:** `PyMuPDF` (fitz) for converting multi-page PDFs into high-resolution images for OCR.
- **Structure:**
  - `app/main.py`: Main entry point.
  - `app/utils/pdf_utils.py`: PDF to image conversion logic.
  - `app/services/ml_models.py`: Orchestrator for the ML pipeline (OCR + Grading).

### Frontend (React/TypeScript)
- **Build Tool:** Vite / TailwindCSS v4.
- **State Management:** Zustand.
- **PDF Support:** Enhanced `GradingStudio` to handle multi-page submissions and display original PDF pages alongside extracted text.

## 🧠 ML Integration Guide (Hybrid Cloud-Local)

The system is designed to handle heavy ML models (TrOCR, SBERT) even on hardware without a GPU by using a hybrid approach.

### 1. PDF-to-Image Pipeline
- **Input:** Student PDF upload.
- **Process:** The backend splits the PDF into individual page images (300 DPI).
- **Storage:** Images are stored in `uploads/{submission_id}/page_N.png`.

### 2. OCR Extraction (TrOCR)
- **Engine:** Microsoft TrOCR (`microsoft/trocr-large-handwritten`).
- **Execution Options:**
  - **Local (CPU):** Uses `trocr-base` for faster but less accurate inference.
  - **Cloud (Google Colab):** Recommended. A separate worker script runs the `Deep_Learning_Project` modules on a Colab GPU and exposes an API endpoint via `ngrok`.
- **Logic:** Each page image is segmented into lines and processed. Results are aggregated into a single document text.

### 3. Semantic Grading (SBERT)
- **Model:** `all-mpnet-base-v2`.
- **Logic:** Compares the aggregated student text against the `expected_answer` using cosine similarity (Paragraph + Sentence level).
- **Keywords:** Uses semantic keyword matching to identify if core concepts are present even if phrased differently.

## 🚀 Execution & Infrastructure
- **Development:** `docker-compose up --build` for DB and core services.
- **ML Worker:** Run `ml_worker_colab.ipynb` in Google Colab to provide a high-performance GPU backend for the OCR and Grader. Update `.env` with the Colab API URL.
- **Local Fallback:** Ensure `requirements.txt` in the backend includes `torch` and `transformers` for CPU-based execution.

## 🛠 Core Workflows (Updated)

### 1. Grading Pipeline (Multi-Page)
1. **Upload:** User uploads a multi-page PDF.
2. **Conversion:** Backend converts PDF to images immediately.
3. **OCR:** System processes each page sequentially (locally or via Colab).
4. **Aggregation:** Extracted text from all pages is concatenated.
5. **Grading:** AI evaluates the total text against exam questions.
6. **Review:** Teacher reviews results in `GradingStudio`, with the ability to flip through the original PDF pages.

## 📊 Core Data Schemas

Reference these schemas when integrating real ML APIs:

### Question Structure
```python
class QuestionBase(BaseModel):
    question_no: int
    question_text: str
    expected_answer: str
    keywords: List[str]
    max_marks: float
```

### Grading Result Structure
```python
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
```

## 🛠 Core Workflows

### 1. Authentication
- Users register/login to receive a JWT.
- Tokens are stored in the Zustand store and persisted in `localStorage`.
- The `apiService` automatically attaches the token to outgoing requests.

### 2. Exam Management
- Educators create exams defining subjects and questions (with optional keyword targets).
- Exams are stored in the `exams` collection.

### 3. Grading Pipeline
1. **Upload:** Student answer sheets are uploaded and stored in the `uploads/` directory.
2. **Preprocessing:** OCR processes the image/PDF to extract text (currently `mock_ocr_service`).
3. **Prediction:** AI evaluates the extracted text against exam questions (currently `mock_grading_service`).
4. **Finalization:** Teachers review AI suggestions in the `GradingStudio` and manually finalize marks.

## 📝 Reference Test Case: DBMS Exam

Use this configuration to test the system's ability to handle high-mark questions and diverse keywords:

- **Exam Name:** DBMS Mid-Term
- **Question 1 (30 Marks):** Explain Data Independence (Physical vs. Logical).
  - **Keywords:** `["Data Independence", "Logical", "Physical", "Three-Schema Architecture", "Conceptual schema"]`
- **Question 2 (70 Marks):** Explain Normalization (1NF to BCNF) and trade-offs.
  - **Keywords:** `["Normalization", "1NF", "2NF", "3NF", "BCNF", "Superkey", "Denormalization", "Joins"]`

## 🚀 Execution & Infrastructure
- **Docker:** Use `docker-compose up --build` for the full stack.
- **Local Dev:**
  - Backend: `uvicorn app.main:app --reload` (requires MongoDB).
  - Frontend: `npm run dev`.
