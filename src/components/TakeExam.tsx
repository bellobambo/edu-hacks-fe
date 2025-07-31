// components/TakeExam.tsx
import { useEffect, useState } from "react";
import { useExamContract } from "../hooks/useExamContract";

interface TakeExamProps {
  examAddress: string;
  studentAccount: string;
}

export default function TakeExam({
  examAddress,
  studentAccount,
}: TakeExamProps) {
  const { contract } = useExamContract(examAddress);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!contract) return;
      const fetched = await contract.getQuestions();
      const formatted = fetched.map((q: any) => ({
        questionText: q.questionText,
        options: q.options,
      }));
      setQuestions(formatted);
      setSelectedAnswers(new Array(formatted.length).fill(-1));
    };

    const checkTime = async () => {
      if (!contract) return;
      const startTime = await contract.startTime();
      const duration = await contract.duration();
      const endTime = Number(startTime) + Number(duration);
      const remaining = endTime - Math.floor(Date.now() / 1000);
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    fetchQuestions();
    checkTime();
  }, [contract]);

  const handleOptionSelect = (qIdx: number, optIdx: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[qIdx] = optIdx;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!contract || submitted) return;

    // Check if time has expired
    if (timeRemaining !== null && timeRemaining <= 0) {
      alert("Exam time has ended. Submissions are no longer accepted.");
      return;
    }

    const incomplete = selectedAnswers.some((a) => a === -1);
    if (incomplete) {
      alert("Please answer all questions before submitting.");
      return;
    }

    try {
      const tx = await contract.submitAnswers(selectedAnswers);
      const receipt = await tx.wait();
      const event = receipt.events?.find(
        (e: any) => e.event === "ExamSubmitted"
      );
      const studentScore = event?.args?.score.toNumber();
      setScore(studentScore);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission failed:", err);
      if (err.message.includes("Exam time has ended")) {
        alert("Exam time has ended. Submissions are no longer accepted.");
      } else {
        alert("Submission failed. Please try again.");
      }
    }
  };

  if (!contract) return <p>Loading exam...</p>;

  return (
    <div className="mt-8 space-y-6">
      <h2 className="text-xl font-bold">Take Exam</h2>

      {timeRemaining !== null && (
        <div className="bg-blue-100 p-3 rounded-lg">
          <p className="font-semibold">
            Time Remaining: {Math.floor(timeRemaining / 60)} minutes{" "}
            {timeRemaining % 60} seconds
          </p>
          {timeRemaining <= 0 && (
            <p className="text-red-600 font-bold mt-1">Exam time has ended!</p>
          )}
        </div>
      )}

      {questions.map((q, i) => (
        <div key={i} className="border p-4 rounded">
          <p className="font-medium mb-2">
            {i + 1}. {q.questionText}
          </p>
          <ul className="space-y-2">
            {q.options.map((opt: string, j: number) => (
              <li key={j}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`q-${i}`}
                    checked={selectedAnswers[i] === j}
                    onChange={() => handleOptionSelect(i, j)}
                    disabled={timeRemaining !== null && timeRemaining <= 0}
                  />
                  {opt}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
        disabled={submitted || (timeRemaining !== null && timeRemaining <= 0)}
      >
        {submitted
          ? "Submitted"
          : timeRemaining !== null && timeRemaining <= 0
          ? "Exam Time Expired"
          : "Submit Exam"}
      </button>

      {submitted && score !== null && (
        <p className="text-xl mt-4 text-blue-700 font-bold">
          ✅ Your Score: {score} / {questions.length}
        </p>
      )}
    </div>
  );
}
