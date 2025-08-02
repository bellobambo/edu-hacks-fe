import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import Enroll from "./Enroll";
import { ethers } from "ethers";

type Course = {
  courseId: bigint;
  title: string;
  description: string;
  lecturer: string;
  lecturerName: string;
  creationDate: bigint;
};

type UserProfile = {
  walletAddress: string;
  name: string;
  matricNumber: string;
  isLecturer: boolean;
  mainCourse: string;
};

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchCoursesAndProfile = async () => {
      setLoading(true);
      try {
        const contract = await getLMSContract();
        if (!contract) return;

        // Fetch user profile
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const user = await contract.getUserProfile(address);

        setProfile({
          walletAddress: user[0],
          name: user[1],
          matricNumber: user[2],
          isLecturer: user[3],
          mainCourse: user[4],
        });

        // Fetch courses
        const count = await contract.courseCount();
        const courseArray: Course[] = [];

        for (let i = 0; i < Number(count); i++) {
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
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchCoursesAndProfile();
  }, []);

  if (loading) return <p>Loading courses...</p>;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-[#B49286]">
        Available Courses
      </h2>

      <Enroll courses={courses} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div
              key={Number(course.courseId)}
              className="border border-[#B49286]/20 rounded-lg p-4 hover:shadow-lg transition-shadow bg-[#744253] text-[#B49286]"
            >
              <h3 className="font-bold text-lg sm:text-xl mb-2">
                {course.title}
              </h3>
              <p className="mb-3 opacity-90 text-sm sm:text-base">
                {course.description}
              </p>
              <div className="text-xs sm:text-sm space-y-1">
                <p>
                  <span className="font-medium">Lecturer:</span>{" "}
                  {course.lecturerName}
                </p>
                <p className="opacity-80 truncate">{course.lecturer}</p>
                <p className="opacity-70">
                  Created:{" "}
                  {new Date(
                    Number(course.creationDate) * 1000
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm sm:text-base text-[#B49286]/80">
            No courses available.
          </p>
        )}
      </div>

      {profile?.isLecturer && (
        <a
          href="/create-exam"
          className="inline-block mt-6 bg-[#744253] hover:bg-[#744253]/90 text-[#B49286] px-4 py-2 rounded transition-colors shadow border border-[#B49286]/20 text-sm sm:text-base"
        >
          Create Exam
        </a>
      )}
    </div>
  );
}
