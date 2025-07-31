// hooks/useExamContract.ts
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ExamABI } from "../abi/ExamABI";

export function useExamContract(contractAddress?: string) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const disconnect = () => {
    setContract(null);
    setAccount(null);
    setProvider(null);
    setError("Disconnected");
  };

  const connect = async () => {
    try {
      setIsLoading(true);
      if (!window.ethereum) {
        setError("Please install MetaMask!");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);

      const provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(provider);

      const signer = await provider.getSigner();

      if (!contractAddress) {
        setError("No contract address provided");
        setContract(null);
        return;
      }

      const instance = new ethers.Contract(contractAddress, ExamABI, signer);
      setContract(instance);
      setError(null);
    } catch (err) {
      console.error("Connection error:", err);
      setError("Failed to connect to wallet");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            await connect();
          }
        } catch (err) {
          console.error("Initialization error:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initialize();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
          connect();
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", disconnect);
      }
    };
  }, [contractAddress]); // Re-run if contractAddress changes

  return {
    contract,
    error,
    account,
    provider,
    isLoading,
    connect,
    disconnect,
  };
}
