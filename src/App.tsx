import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import ExamList from "./components/ExamList";
import ExamPage from "./components/ExamPage";
import Profile from "./components/Profile";
import CreateCourse from "./components/CreateCourse";
import CourseList from "./components/CourseList";
import CreateExamWithAI from "./components/CreateExam";
import AllExams from "./components/AllExams";
import { getLMSContract } from "./utils/contracts";

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [__, setError] = useState<string | null>(null);
  const [_, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<{ name: string; isLecturer: boolean } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const EDUCHAIN_TESTNET_ID = 656476;

  const checkNetwork = async (provider: ethers.BrowserProvider) => {
    try {
      const network = await provider.getNetwork();
      setIsCorrectNetwork(network.chainId === BigInt(EDUCHAIN_TESTNET_ID));
      return network.chainId === BigInt(EDUCHAIN_TESTNET_ID);
    } catch (err) {
      console.error("Error checking network:", err);
      setIsCorrectNetwork(false);
      return false;
    }
  };

  const fetchUserProfile = async () => {
    try {
      const contract = await getLMSContract();
      if (!contract) return null;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const user = await contract.getUserProfile(address);
      if (user[1]) {
        const profile = { name: user[1], isLecturer: user[3] };
        setUserProfile(profile);
        return profile;
      }
      setUserProfile(null);
      return null;
    } catch {
      setUserProfile(null);
      return null;
    }
  };

  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      if (!window.ethereum) {
        setError("MetaMask not detected");
        toast.error("MetaMask not detected");
        return;
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);

      const accounts = await newProvider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      // Check network but don't force switch
      const isCorrect = await checkNetwork(newProvider);
      if (!isCorrect) {
        toast(
          <div className="flex items-center">
            <span>
              Switch to EduChain Testnet for proper on-chain recording
            </span>
            <button
              onClick={() => switchToEduChain()}
              className="ml-2 px-2 py-1 bg-[#744253] text-white rounded text-xs"
            >
              Switch
            </button>
          </div>,
          { duration: 10000 }
        );
      }

      setError(null);
      await fetchUserProfile();
      navigate("/profile");
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      toast.error(err.message || "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToEduChain = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${EDUCHAIN_TESTNET_ID.toString(16)}` }],
      });
      toast.success("Switched to EduChain Testnet");
      setIsCorrectNetwork(true);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${EDUCHAIN_TESTNET_ID.toString(16)}`,
                chainName: "EduChain Testnet",
                nativeCurrency: {
                  name: "EDU",
                  symbol: "EDU",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.open-campus-codex.gelato.digital"],
                blockExplorerUrls: [
                  "https://edu-chain-testnet.blockscout.com/",
                ],
              },
            ],
          });
          toast.success("EduChain Testnet added successfully");
          setIsCorrectNetwork(true);
        } catch (addError) {
          toast.error("Failed to add EduChain Testnet");
          console.error("Error adding EduChain:", addError);
        }
      } else {
        toast.error("Failed to switch to EduChain Testnet");
        console.error("Error switching network:", switchError);
      }
    }
  };

  const handleSignOut = () => {
    setAccount(null);
    setError(null);
    setIsCorrectNetwork(null);
    toast.success("Disconnected successfully");
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success("Address copied to clipboard!");
    }
  };

  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);

        const accounts = await newProvider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          await checkNetwork(newProvider);
          await fetchUserProfile();
        }
      }
    };
    autoConnect();
  }, []);

  useEffect(() => {
    if (account && location.pathname !== "/profile") {
      fetchUserProfile();
    }
  }, [location.pathname]);

  if (!account) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#B49286] p-4 sm:p-6">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#744253",
              color: "#B49286",
              border: "1px solid #B49286",
            },
          }}
        />
        <h1 className="text-2xl sm:text-3xl font-bold text-[#744253] mb-4 sm:mb-6">
          Proof
        </h1>
        <button
          onClick={connect}
          disabled={isConnecting}
          className={`w-full sm:w-auto bg-[#744253] hover:bg-[#744253]/90 text-white px-6 py-3 rounded-lg transition-colors shadow-md flex items-center justify-center ${
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#B49286]">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#744253",
            color: "#B49286",
            border: "1px solid #B49286",
          },
        }}
      />

      {/* Network Indicator Banner */}
      {isCorrectNetwork === false && (
        <div className="bg-yellow-500 text-white p-2 text-center text-sm">
          You're not on EduChain Testnet.
          <button
            onClick={switchToEduChain}
            className="ml-2 px-2 py-0.5 bg-[#744253] rounded text-xs"
          >
            Switch Network
          </button>
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#744253] border-b border-[#B49286]/20 shadow-md">
        <div className="w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Left: logo + user greeting */}
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="text-xl font-bold text-[#B49286] tracking-tight"
              >
                Proof
              </Link>

              {userProfile && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[#B49286] text-sm">
                    Hi, {userProfile.name}
                  </span>
                  <span className="bg-[#B49286] text-[#744253] text-xs font-semibold px-2 py-0.5 rounded-md">
                    {userProfile.isLecturer ? "Lecturer" : "Student"}
                  </span>
                </div>
              )}
            </div>

            {/* Right: register + wallet + disconnect */}
            <div className="flex items-center gap-2 sm:gap-3">
              {!userProfile && (
                <Link
                  to="/profile"
                  className="bg-[#B49286] text-[#744253] text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-[#B49286]/90 transition-colors"
                >
                  Register
                </Link>
              )}

              <button
                onClick={copyAddress}
                className="hidden sm:flex items-center gap-1.5 bg-[#B49286]/10 hover:bg-[#B49286]/20 rounded-lg px-3 py-1.5 transition-colors group"
              >
                <span className="font-mono text-[#B49286] text-xs">
                  {account.substring(0, 4)}…{account.substring(account.length - 4)}
                </span>
                <span className="text-[#B49286]/60 group-hover:text-[#B49286] text-xs">⎘</span>
              </button>

              <button
                onClick={handleSignOut}
                className="bg-[#071013] hover:bg-[#071013]/80 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors shadow"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-6">
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/profile" replace />}
          />
          <Route path="/course/:courseId" element={<ExamListWrapper />} />
          <Route path="/all-exams" element={<AllExams />} />
          <Route path="/exams/:examId" element={<ExamPage />} />
          <Route
            path="/profile"
            element={<MainPage showLearningSections={Boolean(userProfile)} />}
          />
          <Route path="/create-course" element={<CreateCourse />} />
          <Route path="/course-list" element={<CourseList />} />
          <Route path="/create-exam" element={<CreateExamWithAI />} />
        </Routes>
      </main>
    </div>
  );
}

function MainPage({
  showLearningSections,
}: {
  showLearningSections: boolean;
}) {
  return (
    <div className="space-y-8">
      <Profile />

      {showLearningSections && (
        <>
          <CourseList />
          <AllExams />
        </>
      )}
    </div>
  );
}

function ExamListWrapper() {
  const { courseId } = useParams();
  return <ExamList courseId={Number(courseId)} />;
}

export default App;
