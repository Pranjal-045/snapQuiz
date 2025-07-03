import os
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from app.rag_pipeline import generate_mcqs
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        return {"error": str(e)}
