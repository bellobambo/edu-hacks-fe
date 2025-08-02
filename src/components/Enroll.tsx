import { useState } from "react";
import { getLMSContract } from "../utils/contracts";

type Course = {
  courseId: bigint;
  title: string;
  description: string;
  lecturer: string;
  lecturerName: string;
  creationDate: bigint;
};

type EnrollProps = {
  courses: Course[];
};

export default function Enroll({ courses }: EnrollProps) {
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [useManualInput, setUseManualInput] = useState(false);

  const enroll = async () => {
    if (!courseId) {
      setMessage({
        text: "Please select or enter a course ID",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");

      const tx = await contract.enrollInCourse(parseInt(courseId));
      await tx.wait();
      setMessage({
        text: "Enrolled successfully!",
        type: "success",
      });
      setCourseId("");
    } catch (error: any) {
      let errorMessage = "Enrollment failed";

      if (error.reason === "Already enrolled") {
        errorMessage = "You are already enrolled in this course";
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage({
        text: errorMessage,
        type: "error",
      });
    }
    setLoading(false);
  };

  return (
    <main className="w-full max-w-md mx-auto p-4 sm:p-6 bg-[#744253] rounded-lg shadow-md mb-6 border border-[#B49286]/20">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-[#B49286]">
        Enroll In Course
      </h1>

      <div className="mb-4">
        <div className="flex items-center mb-2">
          <label className="block text-sm sm:text-base text-[#B49286] mr-2">
            Select Course:
          </label>
          <button
            onClick={() => setUseManualInput(!useManualInput)}
            className="text-xs text-[#B49286] hover:underline"
          >
            {useManualInput ? "Choose from list" : "Enter ID manually"}
          </button>
        </div>

        {useManualInput ? (
          <input
            type="number"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="Enter course ID"
            className="border border-[#B49286]/30 p-2 sm:p-3 w-full rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
          />
        ) : (
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="border border-[#B49286]/30 p-2 sm:p-3 w-full rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
            disabled={courses.length === 0}
          >
            <option value="">-- Select a course --</option>
            {courses.length === 0 ? (
              <option disabled>Loading courses...</option>
            ) : (
              courses.map((course) => (
                <option
                  key={Number(course.courseId)}
                  value={Number(course.courseId)}
                >
                  {course.title} (ID: {Number(course.courseId)})
                </option>
              ))
            )}
          </select>
        )}
      </div>

      <button
        disabled={loading || !courseId}
        onClick={enroll}
        className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded disabled:opacity-50 transition-colors font-medium"
      >
        {loading ? "Enrolling..." : "Enroll"}
      </button>

      {message && (
        <div
          className={`mt-3 p-3 rounded-md ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          <p className="text-sm sm:text-base">{message.text}</p>
        </div>
      )}
    </main>
  );
}
