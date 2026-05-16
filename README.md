# Smart Exam Answer Sheet Auto-Grading System

A production-ready full-stack application for AI-assisted grading of exam answer sheets.

## Tech Stack
- **Frontend:** React, TailwindCSS, Zustand, Recharts, Lucide React
- **Backend:** FastAPI (Python), Motor (Async MongoDB)
- **Database:** MongoDB
- **Infrastructure:** Docker, Docker Compose

## Features
- **Dashboard:** Overview of grading stats and recent exams.
- **Upload:** Drag & drop student answer sheets (PDF/Images).
- **Grading Studio:** Split-view editor for reviewing OCR text and AI grading suggestions.
- **Bulk Review:** Management table for all student submissions.
- **Analytics:** Visual insights into class performance.

---

## 🚀 Getting Started

### Method 1: Docker (Recommended)
1. Ensure you have Docker and Docker Compose installed.
2. Run the following command in the root directory:
   ```bash
   docker-compose up --build
   ```
3. Access the application:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:8000](http://localhost:8000)

### Method 2: Manual Setup

#### Backend
1. Navigate to `backend/`
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Ensure MongoDB is running on `localhost:27017`
4. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend
1. Navigate to `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure
- `frontend/`: React + Vite project.
- `backend/`: FastAPI project.
- `docker-compose.yml`: Orchestration for all services.
