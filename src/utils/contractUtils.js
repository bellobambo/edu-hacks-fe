import { ethers } from "ethers";
import { courseContractAddress, CourseABI } from "./contractDetails";

// Initialize provider (use MetaMask provider if available)
const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return ethers.getDefaultProvider(); // Fallback to default provider
};

// Get signer for transactions
const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

// Get contract instance with signer (for write operations)
export const getContractWithSigner = async () => {
  const signer = await getSigner();
  return new ethers.Contract(courseContractAddress, CourseABI, signer);
};

// Get contract instance without signer (for read-only operations)
export const getContract = () => {
  const provider = getProvider();
  return new ethers.Contract(courseContractAddress, CourseABI, provider);
};

// Connect to MetaMask
export const connectWallet = async () => {
  if (window.ethereum) {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      return true;
    } catch (error) {
      console.error("User rejected request", error);
      return false;
    }
  } else {
    alert("Please install MetaMask!");
    return false;
  }
};

// Get current account
export const getCurrentAccount = async () => {
  const provider = getProvider();
  const accounts = await provider.listAccounts();
  return accounts[0] || null;
};
