// ExamList.tsx
import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";

type Exam = {
  examId: number;
  examTitle: string;
  duration: number;
  courseId: number;
};

interface ExamListProps {
  courseId: number;
}

export default function ExamList({ courseId }: ExamListProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) return;

        const examIds = await contract.getCourseExamIds(courseId);
        const examArray = [];

        for (const id of examIds) {
          const exam = await contract.exams(id);
          examArray.push({
            examId: Number(exam.examId),
            examTitle: exam.examTitle,
            duration: Number(exam.duration),
            courseId: Number(exam.courseId),
          });
        }

        setExams(examArray);
      } catch (error) {
        console.error("Error fetching exams:", error);
      }
      setLoading(false);
    };

    fetchExams();
  }, [courseId]);

  if (loading) {
    return (
      <div className="p-6 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
        <div className="flex items-center justify-center space-x-2 text-[#B49286]">
          <svg
            className="animate-spin h-5 w-5 text-[#B49286]"
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
          <span>Loading exams...</span>
        </div>
      </div>
    );
  }
  if (!exams.length) return <p>No exams found for this course.</p>;

  return (
    <div className="mt-8 px-4 sm:px-0">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-[#B49286]">
        Course Exams
      </h3>
      <ul className="space-y-3">
        {exams.map((exam) => (
          <li
            key={exam.examId}
            className="border border-[#B49286]/20 bg-[#744253]/80 p-4 rounded-lg hover:shadow-lg transition-shadow"
          >
            <a
              href={`/exams/${exam.examId}`}
              className="block text-[#B49286] hover:underline text-sm sm:text-base"
            >
              {exam.examTitle}{" "}
              <span className="text-[#B49286]/70">({exam.duration} mins)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
