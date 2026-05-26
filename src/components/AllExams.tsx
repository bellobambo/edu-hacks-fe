import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { useWallet } from "../utils/useWallet";
import ExamPage from "./ExamPage";
import { UploadForm } from "./CreateExam";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

type Exam = {
  examId: number;
  examTitle: string;
  courseId: number;
  courseTitle: string;
  lecturer: string;
  lecturerName: string;
  questionCount: number;
};

const AllExams = () => {
  const [searchParams] = useSearchParams();
  const { walletAddress } = useWallet();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLecturer, setIsLecturer] = useState(false);
  const [submittedExamIds, setSubmittedExamIds] = useState<Set<number>>(
    new Set()
  );
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  useEffect(() => {
    const fetchAllExams = async () => {
      setLoading(true);
      setError("");
      try {
        const contract = await getLMSContract();
        if (!contract) {
          throw new Error("Contract not connected");
        }

        let currentIsLecturer = false;
        if (walletAddress) {
          try {
            const user = await contract.getUserProfile(walletAddress);
            currentIsLecturer = Boolean(user[3]);
            setIsLecturer(currentIsLecturer);
          } catch {
            setIsLecturer(false);
          }
        }

        // Get all exam IDs
        const examIds = await contract.getAllExamIds();
        const examArray: Exam[] = [];
        const submittedIds = new Set<number>();

        // Fetch details for each exam
        for (const id of examIds) {
          const exam = await contract.getExamInfo(id);
          const numericCourseId = Number(exam[2]);
          let courseTitle = "";
          try {
            const courseInfo = await contract.getCourseInfo(numericCourseId);
            courseTitle = courseInfo[1] || "";
          } catch {
            courseTitle = "";
          }
          examArray.push({
            examId: Number(exam[0]),
            examTitle: exam[1],
            courseId: numericCourseId,
            courseTitle,
            lecturer: exam[3],
            lecturerName: exam[4],
            questionCount: Number(exam[5]),
          });

          if (walletAddress && !currentIsLecturer) {
            try {
              const [, , , submissionTime] = await contract.getMyExamCorrection(Number(id));
              if (Number(submissionTime) > 0) {
                submittedIds.add(Number(id));
              }
            } catch {
              // No submission yet for this exam
            }
          }
        }

        setExams(examArray);
        setSubmittedExamIds(submittedIds);

        const manageExamId = searchParams.get("manageExamId");
        if (manageExamId) {
          const examToManage = examArray.find(
            (exam) => exam.examId === Number(manageExamId)
          );
          if (examToManage) {
            setActiveExam(examToManage);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch exams");
        console.error("Error fetching exams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllExams();
  }, [walletAddress, searchParams, isLecturer]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center space-x-2 text-[#744253]">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#744253] border-t-transparent"></div>
        <span>Loading exams...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-[#744253]">
        All Exams
      </h2>

      {exams.length === 0 ? (
        <p className="text-[#744253]/80 text-sm sm:text-base">No exams found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const hasSubmitted = submittedExamIds.has(exam.examId);

            return (
              <div
                key={exam.examId}
                className="border border-[#B49286]/20 p-4 rounded-lg shadow hover:shadow-md transition-shadow bg-[#744253]/90"
              >
                <h3 className="font-semibold text-lg sm:text-xl mb-2 text-[#B49286]">
                  {exam.examTitle || `Exam #${exam.examId}`}
                </h3>
                <div className="space-y-1 text-[#B49286]/90 text-sm sm:text-base">
                  <p>Course: {exam.courseTitle || `Course #${exam.courseId}`}</p>
                  <p>Lecturer: {exam.lecturerName}</p>
                  <p>Questions: {exam.questionCount}</p>
                </div>
                {(() => {
                  const isExamCreator =
                    isLecturer &&
                    walletAddress?.toLowerCase() === exam.lecturer.toLowerCase();
                  return (
                    <button
                      onClick={() => setActiveExam(exam)}
                      disabled={isLecturer && !isExamCreator}
                      className="mt-3 w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded transition-colors shadow text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLecturer
                        ? exam.questionCount > 0
                          ? "View Questions"
                          : "Add Questions"
                        : hasSubmitted
                        ? "View Past Questions"
                        : "Take Exam"}
                    </button>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {activeExam && (
        <div className="fixed inset-0 z-[90] bg-[#071013]/60">
          <aside className="ml-auto h-full w-full max-w-4xl bg-[#744253] shadow-2xl border-l border-[#B49286]/20 overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#744253] border-b border-[#B49286]/20 p-4">
              <div>
                <h3 className="text-lg font-semibold text-[#B49286]">
                  {activeExam.examTitle || `Exam #${activeExam.examId}`}
                </h3>
                <p className="text-sm text-[#B49286]/75">
                  {submittedExamIds.has(activeExam.examId)
                    ? "Past questions and corrections"
                    : isLecturer
                    ? "Add questions, options, and correct answers"
                    : "Answer all questions before submitting"}
                </p>
              </div>
              <button
                onClick={() => setActiveExam(null)}
                className="border border-[#B49286]/30 text-[#B49286] hover:bg-[#B49286]/10 px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
            {isLecturer ? (
              <TutorQuestionManager exam={activeExam} />
            ) : (
              <ExamPage
                examIdOverride={activeExam.examId}
                onSubmitted={(examId) => {
                  setSubmittedExamIds(
                    (current) => new Set(current).add(examId)
                  );
                }}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

type DraftQuestion = {
  text: string;
  options: string[];
  correctOption: number;
};

type Submission = {
  studentAddress: string;
  studentName: string;
  score: number;
};

const optionLabels = ["A", "B", "C", "D"];

function TutorQuestionManager({ exam }: { exam: Exam }) {
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<DraftQuestion[]>(
    []
  );
  const [selectedGenerated, setSelectedGenerated] = useState<number[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [questionMode, setQuestionMode] = useState<"manual" | "upload" | "ai">(
    "manual"
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const fetchQuestions = async () => {
    const contract = await getLMSContract();
    if (!contract) return;
    const fetchedQuestions = await contract.getExamQuestions(exam.examId);
    setQuestions(
      fetchedQuestions.map((question: any) => ({
        text: question.questionText,
        options: Array.from(question.options ?? []),
        correctOption: Number(question.correctOption),
      }))
    );
  };

  const fetchSubmissions = async () => {
    try {
      const contract = await getLMSContract();
      if (!contract) return;
      const raw = await contract.getExamSubmissions(exam.examId);
      const resolved = await Promise.all(
        raw.map(async (s: any) => {
          let studentName = "";
          try {
            const profile = await contract.getUserProfile(s.studentAddress);
            studentName = profile[1] || "";
          } catch {
            studentName = "";
          }
          return {
            studentAddress: s.studentAddress,
            studentName,
            score: Number(s.score),
          };
        })
      );
      setSubmissions(resolved);
    } catch {
      // not lecturer or no submissions yet
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchSubmissions();
  }, [exam.examId]);

  const normalizeOption = (option: string) =>
    option.replace(/^[A-Da-d][).:-]\s*/, "").trim();

  const parseQuestions = (result: string): DraftQuestion[] => {
    return result
      .split(/\n\s*\n/)
      .filter((block) => block.trim())
      .map((block) => {
        const lines = block.split("\n").filter((line) => line.trim());
        const answerLine = lines.find((line) => /^answer\s*[:\-]/i.test(line));
        const answer = answerLine
          ?.replace(/^answer\s*[:\-]\s*/i, "")
          .trim()
          .toUpperCase();
        const answerIndex = answer ? optionLabels.indexOf(answer[0]) : -1;
        const bodyLines = lines.filter((line) => !/^answer\s*[:\-]/i.test(line));
        const questionLine = bodyLines[0]?.replace(/^question\s*[:\-]\s*/i, "");
        const optionLines = bodyLines
          .slice(1)
          .filter((line) => /^[A-Da-d][).:-]\s*/.test(line) || line.trim());

        if (!questionLine || optionLines.length < 4) return null;

        const parsedOptions = optionLines.slice(0, 4).map((option) => {
          const isMarkedCorrect =
            option.includes("(correct)") || option.includes("*");
          if (isMarkedCorrect && answerIndex === -1) {
            return normalizeOption(option.replace("(correct)", "").replace("*", ""));
          }
          return normalizeOption(option.replace("(correct)", "").replace("*", ""));
        });

        const markedIndex = optionLines
          .slice(0, 4)
          .findIndex((option) => option.includes("(correct)") || option.includes("*"));

        return {
          text: questionLine.trim(),
          options: parsedOptions,
          correctOption: answerIndex >= 0 ? answerIndex : Math.max(markedIndex, 0),
        };
      })
      .filter(Boolean) as DraftQuestion[];
  };

  const downloadTemplate = () => {
    const template = `Question: What is photosynthesis?
A) Plants taking in oxygen
B) Plants convert light energy into chemical energy
C) Animals eating plants
D) Water moving through soil
Answer: B

Question: Which gas do plants mostly absorb during photosynthesis?
A) Oxygen
B) Nitrogen
C) Carbon dioxide
D) Hydrogen
Answer: C
`;
    const blob = new Blob([template], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exam-question-template.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importStructuredFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsedQuestions = parseQuestions(text);
    if (!parsedQuestions.length) {
      setMessage("No valid questions found in the file.");
      return;
    }
    setDraftQuestions((current) => [...current, ...parsedQuestions]);
    setMessage(`${parsedQuestions.length} structured questions added locally.`);
    event.target.value = "";
  };

  const addManualDraftQuestion = () => {
    setMessage("");
    if (!questionText.trim()) {
      setMessage("Question text is required.");
      return;
    }
    if (options.some((option) => !option.trim())) {
      setMessage("All four options are required.");
      return;
    }
    setDraftQuestions((current) => [
      ...current,
      {
        text: questionText.trim(),
        options: options.map((option) => option.trim()),
        correctOption,
      },
    ]);
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectOption(0);
  };

  const updateDraftCorrectOption = (index: number, correct: number) => {
    setDraftQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, correctOption: correct } : question
      )
    );
  };

  const deleteDraftQuestion = (index: number) => {
    setDraftQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index)
    );
  };

  const addSelectedGeneratedToDraft = () => {
    const selected = selectedGenerated
      .map((index) => generatedQuestions[index])
      .filter(Boolean);
    if (!selected.length) {
      setMessage("Select at least one generated question.");
      return;
    }
    setDraftQuestions((current) => [...current, ...selected]);
    setGeneratedQuestions([]);
    setSelectedGenerated([]);
    setMessage(`${selected.length} generated questions added locally.`);
  };

  const uploadDraftQuestions = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (!draftQuestions.length) {
        throw new Error("Add at least one question before uploading.");
      }
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");
      const tx = await contract.addQuestionsBatch(
        exam.examId,
        draftQuestions.map((question) => question.text),
        draftQuestions.map((question) => question.options),
        draftQuestions.map((question) => question.correctOption)
      );
      await tx.wait();
      setDraftQuestions([]);
      toast.success("Questions uploaded on-chain successfully.");
      await fetchQuestions();
      window.location.reload();
    } catch (error: any) {
      setMessage(error.message || "Failed to upload questions.");
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question: DraftQuestion, index: number) => (
    <div
      key={`${question.text}-${index}`}
      className="rounded-lg border border-[#B49286]/20 bg-[#744253]/70 p-4 text-[#B49286]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">
          {index + 1}. {question.text}
        </p>
        <span className="rounded bg-[#B49286]/15 px-2 py-1 text-xs font-medium">
          {question.options.length} options
        </span>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        {question.options.map((option, optionIndex) => (
          <p
            key={optionIndex}
            className={
              optionIndex === question.correctOption ? "font-semibold" : "opacity-80"
            }
          >
            {optionLabels[optionIndex]}. {option}
            {optionIndex === question.correctOption ? " (Correct)" : ""}
          </p>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 pb-28 space-y-6">

      {/* Student Submissions */}
      <div>
        <h4 className="text-lg font-semibold text-[#B49286] mb-3">
          Student Submissions
          {submissions.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[#B49286]/70">
              ({submissions.length} submitted)
            </span>
          )}
        </h4>
        {submissions.length === 0 ? (
          <p className="text-sm text-[#B49286]/70">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {submissions.map((sub, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[#B49286]/20 px-4 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#B49286] truncate">
                    {sub.studentName || "Unknown"}
                  </p>
                  <a
                    href={`https://opencampus-codex.blockscout.com/address/${sub.studentAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-[#B49286]/60 hover:text-[#B49286]/80 truncate block"
                  >
                    {sub.studentAddress}
                  </a>
                </div>
                <span className="ml-4 shrink-0 font-semibold text-emerald-300/80">
                  {sub.score} / {questions.length || "—"}
                  {questions.length > 0 && (
                    <span className="ml-1 text-xs font-normal text-[#B49286]/70">
                      ({Math.round((sub.score / questions.length) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h4 className="text-lg font-semibold text-[#B49286]">
          Uploaded Questions
        </h4>
      </div>

      {questions.length ? (
        <div className="space-y-3">{questions.map(renderQuestion)}</div>
      ) : (
        <p className="text-[#B49286]/80">No questions uploaded yet.</p>
      )}

      {questions.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            ["manual", "Add Manually"],
            ["upload", "Upload Questions"],
            ["ai", "Add With AI"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              onClick={() =>
                setQuestionMode(mode as "manual" | "upload" | "ai")
              }
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                questionMode === mode
                  ? "bg-[#B49286] text-[#744253]"
                  : "bg-[#744253]/70 text-[#B49286] border border-[#B49286]/20 hover:bg-[#B49286]/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {questions.length === 0 && questionMode === "manual" && (
        <div className="rounded-lg border border-[#B49286]/20 bg-[#744253]/70 p-4">
        <h4 className="font-semibold text-[#B49286] mb-3">
          Add Question Manually
        </h4>
        <input
          value={questionText}
          onChange={(event) => setQuestionText(event.target.value)}
          placeholder="Question"
          className="w-full border border-[#B49286]/30 p-2 rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60"
        />
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#B49286]/75">
          Select the correct answer
        </p>
        <div className="mt-3 space-y-2">
          {options.map((option, index) => (
            <label
              key={index}
              className="flex items-center gap-2 rounded p-1 cursor-pointer"
            >
              <input
                type="radio"
                checked={correctOption === index}
                onChange={() => setCorrectOption(index)}
                className="accent-[#B49286]"
              />
              <span className="w-5 text-[#B49286]">{optionLabels[index]}.</span>
              <input
                value={option}
                onChange={(event) => {
                  const nextOptions = [...options];
                  nextOptions[index] = event.target.value;
                  setOptions(nextOptions);
                }}
                placeholder={`Option ${optionLabels[index]}`}
                className="flex-1 border border-[#B49286]/30 p-2 rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60"
              />
              {correctOption === index && (
                <span className="text-xs font-semibold text-[#B49286]">
                  Correct
                </span>
              )}
            </label>
          ))}
        </div>
        <button
          onClick={addManualDraftQuestion}
          disabled={!questionText || options.some((option) => !option)}
          className="mt-4 w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded-lg font-medium disabled:opacity-50"
        >
          Add Question
        </button>
      </div>
      )}

      {questions.length === 0 && questionMode === "upload" && (
        <div className="rounded-lg border border-[#B49286]/20 bg-[#744253]/70 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h4 className="font-semibold text-[#B49286]">
                Upload Structured Questions
              </h4>
              <p className="mt-1 text-sm text-[#B49286]/75">
                Upload a structured `.txt` file using the template format.
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="border border-[#B49286]/30 text-[#B49286] hover:bg-[#B49286]/10 px-4 py-2 rounded-lg text-sm font-medium"
            >
              Download Format
            </button>
          </div>
          <input
            type="file"
            accept=".txt,.md"
            onChange={importStructuredFile}
            className="w-full border border-[#B49286]/30 rounded-lg p-3 text-[#B49286]"
          />
        </div>
      )}

      {questions.length === 0 && questionMode === "ai" && (
        <div className="rounded-lg border border-[#B49286]/20 bg-[#744253]/70 p-4">
          <UploadForm
            onQuestionsGenerated={(result) => {
              const parsedQuestions = parseQuestions(result);
              setGeneratedQuestions(parsedQuestions);
              setSelectedGenerated(parsedQuestions.map((_, index) => index));
            }}
          />

          {generatedQuestions.length > 0 && (
            <div className="mt-4 space-y-3">
              {generatedQuestions.map((question, index) => (
                <div
                  key={`${question.text}-${index}`}
                  className="rounded border border-[#B49286]/20 p-3 text-[#B49286]"
                >
                  <label className="font-medium">
                    <input
                      type="checkbox"
                      checked={selectedGenerated.includes(index)}
                      onChange={() =>
                        setSelectedGenerated((current) =>
                          current.includes(index)
                            ? current.filter((item) => item !== index)
                            : [...current, index]
                        )
                      }
                      className="mr-2 accent-[#B49286]"
                    />
                    {question.text}
                  </label>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#B49286]/75">
                    Correct answer
                  </p>
                  <div className="mt-2 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className="text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          checked={question.correctOption === optionIndex}
                          onChange={() =>
                            setGeneratedQuestions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, correctOption: optionIndex }
                                  : item
                              )
                            )
                          }
                          className="mr-2 accent-[#B49286]"
                        />
                        {optionLabels[optionIndex]}. {option}
                        {question.correctOption === optionIndex && (
                          <span className="ml-2 text-xs font-semibold text-[#B49286]">
                            Correct
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={addSelectedGeneratedToDraft}
                disabled={selectedGenerated.length === 0}
                className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                Add Selected To Draft
              </button>
            </div>
          )}
        </div>
      )}

      {questions.length === 0 && draftQuestions.length > 0 && (
        <div className="space-y-3">
          {draftQuestions.map((question, index) => (
            <div
              key={`${question.text}-${index}`}
              className="rounded-lg border border-[#B49286]/20 bg-[#744253]/70 p-3 text-[#B49286]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  {index + 1}. {question.text}
                </p>
                <button
                  onClick={() => deleteDraftQuestion(index)}
                  className="rounded border border-red-300/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#B49286]/75">
                Correct answer
              </p>
              <div className="mt-2 grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="text-sm cursor-pointer"
                  >
                    <input
                      type="radio"
                      checked={question.correctOption === optionIndex}
                      onChange={() =>
                        updateDraftCorrectOption(index, optionIndex)
                      }
                      className="mr-2 accent-[#B49286]"
                    />
                    {optionLabels[optionIndex]}. {option}
                    {question.correctOption === optionIndex && (
                      <span className="ml-2 text-xs font-semibold text-[#B49286]">
                        Correct
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-sm text-[#B49286]">{message}</p>}

      {questions.length === 0 && (
        <div className="fixed bottom-0 right-0 z-[100] w-full max-w-4xl border-t border-[#B49286]/20 bg-[#744253] p-4 shadow-2xl">
          <button
            onClick={uploadDraftQuestions}
            disabled={loading || draftQuestions.length === 0}
            className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Uploading..."
              : `Upload ${draftQuestions.length} Question${
                  draftQuestions.length === 1 ? "" : "s"
                } On-Chain`}
          </button>
        </div>
      )}
    </div>
  );
}

export default AllExams;
