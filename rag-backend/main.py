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

@app.get("/")
async def root():
    return {
        "message": "Welcome to snapQuiz RAG API",
        "status": "online"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "api_key": "Available" if os.getenv("GROQ_API_KEY") else "Missing"}

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file with extensive debugging."""
    text = ""
    page_count = 0
    
    try:
        with open(pdf_path, 'rb') as file:
            # Get file size for debugging
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            print(f"PDF file size: {file_size} bytes")
            
            try:
                reader = PdfReader(file)
                print(f"PDF has {len(reader.pages)} pages")
                
                for i, page in enumerate(reader.pages):
                    page_count += 1
                    try:
                        page_text = page.extract_text()
                        if page_text and len(page_text.strip()) > 10:  # Ensure we have meaningful text
                            text += page_text + "\n\n"
                            print(f"Page {i+1}: Extracted {len(page_text)} chars")
                        else:
                            print(f"Page {i+1}: No meaningful text extracted")
                    except Exception as e:
                        print(f"Error extracting text from page {i+1}: {e}")
            except Exception as e:
                print(f"Error reading PDF: {e}")
                raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")
        
        # Check if we got any usable text
        cleaned_text = text.strip()
        print(f"Total extracted text: {len(cleaned_text)} chars from {page_count} pages")
        
        if len(cleaned_text) < 100:
            print("WARNING: Very little text extracted, PDF might be image-based or scanned")
            if len(cleaned_text) > 0:
                print(f"Sample of extracted text: {cleaned_text[:100]}")
            raise ValueError("Insufficient text extracted from PDF")
        
        print(f"Sample of extracted text: {cleaned_text[:200]}...")
        return cleaned_text
        
    except ValueError as e:
        # Re-raise ValueError for specific handling
        raise
    except Exception as e:
        print(f"Unexpected error extracting text: {e}")
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(e)}")

async def generate_mcqs_with_groq(text: str, file_name: str, num_questions: int = 5) -> List[Dict[str, Any]]:
    """Generate MCQs using Groq API, using a more powerful model."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not found in environment variables")
    
    # Truncate text if needed
    max_chars = 24000  # Maximum context for llama3-70b
    if len(text) > max_chars:
        print(f"Text is too long ({len(text)} chars), truncating to {max_chars} chars")
        text = text[:max_chars]
    
    # Updated prompt that's very explicit
    prompt = f"""
    I will provide you with text extracted from a document. Your task is to create {num_questions} multiple-choice questions based ONLY on the specific content in this text.

    TEXT CONTENT FROM DOCUMENT:
    ```
    {text}
    ```

    CRITICAL REQUIREMENTS:
    1. NEVER mention the document, PDF, or any filenames in your questions or answers
    2. Questions must be about SPECIFIC facts, concepts, or information from the text
    3. Each question must have exactly 4 options labeled A, B, C, D with only one correct answer
    4. If the text appears to be incomplete or lacks substantive content, create questions based on whatever information is available
    5. ALL questions must be derived from the text content provided - do not make up information

    Format your response as a JSON array like this:
    [
      {{
        "question": "Specific question about content from the text?",
        "options": {{
          "A": "Correct answer from the text",
          "B": "Incorrect but plausible option",
          "C": "Incorrect but plausible option",
          "D": "Incorrect but plausible option"
        }},
        "answer": "A"
      }},
      ...more questions...
    ]

    RETURN ONLY THE JSON ARRAY WITH NO OTHER TEXT OR EXPLANATION.
    """
    
    try:
        print(f"Sending request to Groq API using model llama3-70b for document: {file_name}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-70b-8192",  # Using more powerful model
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 2000,
                },
                timeout=120.0
            )
            
            response.raise_for_status()
            data = response.json()
            
            if "choices" not in data or not data["choices"]:
                raise HTTPException(status_code=500, detail="Invalid response from Groq API")
                
            content = data["choices"][0]["message"]["content"]
            print(f"Received response with {len(content)} chars")
            
            # Extract JSON from the response
            json_start = content.find('[')
            json_end = content.rfind(']') + 1
            
            if json_start == -1 or json_end <= 0:
                print("Failed to find JSON in response. Response preview:")
                print(content[:500])
                raise HTTPException(status_code=500, detail="Could not find valid JSON in API response")
                
            json_str = content[json_start:json_end]
            
            try:
                mcqs = json.loads(json_str)
                
                # Validate and filter the MCQs
                filtered_mcqs = []
                for mcq in mcqs:
                    question = mcq.get("question", "").lower()
                    
                    # Skip questions that mention PDF or filename
                    if "pdf" in question or "document" in question or file_name.lower() in question:
                        print(f"Skipping question that mentions PDF/document: '{mcq.get('question')}'")
                        continue
                        
                    # Ensure the question has the required fields
                    if "question" in mcq and "options" in mcq and "answer" in mcq:
                        if len(mcq["options"]) == 4:  # Ensure we have exactly 4 options
                            filtered_mcqs.append(mcq)
                            
                if not filtered_mcqs:
                    # If all questions were filtered out, we have a problem
                    raise HTTPException(status_code=500, 
                                      detail="Generated questions did not meet quality standards")
                
                print(f"Successfully created {len(filtered_mcqs)} content-specific MCQs")
                return filtered_mcqs
                
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                print(f"Problematic JSON: {json_str[:100]}...")
                raise HTTPException(status_code=500, detail="Failed to parse JSON from API response")
            
    except httpx.HTTPStatusError as e:
        print(f"HTTP error: {e}")
        if hasattr(e, 'response'):
            print(f"Response: {e.response.text}")
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
        if not pdf.filename.lower().endswith('.pdf'):
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
        
        # Extract text from PDF or use fallback for image-based PDFs
        try:
            text = extract_text_from_pdf(temp_path)
        except ValueError as e:
            print(f"PDF text extraction issue: {e}")
            raise HTTPException(status_code=400, 
                               detail="Could not extract sufficient text from your PDF. It appears to be an image-based or scanned document. Please upload a PDF with extractable text.")
        
        # Generate MCQs from text using Groq API with more powerful model
        mcqs = await generate_mcqs_with_groq(text, pdf.filename, num_questions)
        
        # Clean up
        try:
            os.unlink(temp_path)
        except Exception as e:
            print(f"Error removing temp file: {str(e)}")
        
        return {
            "mcqs": mcqs,
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