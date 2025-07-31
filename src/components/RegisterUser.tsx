import { useState } from "react";
import { useCourseContract } from "../hooks/useCourseContract";

interface RegisterUserProps {
  onRegistrationSuccess?: () => void;
}

export default function RegisterUser({
  onRegistrationSuccess,
}: RegisterUserProps) {
  const { contract, error: contractError } = useCourseContract();
  const [form, setForm] = useState({
    name: "",
    matricNumber: "",
    isLecturer: false,
    mainCourse: "",
  });
  const [txError, setTxError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (name === "userType") {
      const isLecturer = value === "lecturer";
      setForm({
        ...form,
        isLecturer,
        matricNumber: isLecturer ? "" : form.matricNumber,
      });
      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
    } else {
      setForm({
        ...form,
        [name]:
          type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);

    if (!contract) {
      setTxError("Contract not loaded. Please connect your wallet.");
      return;
    }

    // Validate form based on user type
    if (!form.name.trim()) {
      setTxError("Name is required");
      return;
    }

    if (!form.isLecturer && !form.matricNumber.trim()) {
      setTxError("Matric Number is required for students");
      return;
    }

    if (!form.isLecturer && !form.mainCourse.trim()) {
      setTxError("Main Course is required for students");
      return;
    }

    if (form.isLecturer && form.matricNumber.trim()) {
      setTxError("Lecturers should not have a matric number");
      return;
    }

    if (form.isLecturer && form.mainCourse.trim()) {
      setTxError("Lecturers should not have a main course");
      return;
    }

    setLoading(true);
    try {
      console.log("Registering with:", {
        name: form.name,
        matricNumber: form.isLecturer ? "" : form.matricNumber,
        isLecturer: form.isLecturer,
        mainCourse: form.isLecturer ? "" : form.mainCourse,
      });

      const tx = await contract.registerUser(
        form.name,
        form.isLecturer ? "" : form.matricNumber,
        form.isLecturer,
        form.isLecturer ? "" : form.mainCourse
      );

      await tx.wait();
      alert("User registered successfully");
      setForm({
        name: "",
        matricNumber: "",
        isLecturer: false,
        mainCourse: "",
      });
      if (onRegistrationSuccess) onRegistrationSuccess();
    } catch (err: any) {
      console.error("Registration error:", err);
      setTxError(
        err.reason ||
          err.data?.message ||
          err.message ||
          "Error registering user. Please check your inputs and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {contractError && <div className="text-red-500">{contractError}</div>}
      {txError && <div className="text-red-500">{txError}</div>}

      <input
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={handleChange}
        className="border p-1 w-full"
        required
      />

      <select
        name="userType"
        value={form.isLecturer ? "lecturer" : "student"}
        onChange={handleChange}
        className="border p-1 w-full"
        required
      >
        <option value="">Select user type</option>
        <option value="student">Student</option>
        <option value="lecturer">Lecturer</option>
      </select>

      {!form.isLecturer && (
        <>
          <input
            name="matricNumber"
            placeholder="Matric Number"
            value={form.matricNumber}
            onChange={handleChange}
            className="border p-1 w-full"
            required={!form.isLecturer}
          />
          <input
            name="mainCourse"
            placeholder="Main Course"
            value={form.mainCourse}
            onChange={handleChange}
            className="border p-1 w-full"
            required={!form.isLecturer}
          />
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-500 text-white p-1 px-3 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? "Processing..." : "Register"}
      </button>
    </form>
  );
}
