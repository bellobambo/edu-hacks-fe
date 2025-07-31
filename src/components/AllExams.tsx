import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";

import { Link } from "react-router-dom";

type Exam = {
  examId: number;
  examTitle: string;
  duration: number;
  courseId: number;
  lecturer: string;
  lecturerName: string;
};

const AllExams = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAllExams = async () => {
      setLoading(true);
      setError("");
      try {
        const contract = await getLMSContract();
        if (!contract) {
          throw new Error("Contract not connected");
        }

        // Get all exam IDs
        const examIds = await contract.getAllExamIds();
        const examArray: Exam[] = [];

        // Fetch details for each exam
        for (const id of examIds) {
          const exam = await contract.exams(id);
          examArray.push({
            examId: Number(id),
            examTitle: exam.examTitle,
            duration: Number(exam.duration),
            courseId: Number(exam.courseId),
            lecturer: exam.lecturer,
            lecturerName: exam.lecturerName,
          });
        }

        setExams(examArray);
      } catch (err: any) {
        setError(err.message || "Failed to fetch exams");
        console.error("Error fetching exams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllExams();
  }, []);

  if (loading) {
    return <div className="p-4">Loading exams...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">All Exams</h2>

      {exams.length === 0 ? (
        <p>No exams found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <div
              key={exam.examId}
              className="border p-4 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h3 className="font-bold text-lg mb-2">{exam.examTitle}</h3>
              <p className="text-gray-600">Duration: {exam.duration} seconds</p>
              <p className="text-gray-600">Course ID: {exam.courseId}</p>
              <p className="text-gray-600">Lecturer: {exam.lecturerName}</p>
              <Link
                to={`/exams/${exam.examId}`}
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                View Exam
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllExams;
