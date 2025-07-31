// components/ViewProfile.tsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useCourseContract } from "../hooks/useCourseContract";
import CreateCourseForm from "./CreateCourseForm";
import CourseList from "./CourseList";

interface ViewProfileProps {
  onNotRegistered?: () => void;
  account?: string | null;
}

export default function ViewProfile({
  onNotRegistered,
  account,
}: ViewProfileProps) {
  const {
    contract,
    account: connectedAccount,
    isLoading: contractLoading,
  } = useCourseContract();
  const [profile, setProfile] = useState<any>(null);
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!window.ethereum) {
          setError("MetaMask not available");
          return;
        }

        if (contractLoading || !contract) {
          return; // Wait for contract to be loaded
        }

        const [userAddress] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        setAddress(userAddress);

        const provider = new ethers.BrowserProvider(window.ethereum);
        const balanceWei = await provider.getBalance(userAddress);
        setBalance(ethers.formatEther(balanceWei));

        const user = await contract.getUserProfile(userAddress);

        if (user && user.name) {
          setProfile(user);
        } else {
          if (onNotRegistered) onNotRegistered();
        }
      } catch (err: any) {
        console.error("Profile fetch error:", err);
        setError(err.message || "Failed to fetch profile");
        if (onNotRegistered) onNotRegistered();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [contract, contractLoading, onNotRegistered]);

  if (contractLoading) return <p>Loading contract...</p>;
  if (loading) return <p>Loading profile...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!profile) return <p>No profile found</p>;

  return (
    <div className="border p-4 space-y-2 bg-gray-50 rounded-md shadow">
      <div>
        <strong>Connected Wallet:</strong> {account || connectedAccount}
      </div>
      <div>
        <strong>Wallet Address:</strong> {address}
      </div>
      <div>
        <strong>Balance:</strong> {parseFloat(balance).toFixed(4)} ETH
      </div>
      <hr />
      <div>
        <strong>Name:</strong> {profile.name}
      </div>
      <div>
        <strong>Matric No:</strong> {profile.matricNumber}
      </div>
      <div>
        <strong>Main Course:</strong> {profile.mainCourse}
      </div>
      <div>
        <strong>Lecturer?</strong> {profile.isLecturer ? "Yes" : "No"}
      </div>

      {profile.isLecturer && (
        <div>
          <h3 className="text-lg font-semibold mt-4">Lecturer Actions</h3>
          <CreateCourseForm />
        </div>
      )}

      <CourseList />
    </div>
  );
}
