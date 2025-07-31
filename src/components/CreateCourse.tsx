import { useState } from "react";
import { getLMSContract } from "../utils/contracts";
import WalletInfo from "./WalletInfo";

export default function CreateCourse() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const createCourse = async () => {
    setLoading(true);
    setMessage("");
    try {
      const contract = await getLMSContract();
      if (!contract) throw new Error("No contract found");
      const tx = await contract.createCourse(title, description);
      await tx.wait();
      setMessage("Course created successfully!");
      setTitle("");
      setDescription("");
    } catch (error: any) {
      setMessage(error.message || "Failed to create course");
    }
    setLoading(false);
  };

  return (
    <main className="max-w-xl mx-auto p-6">
      <>
        <WalletInfo />
      </>
      <h1 className="text-2xl font-bold mb-4">Create Course</h1>
      <input
        type="text"
        placeholder="Course Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 w-full mb-3 rounded"
      />
      <textarea
        placeholder="Course Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 w-full mb-3 rounded"
      />
      <button
        disabled={loading || !title || !description}
        onClick={createCourse}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Course"}
      </button>
      {message && <p className="mt-3">{message}</p>}

      <>
        <a href="/course-list">View Courses</a>
      </>
    </main>
  );
}
