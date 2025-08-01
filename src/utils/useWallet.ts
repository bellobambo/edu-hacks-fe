// hooks/useWallet.ts
import { useEffect, useState } from "react";
import { ethers } from "ethers";

export const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("No Ethereum provider found");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setWalletAddress(address);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      setWalletAddress("");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWalletData();

    // Listen for account changes
    window.ethereum?.on("accountsChanged", fetchWalletData);
    window.ethereum?.on("chainChanged", fetchWalletData);

    return () => {
      window.ethereum?.removeListener("accountsChanged", fetchWalletData);
      window.ethereum?.removeListener("chainChanged", fetchWalletData);
    };
  }, []);

  return { walletAddress, loading };
};
