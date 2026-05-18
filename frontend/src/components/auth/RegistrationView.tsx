import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
} from "lucide-react";

export function RegistrationView({
  setView,
  fpHash,
  t,
  canRegister,
  role,
  token,
  i18n,
}: any) {
  const lang = i18n.language as "en" | "am";
  // Public registration is allowed if role is NONE
  const isAuthorized = role === "NONE" || canRegister;

  const [step, setStep] = useState(0);
  const [nidInput, setNidInput] = useState("");
  const [nidError, setNidError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    nationalId: "",
    address: "",
    email: "",
    phone: "",
    regionId: "r1",
    isCitizen: false,
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto text-center mt-12 bg-white p-8 rounded-2xl shadow-xl border border-red-100">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">{t("error")}</h2>
        <p className="text-slate-500 mb-6">
          Unauthorized: your role does not have registration permissions.
        </p>
        <button
          onClick={() => setView("dashboard")}
          className="w-full bg-election-dark text-white p-3 rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleVerifyNid = async () => {
    if (!nidInput.trim()) return;
    setLoading(true);
    setNidError("");
    try {
      const response = await fetch(`/api/citizen/${nidInput}`);

      if (response.status === 404) {
        throw new Error(t("nid_error") + " (Citizen database not found)");
      }

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error("Invalid server response format.");
      }

      if (!response.ok) {
        throw new Error(data.error || t("nid_error"));
      }

      setFormData({
        ...formData,
        fullName: data.fullName,
        dob: data.dob,
        nationalId: data.nationalId,
        address: data.address,
        phone: data.phone || "",
        isCitizen: data.citizenshipStatus === "Ethiopian",
        gender: data.gender || "",
      });
      setStep(1);
    } catch (err: any) {
      setNidError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle camera access for Step 3
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    if (step === 3) {
      const startCamera = async () => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true });
          currentStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        } catch (err) {
          console.error("Camera access failed", err);
          alert(
            "Could not access camera for facial biometrics. Please check permissions.",
          );
          setStep(2);
        }
      };
      startCamera();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);

  // Ensure video element gets the stream even if Ref was null initially
  useEffect(() => {
    if (
      step === 3 &&
      stream &&
      videoRef.current &&
      !videoRef.current.srcObject
    ) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  const handleSubmit = async () => {
    if (!fpHash) {
      alert(
        "Biometric initialization incomplete. Please refresh or check your browser settings.",
      );
      return;
    }
    setLoading(true);
    // Stop camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    try {
      const response = await fetch("/api/auth/register-voter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...formData, biometricHash: fpHash }),
      });

      if (response.status === 404) {
        throw new Error("Registration service is currently unavailable (404).");
      }

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        throw new Error(
          "Registration failed: Server returned an invalid response.",
        );
      }

      if (data?.error) throw new Error(data.error);
      setSuccessData(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md mx-auto text-center mt-12 bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("reg_success")}</h2>
        <p className="text-slate-500 mb-4">{t("reg_success_desc")}</p>

        {successData.voterId && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {t("unique_voter_id")}
            </p>
            <p className="text-xl font-mono font-bold text-election-dark tracking-tighter">
              {successData.voterId}
            </p>
          </div>
        )}

        <button
          onClick={() => setView("login")}
          className="bg-election-blue text-white px-8 py-3 rounded-xl font-medium w-full"
        >
          {t("return_home")}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <button
            onClick={() => setView("login")}
            className="text-xs text-slate-400 hover:text-slate-600 uppercase tracking-widest font-bold mb-4 flex items-center gap-1"
          >
            ← {t("cancel")}
          </button>
          <h2 className="text-3xl font-bold">{t("reg_title")}</h2>
          <p className="text-slate-500">{t("reg_desc")}</p>
        </div>
        <button
          onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
          className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-200"
        >
          {lang === "en" ? "Amharic (አማርኛ)" : "English"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              {t("region")}
            </label>
            <select
              value={formData.regionId}
              onChange={(e) =>
                setFormData({ ...formData, regionId: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-sm font-medium"
            >
              {[...Array(11)].map((_, i) => (
                <option key={i} value={`r${i + 1}`}>
                  {t(`r${i + 1}`)}
                </option>
              ))}
            </select>
          </div>

          {step === 0 ? (
            <div className="space-y-6">
              <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4">
                <Search className="mx-auto text-election-blue mb-2" size={32} />
                <h3 className="font-bold text-slate-900">
                  {t("search_citizen")}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{t("nid_desc")}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("national_id")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nidInput}
                    onChange={(e) => setNidInput(e.target.value)}
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-election-blue outline-none transition-all font-mono"
                    placeholder={t("nid_placeholder")}
                    onKeyPress={(e) => e.key === "Enter" && handleVerifyNid()}
                  />
                  <button
                    onClick={handleVerifyNid}
                    disabled={loading || !nidInput.trim()}
                    className="bg-election-blue text-white px-6 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    {t("verify_nid")}
                  </button>
                </div>
                {nidError && (
                  <p className="text-xs text-red-500 font-medium ml-1">
                    {nidError}
                  </p>
                )}
                <div className="p-3 bg-slate-50 rounded-lg text-[10px] text-slate-400 font-mono italic">
                  Try simulated IDs: NID-123456, NID-654321
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 italic">
                  * Manual entry is restricted for election integrity. Please
                  use your biometric-linked National ID.
                </p>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{t("step_personal")}</h3>
                {formData.nationalId && (
                  <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={10} /> {t("nid_verified")}
                  </span>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("full_name")}
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                  placeholder={t("placeholder_name")}
                  readOnly={!!formData.nationalId}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("dob")}
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      setFormData({ ...formData, dob: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all text-sm"
                    readOnly={!!formData.nationalId}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("national_id")}
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) =>
                      setFormData({ ...formData, nationalId: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                    placeholder={t("placeholder_id")}
                    readOnly={!!formData.nationalId}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("gender")}
                  </label>
                  <input
                    type="text"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                    placeholder={t("gender")}
                    readOnly={!!formData.nationalId}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    {t("phone")}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                    placeholder={t("placeholder_phone")}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("address")}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                  placeholder={t("placeholder_address")}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-election-blue outline-none transition-all"
                  placeholder={t("placeholder_email")}
                />
              </div>
              <div className="flex items-start gap-3 p-2">
                <input
                  type="checkbox"
                  id="isCitizen"
                  checked={formData.isCitizen}
                  onChange={(e) =>
                    setFormData({ ...formData, isCitizen: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 rounded text-election-blue focus:ring-election-blue"
                  disabled={!!formData.nationalId}
                />
                <label
                  htmlFor="isCitizen"
                  className="text-sm text-slate-600 leading-tight"
                >
                  {t("citizen_confirm")}
                </label>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-medium"
                >
                  {t("back")}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={
                    !formData.fullName ||
                    !formData.nationalId ||
                    !formData.dob ||
                    !formData.address ||
                    !formData.isCitizen
                  }
                  className="flex-[2] bg-election-dark text-white p-4 rounded-xl font-medium disabled:opacity-50"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-6">
              <div className="bg-election-dark/5 p-6 rounded-xl border border-dashed border-slate-300">
                <div className="flex flex-col items-center text-center">
                  <Fingerprint
                    size={64}
                    className="text-election-blue mb-4 animate-pulse"
                  />
                  <h3 className="font-bold text-lg">
                    {t("biometric_consent")}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {t("consent_text")}
                  </p>
                  <div className="mt-6 flex gap-2">
                    <span className="inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                    <span className="text-[10px] font-mono text-green-600 uppercase tracking-tighter">
                      {t("step_biometric")} Ready: {fpHash.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-medium"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] bg-election-blue text-white p-4 rounded-xl font-medium shadow-lg shadow-election-blue/20"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video relative group border-4 border-election-blue/30 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-48 h-64 border-2 border-dashed border-election-blue/50 rounded-[4rem] relative">
                    <motion.div
                      animate={{ top: ["10%", "90%", "10%"] }}
                      transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: "linear",
                      }}
                      className="absolute left-0 right-0 h-0.5 bg-election-blue shadow-[0_0_15px_#0ea5e9]"
                    />
                  </div>
                  <p className="mt-4 text-[10px] font-mono text-white/70 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                    {t("placeholder_face")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-slate-100 text-slate-600 p-4 rounded-xl font-medium"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-[2] bg-election-blue text-white p-4 rounded-xl font-medium shadow-lg shadow-election-blue/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    t("loading")
                  ) : (
                    <>
                      <UserCheck size={20} />
                      {t("complete_reg")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800 text-white p-6 rounded-2xl">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-election-blue" />
              {t("security_notice")}
            </h4>
            <ul className="text-xs space-y-3 opacity-80 list-disc pl-4 font-mono">
              <li>{t("security_notice_1")}</li>
              <li>{t("security_notice_2")}</li>
              <li>{t("security_notice_3")}</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
