import { useEffect, useState } from "react";
import { useCourseContract } from "../hooks/useCourseContract";
import { useExamContract } from "../hooks/useExamContract";
import * as pdfjsLib from "pdfjs-dist";

type Exam = {
  courseId: number;
  examId: number;
  title: string;
  duration: number; // minutes
  examAddress: string;
};

type GeneratedQuestion = {
  questionText: string;
  options: string[];
  correctOption: number;
};

export default function ExamList() {
  const { contract: courseContract, account } = useCourseContract();
  const { contract: examContract, isLoading: examLoading } = useExamContract();

  const [isLecturer, setIsLecturer] = useState<boolean | null>(null);
  const [studentExams, setStudentExams] = useState<Exam[]>([]);
  const [lecturerExams, setLecturerExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  // File upload & lecture note extraction states
  const [lectureNoteFile, setLectureNoteFile] = useState<File | null>(null);
  const [lectureNoteText, setLectureNoteText] = useState<string>("");

  // AI question generation states
  const [generatedQuestions, setGeneratedQuestions] = useState<
    GeneratedQuestion[]
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Handle file input change
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLectureNoteFile(file ?? null);
  };

  // Extract text from uploaded file (PDF or TXT)
  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      // PDF extraction
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += pageText + "\n\n";
      }
      return text;
    } else if (file.type === "text/plain") {
      // Plain text file
      return await file.text();
    } else {
      throw new Error(
        "Unsupported file type. Please upload PDF or plain text."
      );
    }
  };

  // When lectureNoteFile changes, extract text automatically
  useEffect(() => {
    if (!lectureNoteFile) {
      setLectureNoteText("");
      return;
    }
    setAiError(null);
    setAiLoading(true);

    extractTextFromFile(lectureNoteFile)
      .then((text) => setLectureNoteText(text))
      .catch((e) => setAiError(e.message))
      .finally(() => setAiLoading(false));
  }, [lectureNoteFile]);

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

  // Fetch all exams for student (only enrolled courses)
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

        for (let examId = 0; examId < examCount; examId++) {
          const examAddress = await courseContract.getExamAddress(
            courseId,
            examId
          );

          exams.push({
            courseId,
            examId,
            title: `Exam #${examId + 1} of ${course.title}`,
            duration: 0,
            examAddress,
          });
        }
      }

      setStudentExams(exams);
    } catch (err) {
      console.error("Error fetching student exams:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch exams created by lecturer (all exams in owned courses)
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

        for (let examId = 0; examId < examCount; examId++) {
          const examAddress = await courseContract.getExamAddress(
            courseId,
            examId
          );
          exams.push({
            courseId,
            examId,
            title: `Exam #${examId + 1} of ${course.title}`,
            duration: 0,
            examAddress,
          });
        }
      }

      setLecturerExams(exams);
    } catch (err) {
      console.error("Error fetching lecturer exams:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate questions from lectureNoteText using DeepSeek AI
  async function generateQuestionsFromNote() {
    if (!lectureNoteText.trim()) {
      setAiError("Lecture note text is empty.");
      return;
    }
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(
        "https://api.deepseek.com/generate-questions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEKAPI}`,
          },
          body: JSON.stringify({
            text: lectureNoteText,
            numberOfQuestions: 5,
          }),
        }
      );

      if (!response.ok) throw new Error("AI generation failed");

      const data = await response.json();

      // Assuming API returns { questions: GeneratedQuestion[] }
      setGeneratedQuestions(data.questions);
    } catch (err: any) {
      setAiError(err.message || "Failed to generate questions");
    } finally {
      setAiLoading(false);
    }
  }

  // Add generated questions to the exam contract
  async function addGeneratedQuestionsToContract() {
    if (!examContract || generatedQuestions.length === 0) return;

    try {
      for (const q of generatedQuestions) {
        await examContract.addQuestion(
          q.questionText,
          q.options,
          q.correctOption
        );
      }
      alert("Questions added to exam contract!");
      setGeneratedQuestions([]);
      setLectureNoteFile(null);
      setLectureNoteText("");
    } catch (err) {
      console.error("Error adding questions:", err);
      alert("Failed to add questions to contract.");
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

      {isLecturer && lecturerExams.length === 0 && (
        <p className="text-gray-500">You haven't created any exams yet.</p>
      )}

      {!isLecturer && studentExams.length === 0 && (
        <p className="text-gray-500">
          You have no exams because you are not enrolled in any courses.
        </p>
      )}

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
          </li>
        ))}
      </ul>

      {/* --- Lecturer's AI question generation UI --- */}
      {isLecturer && (
        <div className="mt-8 p-4 border rounded bg-purple-50">
          <h3 className="text-xl font-semibold mb-2">
            Upload Lecture Note & Generate Questions
          </h3>

          <input
            type="file"
            accept=".pdf,.txt"
            onChange={onFileChange}
            disabled={aiLoading}
            className="mb-2"
          />

          {aiLoading && <p>Extracting and generating questions...</p>}
          {aiError && <p className="text-red-600">{aiError}</p>}

          <button
            className="px-4 py-2 bg-purple-700 text-white rounded disabled:opacity-50"
            onClick={generateQuestionsFromNote}
            disabled={aiLoading || !lectureNoteText.trim()}
          >
            Generate Questions from Lecture Note
          </button>

          {generatedQuestions.length > 0 && (
            <>
              <h4 className="mt-4 font-semibold">
                Preview Generated Questions:
              </h4>
              <ul className="list-decimal pl-6 mt-2 space-y-3">
                {generatedQuestions.map((q, i) => (
                  <li key={i}>
                    <p>
                      <strong>Q:</strong> {q.questionText}
                    </p>
                    <ul className="list-disc pl-6">
                      {q.options.map((opt, idx) => (
                        <li
                          key={idx}
                          className={
                            idx === q.correctOption
                              ? "font-bold text-green-600"
                              : ""
                          }
                        >
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>

              <button
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
                onClick={addGeneratedQuestionsToContract}
                disabled={examLoading}
              >
                Add Questions to Exam Contract
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
