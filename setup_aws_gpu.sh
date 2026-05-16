#!/bin/bash

# =============================================================================
# AWS EC2 G4DN Setup Script (Ubuntu 22.04)
# Purpose: Install NVIDIA Drivers, Docker, and NVIDIA Container Toolkit
# =============================================================================

echo "--- Starting AWS GPU Setup ---"

# 1. Update and install basic dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release build-essential

# 2. Install NVIDIA Drivers (for G4dn/T4 GPU)
echo "--- Installing NVIDIA Drivers ---"
sudo apt-get install -y nvidia-driver-535 nvidia-utils-535

# 3. Install Docker
echo "--- Installing Docker ---"
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Install NVIDIA Container Toolkit (Allow Docker to see the GPU)
echo "--- Installing NVIDIA Container Toolkit ---"
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 5. Restart Docker to apply changes
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 6. Final verification
echo "--- Verification ---"
nvidia-smi
sudo docker run --rm --runtime=nvidia --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi

echo "--- Setup Complete! You can now run your GPU-accelerated backend ---"
