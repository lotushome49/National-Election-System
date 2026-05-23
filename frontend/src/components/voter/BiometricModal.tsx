import React, { useState } from "react";

interface BiometricModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export default function BiometricModal({
  open,
  onClose,
  onSuccess,
}: BiometricModalProps) {
  const [nationalId, setNationalId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!nationalId.trim()) {
      setError("Please enter the National ID");
      return;
    }
    setError(null);
    setScanning(true);
    // simulate scan delay
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/api/v1/auth/biometric-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Dummy hash expected by backend
            faceEmbedding: "DEMO_BIO_HASH_12345",
            nationalId,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "Biometric login failed");
      }
      onSuccess(data.accessToken ?? data.token);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Unexpected error");
    } finally {
      setScanning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Face Login (Dummy)</h2>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <input
          type="text"
          placeholder="Enter dummy National ID"
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value)}
          className="border rounded w-full p-2 mb-4"
          disabled={scanning}
        />
        {scanning && (
          <div className="flex items-center mb-4">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
            Scanning...
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            disabled={scanning}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            disabled={scanning}
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}
