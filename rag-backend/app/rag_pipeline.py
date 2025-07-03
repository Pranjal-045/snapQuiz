import os
import json
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain.chains import RetrievalQA
from langchain.text_splitter import CharacterTextSplitter

load_dotenv()

def generate_mcqs(pdf_path: str, num_questions: int = 5):
    loader = PyPDFLoader(pdf_path)
    pages = loader.load()

    splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = splitter.split_documents(pages)

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vectordb = Chroma.from_documents(docs, embedding=embeddings)

    llm = ChatGroq(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama3-8b-8192"
    )

    qa_chain = RetrievalQA.from_chain_type(llm=llm, retriever=vectordb.as_retriever())

    # Prompt asking explicitly for JSON format
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
        "Make sure the JSON is valid and parsable."
    )

    raw_response = qa_chain.run(prompt)

    # Try to parse JSON from the LLM output safely
    try:
        # Sometimes LLM might add extra text, so extract JSON part:
        json_start = raw_response.find('[')
        json_end = raw_response.rfind(']') + 1
        json_str = raw_response[json_start:json_end]

        mcqs_json = json.loads(json_str)
        return mcqs_json
    except Exception as e:
        # If parsing fails, return raw string with error info (or handle differently)
        return {"error": "Failed to parse JSON from LLM response", "raw": raw_response, "exception": str(e)}
