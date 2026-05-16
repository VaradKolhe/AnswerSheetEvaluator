# Use NVIDIA CUDA base image for GPU support
FROM nvidia/cuda:12.2.0-base-ubuntu22.04

# Install Python and system dependencies for OpenCV/PyMuPDF
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure pip is up to date
RUN python3.11 -m pip install --upgrade pip

COPY requirements.txt .
RUN python3.11 -m pip install --no-cache-dir -r requirements.txt

COPY . .

# Use the python3.11 binary explicitly
CMD ["python3.11", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
