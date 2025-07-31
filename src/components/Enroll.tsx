import { useState } from "react";
import { getLMSContract } from "../utils/contracts";

export default function Enroll() {
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const enroll = async () => {
    setLoading(true);
    setMessage("");
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("Contract not found");
      const tx = await contract.enrollInCourse(parseInt(courseId));
      await tx.wait();
      setMessage("Enrolled successfully!");
      setCourseId("");
    } catch (error: any) {
      setMessage(error.message || "Enrollment failed");
    }
    setLoading(false);
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Enroll In Course</h1>
      <input
        type="number"
        placeholder="Course ID"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="border p-2 w-full mb-3 rounded"
      />
      <button
        disabled={loading || !courseId}
        onClick={enroll}
        className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Enrolling..." : "Enroll"}
      </button>
      {message && <p className="mt-3">{message}</p>}
    </main>
  );
}
