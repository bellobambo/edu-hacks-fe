import "./App.css";
import RegisterUser from "./components/RegisterUser";
import ViewProfile from "./components/ViewProfile";
import { useState } from "react";
import { useCourseContract } from "./hooks/useCourseContract";

function App() {
  const { error, account, disconnect, connect } = useCourseContract();
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
  };

  const handleNotRegistered = () => {
    setIsRegistered(false);
  };

  const handleSignOut = () => {
    disconnect();
    setIsRegistered(null);
  };

  if (!account) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold">Course Contract UI</h1>
        <button
          onClick={connect}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Connect Wallet
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Course Contract UI</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Disconnect
        </button>
      </div>

      {isRegistered === null ? (
        <ViewProfile onNotRegistered={handleNotRegistered} />
      ) : isRegistered ? (
        <ViewProfile />
      ) : (
        <RegisterUser onRegistrationSuccess={handleRegistrationSuccess} />
      )}
    </div>
  );
}

export default App;
