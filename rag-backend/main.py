import os
import json
import tempfile
from typing import List, Dict, Any
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
    return {"status": "healthy", "api_key": "Available" if os.getenv("GROQ_API_KEY") else "Missing"}

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file."""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PdfReader(file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
                    
        if not text.strip():
            raise ValueError("No text could be extracted from the PDF")
            
        print(f"Successfully extracted {len(text)} characters from PDF")
        # Print a small sample of the text for debugging
        print(f"Sample text: {text[:200]}...")
        return text
        
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")

async def generate_mcqs_with_groq(text: str, file_name: str, num_questions: int = 5) -> List[Dict[str, Any]]:
    """Generate MCQs using the Groq API directly."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not found in environment variables")
    
    # Truncate text if it's too long but keep as much as possible
    max_tokens = 6000
    if len(text) > max_tokens * 4:  # Rough character to token ratio
        print(f"Text is too long ({len(text)} chars), truncating to approximately {max_tokens} tokens")
        text = text[:max_tokens * 4]
    
    # FIXED PROMPT: Explicitly instructs not to mention the filename in questions
    # and focuses on the document content itself
    prompt = f"""
    You are creating a quiz based on the content of a document. 
    
    The following text was extracted from a document:
    ---START OF DOCUMENT CONTENT---
    {text}
    ---END OF DOCUMENT CONTENT---
    
    Create {num_questions} multiple-choice questions based ONLY on the specific information provided in the document text above.
    
    IMPORTANT INSTRUCTIONS:
    1. DO NOT mention the filename or refer to "the PDF" or "the document" in any question or answer.
    2. Questions should be about the specific content, facts, concepts, or information in the text.
    3. Each question must have exactly 4 options (A, B, C, D) with only one correct answer.
    4. Ensure questions are specific to this content, not generic.
    5. Cover different topics from the document to test various aspects.
    
    Format the response EXACTLY as a JSON array like this:
    [
      {{
        "question": "Specific question about content?",
        "options": {{
          "A": "Correct answer",
          "B": "Wrong option",
          "C": "Wrong option",
          "D": "Wrong option"
        }},
        "answer": "A"
      }}
    ]
    
    RETURN ONLY THE JSON ARRAY. No introductions, explanations or other text.
    """
    
    try:
        print(f"Sending request to Groq API for document: {file_name}")
        
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
                    "temperature": 0.1,  # Very low temperature for more deterministic output
                    "max_tokens": 2000,
                },
                timeout=120.0  # Longer timeout for complex PDFs
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
                print("Failed to find JSON in response. Full response:")
                print(content[:1000])  # Print part of response for debugging
                raise HTTPException(status_code=500, detail="Could not find valid JSON in API response")
                
            json_str = content[json_start:json_end]
            
            try:
                mcqs = json.loads(json_str)
                
                # Validate the MCQs to ensure they follow our requirements
                for i, mcq in enumerate(mcqs):
                    # Check if the question mentions the filename or "pdf" or "document"
                    question_text = mcq.get("question", "").lower()
                    if "pdf" in question_text or "document" in question_text or file_name.lower() in question_text:
                        print(f"Warning: Question {i+1} mentions PDF/document: '{question_text}'")
                
                print(f"Successfully created {len(mcqs)} content-specific MCQs")
                return mcqs
                
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                print(f"Problematic JSON: {json_str[:100]}...")
                raise HTTPException(status_code=500, detail=f"Failed to parse JSON: {str(e)}")
            
    except httpx.HTTPStatusError as e:
        print(f"HTTP error: {e}")
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Error calling Groq API: {str(e)}")

@app.post("/upload")
async def upload_file(
    pdf: UploadFile = File(...),
    num_questions: int = Form(5)
):
    try:
        # Validate input
        if pdf.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")
        
        if num_questions < 1 or num_questions > 20:
            raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 20")
        
        # Save uploaded file to disk temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await pdf.read()
            if not content:
                raise HTTPException(status_code=400, detail="Empty PDF file")
                
            temp_file.write(content)
            temp_path = temp_file.name
        
        print(f"PDF saved to {temp_path} - Size: {len(content)} bytes")
        
        # Extract text from PDF
        text = extract_text_from_pdf(temp_path)
        if not text or len(text.strip()) < 50:
            raise HTTPException(status_code=400, 
                              detail="Could not extract sufficient text from the PDF. Please ensure it contains readable text.")
        
        print(f"Extracted {len(text)} characters of text from {pdf.filename}")
        
        # Generate MCQs from text using Groq API
        # Now passing the filename as a parameter
        mcqs = await generate_mcqs_with_groq(text, pdf.filename, num_questions)
        print(f"Generated {len(mcqs)} MCQs for {pdf.filename}")
        
        # Clean up
        try:
            os.unlink(temp_path)
        except Exception as e:
            print(f"Error removing temp file: {str(e)}")
        
        # Return the MCQs with some metadata
        return {
            "mcqs": mcqs,
            "pdf_name": pdf.filename,
            "total_questions": len(mcqs)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in /upload endpoint: {str(e)}")
        print(error_details)
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)