import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Routes, Route, Link, useParams } from "react-router-dom";
import ExamList from "./components/ExamList";
import ExamPage from "./components/ExamPage";
import Profile from "./components/Profile";
import CreateCourse from "./components/CreateCourse";
import CourseList from "./components/CourseList";
import CreateExamWithAI from "./components/CreateExam";
import AllExams from "./components/AllExams";

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask not detected");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    }
  };

  const handleSignOut = () => {
    setAccount(null);
    setError(null);
  };

  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
        }
      }
    };
    autoConnect();
  }, []);

  if (!account) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold">Course Contract UI</h1>
        <button
          onClick={connect}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Connect Wallet
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Course Contract UI</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Disconnect
        </button>
      </div>
      <p className="text-gray-700">Connected account: {account}</p>

      <nav className="space-x-4 mt-4">
        <Link to="/profile" className="text-blue-600 hover:underline">
          Profile
        </Link>
        <Link to="/course-list" className="text-blue-600 hover:underline">
          Courses
        </Link>
      </nav>

      <Routes>
        <Route path="/course/:courseId" element={<ExamListWrapper />} />
        <Route path="/all-exams" element={<AllExams />} />

        <Route path="/exams/:examId" element={<ExamPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/create-course" element={<CreateCourse />} />
        <Route path="/course-list" element={<CourseList />} />
        <Route path="/create-exam" element={<CreateExamWithAI />} />
      </Routes>
    </div>
  );
}

// Wrapper component to extract route params
function ExamListWrapper() {
  const { courseId } = useParams();
  return <ExamList courseId={Number(courseId)} />;
}

export default App;
