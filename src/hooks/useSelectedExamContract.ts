// hooks/useSelectedExamContract.ts
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ExamABI } from "../abi/ExamABI";

export function useSelectedExamContract(selectedExamAddress: string | null) {
  const [selectedExamContract, setSelectedExamContract] =
    useState<ethers.Contract | null>(null);

  useEffect(() => {
    if (!selectedExamAddress || !window.ethereum) {
      setSelectedExamContract(null);
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      selectedExamAddress,
      ExamABI,
      provider
    ); // ✅ use provider only for read-only
    setSelectedExamContract(contract);
  }, [selectedExamAddress]);

  return selectedExamContract;
}
