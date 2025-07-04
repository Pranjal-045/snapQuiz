import { useState } from 'react';
import axios from 'axios';

function Home() {
  const [file, setFile] = useState(null);
  const [mcqs, setMcqs] = useState("");

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await axios.post("process.env.REACT_APP_RAG_URL", formData);
    setMcqs(res.data.mcqs);
  };

  return (
    <div className="p-4">
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} className="bg-blue-500 text-white px-4 py-2 ml-2">Upload</button>
      <pre className="mt-4 whitespace-pre-wrap">{mcqs}</pre>
    </div>
  );
}

export default Home;
