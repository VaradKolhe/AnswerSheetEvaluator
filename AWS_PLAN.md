# AWS Integration Strategy: Unified AI Backend

## 1. AWS Infrastructure Choice
*   **Instance Type:** `g4dn.xlarge` (Recommended). 
    *   **Why:** It includes an NVIDIA T4 GPU. Your teammate's TrOCR and SBERT models will run ~20x faster than on a CPU.
    *   **Cost:** ~$0.52/hour (Your $120 credits will last for ~230 hours of runtime).
*   **AMI:** Deep Learning OSS Nvidia Driver AMI (Ubuntu 22.04).

## 2. Integration Architecture
We will move away from the "Two Backends" confusion by creating a **Unified API** on the AWS instance.

### A. The AIML Worker (Inside `Deep_Learning_Project/`)
We will transform the Streamlit app logic into a FastAPI service. 
*   **New File:** `Deep_Learning_Project/ml_api.py`.
*   **Purpose:** Exposes an endpoint `POST /process-pdf` that accepts a PDF, does the OCR on all pages, and returns the graded JSON.

### B. The Main Backend (Inside `backend/`)
We will update the main backend to act as the "Orchestrator".
*   **Action:** When a student uploads a PDF, the main backend forwards it to the `ml_api.py` (running on the same VM or a different one).

## 3. Implementation Steps

### Step 1: Prepare the AWS Instance
1.  Launch `g4dn.xlarge`.
2.  Install Docker and NVIDIA Container Toolkit.
3.  Clone the repository.

### Step 2: Create the `ml_api.py` (The Bridge)
I will write a FastAPI wrapper for your teammate's code that:
1.  Accepts the PDF.
2.  Splits it into images.
3.  Loops OCR across all images.
4.  Returns the JSON report.

### Step 3: Connect Frontend to AWS
Update the Frontend `.env` to point to the AWS Public IP/DNS.

## 4. Why this is "Best-in-Class"
*   **Single Request:** The frontend makes one call to the backend; the backend makes one call to the AI; the AI handles the 14-page PDF in one go.
*   **Zero Local Load:** Your laptop only renders the UI.
*   **Credit Optimized:** Using a GPU instance makes the processing so fast that you'll spend less time with the server running.

---
**Next Move:** I will now generate the `ml_api.py` script that transforms your teammate's AIML folder into a professional API. Shall I proceed?