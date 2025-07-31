import { useEffect, useState } from "react";
import { useCourseContract } from "../hooks/useCourseContract";
import { ethers } from "ethers";
import CreateExam from "./CreateExam";
import ExamList from "./ExamList";

export default function CourseList() {
  const { contract, account } = useCourseContract();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLecturer, setIsLecturer] = useState<boolean | null>(null);
  const [enrolledStatus, setEnrolledStatus] = useState<{
    [key: number]: boolean;
  }>({});
  const [loadingEnrollId, setLoadingEnrollId] = useState<number | null>(null);

  // Updated fetchCourses function in CourseList.tsx
  const fetchCourses = async () => {
    if (!contract) return;

    setLoading(true);
    try {
      const totalCourses = await contract.courseCount();
      const coursePromises = [];

      for (let i = 0; i < totalCourses; i++) {
        coursePromises.push(contract.courses(i));
      }

      const results = await Promise.all(coursePromises);
      console.log("Raw course data:", results);

      const formatted = results
        .map((course: any, index: number) => ({
          courseId: index,
          lecturer: course.lecturer,
          lecturerName: course.lecturerName,
          title: course.title,
          description: course.description,
          creationDate: new Date(
            Number(course.creationDate) * 1000
          ).toLocaleDateString(),
          examCount: Number(course.examCount),
        }))
        // Only filter out courses with empty title or description if needed
        .filter((course) => course.title && course.description);

      console.log("Formatted courses:", formatted);
      setCourses(formatted);

      // Fetch enrollment status for each course for current user
      if (account) {
        const statuses: { [key: number]: boolean } = {};
        for (const course of formatted) {
          try {
            const enrolled = await contract.isStudentEnrolled(
              account,
              course.courseId
            );
            statuses[course.courseId] = enrolled;
          } catch (err) {
            console.error(
              `Failed to fetch enrollment status for course ${course.courseId}`,
              err
            );
            statuses[course.courseId] = false;
          }
        }
        setEnrolledStatus(statuses);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    if (!contract || !account) return;
    try {
      const profile = await contract.getUserProfile(account);
      setIsLecturer(profile.isLecturer);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const handleEnroll = async (courseId: number) => {
    if (!contract || !account) return;
    try {
      setLoadingEnrollId(courseId);
      const tx = await contract.enrollInCourse(courseId);
      await tx.wait();
      alert("✅ Successfully enrolled in course!");

      // Update enrollment status immediately after enrolling
      setEnrolledStatus((prev) => ({
        ...prev,
        [courseId]: true,
      }));
    } catch (err) {
      console.error("Enrollment failed:", err);
      alert("❌ Failed to enroll in course.");
    } finally {
      setLoadingEnrollId(null);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchUserRole();
  }, [contract, account]);

  return (
    <div className="p-6 bg-gray-50 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-700">
        📚 Available Courses
      </h2>

      {loading ? (
        <p className="text-gray-600">Loading courses...</p>
      ) : courses.length === 0 ? (
        <p className="text-gray-500">No courses available at the moment.</p>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <li
              key={course.courseId}
              className="bg-white border border-gray-200 p-4 rounded-lg shadow hover:shadow-md transition"
            >
              <h3 className="text-xl font-semibold text-purple-800 mb-1">
                {course.title || "Untitled Course"}
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                {course.description || "No description provided."}
              </p>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Lecturer:</span>{" "}
                  {course.lecturerName || "Unknown"}
                </p>
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {course.creationDate}
                </p>
                <p>
                  <span className="font-medium">Exams:</span> {course.examCount}
                </p>
              </div>

              {/* Only show the enroll button if user is NOT a lecturer */}
              {isLecturer === false && (
                <>
                  {courses.filter((course) => !enrolledStatus[course.courseId])
                    .length === 0 ? (
                    <p className="text-gray-600">
                      You are enrolled in all available courses.
                    </p>
                  ) : (
                    <ul className="grid md:grid-cols-2 gap-4">
                      {courses
                        .filter((course) => !enrolledStatus[course.courseId])
                        .map((course) => (
                          <li key={course.courseId} className="...">
                            {/* Course details */}
                            <button
                              onClick={() => handleEnroll(course.courseId)}
                              className="..."
                              disabled={loadingEnrollId === course.courseId}
                            >
                              {loadingEnrollId === course.courseId
                                ? "Enrolling..."
                                : "Enroll in this Course"}
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {isLecturer && <CreateExam />}
      <ExamList />
    </div>
  );
}
