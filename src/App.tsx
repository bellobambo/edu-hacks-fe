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
  const [balance, setBalance] = useState<string>("0");
  const [_, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      if (!window.ethereum) {
        setError("MetaMask not detected");
        return;
      }
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);
      const accounts = await newProvider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      await fetchBalance(newProvider, accounts[0]);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchBalance = async (
    provider: ethers.BrowserProvider,
    address: string
  ) => {
    const balance = await provider.getBalance(address);
    setBalance(ethers.formatEther(balance).substring(0, 6)); // Show first 6 decimals
  };

  const handleSignOut = () => {
    setAccount(null);
    setError(null);
    setBalance("0");
  };

  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);
        const accounts = await newProvider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          await fetchBalance(newProvider, accounts[0].address);
        }
      }
    };
    autoConnect();
  }, []);

  if (!account) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#B49286] p-6">
        <h1 className="text-3xl font-bold text-[#744253] mb-6">Proof</h1>
        <button
          onClick={connect}
          disabled={isConnecting}
          className={`bg-[#744253] hover:bg-[#744253]/90 text-white px-6 py-3 rounded-lg transition-colors shadow-md flex items-center justify-center ${
            isConnecting ? "opacity-75 cursor-not-allowed" : ""
          }`}
        >
          {isConnecting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Connecting...
            </>
          ) : (
            "Connect Wallet"
          )}
        </button>
        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#B49286] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 p-4 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
          <h1 className="text-2xl font-bold text-[#B49286]">Proof</h1>
          <div className="flex items-center space-x-4">
            <div
              className="flex items-center bg-[#B49286]/10 hover:bg-[#B49286]/20 rounded-full px-3 py-1 transition-colors group cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(account);
                alert("Address copied to clipboard!");
              }}
            >
              <span className="text-[#B49286] text-sm mr-1">Connected:</span>
              <span className="font-mono text-[#B49286] text-sm">
                {account.substring(0, 6)}...
                {account.substring(account.length - 4)}
              </span>
              <span className="ml-2 text-[#B49286] opacity-70 group-hover:opacity-100 transition-opacity">
                &#128220;
              </span>
            </div>

            <div className="bg-[#B49286]/10 px-3 py-1 rounded-full text-[#B49286] font-medium">
              {balance} ETH
            </div>

            <button
              onClick={handleSignOut}
              className="bg-[#071013] hover:bg-[#071013]/90 text-white px-4 py-2 rounded transition-colors shadow"
            >
              Disconnect
            </button>
          </div>
        </div>

        <nav className="flex space-x-4 mb-8 p-4 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
          <Link
            to="/profile"
            className="text-[#B49286] hover:text-[#B49286]/90 hover:bg-[#B49286]/20 px-4 py-2 rounded-full transition-colors font-medium flex items-center"
          >
            <span className="mr-2">👤</span> Profile
          </Link>
          <Link
            to="/course-list"
            className="text-[#B49286] hover:text-[#B49286]/90 hover:bg-[#B49286]/20 px-4 py-2 rounded-full transition-colors font-medium flex items-center"
          >
            <span className="mr-2">📚</span> Courses
          </Link>
          <Link
            to="/all-exams"
            className="text-[#B49286] hover:text-[#B49286]/90 hover:bg-[#B49286]/20 px-4 py-2 rounded-full transition-colors font-medium flex items-center"
          >
            <span className="mr-2">📝</span> All Exams
          </Link>
        </nav>

        <div className="bg-[#744253] rounded-lg shadow-lg p-6 border border-[#B49286]/10">
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
      </div>
    </div>
  );
}

function ExamListWrapper() {
  const { courseId } = useParams();
  return <ExamList courseId={Number(courseId)} />;
}

export default App;

// primary: '#744253',
//       secondary: '#B49286',
//       dark: '#071013',
