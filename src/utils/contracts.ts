import { ethers } from "ethers";
import { LmsABI, lmsAddress } from "../abi/LMS";

export const getLMSContract = async () => {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(lmsAddress, LmsABI, signer);
};
