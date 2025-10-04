import { useState, useContext, useEffect } from "react";
import MainLayout from "../components/mainlayout";
import { AuthContext } from "../App";
import UserAvatar from "../components/UserAvatar";

export default function Account() {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2FA states
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [setupStep, setSetupStep] = useState("initial"); // 'initial', 'setup', 'verify'

  useEffect(() => {
    // Fetch user's 2FA status on component mount
    const fetchTwoFactorStatus = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const response = await fetch("/api/account/2fa/status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setIsTwoFactorEnabled(data.enabled || false);
        }
      } catch (error) {
        console.error("Error fetching 2FA status:", error);
      }
    };

    fetchTwoFactorStatus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle 2FA code input change
  const handleVerificationCodeChange = (e) => {
    setVerificationCode(e.target.value);
  };

  // Start 2FA setup process
  const initiateTwoFactorSetup = async () => {
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch("/api/account/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setTwoFactorSecret(data.secret);
        setQrCodeUrl(data.qrCode);
        setRecoveryCodes(data.recoveryCodes || []);
        setSetupStep("setup");
      } else {
        console.error("2FA Setup Error:", data.error);
        setErrorMessage(data.error || "Failed to setup 2FA.");
      }
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      setErrorMessage("Failed to setup 2FA. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify and enable 2FA
  const verifyAndEnableTwoFactor = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch("/api/account/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          token: verificationCode,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsTwoFactorEnabled(true);
        setSuccessMessage("Two-factor authentication enabled successfully!");
        setShowRecoveryCodes(true);
        setSetupStep("initial");
      } else {
        console.error("2FA Verification Error:", data.error);
        setErrorMessage(data.error || "Failed to verify code.");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      setErrorMessage("Failed to verify code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Disable 2FA
  const disableTwoFactor = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disable two-factor authentication? This will make your account less secure.",
      )
    ) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("jwt");
      const response = await fetch("/api/account/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setIsTwoFactorEnabled(false);
        setSuccessMessage("Two-factor authentication disabled successfully.");
      } else {
        setErrorMessage(data.error || "Failed to disable 2FA.");
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      setErrorMessage("Failed to disable 2FA. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch("/api/account/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Profile updated successfully");
        if (user) {
          user.username = formData.username;
          user.email = formData.email;
        }
      } else {
        setErrorMessage(data.error || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage("New passwords do not match");
      return;
    }
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Password changed successfully");
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        setErrorMessage(data.error || "Failed to change password.");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      setErrorMessage(
        "Failed to change password. Please verify your current password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-2xl font-semibold text-white mb-6">
          Account Settings
        </h1>

        {/* User Profile Header */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md mb-6">
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <UserAvatar 
                user={user} 
                size="xl"
                className="ring-4 ring-gray-600"
              />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">
                  {user?.username || "User"}
                </h2>
                <p className="text-gray-400">
                  {user?.email}
                </p>
                <div className="flex items-center mt-2">
                  <span className={`
                    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${user?.role === 'admin' 
                      ? 'bg-purple-900/40 text-purple-400 border border-purple-700' 
                      : 'bg-blue-900/40 text-blue-400 border border-blue-700'
                    }
                  `}>
                    {user?.role === 'admin' ? '👑 Administrator' : '👤 User'}
                  </span>
                  {isTwoFactorEnabled && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-400 border border-green-700">
                      🔐 2FA Enabled
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-500 bg-opacity-20 border border-green-500 text-white px-4 py-3 rounded-md mb-6">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white px-4 py-3 rounded-md mb-6">
            {errorMessage}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md mb-8">
          <div className="p-6">
            <h2 className="text-xl font-medium text-white mb-4">
              Profile Information
            </h2>
            <form onSubmit={handleProfileUpdate}>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isLoading
                    ? "bg-gray-300 text-gray-800 cursor-not-allowed"
                    : "bg-white text-gray-900 hover:bg-gray-200"
                } transition-colors`}
              >
                {isLoading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md mb-8">
          <div className="p-6">
            <h2 className="text-xl font-medium text-white mb-4">
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange}>
              <div className="mb-4">
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isLoading
                    ? "bg-gray-300 text-gray-800 cursor-not-allowed"
                    : "bg-white text-gray-900 hover:bg-gray-200"
                } transition-colors`}
              >
                {isLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
        

        {/* Two-Factor Authentication Card */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md mb-8">
          <div className="p-6">
            <h2 className="text-xl font-medium text-white mb-4">
              Two-Factor Authentication (2FA)
            </h2>

            {isTwoFactorEnabled ? (
              <>
                <div className="flex items-center mb-4">
                  <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                  <p className="text-green-400">
                    Two-factor authentication is enabled
                  </p>
                </div>
                <p className="text-gray-400 mb-4">
                  Two-factor authentication adds an extra layer of security to
                  your account by requiring a code from your phone in addition
                  to your password.
                </p>
                <button
                  onClick={disableTwoFactor}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    isLoading
                      ? "bg-gray-300 text-gray-800 cursor-not-allowed"
                      : "bg-red-600 text-white hover:bg-red-700"
                  } transition-colors`}
                >
                  {isLoading ? "Processing..." : "Disable 2FA"}
                </button>
              </>
            ) : setupStep === "initial" ? (
              <>
                <div className="flex items-center mb-4">
                  <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                  <p className="text-red-400">
                    Two-factor authentication is disabled
                  </p>
                </div>
                <p className="text-gray-400 mb-4">
                  Two-factor authentication adds an extra layer of security to
                  your account by requiring a code from your phone in addition
                  to your password.
                </p>
                <button
                  onClick={initiateTwoFactorSetup}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    isLoading
                      ? "bg-gray-300 text-gray-800 cursor-not-allowed"
                      : "bg-white text-gray-900 hover:bg-gray-200"
                  } transition-colors`}
                >
                  {isLoading ? "Processing..." : "Enable 2FA"}
                </button>
              </>
            ) : setupStep === "setup" ? (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-white mb-2">
                    Setup Two-Factor Authentication
                  </h3>
                  <ol className="list-decimal pl-5 text-gray-300 mb-4">
                    <li className="mb-2">
                      Download an authenticator app like Google Authenticator or
                      Authy
                    </li>
                    <li className="mb-2">
                      Scan the QR code with your authenticator app
                    </li>
                    <li className="mb-2">
                      Enter the 6-digit verification code from your app
                    </li>
                  </ol>
                </div>

                <div className="mb-6">
                  {qrCodeUrl && (
                    <div className="bg-white p-4 inline-block rounded mb-4">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code for 2FA"
                        className="max-w-[180px]"
                      />
                    </div>
                  )}

                  <p className="text-sm text-gray-400 mb-2">
                    Can't scan the QR code? Enter this code manually in your
                    app:
                  </p>
                  <div className="bg-gray-700 p-2 rounded font-mono text-sm mb-4 select-all overflow-x-auto">
                    {twoFactorSecret}
                  </div>
                </div>

                <form onSubmit={verifyAndEnableTwoFactor}>
                  <div className="mb-4">
                    <label
                      htmlFor="verificationCode"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Verification Code
                    </label>
                    <input
                      type="text"
                      id="verificationCode"
                      value={verificationCode}
                      onChange={handleVerificationCodeChange}
                      maxLength={6}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                      placeholder="Enter 6-digit code"
                      required
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isLoading || verificationCode.length !== 6}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        isLoading || verificationCode.length !== 6
                          ? "bg-gray-300 text-gray-800 cursor-not-allowed"
                          : "bg-white text-gray-900 hover:bg-gray-200"
                      } transition-colors`}
                    >
                      {isLoading ? "Verifying..." : "Verify & Enable"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSetupStep("initial")}
                      className="px-4 py-2 bg-transparent border border-gray-600 text-gray-300 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : null}

            {/* Show recovery codes after enabling 2FA */}
            {showRecoveryCodes && recoveryCodes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-medium text-white mb-2">
                  Recovery Codes
                </h3>
                <p className="text-gray-400 mb-4">
                  Save these recovery codes in a secure place. They can be used
                  if you lose access to your authenticator app. Each code can
                  only be used once.
                </p>
                <div className="bg-gray-700 p-3 rounded mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((code, index) => (
                      <div
                        key={index}
                        className="font-mono text-sm text-white select-all"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowRecoveryCodes(false)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Hide recovery codes
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-md">
          <div className="p-6">
            <h2 className="text-xl font-medium text-white mb-4">Danger Zone</h2>
            <p className="text-gray-400 mb-4">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <button
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete your account? This action cannot be undone.",
                  )
                ) {
                  console.log("Account deletion requested");
                }
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
