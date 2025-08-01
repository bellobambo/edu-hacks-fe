import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { useWallet } from "../utils/useWallet";

type Question = {
  questionText: string;
  options: string[];
  correctOption: number;
};

export default function ExamPage() {
  const { examId } = useParams();
  const { walletAddress } = useWallet();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!examId || !walletAddress) return;

    const checkSubmissionAndFetch = async () => {
      setLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) return;

        // Assuming your contract has getExamSubmissions function
        const submissions = await contract.getExamSubmissions(Number(examId));

        const existing = submissions.find(
          (sub: any) =>
            sub.studentAddress.toLowerCase() === walletAddress.toLowerCase()
        );

        if (existing) {
          setSubmittedScore(existing.score.toNumber());
          setMessage("You have already submitted this exam.");
          setLoading(false);
          return;
        }

        const q = await contract.getExamQuestions(Number(examId));
        setQuestions(q);
        setAnswers(new Array(q.length).fill(-1));
      } catch (error) {
        console.error("Error loading exam data", error);
        setMessage("Failed to load exam.");
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
      setMessage("Wallet not connected");
      return;
    }

    if (answers.includes(-1)) {
      setMessage("Please answer all questions.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");

      const tx = await contract.submitAnswers(Number(examId), answers);
      await tx.wait();

      // Get score with wallet address
      const score = await contract.getScore(Number(examId), walletAddress);
      setSubmittedScore(score.toNumber());
      setMessage("Answers submitted successfully!");
    } catch (error: any) {
      if (error.reason === "Already submitted") {
        try {
          const contract = await getLMSContract();
          if (contract) {
            const score = await contract.getScore(
              Number(examId),
              walletAddress
            );
            setSubmittedScore(score.toNumber());
            setMessage("You already submitted. Here's your score.");
          }
        } catch (fetchError) {
          console.error("Error fetching score:", fetchError);
          setMessage("Failed to fetch your score.");
        }
      } else {
        setMessage(error.message || "Submission failed");
      }
    }
    setLoading(false);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Exam #{examId}</h1>

      {submittedScore !== null ? (
        <div className="mb-4">
          <p className="font-semibold text-green-700">
            Your score: {submittedScore}
          </p>
          <p className="text-sm text-gray-600">Wallet: {walletAddress}</p>
        </div>
      ) : questions.length > 0 ? (
        <>
          {questions.map((q, i) => (
            <div key={i} className="mb-6">
              <p className="font-semibold">
                {i + 1}. {q.questionText}
              </p>
              <ul>
                {q.options.map((opt, idx) => (
                  <li key={idx}>
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${i}`}
                        checked={answers[i] === idx}
                        onChange={() => handleAnswer(i, idx)}
                        className="mr-2"
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
            disabled={loading}
            className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Submit Answers
          </button>
        </>
      ) : (
        <p>No questions found or exam already submitted.</p>
      )}

      {message && <p className="mt-3 text-red-600">{message}</p>}
    </main>
  );
}
