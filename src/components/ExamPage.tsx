import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { useWallet } from "../utils/useWallet";

type Question = {
  questionText: string;
  options: string[];
  correctOption: number;
};

type MessageType = {
  text: string;
  type: "success" | "error" | "info";
};

export default function ExamPage() {
  const { examId } = useParams();
  const { walletAddress } = useWallet();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [message, setMessage] = useState<MessageType | null>(null);
  const [maxPossibleScore, setMaxPossibleScore] = useState<number | null>(null);
  const [examEnded, setExamEnded] = useState(false);

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
        }

        const q = await contract.getExamQuestions(Number(examId));
        setQuestions(q);
        setMaxPossibleScore(q.length);
        setAnswers(new Array(q.length).fill(-1));
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
        setSubmittedScore(studentSubmission.score);
      }

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
              setSubmittedScore(existing.score);
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
                <p className="text-2xl font-bold text-green-700">
                  {maxPossibleScore
                    ? `${Math.round(
                        (Number(submittedScore) / Number(maxPossibleScore)) *
                          100
                      )}%`
                    : "N/A"}
                </p>
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-700 break-all">
            Wallet: {walletAddress}
          </p>
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
