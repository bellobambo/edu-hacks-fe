import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function WalletInfo() {
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("No Ethereum provider found");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);

      setWalletAddress(address);
      setBalance(parseFloat(balanceEth).toFixed(4));
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      setWalletAddress("Not connected");
      setBalance("0");
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

  if (loading) return <div className="p-2 text-sm">Loading wallet...</div>;

  return (
    <div className="bg-gray-100 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm max-w-full">
      <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-medium mr-1">Wallet:</span>
        <span className="font-mono text-gray-700 truncate max-w-[100%] sm:max-w-[180px]">
          {walletAddress}
        </span>
      </div>
      <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start">
        <span className="font-medium mr-1">Balance:</span>
        <span className="font-mono text-gray-700">{balance} ETH</span>
      </div>
    </div>
  );
}
