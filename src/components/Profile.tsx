import { useEffect, useState } from "react";
import { getLMSContract } from "../utils/contracts";
import { ethers } from "ethers";

type UserProfile = {
  walletAddress: string;
  name: string;
  matricNumber: string;
  isLecturer: boolean;
  mainCourse: string;
};

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Registration form state
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [isLecturer, setIsLecturer] = useState(false);
  const [mainCourse, setMainCourse] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const contract = await getLMSContract();
      if (!contract) return;

      // Use the same provider initialization as in getLMSContract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const user = await contract.getUserProfile(address);

      console.log("Raw user data:", user);

      setProfile({
        walletAddress: user[0],
        name: user[1],
        matricNumber: user[2],
        isLecturer: user[3],
        mainCourse: user[4],
      });

      console.log("logged in user", user);
    } catch (error) {
      console.error("Error fetching user profile", error);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchProfile();
  }, []);

  const registerUser = async () => {
    setLoading(true);
    setMessage("");
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");
      const tx = await contract.registerUser(
        name,
        matric,
        isLecturer,
        mainCourse
      );
      await tx.wait();
      setMessage("User registered successfully!");
      fetchProfile();
    } catch (error: any) {
      setMessage(error.message || "Registration failed");
    }
    setLoading(false);
  };

  // const deleteUser = async () => {
  //   setLoading(true);
  //   setMessage("");
  //   try {
  //     const contract = await getLMSContract();
  //     if (!contract) throw new Error("Contract not found");
  //     const tx = await contract.deleteUser();
  //     await tx.wait();
  //     setMessage("User deleted successfully!");
  //     setProfile(null); // Clear the profile from state
  //   } catch (error: any) {
  //     setMessage(error.message || "Deletion failed");
  //   }
  //   setLoading(false);
  // };

  if (loading) return <p>Loading...</p>;

  if (profile && profile.name) {
    return (
      <main className="w-[95%] sm:max-w-xl mx-auto p-4 sm:p-6 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 text-[#B49286]">
          Your Profile
        </h1>
        <div className="space-y-3 text-[#B49286] text-sm sm:text-base">
          <p>
            <strong className="font-medium">Name:</strong> {profile.name}
          </p>
          <p>
            <strong className="font-medium">Matric Number:</strong>{" "}
            {profile.matricNumber}
          </p>
          <p>
            <strong className="font-medium">Lecturer:</strong>{" "}
            {profile.isLecturer ? "Yes" : "No"}
          </p>
          <p>
            <strong className="font-medium">Main Course:</strong>{" "}
            {profile.mainCourse}
          </p>
        </div>

        {profile.isLecturer && (
          <a
            href="/create-course"
            className="inline-block mt-6 bg-[#744253] hover:bg-[#744253]/90 text-[#B49286] px-4 py-2 rounded transition-colors shadow border border-[#B49286]/20 text-sm sm:text-base"
          >
            Create Course
          </a>
        )}
      </main>
    );
  }

  return (
    <main className="w-[95%] sm:max-w-xl mx-auto p-4 sm:p-6 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-[#B49286]">
        Register User
      </h1>

      <div className="space-y-3 text-sm sm:text-base">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-[#B49286]/30 bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 p-2 w-full rounded focus:outline-none focus:ring-1 focus:ring-[#B49286]"
          required
        />

        <label className="flex items-center text-[#B49286]">
          <input
            type="checkbox"
            checked={isLecturer}
            onChange={() => {
              setIsLecturer(!isLecturer);
              if (!isLecturer) setMatric("");
            }}
            className="mr-2 border-[#B49286] text-[#744253] focus:ring-[#B49286]"
          />
          I am a lecturer
        </label>

        {!isLecturer && (
          <input
            type="text"
            placeholder="Matric Number"
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
            className="border border-[#B49286]/30 bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 p-2 w-full rounded focus:outline-none focus:ring-1 focus:ring-[#B49286]"
            required={!isLecturer}
          />
        )}

        <input
          type="text"
          placeholder={isLecturer ? "Course You Teach" : "Main Course"}
          value={mainCourse}
          onChange={(e) => setMainCourse(e.target.value)}
          className="border border-[#B49286]/30 bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 p-2 w-full rounded focus:outline-none focus:ring-1 focus:ring-[#B49286]"
          required
        />

        <button
          onClick={registerUser}
          disabled={loading || !name || !mainCourse || (!isLecturer && !matric)}
          className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-2 rounded transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </div>

      {message && <p className="mt-3 text-[#B49286]">{message}</p>}
    </main>
  );
}
