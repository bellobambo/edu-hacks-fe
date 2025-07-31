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

  const deleteUser = async () => {
    setLoading(true);
    setMessage("");
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");
      const tx = await contract.deleteUser();
      await tx.wait();
      setMessage("User deleted successfully!");
      setProfile(null); // Clear the profile from state
    } catch (error: any) {
      setMessage(error.message || "Deletion failed");
    }
    setLoading(false);
  };

  if (loading) return <p>Loading...</p>;

  if (profile && profile.name) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
        <p>
          <strong>Name:</strong> {profile.name}
        </p>
        <p>
          <strong>Matric Number:</strong> {profile.matricNumber}
        </p>
        <p>
          <strong>Lecturer:</strong> {profile.isLecturer ? "Yes" : "No"}
        </p>
        <p>
          <strong>Main Course:</strong> {profile.mainCourse}
        </p>

        <a href="/create-course">Create Course</a>
        {/* <button
          onClick={deleteUser}
          className="bg-red-600 text-white px-4 py-2 rounded mt-4"
        >
          Delete My Profile
        </button> */}
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Register User</h1>
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full mb-3 rounded"
        required
      />

      {/* Only show matric field if NOT a lecturer */}
      {!isLecturer && (
        <input
          type="text"
          placeholder="Matric Number"
          value={matric}
          onChange={(e) => setMatric(e.target.value)}
          className="border p-2 w-full mb-3 rounded"
          required={!isLecturer} // Only required for students
        />
      )}

      <label className="flex items-center mb-3">
        <input
          type="checkbox"
          checked={isLecturer}
          onChange={() => {
            setIsLecturer(!isLecturer);
            // Clear matric number when switching to lecturer
            if (!isLecturer) setMatric("");
          }}
          className="mr-2"
        />
        I am a lecturer
      </label>

      <input
        type="text"
        placeholder={isLecturer ? "Course You Teach" : "Main Course"}
        value={mainCourse}
        onChange={(e) => setMainCourse(e.target.value)}
        className="border p-2 w-full mb-3 rounded"
        required
      />

      <button
        onClick={registerUser}
        disabled={loading || !name || !mainCourse || (!isLecturer && !matric)}
        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Registering..." : "Register"}
      </button>
      {message && <p className="mt-3">{message}</p>}
    </main>
  );
}
