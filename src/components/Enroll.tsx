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
  const [message, setMessage] = useState("");

  const enroll = async () => {
    setLoading(true);
    setMessage("");
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");
      const tx = await contract.enrollInCourse(parseInt(courseId));
      await tx.wait();
      setMessage("Enrolled successfully!");
      setCourseId("");
    } catch (error: any) {
      setMessage(error.message || "Enrollment failed");
    }
    setLoading(false);
  };

  return (
    <main className="w-full max-w-md mx-auto p-4 sm:p-6 bg-[#744253] rounded-lg shadow-md mb-6 border border-[#B49286]/20">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-[#B49286]">
        Enroll In Course
      </h1>

      <div className="mb-4">
        <label
          htmlFor="course-select"
          className="block mb-2 text-sm sm:text-base text-[#B49286]"
        >
          Select Course:
        </label>
        <select
          id="course-select"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="border border-[#B49286]/30 p-2 sm:p-3 w-full rounded bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
        >
          <option value="">-- Select a course --</option>
          {courses.map((course) => (
            <option
              key={Number(course.courseId)}
              value={Number(course.courseId)}
            >
              {course.title} (ID: {Number(course.courseId)})
            </option>
          ))}
        </select>
      </div>

      <button
        disabled={loading || !courseId}
        onClick={enroll}
        className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded disabled:opacity-50 transition-colors font-medium"
      >
        {loading ? "Enrolling..." : "Enroll"}
      </button>

      {message && (
        <p className="mt-3 text-[#B49286] text-sm sm:text-base">{message}</p>
      )}
    </main>
  );
}
