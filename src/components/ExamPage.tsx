import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { useWallet } from "../utils/useWallet";

type Question = {
  questionText: string;
  options: string[];
};

type CorrectionQuestion = Question & {
  correctOption: number;
};

type Correction = {
  questions: CorrectionQuestion[];
  submittedAnswers: number[];
  score: number;
  submissionTime: number;
};

type MessageType = {
  text: string;
  type: "success" | "error" | "info";
};

type ExamPageProps = {
  examIdOverride?: number;
  onSubmitted?: (examId: number) => void;
};

export default function ExamPage({ examIdOverride, onSubmitted }: ExamPageProps) {
  const { examId: routeExamId } = useParams();
  const examId = examIdOverride?.toString() ?? routeExamId;
  const { walletAddress } = useWallet();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [message, setMessage] = useState<MessageType | null>(null);
  const [maxPossibleScore, setMaxPossibleScore] = useState<number | null>(null);
  const [examEnded, setExamEnded] = useState(false);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [explainingIndex, setExplainingIndex] = useState<number | null>(null);

  const fetchCorrection = async () => {
    const contract = await getLMSContract();
    if (!contract || !examId) return;

    const [correctionQuestions, submittedAnswers, score, submissionTime] =
      await contract.getMyExamCorrection(Number(examId));
    const parsedQuestions = correctionQuestions.map((q: any) => ({
      questionText: q.questionText,
      options: Array.from(q.options ?? []),
      correctOption: Number(q.correctOption),
    }));

    setCorrection({
      questions: parsedQuestions,
      submittedAnswers: submittedAnswers.map((answer: bigint | number) =>
        Number(answer)
      ),
      score: Number(score),
      submissionTime: Number(submissionTime),
    });
    setMaxPossibleScore(parsedQuestions.length);
  };

  useEffect(() => {
    if (!examId || !walletAddress) return;

    const checkSubmissionAndFetch = async () => {
      setLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) {
          setMessage({ text: "Failed to connect to contract", type: "error" });
          return;
        }

        const submissions = await contract.getExamSubmissions(Number(examId));
        const existing = submissions.find(
          (sub: any) =>
            sub.studentAddress.toLowerCase() === walletAddress.toLowerCase()
        );

        if (existing) {
          setSubmittedScore(Number(existing.score)); // ✅ FIXED
          await fetchCorrection();
        }

        const [questionTexts, optionsList] =
          await contract.getExamQuestionsForStudent(Number(examId));
        const studentQuestions = questionTexts.map(
          (questionText: string, index: number) => ({
            questionText,
            options: Array.from(optionsList[index] ?? []),
          })
        );
        setQuestions(studentQuestions);
        setMaxPossibleScore(studentQuestions.length);
        setAnswers(new Array(studentQuestions.length).fill(-1));
      } catch (error: any) {
        console.error("Error loading exam data", error);
        setMessage({
          text: "Failed to load exam. Please try again later.",
          type: "error",
        });
      }
      setLoading(false);
    };

    checkSubmissionAndFetch();
  }, [examId, walletAddress]);

  const handleAnswer = (index: number, optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = optionIndex;
    setAnswers(newAnswers);
  };

  const submitAnswers = async () => {
    if (!walletAddress) {
      setMessage({
        text: "Please connect your wallet to submit answers",
        type: "error",
      });
      return;
    }

    if (answers.includes(-1)) {
      setMessage({
        text: "Please answer all questions before submitting",
        type: "error",
      });
      return;
    }

    if (examEnded) {
      setMessage({
        text: "This exam has ended and no longer accepts submissions",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Failed to connect to contract");

      const tx = await contract.submitAnswers(Number(examId), answers);
      await tx.wait();

      // Get updated score
      const submissions = await contract.getExamSubmissions(Number(examId));
      const studentSubmission = submissions.find(
        (sub: any) =>
          sub.studentAddress.toLowerCase() === walletAddress.toLowerCase()
      );

      if (studentSubmission) {
        setSubmittedScore(Number(studentSubmission.score));
        if (examId) onSubmitted?.(Number(examId));
      }

      await fetchCorrection();

      setMessage({
        text: "Answers submitted successfully!",
        type: "success",
      });
    } catch (error: any) {
      if (error.reason === "Already submitted") {
        try {
          const contract = await getLMSContract();
          if (contract) {
            const submissions = await contract.getExamSubmissions(
              Number(examId)
            );
            const existing = submissions.find(
              (sub: any) =>
                sub.studentAddress.toLowerCase() === walletAddress.toLowerCase()
            );
            if (existing) {
              setSubmittedScore(Number(existing.score));
              await fetchCorrection();
              setMessage({
                text: "You've already submitted this exam. Here's your score.",
                type: "info",
              });
            }
          }
        } catch (fetchError) {
          console.error("Error fetching score:", fetchError);
          setMessage({
            text: "Failed to fetch your score. Please try again later.",
            type: "error",
          });
        }
      } else if (error.reason === "Exam ended") {
        setExamEnded(true);
        setMessage({
          text: "This exam has ended and no longer accepts submissions",
          type: "error",
        });
      } else {
        setMessage({
          text:
            error.reason ||
            error.message ||
            "Submission failed. Please try again.",
          type: "error",
        });
      }
    }
    setLoading(false);
  };

  const explainAnswer = async (questionIndex: number) => {
    if (!correction) return;

    const question = correction.questions[questionIndex];
    const selectedAnswerIndex = correction.submittedAnswers[questionIndex];
    const selectedAnswer = question.options[selectedAnswerIndex] ?? "";
    const correctAnswer = question.options[question.correctOption] ?? "";

    setExplainingIndex(questionIndex);
    setMessage(null);

    try {
      const res = await fetch("https://eduhack-ozld.vercel.app/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.questionText,
          selectedAnswer,
          correctAnswer,
          context: `Exam #${examId}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to explain answer");
      }

      setExplanations((prev) => ({
        ...prev,
        [questionIndex]: data.explanation || data.result || data.message || "",
      }));
    } catch (error: any) {
      setMessage({
        text: error.message || "Failed to explain answer",
        type: "error",
      });
    } finally {
      setExplainingIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B49286]"></div>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-[#B49286]">
        Exam #{examId}
      </h1>

      {submittedScore !== null ? (
        <div className="mb-6 bg-green-100 border border-green-300 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            Exam Results
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700">Your Score:</p>
              <p className="text-2xl font-bold text-green-700">
                {submittedScore} {maxPossibleScore && `/ ${maxPossibleScore}`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Percentage:</p>
              <p className="text-2xl font-bold text-green-700">
                {maxPossibleScore
                  ? `${Math.round(
                      (Number(submittedScore) / Number(maxPossibleScore)) * 100
                    )}%`
                  : "N/A"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-700 break-all">
            Wallet: {walletAddress}
          </p>

          {correction && (
            <div className="mt-6 space-y-4">
              <h3 className="text-base font-semibold text-green-900">
                Answer Review
              </h3>

              {correction.questions.map((question, index) => {
                const selectedAnswerIndex = correction.submittedAnswers[index];
                const selectedAnswer =
                  question.options[selectedAnswerIndex] ?? "No answer";
                const correctAnswer =
                  question.options[question.correctOption] ?? "Unavailable";
                const isCorrect =
                  selectedAnswerIndex === question.correctOption;

                return (
                  <div
                    key={index}
                    className="rounded-lg border border-green-200 bg-white p-3"
                  >
                    <p className="font-medium text-gray-900">
                      {index + 1}. {question.questionText}
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                      Your answer:{" "}
                      <span
                        className={
                          isCorrect ? "font-medium text-green-700" : "font-medium text-red-700"
                        }
                      >
                        {selectedAnswer}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Correct answer:{" "}
                      <span className="font-medium text-green-700">
                        {correctAnswer}
                      </span>
                    </p>

                    <button
                      onClick={() => explainAnswer(index)}
                      disabled={explainingIndex === index}
                      className="mt-3 bg-[#744253] hover:bg-[#744253]/90 text-[#B49286] px-3 py-1.5 rounded text-sm disabled:opacity-50"
                    >
                      {explainingIndex === index
                        ? "Explaining..."
                        : "Explain Answer"}
                    </button>

                    {explanations[index] && (
                      <p className="mt-3 text-sm text-gray-800 bg-green-50 border border-green-100 rounded p-3">
                        {explanations[index]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : questions.length > 0 ? (
        <>
          {questions.map((q, i) => (
            <div
              key={i}
              className="mb-6 bg-[#744253]/70 p-4 rounded-lg shadow-sm"
            >
              <p className="font-medium text-[#B49286] mb-2">
                {i + 1}. {q.questionText}
              </p>
              <ul className="space-y-2">
                {q.options.map((opt, idx) => (
                  <li key={idx}>
                    <label className="inline-flex items-center cursor-pointer text-white">
                      <input
                        type="radio"
                        name={`question-${i}`}
                        checked={answers[i] === idx}
                        onChange={() => handleAnswer(i, idx)}
                        className="mr-2 accent-[#B49286]"
                        disabled={examEnded}
                      />
                      {opt}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button
            onClick={submitAnswers}
            disabled={loading || examEnded}
            className="bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-5 py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading
              ? "Submitting..."
              : examEnded
              ? "Exam Ended"
              : "Submit Answers"}
          </button>
        </>
      ) : (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
          <p className="text-blue-800">
            No questions found for this exam or you haven't been granted access.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`mt-4 p-3 rounded-md ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : message.type === "info"
              ? "bg-blue-100 text-blue-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          <p className="text-sm sm:text-base">{message.text}</p>
        </div>
      )}
    </main>
  );
}
