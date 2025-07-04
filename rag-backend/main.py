import os
import json
import tempfile
from typing import List, Dict, Any, Optional
import httpx

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
import uvicorn

# Initialize FastAPI app
app = FastAPI(
    title="snapQuiz RAG API",
    description="API for generating quiz questions from PDF documents",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to snapQuiz RAG API",
        "status": "online",
        "endpoints": [
            {"path": "/", "method": "GET", "description": "API information"},
            {"path": "/health", "method": "GET", "description": "Health check endpoint"},
            {"path": "/upload", "method": "POST", "description": "Upload PDF and generate MCQs"}
        ]
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "api_key": "Available" if os.getenv("GROQ_API_KEY") else "Missing"
    }

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file."""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n\n"
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")

async def generate_mcqs_with_groq(text: str, num_questions: int = 5) -> List[Dict[str, Any]]:
    """Generate MCQs using the Groq API directly."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not found in environment variables")
    
    # Prepare the prompt
    prompt = f"""
    Generate {num_questions} multiple choice questions (MCQs) based on the following text. 
    Format them as a JSON array like this:
    [
      {{
        "question": "What is the capital of France?",
        "options": {{"A": "Paris", "B": "London", "C": "Berlin", "D": "Madrid"}},
        "answer": "A"
      }}
    ]
    
    TEXT TO PROCESS:
    {text[:8000]}  # Truncate to avoid token limits
    
    Generate {num_questions} MCQs in the specified JSON format. Return only valid JSON.
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.5
                },
                timeout=60.0
            )
            
            response.raise_for_status()
            data = response.json()
            
            if "choices" not in data or not data["choices"]:
                raise HTTPException(status_code=500, detail="Invalid response from Groq API")
                
            content = data["choices"][0]["message"]["content"]
            
            # Extract JSON from the response
            json_start = content.find('[')
            json_end = content.rfind(']') + 1
            
            if json_start == -1 or json_end <= 0:
                raise HTTPException(status_code=500, detail="Could not find valid JSON in API response")
                
            json_str = content[json_start:json_end]
            return json.loads(json_str)
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Groq API error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse JSON from API response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling Groq API: {str(e)}")

@app.post("/upload")
async def upload_file(
    pdf: UploadFile = File(...),
    num_questions: int = Form(5)
):
    try:
        # Save uploaded file to disk temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await pdf.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        print(f"PDF saved to {temp_path} - Size: {len(content)} bytes")
        
        # Extract text from PDF
        text = extract_text_from_pdf(temp_path)
        print(f"Extracted {len(text)} characters of text")
        
        # Generate MCQs from text using Groq API
        mcqs = await generate_mcqs_with_groq(text, num_questions)
        print(f"Generated {len(mcqs)} MCQs")
        
        # Clean up
        try:
            os.unlink(temp_path)
            print(f"Removed temporary file {temp_path}")
        except Exception as e:
            print(f"Error removing temp file: {str(e)}")
        
        return {"mcqs": mcqs}
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in /upload endpoint: {str(e)}")
        print(error_details)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)