import { useEffect, useState } from "react";
import { useCourseContract } from "../hooks/useCourseContract";
import { useExamContract } from "../hooks/useExamContract";
import TakeExam from "./TakeExam";

type Exam = {
  courseId: number;
  examId: number;
  title: string;
  duration: number;
  examAddress: string;
};

export default function ExamList() {
  const { contract: courseContract, account } = useCourseContract();

  const [selectedExamAddress, setSelectedExamAddress] = useState<string>("");

  // Hook to get exam contract for selected exam address
  const { contract: selectedExamContract, isLoading: examContractLoading } =
    useExamContract(selectedExamAddress);

  const [isLecturer, setIsLecturer] = useState<boolean | null>(null);
  const [studentExams, setStudentExams] = useState<Exam[]>([]);
  const [lecturerExams, setLecturerExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  // Parses AI output text into structured questions
  function parseQuestions(rawText: string): any[] {
    const questionBlocks = rawText
      .split(/\n---+\n/) // markdown dividers
      .map((b) => b.trim())
      .filter(Boolean);

    const parsed = questionBlocks.map((block) => {
      const lines = block.split("\n").map((l) => l.trim());

      const questionLine = lines.find((line) =>
        /^###\s*\*\*\d+\.\s/.test(line)
      );
      if (!questionLine) return null;

      const questionText = questionLine
        .replace(/^###\s*\*\*\d+\.\s*/, "")
        .replace(/\*\*$/, "")
        .trim();

      const optionLines = lines.filter((line) => /^[A-D]\)/.test(line));
      const options = optionLines.map((opt) =>
        opt.replace(/^[A-D]\)\s*/, "").trim()
      );

      const correctLine = lines.find((line) =>
        /\*\*Correct Answer:\*\*/i.test(line)
      );
      if (!correctLine) return null;

      const correctMatch = correctLine.match(
        /\*\*Correct Answer:\*\*\s*\*\*([A-D])/i
      );
      if (!correctMatch) return null;

      const correctLetter = correctMatch[1].toUpperCase();
      const correctIndex = correctLetter.charCodeAt(0) - 65;

      if (options.length < 2 || correctIndex >= options.length) return null;

      return {
        questionText,
        options,
        correctOption: correctIndex,
      };
    });

    return parsed.filter(Boolean) as any[];
  }

  // Fetch user role (lecturer or student)
  const fetchUserRole = async () => {
    if (!courseContract || !account) return;
    try {
      const profile = await courseContract.getUserProfile(account);
      setIsLecturer(profile.isLecturer);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Fetch exams student is enrolled in
  const fetchStudentExams = async () => {
    if (!courseContract || !account) return;
    setLoading(true);
    try {
      const totalCourses = await courseContract.courseCount();
      const exams: Exam[] = [];

      for (let courseId = 0; courseId < totalCourses; courseId++) {
        const enrolled = await courseContract.isStudentEnrolled(
          account,
          courseId
        );
        if (!enrolled) continue;

        const course = await courseContract.courses(courseId);
        const examCount = Number(course.examCount);

        const examPromises = Array.from({ length: examCount }, (_, examId) =>
          courseContract
            .getExamAddress(courseId, examId)
            .then((examAddress) => ({
              courseId,
              examId,
              title: `Exam #${examId + 1} of ${course.title}`,
              duration: 0,
              examAddress,
            }))
        );

        const examsForCourse = await Promise.all(examPromises);
        exams.push(...examsForCourse);
      }

      setStudentExams(exams);
    } catch (err) {
      console.error("Error fetching student exams:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch exams lecturer created
  const fetchLecturerExams = async () => {
    if (!courseContract || !account) return;
    setLoading(true);
    try {
      const totalCourses = await courseContract.courseCount();
      const exams: Exam[] = [];

      for (let courseId = 0; courseId < totalCourses; courseId++) {
        const course = await courseContract.courses(courseId);
        if (course.lecturer.toLowerCase() !== account.toLowerCase()) continue;

        const examCount = Number(course.examCount);

        const examPromises = Array.from({ length: examCount }, (_, examId) =>
          courseContract
            .getExamAddress(courseId, examId)
            .then((examAddress) => ({
              courseId,
              examId,
              title: `Exam #${examId + 1} of ${course.title}`,
              duration: 0,
              examAddress,
            }))
        );

        const examsForCourse = await Promise.all(examPromises);
        exams.push(...examsForCourse);
      }

      setLecturerExams(exams);
    } catch (err) {
      console.error("Error fetching lecturer exams:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  function handleFileChange(e: any) {
    const file = e.target.files[0];
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

  // Submit file to backend for AI question generation
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
      const res = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        const parsed = parseQuestions(data.result);
        setGeneratedQuestions(parsed);
      }
    } catch (err) {
      setError("Something went wrong.");
      console.error(err);
    }

    setLoading(false);
  }

  // Add generated questions to the exam contract on-chain
  async function addGeneratedQuestionsToContract() {
    if (!selectedExamContract) {
      alert("Please select an exam first.");
      return;
    }

    if (generatedQuestions.length === 0) {
      alert("No generated questions to add.");
      return;
    }

    setLoading(true);

    try {
      const questionTexts = generatedQuestions.map((q) => q.questionText);
      const options = generatedQuestions.map((q) => q.options);
      const correctOptions = generatedQuestions.map((q) => q.correctOption);

      const tx = await selectedExamContract.addQuestionsBatch(
        questionTexts,
        options,
        correctOptions
      );
      await tx.wait();

      alert("All questions added successfully!");
      setGeneratedQuestions([]);
    } catch (err) {
      console.error("Error adding questions:", err);
      alert("Failed to add questions to contract.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUserRole();
  }, [courseContract, account]);

  useEffect(() => {
    if (isLecturer === null) return;
    if (isLecturer) {
      fetchLecturerExams();
    } else {
      fetchStudentExams();
    }
  }, [isLecturer, courseContract, account]);

  if (isLecturer === null) {
    return <p className="text-center mt-6">Loading user role...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-purple-700">
        {isLecturer ? "📝 Exams You Created" : "📋 Your Enrolled Exams"}
      </h2>

      {loading && <p>Loading exams...</p>}

      <ul className="space-y-4">
        {(isLecturer ? lecturerExams : studentExams).map((exam) => (
          <li
            key={`${exam.courseId}-${exam.examId}`}
            className="border border-gray-300 rounded p-4 hover:shadow-md transition"
          >
            <h3 className="text-lg font-semibold text-purple-800">
              {exam.title}
            </h3>
            <p className="text-sm text-gray-700">
              Course ID: {exam.courseId} | Exam ID: {exam.examId}
            </p>
            <p className="text-sm text-gray-600 break-all">
              Address: {exam.examAddress}
            </p>

            {!isLecturer && (
              <button
                className="mt-2 px-4 py-1 bg-blue-600 text-white rounded"
                onClick={() => setSelectedExamAddress(exam.examAddress)}
              >
                Take This Exam
              </button>
            )}
          </li>
        ))}
      </ul>

      {isLecturer && (
        <div className="max-w-2xl mx-auto mt-12 bg-white shadow-md rounded-xl p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Generate Exam Questions
          </h2>

          <input
            type="file"
            onChange={handleFileChange}
            accept=".txt,.pdf,.docx"
            className="w-full border rounded-md p-2"
          />

          <input
            type="number"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full border rounded-md p-2"
          />

          {error && <p className="text-red-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !uploadedFile}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Questions"}
          </button>

          {generatedQuestions.length > 0 && (
            <div className="mt-6 space-y-6">
              {generatedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 p-4 rounded-md shadow-sm"
                >
                  <h3 className="font-semibold text-lg mb-2">
                    {idx + 1}. {q.questionText}
                  </h3>
                  <ul className="space-y-1">
                    {q.options.map((opt: string, i: number) => (
                      <li key={i} className="p-2 rounded-md bg-gray-100">
                        <span className="font-medium">
                          ({String.fromCharCode(97 + i)})
                        </span>{" "}
                        <span
                          className={
                            i === q.correctOption
                              ? "font-bold text-green-700"
                              : ""
                          }
                        >
                          {opt}
                        </span>
                        {i === q.correctOption && (
                          <span className="ml-2 text-sm text-green-600 font-medium">
                            (Correct)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {lecturerExams.length > 0 && (
            <select
              className="w-full border rounded-md p-2"
              value={selectedExamAddress}
              onChange={(e) => setSelectedExamAddress(e.target.value)}
              disabled={examContractLoading}
            >
              <option value="">-- Select an Exam --</option>
              {lecturerExams.map((exam) => (
                <option key={exam.examAddress} value={exam.examAddress}>
                  {exam.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={addGeneratedQuestionsToContract}
            disabled={
              !selectedExamContract ||
              generatedQuestions.length === 0 ||
              loading
            }
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Add Questions to Selected Exam
          </button>
        </div>
      )}

      {!isLecturer && selectedExamAddress && (
        <TakeExam examAddress={selectedExamAddress} studentAccount={account!} />
      )}
    </div>
  );
}
