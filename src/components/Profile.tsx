import { useState } from "react";
import { getLMSContract } from "../utils/contracts";
import toast from "react-hot-toast";

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Registration form state
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [isLecturer, setIsLecturer] = useState(false);
  const [mainCourse, setMainCourse] = useState("");

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
      toast.success("Registered successfully!");
      window.location.reload();
    } catch (error: any) {
      setMessage(error.message || "Registration failed");
    }
    setLoading(false);
  };

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

        <select
          value={isLecturer ? "lecturer" : "student"}
          onChange={(e) => {
            const lecturer = e.target.value === "lecturer";
            setIsLecturer(lecturer);
            if (lecturer) setMatric("");
          }}
          className="border border-[#B49286]/30 bg-[#744253]/90 text-[#B49286] p-2 w-full rounded focus:outline-none focus:ring-1 focus:ring-[#B49286]"
        >
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
        </select>

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
