import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import WalletInfo from "./WalletInfo";

type Course = {
  courseId: bigint; // Changed to bigint
  title: string;
  description: string;
  lecturer: string;
  lecturerName: string;
  creationDate: bigint; // Changed to bigint
};

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) return;

        const count = await contract.courseCount();
        const courseArray = [];

        for (let i = 0; i < Number(count); i++) {
          // Convert BigInt to Number for loop
          const course = await contract.courses(i);
          courseArray.push({
            courseId: course.courseId,
            title: course.title,
            description: course.description,
            lecturer: course.lecturer,
            lecturerName: course.lecturerName,
            creationDate: course.creationDate,
          });
        }
        setCourses(courseArray);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  if (loading) return <p>Loading courses...</p>;
  if (!courses.length) return <p>No courses available.</p>;

  return (
    <div className="container mx-auto p-4">
      <WalletInfo />
      <h2 className="text-2xl font-bold mb-6">Available Courses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <div
            key={Number(course.courseId)} // Convert BigInt to Number for key
            className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-bold text-lg mb-2">{course.title}</h3>
            <p className="text-gray-600 mb-3">{course.description}</p>
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Lecturer:</span>{" "}
                {course.lecturerName}
              </p>
              <p className="text-gray-500 truncate">{course.lecturer}</p>
              <p className="text-gray-400">
                Created:{" "}
                {new Date(
                  Number(course.creationDate) * 1000
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <a href="/create-exam">Create Exam</a>
    </div>
  );
}
