"use client";

import { useState } from "react";

export default function UploadForm() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: any) {
    const file = e.target.files[0];
    if (
      file &&
      (file.type === "text/plain" ||
        file.type === "application/pdf" ||
        file.name.endsWith(".docx") || // Add DOCX check
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      setUploadedFile(file);
      setError("");
    } else {
      setUploadedFile(null);
      setError("Please upload a valid .txt, .pdf, or .docx file.");
    }
  }

  async function handleSubmit() {
    if (!uploadedFile) {
      setError("No file uploaded.");
      return;
    }

    if (questionCount < 1 || questionCount > 50) {
      setError("Please enter a number between 1 and 50.");
      return;
    }

    setLoading(true);
    setResult("");
    setError("");

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("questionCount", questionCount.toString());

    try {
      const res = await fetch("https://eduhack-three.vercel.app/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
      }
    } catch (err) {
      setError("Something went wrong.");
      console.error(err);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 bg-white shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        Generate Exam Questions
      </h2>
      <div className="space-y-2">
        <label className="block font-medium text-gray-700">
          Upload a `.txt`, `.pdf`, or `.docx` file
        </label>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".txt,.pdf,.docx"
          className="w-full border rounded-md p-2"
        />
      </div>
      <div className="space-y-2">
        <label className="block font-medium text-gray-700">
          Number of Questions
        </label>
        <input
          type="number"
          min="1"
          max="50"
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="w-full border rounded-md p-2"
        />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="mt-4">
        <button
          onClick={handleSubmit}
          disabled={loading || !uploadedFile}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Questions"}
        </button>
      </div>
      {result && (
        <div className="mt-6 whitespace-pre-wrap text-gray-800 bg-gray-50 p-4 rounded-md border max-h-[500px] overflow-y-auto">
          {result}
        </div>
      )}
    </div>
  );
}
