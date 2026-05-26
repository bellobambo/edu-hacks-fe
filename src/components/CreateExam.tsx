"use client";

import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { ethers } from "ethers";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

export function UploadForm({
  onQuestionsGenerated,
}: {
  onQuestionsGenerated?: (result: string) => void;
}) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (
      file &&
      (file.type === "text/plain" ||
        file.type === "application/pdf" ||
        file.name.endsWith(".docx") ||
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

    if (!description.trim()) {
      setError("Please enter a description for the generated questions.");
      return;
    }

    setLoading(true);
    setResult("");
    setError("");

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("questionCount", questionCount.toString());
    formData.append("description", description.trim());

    try {
      const res = await fetch("https://eduhack-ozld.vercel.app/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        if (onQuestionsGenerated) {
          onQuestionsGenerated(data.result);
        }
      }
    } catch (err) {
      setError("Something went wrong.");
      console.error(err);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="block font-medium text-[#B49286]">
            Upload a `.txt`, `.pdf`, or `.docx` file
          </label>
          <br />
          <small className="text-[#B49286]">preferably .docx files</small>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".txt,.pdf,.docx"
            className="w-full sm:w-auto border border-[#B49286]/30 rounded-lg p-3 bg-[#744253]/90 focus:ring-2 focus:ring-[#B49286]/50 focus:border-[#B49286]/50 text-[#B49286]"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-medium text-[#B49286]">
            Number of Questions
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full sm:w-auto border border-[#B49286]/30 rounded-lg p-3 bg-[#744253]/90 focus:ring-2 focus:ring-[#B49286]/50 focus:border-[#B49286]/50 text-[#B49286]"
          />
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <label className="block font-medium text-[#B49286]">
          Lesson Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Week 3 biology lesson on photosynthesis"
          className="w-full border border-[#B49286]/30 rounded-lg p-3 bg-[#744253]/90 focus:ring-2 focus:ring-[#B49286]/50 focus:border-[#B49286]/50 text-[#B49286] placeholder-[#B49286]/60 min-h-[100px]"
        />
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <div>
        <button
          onClick={handleSubmit}
          disabled={loading || !uploadedFile || !description.trim()}
          className={`w-full sm:w-auto bg-[#744253] text-[#B49286] px-6 py-3 rounded-lg hover:bg-[#744253]/90 transition-colors shadow-md ${
            loading || !uploadedFile || !description.trim()
              ? "opacity-70 cursor-not-allowed"
              : ""
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#B49286]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating...
            </span>
          ) : (
            "Generate Questions"
          )}
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-[#744253]/20 rounded-lg border border-[#B49286]/20 overflow-auto">
          <p className="font-medium text-[#B49286]">
            Generated Questions Preview:
          </p>
          <div className="mt-3 p-3 bg-[#744253]/70 rounded-md text-[#B49286] whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateExamWithAI({ onClose }: { onClose?: () => void } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [courseId, setCourseId] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) return;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const lecturerAddress = await signer.getAddress();

        const courseIds = await contract.getLecturerCourseIds();
        const courseArray = [];

        for (const id of courseIds) {
          const course = await contract.getCourseInfo(id);
          const lecturer = String(course[3]);
          // Only include courses where the current user is the lecturer
          if (lecturer.toLowerCase() === lecturerAddress.toLowerCase()) {
            courseArray.push({
              courseId: course[0],
              title: course[1],
              description: course[2],
              lecturer,
              lecturerName: course[4],
              creationDate: course[5],
            });
          }
        }
        setCourses(courseArray);
        const requestedCourseId = searchParams.get("courseId");
        if (
          requestedCourseId &&
          courseArray.some(
            (course) => Number(course.courseId) === Number(requestedCourseId)
          )
        ) {
          setCourseId(requestedCourseId);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
      setCoursesLoading(false);
    };
    fetchCourses();
  }, [searchParams]);

  // const addGeneratedQuestion = (question: any) => {
  //   setQuestionText(question.text);
  //   setOptions(question.options);
  //   setCorrectOption(question.correctOption);
  //   setMessage(
  //     "Generated question loaded. Review and click 'Add Question' to save."
  //   );
  // };

  // Update your createExam function to include course validation
  const createExam = async () => {
    setLoading(true);
    setMessage("");
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");

      // Validate course selection
      if (!courseId) throw new Error("Please select a course");
      const selectedCourse = courses.find(
        (c) => Number(c.courseId) === Number(courseId)
      );
      if (!selectedCourse) throw new Error("Invalid course selected");

      const tx = await contract.createExam(Number(courseId), examTitle);
      await tx.wait();

      const examIds = await contract.getAllExamIds();
      const newExamId = examIds[examIds.length - 1];
      toast.success("Exam created successfully");
      setTimeout(() => {
        onClose?.();
        navigate(`/all-exams?manageExamId=${Number(newExamId)}`);
      }, 1500);
    } catch (error: any) {
      setMessage(error.message || "Failed to create exam");
    }
    setLoading(false);
  };

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }

    navigate("/profile");
  };

  return (
    <main className="w-full max-w-lg mx-auto p-4 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#B49286]">Create Exam</h1>
        <button
          onClick={closeForm}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#B49286] text-[#744253] font-bold text-base hover:bg-[#B49286]/80 transition-colors shadow"
          aria-label="Close create exam form"
        >
          &times;
        </button>
      </div>

      {/* Exam Creation Form */}
      <div className="space-y-3 mb-4">
          <div>
            <label className="block mb-1 text-[#B49286]">Select Course</label>
            {coursesLoading ? (
              <select
                disabled
                className="border border-[#B49286]/30 p-2 w-full rounded bg-[#744253]/90 text-[#B49286]"
              >
                <option>Loading courses...</option>
              </select>
            ) : courses.length === 0 ? (
              <select
                disabled
                className="border border-[#B49286]/30 p-2 w-full rounded bg-[#744253]/90 text-[#B49286]"
              >
                <option>No courses available</option>
              </select>
            ) : (
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="border border-[#B49286]/30 p-2 w-full rounded bg-[#744253]/90 text-[#B49286] focus:outline-none focus:ring-1 focus:ring-[#B49286]"
              >
                <option value="" className="text-[#B49286]/60">
                  Select a course
                </option>
                {courses.map((course) => (
                  <option
                    key={Number(course.courseId)}
                    value={Number(course.courseId)}
                    className="bg-[#744253]"
                  >
                  {course.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block mb-1 text-[#B49286]">Exam Title</label>
            <input
              type="text"
              placeholder="Exam Title"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="border border-[#B49286]/30 p-2 w-full rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
            />
          </div>
          <div>
            <button
              disabled={loading || !courseId || !examTitle}
              onClick={createExam}
              className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-6 py-3 rounded-lg transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Creating Exam..." : "Create Exam"}
            </button>
          </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div
          className={`mt-4 p-3 rounded ${
            message.includes("success") || message.includes("Generated")
              ? "bg-[#B49286]/20 text-[#B49286] border border-[#B49286]/20"
              : "bg-[#744253]/90 text-[#B49286] border border-[#B49286]/20"
          }`}
        >
          {message}
        </div>
      )}

    </main>
  );
}
