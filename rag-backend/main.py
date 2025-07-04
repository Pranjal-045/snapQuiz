import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from app.rag_pipeline import generate_mcqs
import uvicorn

app = FastAPI(
    title="snapQuiz RAG API",
    description="API for generating quiz questions from PDF documents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this in production
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
            {"path": "/upload", "method": "POST", "description": "Upload PDF and generate MCQs"}
        ]
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/upload")
async def upload_file(
    pdf: UploadFile = File(...),
    num_questions: int = Form(5)  # Default is 5 if not provided
):
    try:
        # Save uploaded file to disk temporarily
        temp_path = f"temp_{pdf.filename}"
        with open(temp_path, "wb") as f:
            content = await pdf.read()
            f.write(content)

        # Generate MCQs with specified number of questions
        mcqs = generate_mcqs(temp_path, num_questions)

        # Clean up
        os.remove(temp_path)

        return {"mcqs": mcqs}

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(error_details)  # Log the full error
        return {"error": str(e)}

# Only run this when executing the file directly (not when imported)
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)