"""
PRITHVI SHIELD - Landslide Risk Monitoring & Disaster Response Backend
Entrypoint script to run the FastAPI application with Uvicorn.
"""

import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("ENVIRONMENT", "development").lower() == "development"

    print("=" * 65)
    print("  * PRITHVI SHIELD BACKEND SERVER")
    print("  * AI-Powered Landslide Risk Monitoring & Disaster Response")
    print("=" * 65)
    print(f"  [>] Server running on:        http://{host}:{port}")
    print(f"  [>] Interactive API Docs:    http://{host}:{port}/docs")
    print(f"  [>] Alternative Docs:        http://{host}:{port}/redoc")
    print(f"  [>] Health Check:            http://{host}:{port}/health")
    print("=" * 65)

    uvicorn.run("app.main:app", host=host, port=port, reload=reload)
