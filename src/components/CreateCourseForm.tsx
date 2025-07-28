// components/CreateCourseForm.tsx
import { useState } from "react";
import { useCourseContract } from "../hooks/useCourseContract";

export default function CreateCourseForm() {
  const { contract } = useCourseContract();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    setLoading(true);
    try {
      const tx = await contract.createCourse(title, description);
      await tx.wait();
      alert("Course created successfully!");
    } catch (err) {
      console.error(err);
      alert("Error creating course");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
      <h2 className="text-lg font-semibold">Create Course</h2>
      <input
        type="text"
        placeholder="Course Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 w-full"
        required
      />
      <textarea
        placeholder="Course Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="border p-2 w-full"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Creating..." : "Create Course"}
      </button>
    </form>
  );
}
