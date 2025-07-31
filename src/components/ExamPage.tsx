import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";

type Question = {
  questionText: string;
  options: string[];
  correctOption: number;
};

export default function ExamPage() {
  const { examId } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!examId) return;

    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) return;
        const q = await contract.getExamQuestions(Number(examId));
        setQuestions(q);
        setAnswers(new Array(q.length).fill(-1));
      } catch (error) {
        console.error("Error fetching questions", error);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, [examId]);

  const handleAnswer = (index: number, optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = optionIndex;
    setAnswers(newAnswers);
  };

  const submitAnswers = async () => {
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
      const receipt = await tx.wait();
      const score = await contract.getScore(Number(examId)); // Adjust if you store score this way
      setSubmittedScore(score.toNumber());
      setMessage("Answers submitted successfully!");
    } catch (error: any) {
      setMessage(error.message || "Submission failed");
    }
    setLoading(false);
  };

  if (loading) return <p>Loading...</p>;
  if (!questions.length) return <p>No questions found for this exam.</p>;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Exam #{examId}</h1>
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
      {submittedScore !== null && (
        <p className="mt-4 font-semibold">Your score: {submittedScore}</p>
      )}
      {message && <p className="mt-3 text-red-600">{message}</p>}
    </main>
  );
}
