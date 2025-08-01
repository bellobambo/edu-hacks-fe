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

        // Check if exam is still active
        const isActive = await contract.isExamActive(Number(examId));
        if (!isActive) {
          setMessage("This exam has ended. You can no longer submit answers.");
        }

        const q = await contract.getExamQuestions(Number(examId));
        setQuestions(q);
        setAnswers(new Array(q.length).fill(-1));
      } catch (error) {
        console.error("Error fetching questions", error);
        setMessage("Exam Ended");
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
      const score = await contract.getScore(Number(examId));
      setSubmittedScore(score.toNumber());
      setMessage("Answers submitted successfully!");
    } catch (error: any) {
      let errorMessage = "Submission failed";

      if (error?.reason) {
        errorMessage = error.reason;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;

        if (errorMessage.includes("Exam ended")) {
          errorMessage =
            "This exam has already ended. You can no longer submit answers.";
        } else if (errorMessage.includes("Not enrolled")) {
          errorMessage = "You are not enrolled in this exam.";
        } else if (errorMessage.includes("Already submitted")) {
          errorMessage = "You have already submitted answers for this exam.";
        }
      }

      setMessage(errorMessage);
    }
    setLoading(false);
  };
  if (loading) return <p>Loading...</p>;
  // if (!questions.length) return <p>No questions found for this exam.</p>;

  return (
    <main className="max-w-3xl mx-auto p-6 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
      <h1 className="text-2xl font-bold mb-6 text-[#B49286]">Exam #{examId}</h1>

      <div className="space-y-6 mb-8">
        {questions.map((q, i) => (
          <div
            key={i}
            className="p-4 bg-[#744253]/90 rounded-lg border border-[#B49286]/20"
          >
            <p className="font-semibold text-[#B49286] mb-3">
              {i + 1}. {q.questionText}
            </p>
            <ul className="space-y-2">
              {q.options.map((opt, idx) => (
                <li key={idx}>
                  <label className="flex items-center cursor-pointer text-[#B49286]/90 hover:text-[#B49286] transition-colors">
                    <input
                      type="radio"
                      name={`question-${i}`}
                      checked={answers[i] === idx}
                      onChange={() => handleAnswer(i, idx)}
                      className="mr-3 h-4 w-4 accent-[#B49286]"
                    />
                    {opt}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={submitAnswers}
          disabled={loading}
          className="w-full max-w-xs bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-6 py-3 rounded-lg transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "Submitting..." : "Submit Answers"}
        </button>

        {submittedScore !== null && (
          <div className="p-4 bg-[#B49286]/10 border border-[#B49286]/20 rounded-lg text-center">
            <p className="font-semibold text-[#B49286]">
              Your score: {submittedScore}
            </p>
          </div>
        )}

        {message && (
          <div
            className={`p-3 rounded text-center ${
              message.includes("success")
                ? "bg-green-900/20 border-green-500 text-green-300"
                : "bg-red-900/20 border-red-500 text-red-300"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
