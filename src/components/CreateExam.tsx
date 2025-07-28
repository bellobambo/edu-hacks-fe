import { useEffect, useState } from "react";
import { useCourseContract } from "../hooks/useCourseContract";

export default function CreateExam() {
  const { contract, account } = useCourseContract();

  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [isLecturer, setIsLecturer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // 🔍 Check if current user is a lecturer
  const fetchUserRole = async () => {
    if (!contract || !account) return;
    try {
      const profile = await contract.getUserProfile(account);
      setIsLecturer(profile.isLecturer);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // 🎓 Fetch only the courses created by the current lecturer
  const fetchMyCourses = async () => {
    if (!contract || !account) return;

    setLoading(true);
    try {
      const total = await contract.courseCount();
      const coursePromises = [];

      for (let i = 0; i < total; i++) {
        coursePromises.push(contract.courses(i));
      }

      const results = await Promise.all(coursePromises);

      const owned = results
        .map((course: any, i: number) => ({
          courseId: i,
          title: course.title,
          lecturer: course.lecturer,
        }))
        .filter(
          (course) => course.lecturer.toLowerCase() === account.toLowerCase()
        );

      setMyCourses(owned);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    } finally {
      setLoading(false);
    }
  };

  // 🛠 Create exam
  const handleCreateExam = async () => {
    if (!contract || selectedCourseId === null || !examTitle || !duration)
      return;

    try {
      setCreating(true);
      const tx = await contract.createExam(
        selectedCourseId,
        examTitle,
        duration
      );
      await tx.wait();
      alert("✅ Exam created successfully!");

      // Reset form
      setSelectedCourseId(null);
      setExamTitle("");
      setDuration(60);
    } catch (err) {
      console.error("Exam creation failed:", err);
      alert("❌ Failed to create exam.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, [contract, account]);

  useEffect(() => {
    if (isLecturer) {
      fetchMyCourses();
    }
  }, [isLecturer, contract, account]);

  // 🚫 Restrict access to lecturers only
  if (isLecturer === false) {
    return (
      <div className="text-center text-red-500 mt-6">
        🚫 Only lecturers can create exams.
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4 text-purple-700">
        📝 Create New Exam
      </h2>

      {loading ? (
        <p className="text-gray-500">Loading your courses...</p>
      ) : myCourses.length === 0 ? (
        <p className="text-gray-500">You haven't created any courses yet.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateExam();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block font-medium mb-1">Select Course</label>
            <select
              value={selectedCourseId ?? ""}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            >
              <option value="">-- Choose a course --</option>
              {myCourses.map((course) => (
                <option key={course.courseId} value={course.courseId}>
                  {course.title} (ID: {course.courseId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1">Exam Title</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="e.g. Midterm Exam"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Duration (in minutes)
            </label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition disabled:opacity-50"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Exam"}
          </button>
        </form>
      )}
    </div>
  );
}
