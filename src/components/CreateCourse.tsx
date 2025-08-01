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
    <main className="max-w-xl mx-auto p-6 bg-[#744253] rounded-lg shadow-md border border-[#B49286]/20">
      <h1 className="text-2xl font-bold mb-4 text-[#B49286]">Create Course</h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Course Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded border border-[#B49286]/30 bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286]"
        />

        <textarea
          placeholder="Course Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded border border-[#B49286]/30 bg-[#744253]/90 text-[#B49286] placeholder-[#B49286]/60 focus:outline-none focus:ring-1 focus:ring-[#B49286] min-h-[120px]"
        />

        <button
          disabled={loading || !title || !description}
          onClick={createCourse}
          className="w-full bg-[#B49286] hover:bg-[#B49286]/90 text-[#744253] px-4 py-3 rounded-lg transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? "Creating..." : "Create Course"}
        </button>

        {message && <p className="mt-3 text-[#B49286]">{message}</p>}

        <div className="pt-4 border-t border-[#B49286]/20">
          <a
            href="/course-list"
            className="inline-block text-[#B49286] hover:text-[#B49286]/90 hover:underline transition-colors"
          >
            View Courses
          </a>
        </div>
      </div>
    </main>
  );
}
