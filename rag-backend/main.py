import os
import tempfile
import traceback
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from app.rag_pipeline import generate_mcqs
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(
    title="snapQuiz RAG API",
    description="API for generating quiz questions from PDF documents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "*"), os.getenv("NODE_BACKEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint - This resolves the 404 error at the root URL
@app.get("/")
async def root():
    return {
        "message": "Welcome to snapQuiz RAG API",
        "status": "online",
        "endpoints": [
            {"path": "/", "method": "GET", "description": "This information"},
            {"path": "/health", "method": "GET", "description": "Health check endpoint"},
            {"path": "/upload", "method": "POST", "description": "Upload PDF and generate MCQs"},
            {"path": "/env-check", "method": "GET", "description": "Check environment variables"}
        ]
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Environment variables check endpoint
@app.get("/env-check")
async def env_check():
    # Don't expose actual keys but check if they exist
    return {
        "GROQ_API_KEY": "Set" if os.getenv("GROQ_API_KEY") else "Not set",
        "PDF_PROCESSING": "Available" if "PyPDFLoader" in globals() else "Not available",
        "EMBEDDINGS": "Available" if "HuggingFaceEmbeddings" in globals() else "Not available"
    }

@app.post("/upload")
async def upload_file(
    pdf: UploadFile = File(...),
    num_questions: int = Form(5)  # Default is 5 if not provided
):
    try:
        # Save uploaded file to disk temporarily using a safer tempfile approach
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await pdf.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        logger.info(f"PDF saved to {temp_path} - Size: {len(content)} bytes")
        
        # Generate MCQs with specified number of questions
        mcqs = generate_mcqs(temp_path, num_questions)
        
        # Log the results for debugging
        logger.info(f"Generated MCQs result type: {type(mcqs)}")
        
        # Clean up
        try:
            os.unlink(temp_path)
            logger.info(f"Removed temporary file {temp_path}")
        except Exception as e:
            logger.error(f"Error removing temp file: {str(e)}")
        
        # Check if we have an error response
        if isinstance(mcqs, dict) and "error" in mcqs:
            logger.error(f"Error in MCQ generation: {mcqs.get('error')}")
            return {"error": mcqs.get('error'), "details": mcqs.get('raw', '')[:500]}
        
        return {"mcqs": mcqs}
    
    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"ERROR in /upload endpoint: {str(e)}")
        logger.error(error_details)
        return {
            "error": str(e), 
            "mcqs": [{
                "question": f"Server Error: {str(e)}",
                "options": {
                    "A": "Check server logs",
                    "B": "Verify PDF file",
                    "C": "Try again later",
                    "D": "Contact support"
                },
                "answer": "A"
            }]
        }

# Only run this when executing the file directly (not when imported)
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)