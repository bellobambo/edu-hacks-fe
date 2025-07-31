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

  if (loading) return <p>Loading exams...</p>;
  if (!exams.length) return <p>No exams found for this course.</p>;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-3">Course Exams</h3>
      <ul className="space-y-2">
        {exams.map((exam) => (
          <li key={exam.examId} className="border p-3 rounded hover:shadow-md">
            <a
              className="text-blue-600 hover:underline"
              href={`/exams/${exam.examId}`}
            >
              {exam.examTitle} ({exam.duration} mins)
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
