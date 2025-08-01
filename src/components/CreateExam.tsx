"use client";

import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { ethers } from "ethers";
import ExamList from "./ExamList";

function UploadForm({
  onQuestionsGenerated,
}: {
  onQuestionsGenerated?: (result: string) => void;
}) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
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
          <input
            type="file"
            onChange={handleFileChange}
            accept=".txt,.pdf,.docx"
            className="w-full sm:w-auto border border-[#B49286]/30 rounded-lg p-3 bg-[#744253]/10 focus:ring-2 focus:ring-[#B49286]/50 focus:border-[#B49286]/50 text-[#071013]"
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
            className="w-full sm:w-auto border border-[#B49286]/30 rounded-lg p-3 bg-[#744253]/10 focus:ring-2 focus:ring-[#B49286]/50 focus:border-[#B49286]/50 text-[#071013]"
          />
        </div>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <div>
        <button
          onClick={handleSubmit}
          disabled={loading || !uploadedFile}
          className={`w-full sm:w-auto bg-[#744253] text-[#B49286] px-6 py-3 rounded-lg hover:bg-[#744253]/90 transition-colors shadow-md ${
            loading || !uploadedFile ? "opacity-70 cursor-not-allowed" : ""
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
          <div className="mt-3 p-3 bg-[#744253]/10 rounded-md text-[#071013] whitespace-pre-wrap">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateExamWithAI() {
  const [courseId, setCourseId] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [examId, setExamId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Modify the course fetching to filter by lecturer
  useEffect(() => {
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) return;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const lecturerAddress = await signer.getAddress();

        const count = await contract.courseCount();
        const courseArray = [];

        for (let i = 0; i < Number(count); i++) {
          const course = await contract.courses(i);
          // Only include courses where the current user is the lecturer
          if (course.lecturer === lecturerAddress) {
            courseArray.push({
              courseId: course.courseId,
              title: course.title,
              description: course.description,
              lecturer: course.lecturer,
              lecturerName: course.lecturerName,
              creationDate: course.creationDate,
            });
          }
        }
        setCourses(courseArray);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
      setCoursesLoading(false);
    };
    fetchCourses();
  }, []);

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

      const tx = await contract.createExam(
        Number(courseId),
        examTitle,
        parseInt(duration) * 60
      );
      await tx.wait();

      const examIds = await contract.getAllExamIds();
      const newExamId = examIds[examIds.length - 1];
      setExamId(newExamId);

      setMessage("Exam created successfully! Now add questions below.");
    } catch (error: any) {
      setMessage(error.message || "Failed to create exam");
    }
    setLoading(false);
  };
  const addQuestion = async () => {
    if (examId === null) return;

    setLoading(true);
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");

      if (!questionText.trim()) throw new Error("Question text is required");
      if (options.some((opt) => !opt.trim()))
        throw new Error("All options must be filled");

      const tx = await contract.addQuestion(
        examId,
        questionText,
        options,
        correctOption
      );
      await tx.wait();

      setMessage("Question added successfully!");
      setQuestionText("");
      setOptions(["", "", "", ""]);
      setCorrectOption(0);
    } catch (error: any) {
      setMessage(error.message || "Failed to add question");
    }
    setLoading(false);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleQuestionsGenerated = (result: string) => {
    try {
      const parsedQuestions = parseQuestions(result);
      setGeneratedQuestions(parsedQuestions);
      setSelectedQuestions(parsedQuestions.map((_, index) => index)); // Select all by default
      setMessage(
        `${parsedQuestions.length} questions generated successfully! All selected by default.`
      );
    } catch (error) {
      setMessage("Failed to parse generated questions");
    }
  };

  const toggleQuestionSelection = (index: number) => {
    setSelectedQuestions((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === generatedQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(generatedQuestions.map((_, index) => index));
    }
  };

  const addSelectedQuestions = async () => {
    if (examId === null || selectedQuestions.length === 0) return;

    setLoading(true);
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");

      // Prepare arrays for batch upload
      const questionTexts: string[] = [];
      const optionsList: string[][] = [];
      const correctOptions: number[] = [];

      // Collect all selected questions
      for (const index of selectedQuestions) {
        const question = generatedQuestions[index];
        if (!question) continue;

        questionTexts.push(question.text);
        optionsList.push(question.options);
        correctOptions.push(question.correctOption);
      }

      // Use batch upload function
      const tx = await contract.addQuestionsBatch(
        examId,
        questionTexts,
        optionsList,
        correctOptions
      );
      await tx.wait();

      setMessage(
        `Successfully added ${selectedQuestions.length} questions to the exam in one transaction!`
      );
      setSelectedQuestions([]);
      setGeneratedQuestions([]); // Clear the generated questions after upload
    } catch (error: any) {
      setMessage(error.message || "Failed to add questions");
    }
    setLoading(false);
  };

  function parseQuestions(result: string): any[] {
    // This is a simple parser - adjust based on your actual API response format
    const questionBlocks = result.split("\n\n").filter((block) => block.trim());

    return questionBlocks
      .map((block) => {
        const lines = block.split("\n").filter((line) => line.trim());
        if (lines.length < 5) return null; // Skip invalid questions

        const question = {
          text: lines[0],
          options: lines.slice(1, 5),
          correctOption: 0, // Default to first option - you might need to detect the correct one
        };

        // Try to detect correct option (assuming it's marked with (*) or similar)
        for (let i = 0; i < question.options.length; i++) {
          if (
            question.options[i].includes("(correct)") ||
            question.options[i].includes("*")
          ) {
            question.correctOption = i;
            question.options[i] = question.options[i]
              .replace("(correct)", "")
              .replace("*", "")
              .trim();
            break;
          }
        }

        return question;
      })
      .filter(Boolean);
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
      <h1 className="text-2xl font-bold mb-6 text-[#B49286]">Create Exam</h1>

      {/* Exam Creation Form */}
      {!examId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                    {course.title} (ID: {Number(course.courseId)})
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
            <label className="block mb-1 text-[#B49286]">
              Duration (minutes)
            </label>
            <input
              type="number"
              placeholder="Duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="border border-[#B49286]/30 p-2 w-full rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
            />
          </div>
          <div className="md:col-span-2">
            <button
              disabled={loading || !courseId || !examTitle || !duration}
              onClick={createExam}
              className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-6 py-3 rounded-lg transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Creating Exam..." : "Create Exam"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Exam Created Success Section */}
          <div className="bg-[#B49286]/10 border border-[#B49286]/20 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-[#B49286]">
                  Exam Created Successfully!
                </h2>
                <p className="text-[#B49286]/90">
                  Now add questions to your exam: {examTitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setExamId(null);
                  setMessage("");
                  setGeneratedQuestions([]);
                }}
                className="bg-[#B49286]/20 hover:bg-[#B49286]/30 text-[#B49286] px-4 py-2 rounded transition-colors"
              >
                Back to Exam Creation
              </button>
            </div>
          </div>

          {/* Question Management Section */}
          <div className="bg-[#744253]/90 p-6 rounded-lg shadow border border-[#B49286]/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#B49286]">
                Add Questions
              </h2>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  showUploadForm
                    ? "bg-[#B49286]/20 text-[#B49286]"
                    : "bg-[#B49286] text-[#744253]"
                }`}
              >
                {showUploadForm ? "Hide AI Generator" : "Generate with AI"}
              </button>
            </div>

            {/* AI Question Generator */}
            {showUploadForm && (
              <div className="mb-6 p-4 border border-[#B49286]/20 rounded-lg bg-[#744253]/80">
                <UploadForm onQuestionsGenerated={handleQuestionsGenerated} />
              </div>
            )}

            {/* Generated Questions List */}
            {generatedQuestions.length > 0 && (
              <div className="mb-6 p-4 border border-[#B49286]/20 rounded-lg bg-[#744253]/80">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-[#B49286]">
                    Generated Questions ({generatedQuestions.length})
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm bg-[#B49286]/20 hover:bg-[#B49286]/30 text-[#B49286] px-3 py-1 rounded transition-colors"
                    >
                      {selectedQuestions.length === generatedQuestions.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                    <button
                      onClick={addSelectedQuestions}
                      disabled={loading || selectedQuestions.length === 0}
                      className="text-sm bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-3 py-1 rounded transition-colors shadow disabled:opacity-50"
                    >
                      {loading ? "Uploading..." : "Upload All Selected"}
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {generatedQuestions.map((q, i) => (
                    <div
                      key={i}
                      className={`p-3 border rounded transition-colors cursor-pointer ${
                        selectedQuestions.includes(i)
                          ? "bg-[#B49286]/20 border-[#B49286]/30"
                          : "hover:bg-[#B49286]/10 border-[#B49286]/20"
                      }`}
                      onClick={() => toggleQuestionSelection(i)}
                    >
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(i)}
                          onChange={() => toggleQuestionSelection(i)}
                          className="mt-1 mr-2 accent-[#B49286]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 text-[#B49286]">
                          <p className="font-medium">{q.text}</p>
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt: string, j: number) => (
                              <div
                                key={j}
                                className={`pl-2 ${
                                  j === q.correctOption
                                    ? "border-l-2 border-[#B49286] font-medium"
                                    : ""
                                }`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Question Entry */}
            <div className="p-4 border border-[#B49286]/20 rounded-lg bg-[#744253]/80">
              <h3 className="font-semibold mb-3 text-[#B49286]">
                Manual Question Entry
              </h3>
              <div className="mb-3">
                <label className="block mb-1 text-[#B49286]">
                  Question Text
                </label>
                <input
                  type="text"
                  placeholder="Enter question text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="border border-[#B49286]/30 p-2 w-full rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
                />
              </div>

              <div className="mb-3">
                <label className="block mb-1 text-[#B49286]">Options</label>
                {options.map((option, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={correctOption === index}
                      onChange={() => setCorrectOption(index)}
                      className="mr-2 accent-[#B49286]"
                    />
                    <input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      className="border border-[#B49286]/30 p-2 flex-grow rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
                    />
                  </div>
                ))}
              </div>

              <button
                disabled={loading || !questionText || options.some((o) => !o)}
                onClick={addQuestion}
                className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-6 py-3 rounded-lg transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Adding Question..." : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="pt-4 border-t border-[#B49286]/20">
        <a
          href="/all-exams"
          className="inline-block text-[#B49286] hover:text-[#B49286]/90 hover:underline transition-colors"
        >
          All Exams
        </a>
      </div>

      <>{courseId && <ExamList courseId={Number(courseId)} />}</>
    </main>
  );
}
