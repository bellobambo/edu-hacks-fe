import { useCourseContract } from "../utils/useCourseContract";
import { useAccount } from "wagmi";

function CourseList() {
  const { address } = useAccount();
  const contract = useCourseContract();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function loadCourses() {
      if (!contract) return;

      const count = await contract.courseCount();
      const courses = [];

      for (let i = 0; i < count; i++) {
        const course = await contract.courses(i);
        courses.push({
          id: i,
          lecturer: course.lecturer,
          title: course.title,
          description: course.description,
          // Add other fields as needed
        });
      }

      setCourses(courses);
    }

    loadCourses();
  }, [contract]);

  return (
    <div>
      {courses.map((course) => (
        <div key={course.id}>
          <h3>{course.title}</h3>
          <p>{course.description}</p>
        </div>
      ))}
    </div>
  );
}
