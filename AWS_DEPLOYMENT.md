# AWS Deployment Instructions (Unified Backend)

Follow these steps to deploy your consolidated AI-powered backend on AWS.

## 1. AWS Instance Launch
- **Instance Type:** `g4dn.xlarge` (Mandatory for GPU acceleration).
- **AMI:** `Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.2.0 (Ubuntu 22.04)`.
- **Security Group:**
    - Allow SSH (22) from your IP.
    - Allow Custom TCP (8000) for the Backend API.
- **Storage:** At least 50GB (Models take ~5GB, plus Docker images).

## 2. Server Setup
Once you SSH into the instance, run the following commands:

1.  **Run the Setup Script:**
    ```bash
    # Copy the setup_aws_gpu.sh to the server
    chmod +x setup_aws_gpu.sh
    ./setup_aws_gpu.sh
    ```
2.  **Verify GPU:**
    ```bash
    nvidia-smi
    ```
    *You should see the Tesla T4 GPU details.*

## 3. Deployment (Docker Compose)
The best way to run this on AWS is via the included `docker-compose.yml`.

1.  **Install Docker Compose** (if not already present):
    ```bash
    sudo apt-get install docker-compose-plugin
    ```
2.  **Launch:**
    ```bash
    # From the project root
    sudo docker compose up --build -d
    ```

## 4. Frontend Connection
Update your local `frontend/.env` file:
```env
VITE_API_URL=http://<YOUR_AWS_PUBLIC_IP>:8000
```
Restart your frontend development server: `npm run dev`.

## 5. First Run Note
The first time you grade a PDF, the backend will download approximately 2GB of model weights (TrOCR and SBERT). This will only happen once. The AWS network is extremely fast, so this should take less than 2 minutes.

## 6. Security Warning
For a production environment, you should put the backend behind an Nginx proxy with SSL (HTTPS). For this credits-based project, the current setup is sufficient for testing.
