import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useFaceEmbedding } from "../../hooks/useFaceEmbedding";
import { unwrapApiData } from "../../utils/mfa";

const ETHIOPIAN_REGIONS = [
  "Addis Ababa",
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Dire Dawa",
  "Gambela",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "South West Ethiopia",
  "Tigray",
  "Central Ethiopia",
  "Northern Ethiopia",
  "Southern Nations, Nationalities, and Peoples",
];

type FormState = {
  nationalId: string;
  fullName: string;
  dob: string;
  gender: string;
  region: string;
  address: string;
  email: string;
  phone: string;
};

export function RegistrationView({
  setView,
  t,
  canRegister,
  role,
  token,
  i18n,
}: any) {
  const lang = i18n.language as "en" | "am";
  const isAuthorized = role === "NONE" || canRegister;

  const [step, setStep] = useState<"form" | "verified" | "camera" | "success">(
    "form",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [identityMessage, setIdentityMessage] = useState(
    "Enter your National ID and complete the form.",
  );
  const [faceCaptureState, setFaceCaptureState] = useState<
    "idle" | "camera-ready" | "capturing" | "failed"
  >("idle");
  const [faceCaptureMessage, setFaceCaptureMessage] = useState(
    "Camera starts after identity confirmation.",
  );
  const [, setCapturedFaceEmbedding] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);
  const [formData, setFormData] = useState<FormState>({
    nationalId: "",
    fullName: "",
    dob: "",
    gender: "",
    region: "",
    address: "",
    email: "",
    phone: "",
  });

  const {
    videoRef,
    modelReady,
    modelError,
    startCamera,
    stopCamera,
    captureEmbedding,
  } = useFaceEmbedding();

  const progress = useMemo(() => {
    if (step === "form") return 1 / 3;
    if (step === "verified") return 2 / 3;
    if (step === "camera") return 1;
    return 1;
  }, [step]);

  useEffect(() => {
    if (step !== "camera") {
      stopCamera();
      setFaceCaptureState("idle");
      if (step !== "success") {
        setCapturedFaceEmbedding(null);
      }
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        await startCamera();
        if (cancelled) return;
        setFaceCaptureState("camera-ready");
        setFaceCaptureMessage(
          "Camera is ready. Look into the frame, then complete registration.",
        );
      } catch (cameraError) {
        if (cancelled) return;
        setFaceCaptureState("failed");
        setFaceCaptureMessage(
          cameraError instanceof Error
            ? cameraError.message
            : "Camera access failed.",
        );
        setError("Could not access camera for face enrollment.");
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [step, startCamera, stopCamera]);

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto text-center mt-12 bg-white p-8 rounded-2xl shadow-xl border border-red-100">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">{t("error")}</h2>
        <p className="text-slate-500 mb-6">
          This page is for voter registration only.
        </p>
        <button
          onClick={() => setView("login")}
          className="w-full bg-election-dark text-white p-3 rounded-xl"
        >
          Return to Login
        </button>
      </div>
    );
  }

  const updateField = (key: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleVerifyIdentity = async () => {
    setError("");
    const nationalId = formData.nationalId.trim();

    if (!nationalId) {
      setError("Enter a National ID first.");
      return;
    }

    if (
      !formData.fullName.trim() ||
      !formData.dob ||
      !formData.gender.trim() ||
      !formData.region.trim()
    ) {
      setError("Complete the registration form before verification.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/auth/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId,
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dob,
          gender: formData.gender.trim(),
          region: formData.region.trim(),
          address: formData.address.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Identity verification failed",
        );
      }

      const result = unwrapApiData(payload);
      if (!result?.success) {
        throw new Error("Identity verification failed");
      }

      setIdentityMessage(
        "National ID verified. Review the details and confirm identity.",
      );
      setStep("verified");
    } catch (err: any) {
      setError(err?.message || "Identity verification failed");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmIdentity = () => {
    setError("");
    setStep("camera");
    setFaceCaptureMessage(
      "Camera will open now. Liveness check runs on capture.",
    );
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    setFaceCaptureState("capturing");
    setFaceCaptureMessage("Running liveness check and preparing enrollment...");

    try {
      const faceEmbedding = await captureEmbedding();
      setCapturedFaceEmbedding(faceEmbedding);
      const response = await fetch("/api/v1/auth/register-voter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId: formData.nationalId.trim(),
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dob,
          gender: formData.gender.trim().toUpperCase(),
          region: formData.region.trim(),
          address: formData.address.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          faceEmbedding,
          livenessResult: "passed",
        }),
      });

      const text = await response.text();
      let payload: any = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { message: text };
        }
      }

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Registration failed",
        );
      }

      const result = unwrapApiData(payload);
      stopCamera();
      setSuccessData(result);
      setStep("success");
    } catch (err: any) {
      setFaceCaptureState("failed");
      setFaceCaptureMessage(err?.message || "Face enrollment failed.");
      setError(err?.message || "Face enrollment failed.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    const uniqueVoterId =
      successData?.uniqueVoterId ?? successData?.voterId ?? "";

    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md mx-auto text-center mt-12 bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("reg_success")}</h2>
        <p className="text-slate-500 mb-4">Registration complete.</p>

        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-8 text-left">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Unique Voter ID
          </p>
          <p className="text-xl font-mono font-bold text-election-dark tracking-tighter">
            {uniqueVoterId || "VOTER-XXXX-XXXX"}
          </p>
        </div>

        <button
          onClick={() => setView("login")}
          className="bg-election-blue text-white px-8 py-3 rounded-xl font-medium w-full"
        >
          Go to login
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto pb-16"
    >
      <div className="mb-8 rounded-[2rem] bg-gradient-to-r from-slate-900 via-slate-800 to-election-dark text-white p-6 md:p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.24),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3 max-w-2xl">
            <button
              onClick={() => setView("login")}
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-white/60 hover:text-white transition-colors"
            >
              ← {t("cancel")}
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em]">
              <ShieldCheck size={12} />
              {t("reg_title")}
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black tracking-tighter uppercase leading-[0.95]">
              {t("reg_desc")}
            </h2>
            <p className="text-white/70 text-sm md:text-base max-w-xl leading-relaxed">
              National ID is verified first. Every other registration field is
              entered manually, then face enrollment is captured.
            </p>
          </div>
          <button
            onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
            className="self-start md:self-auto px-4 py-2 rounded-full bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-widest text-white/85 hover:bg-white/15 transition-colors"
          >
            {lang === "en" ? "Amharic (አማርኛ)" : "English"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.85fr)] gap-8 items-start">
        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black mb-2">
                  Step {step === "form" ? 1 : step === "verified" ? 2 : 3} of 3
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {step === "form"
                    ? "Enter National ID and registration details"
                    : step === "verified"
                      ? "Confirm identity"
                      : "Face enrollment"}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="w-2 h-2 rounded-full bg-election-blue" />
                Voter flow
              </div>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-8">
              <div
                className="h-full rounded-full bg-election-blue transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === "form" && (
              <div className="space-y-6">
                <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                      <Search size={22} className="text-election-blue" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        National ID + manual form
                      </h4>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        Only approved National IDs are accepted. No personal
                        profile is prefilled.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] block">
                      National ID
                    </label>
                    <input
                      type="text"
                      value={formData.nationalId}
                      onChange={(e) =>
                        updateField("nationalId", e.target.value)
                      }
                      className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all font-mono text-slate-900"
                      placeholder="ETH-100001"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      className="h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-slate-900"
                      placeholder="Full name"
                    />
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => updateField("dob", e.target.value)}
                      className="h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-slate-900"
                    />
                    <select
                      value={formData.gender}
                      onChange={(e) => updateField("gender", e.target.value)}
                      className="h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-slate-900"
                    >
                      <option value="">Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <select
                      value={formData.region}
                      onChange={(e) => updateField("region", e.target.value)}
                      className="h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-slate-900"
                    >
                      <option value="">Region</option>
                      {ETHIOPIAN_REGIONS.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      className="h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-slate-900"
                      placeholder="Phone"
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-slate-900"
                      placeholder="Email"
                    />
                    <textarea
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      className="min-h-28 md:col-span-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-slate-900"
                      placeholder="Address"
                    />
                  </div>
                </div>

                <button
                  onClick={handleVerifyIdentity}
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-election-blue text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  Verify Identity
                </button>
              </div>
            )}

            {step === "verified" && (
              <div className="space-y-5">
                <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 p-5">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          National ID Verified
                        </p>
                        <p className="text-xs text-slate-500">
                          {identityMessage}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-black uppercase tracking-widest">
                      Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                    <div>
                      <strong>Full name:</strong> {formData.fullName}
                    </div>
                    <div>
                      <strong>National ID:</strong> {formData.nationalId}
                    </div>
                    <div>
                      <strong>DOB:</strong> {formData.dob}
                    </div>
                    <div>
                      <strong>Gender:</strong> {formData.gender}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setStep("form")}
                    className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmIdentity}
                    className="flex-[2] h-12 rounded-2xl bg-slate-900 text-white font-bold"
                  >
                    Confirm Identity
                  </button>
                </div>
              </div>
            )}

            {step === "camera" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          <UserCheck size={24} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black mb-2">
                            Confirmed voter details
                          </p>
                          <h4 className="font-bold text-slate-900 text-xl truncate">
                            {formData.fullName}
                          </h4>
                          <p className="text-sm text-slate-500 font-mono mt-1 break-all">
                            {formData.nationalId}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] bg-slate-900 text-white p-5 overflow-hidden relative">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-3">
                          <Camera size={18} className="text-election-blue" />
                          <p className="text-[10px] uppercase tracking-[0.35em] text-white/60 font-black">
                            Live capture
                          </p>
                        </div>
                        <p className="text-sm text-white/75 leading-relaxed mb-4">
                          {faceCaptureMessage}
                        </p>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
                          <span className="inline-flex h-2 w-2 rounded-full bg-green-400" />
                          {faceCaptureState.replace("-", " ")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] bg-white border border-slate-100 p-5 shadow-sm">
                      <div className="aspect-video rounded-[1.5rem] overflow-hidden bg-slate-900 relative border border-slate-200">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover grayscale brightness-75 scale-x-[-1]"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <div className="w-40 h-56 border-2 border-dashed border-election-blue/50 rounded-[3rem] relative">
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
                          <p className="mt-4 text-[10px] font-mono text-white/75 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                            {modelError
                              ? "Model unavailable"
                              : modelReady
                                ? "Face model ready"
                                : "Loading face model..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setStep("verified")}
                    className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || faceCaptureState === "failed"}
                    className="flex-[2] h-12 rounded-2xl bg-election-blue text-white font-bold shadow-lg shadow-election-blue/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      "Submitting..."
                    ) : (
                      <>
                        <UserCheck size={18} />
                        Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === "form" && (
              <p className="mt-4 text-xs text-slate-500">
                Only whitelisted National IDs are accepted. No citizen profile
                is prefilled.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6 sticky top-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-election-blue" />
              {t("security_notice")}
            </h4>
            <ul className="text-sm space-y-3 text-slate-500 list-disc pl-5 leading-relaxed">
              <li>Only approved National IDs are allowed.</li>
              <li>No personal data is auto-filled from a citizen registry.</li>
              <li>Camera access begins only after identity confirmation.</li>
            </ul>
          </div>

          <div className="bg-slate-900 text-white rounded-[2rem] p-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/50 font-black mb-3">
                Quick note
              </p>
              <p className="text-sm text-white/75 leading-relaxed">
                Fill in your details manually. After the whitelist check passes,
                confirm identity to open the camera and complete face
                enrollment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
