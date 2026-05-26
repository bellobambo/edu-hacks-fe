import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

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

type CourseListProps = {
  refreshKey?: number;
};

export default function CourseList({ refreshKey = 0 }: CourseListProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(
    null
  );
  const [enrollMessage, setEnrollMessage] = useState<{
    courseId: number;
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(
    new Set()
  );
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

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

        const courseIds = await contract.getAllCourseIds();
        const courseArray: Course[] = [];
        const enrolledIds = new Set<number>();

        for (const id of courseIds) {
          const course = await contract.getCourseInfo(id);
          const numericCourseId = Number(course[0]);
          courseArray.push({
            courseId: course[0],
            title: course[1],
            description: course[2],
            lecturer: course[3],
            lecturerName: course[4],
            creationDate: course[5],
          });

          if (!user[3]) {
            const enrolled = await contract.isStudentEnrolled(
              address,
              numericCourseId
            );
            if (enrolled) {
              enrolledIds.add(numericCourseId);
            }
          }
        }

        setCourses(courseArray);
        setEnrolledCourseIds(enrolledIds);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchCoursesAndProfile();
  }, [refreshKey, internalRefreshKey]);

  const enrollInCourse = async (courseId: number) => {
    setEnrollingCourseId(courseId);
    setEnrollMessage(null);

    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");

      const tx = await contract.enrollInCourse(courseId);
      await tx.wait();

      toast.success("Enrolled successfully!");
      setEnrolledCourseIds((current) => new Set(current).add(courseId));
      setInternalRefreshKey((k) => k + 1);
      window.location.reload();
    } catch (error: any) {
      setEnrollMessage({
        courseId,
        text: error.reason || error.message || "Enrollment failed",
        type: "error",
      });
    } finally {
      setEnrollingCourseId(null);
    }
  };

  if (loading) return <p className="text-[#744253]">Loading courses...</p>;

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-[#744253]">
        Available Courses
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {courses.length > 0 ? (
          courses.map((course) => {
            const courseId = Number(course.courseId);
            const isCreator =
              profile?.walletAddress?.toLowerCase() ===
              course.lecturer.toLowerCase();
            const isEnrolled = enrolledCourseIds.has(courseId);

            return (
              <div
                key={courseId}
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

                {!profile?.isLecturer && (
                  <div className="mt-4 space-y-2">
                    {isEnrolled ? (
                      <>
                        <span className="block w-full text-center bg-[#B49286]/20 text-[#B49286] px-4 py-2 rounded text-sm font-medium border border-[#B49286]/30">
                          ✓ Enrolled
                        </span>
                      </>
                    ) : (
                      <button
                        onClick={() => enrollInCourse(courseId)}
                        disabled={enrollingCourseId === courseId}
                        className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                      >
                        {enrollingCourseId === courseId ? "Enrolling..." : "Enroll"}
                      </button>
                    )}

                    {enrollMessage?.courseId === courseId && (
                      <p className="text-sm text-red-200">{enrollMessage.text}</p>
                    )}
                  </div>
                )}

                {profile?.isLecturer && (
                  <div className="mt-4">
                    {isCreator ? (
                      <Link
                        to={`/create-exam?courseId=${courseId}`}
                        className="block w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded transition-colors shadow font-medium text-sm sm:text-base text-center"
                      >
                        Create Exam
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-[#B49286]/50 text-[#744253]/70 px-4 py-2 rounded shadow font-medium text-sm sm:text-base cursor-not-allowed"
                      >
                        Create Exam
                      </button>
                    )}

                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm sm:text-base text-[#744253]/80">
            No courses available.
          </p>
        )}
      </div>
    </div>
  );
}
