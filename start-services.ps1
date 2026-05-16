# start-services.ps1
# This script starts the Answer Sheet Evaluation services.

$rootPath = $PSScriptRoot

function Show-Menu {
    Clear-Host
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "   Answer Sheet Evaluation - Startup Utility   " -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "1. Start with Docker Compose (Recommended)"
    Write-Host "2. Start Locally (Development Mode)"
    Write-Host "3. Exit"
    Write-Host "===============================================" -ForegroundColor Cyan
}

function Start-Docker {
    Write-Host "`n[!] Starting services with Docker Compose..." -ForegroundColor Yellow
    if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
        docker-compose up --build
    } elseif (Get-Command "docker" -ErrorAction SilentlyContinue) {
        docker compose up --build
    } else {
        Write-Host "[Error] Docker or Docker Compose not found in PATH." -ForegroundColor Red
        Pause
    }
}

function Start-Locally {
    Write-Host "`n[!] Starting services locally..." -ForegroundColor Yellow
    
    # 1. Check for Python/Uvicorn
    Write-Host "[+] Checking Backend dependencies..." -ForegroundColor Gray
    Set-Location "$rootPath\backend"
    if (!(Get-Command "uvicorn" -ErrorAction SilentlyContinue)) {
        Write-Host "[!] uvicorn not found. Attempting to install requirements..." -ForegroundColor Cyan
        pip install -r requirements.txt
    }

    # 2. Check for NPM/Vite
    Write-Host "[+] Checking Frontend dependencies..." -ForegroundColor Gray
    Set-Location "$rootPath\frontend"
    if (!(Test-Path "node_modules")) {
        Write-Host "[!] node_modules not found. Running npm install..." -ForegroundColor Cyan
        npm install
    }

    # 3. Start Services in new windows
    Write-Host "[+] Launching Backend..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\backend'; uvicorn app.main:app --reload"
    
    Write-Host "[+] Launching Frontend..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootPath\frontend'; npm run dev"

    Write-Host "`n[v] Services are being launched in separate windows." -ForegroundColor Green
    Write-Host "[!] Note: Ensure MongoDB is running on localhost:27017 for local mode." -ForegroundColor Gray
    Pause
}

# Main Execution Loop
do {
    Show-Menu
    $choice = Read-Host "Select an option [1-3]"
    switch ($choice) {
        "1" { Start-Docker; break }
        "2" { Start-Locally; break }
        "3" { exit }
        default { Write-Host "Invalid selection. Please try again." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "3")
