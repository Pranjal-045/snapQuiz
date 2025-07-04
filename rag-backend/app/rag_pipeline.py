import os
import json
import logging
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain.chains import RetrievalQA
from langchain.text_splitter import CharacterTextSplitter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def generate_mcqs(pdf_path: str, num_questions: int = 5):
    # Check for API key
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        logger.error("GROQ_API_KEY environment variable is not set")
        return [
            {
                "question": "API Key Error: GROQ_API_KEY not found",
                "options": {
                    "A": "Check server environment variables",
                    "B": "Set GROQ_API_KEY in Render dashboard",
                    "C": "Restart the application after setting the key",
                    "D": "All of the above"
                },
                "answer": "D"
            }
        ]
    
    try:
        logger.info(f"Processing PDF: {pdf_path}")
        
        # Load and process PDF
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        logger.info(f"Loaded {len(pages)} pages from PDF")

        # Split into chunks
        splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs = splitter.split_documents(pages)
        logger.info(f"Split into {len(docs)} document chunks")

        # Create embeddings
        logger.info("Creating embeddings...")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Create vector store
        logger.info("Creating vector database...")
        vectordb = Chroma.from_documents(docs, embedding=embeddings)

        # Set up LLM with API key
        logger.info("Setting up LLM connection...")
        llm = ChatGroq(
            groq_api_key=groq_api_key,
            model_name="llama3-8b-8192"
        )

        # Create QA chain
        logger.info("Creating QA chain...")
        qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=vectordb.as_retriever())

        # Prompt for JSON format
        prompt = (
            f"Generate {num_questions} multiple choice questions (MCQs) from the document in the following JSON format:\n"
            "[\n"
            "  {\n"
            "    \"question\": \"...\",\n"
            "    \"options\": {\n"
            "      \"A\": \"...\",\n"
            "      \"B\": \"...\",\n"
            "      \"C\": \"...\",\n"
            "      \"D\": \"...\"\n"
            "    },\n"
            "    \"answer\": \"A\"  # correct option letter\n"
            "  },\n"
            "  ...\n"
            "]\n"
            "Make sure the JSON is valid and parsable. Return ONLY the JSON array without any additional explanations or text."
        )

        logger.info("Sending request to Groq API...")
        raw_response = qa_chain.run(prompt)
        logger.info("Received response from Groq API")

        # Try to parse JSON from the LLM output safely
        try:
            # Sometimes LLM might add extra text, so extract JSON part:
            json_start = raw_response.find('[')
            json_end = raw_response.rfind(']') + 1
            
            if json_start == -1 or json_end == 0:
                logger.error("Could not find JSON in response")
                return {
                    "error": "Failed to find JSON in response", 
                    "raw": raw_response
                }
                
            json_str = raw_response[json_start:json_end]
            logger.info("Extracted JSON from response")

            mcqs_json = json.loads(json_str)
            logger.info(f"Successfully parsed {len(mcqs_json)} MCQs")
            return mcqs_json
            
        except Exception as e:
            logger.error(f"JSON parsing error: {str(e)}")
            return {
                "error": "Failed to parse JSON from LLM response", 
                "raw": raw_response, 
                "exception": str(e)
            }
            
    except Exception as e:
        logger.error(f"Error in RAG pipeline: {str(e)}", exc_info=True)
        return [{
            "question": f"Error: {str(e)}",
            "options": {
                "A": "Check server logs for details",
                "B": "Verify PDF file is valid",
                "C": "Ensure all dependencies are installed",
                "D": "All of the above"
            },
            "answer": "D"
        }]