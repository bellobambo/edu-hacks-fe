import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";

import { Link } from "react-router-dom";

type Exam = {
  examId: number;
  examTitle: string;
  courseId: number;
  lecturer: string;
  lecturerName: string;
  questionCount: number;
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
          const exam = await contract.getExamInfo(id);
          examArray.push({
            examId: Number(exam[0]),
            examTitle: exam[1],
            courseId: Number(exam[2]),
            lecturer: exam[3],
            lecturerName: exam[4],
            questionCount: Number(exam[5]),
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
    return (
      <div className="p-6">
        <div className="flex items-center justify-center space-x-2 text-[#744253]">
          <svg
            className="animate-spin h-5 w-5 text-[#744253]"
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
          {exams.map((exam) => (
            <div
              key={exam.examId}
              className="border border-[#B49286]/20 p-4 rounded-lg shadow hover:shadow-md transition-shadow bg-[#744253]/90"
            >
              <h3 className="font-semibold text-lg sm:text-xl mb-2 text-[#B49286]">
                {exam.examTitle}
              </h3>
              <div className="space-y-1 text-[#B49286]/90 text-sm sm:text-base">
                <p>Course ID: {exam.courseId}</p>
                <p>Lecturer: {exam.lecturerName}</p>
                <p>Questions: {exam.questionCount}</p>
              </div>
              <Link
                to={`/exams/${exam.examId}`}
                className="mt-3 inline-block bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded transition-colors shadow text-sm sm:text-base"
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
