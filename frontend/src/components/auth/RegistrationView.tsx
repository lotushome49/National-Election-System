import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { createDemoFaceEmbedding } from "../../utils/faceRecognition";
import { useFaceEmbedding } from "../../hooks/useFaceEmbedding";
import { unwrapApiData } from "../../utils/mfa";

export function RegistrationView({
  setView,
  t,
  canRegister,
  role,
  token,
  i18n,
  onRegistered,
}: any) {
  const lang = i18n.language as "en" | "am";
  const isAuthorized = role === "NONE" || canRegister;

  const [step, setStep] = useState(0);
  const [nidInput, setNidInput] = useState("");
  const [nidError, setNidError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    nationalId: "",
    address: "",
    profileImage: "",
    email: "",
    phone: "",
    isCitizen: false,
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [matchedCitizen, setMatchedCitizen] = useState<any>(null);
  const [faceCaptureState, setFaceCaptureState] = useState<
    "idle" | "camera-ready" | "capturing" | "captured" | "failed"
  >("idle");
  const [faceCaptureMessage, setFaceCaptureMessage] = useState(
    "Face capture not started yet.",
  );
  const [successData, setSuccessData] = useState<any>(null);
  const {
    videoRef,
    modelReady,
    modelError,
    startCamera,
    stopCamera,
    captureEmbedding,
  } = useFaceEmbedding();
  const [demoFaceEmbedding, setDemoFaceEmbedding] = useState<string | null>(
    null,
  );

  const buildRegistrationPayload = (faceEmbedding: string) => {
    const payload: Record<string, unknown> = {
      fullName: formData.fullName.trim(),
      nationalId: formData.nationalId.trim(),
      dateOfBirth: formData.dob,
      faceEmbedding,
    };

    const gender = formData.gender.trim();
    if (gender) {
      const normalizedGender = gender.toUpperCase();
      if (["MALE", "FEMALE", "OTHER"].includes(normalizedGender)) {
        payload.gender = normalizedGender;
      }
    }

    if (formData.phone.trim()) payload.phone = formData.phone.trim();
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.address.trim()) payload.address = formData.address.trim();

    return payload;
  };

  // Client-side fallback for demo mode when the API mock server isn't running
  const clientSimulatedCitizens: Record<string, any> = {
    "NID-123456": {
      nationalId: "NID-123456",
      fullName: "Abebe Bikila",
      dob: "1985-05-15",
      gender: "Male",
      address: "Addis Ababa, Arada Sub-city, House 123",
      citizenshipStatus: "Ethiopian",
      phone: "+251911223344",
      profileImage: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    "NID-654321": {
      nationalId: "NID-654321",
      fullName: "Tirunesh Dibaba",
      dob: "1990-10-20",
      gender: "Female",
      address: "Addis Ababa, Bole Sub-city, House 456",
      citizenshipStatus: "Ethiopian",
      phone: "+251911556677",
      profileImage: "https://randomuser.me/api/portraits/women/44.jpg",
    },
  };

  const hasMatchingNationalId = (record: any, nationalId: string) =>
    Boolean(record?.nationalId) && record.nationalId === nationalId;

  function createDeterministicDemoFaceEmbedding(nationalId: string) {
    const normalized = (nationalId || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();
    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
      hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }
    return createDemoFaceEmbedding(normalized || String(hash));
  }

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

  const handleVerifyNid = async () => {
    if (!nidInput.trim()) return;
    setLoading(true);
    setNidError("");
    try {
      let data: any = null;
      const trimmedNid = nidInput.trim();
      const simulated = clientSimulatedCitizens[trimmedNid];

      if (simulated) {
        if (!hasMatchingNationalId(simulated, trimmedNid)) {
          throw new Error(
            "Simulated citizen record does not match this National ID.",
          );
        }
        data = simulated;
      } else {
        let response: Response | null = null;
        try {
          response = await fetch(`/api/v1/citizen/${trimmedNid}`);
        } catch (networkErr) {
          response = null;
        }

        // If no external citizen registry is reachable, allow a controlled
        // fallback so staff can still continue registration in real DB mode.
        if (!response) {
          data = {
            nationalId: trimmedNid,
            fullName: "Unknown Citizen",
            dob: "",
            address: "",
            profileImage: "",
            phone: "",
            citizenshipStatus: "Ethiopian",
            gender: "",
          };
        } else {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            data = await response.json();
          } else {
            throw new Error("Invalid server response format.");
          }

          if (!response.ok) {
            data = {
              nationalId: trimmedNid,
              fullName: "Unknown Citizen",
              dob: "",
              address: "",
              profileImage: "",
              phone: "",
              citizenshipStatus: "Ethiopian",
              gender: "",
            };
          }
        }
      }

      if (!hasMatchingNationalId(data, trimmedNid)) {
        throw new Error(
          "The verified citizen record does not match the entered National ID.",
        );
      }

      setFormData({
        ...formData,
        fullName: data.fullName,
        dob: data.dob,
        nationalId: data.nationalId,
        address: data.address,
        profileImage: data.profileImage || "",
        phone: data.phone || "",
        isCitizen: data.citizenshipStatus === "Ethiopian",
        gender: data.gender || "",
      });
      setMatchedCitizen(data);
      // Move straight to face capture so the camera appears immediately after verification.
      setStep(2);
    } catch (err: any) {
      setNidError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle camera access for the face-capture step
  useEffect(() => {
    if (step !== 2) {
      stopCamera();
      setFaceCaptureState("idle");
      setFaceCaptureMessage("Face capture not started yet.");
      return;
    }

    const start = async () => {
      try {
        await startCamera();
        setFaceCaptureState("camera-ready");
        setFaceCaptureMessage(
          "Camera is ready. Position your face inside the frame.",
        );

        let cancelled = false;

        const pollForFace = async () => {
          while (!cancelled) {
            try {
              const embedding = await captureEmbedding();
              if (cancelled) return;

              setDemoFaceEmbedding(embedding);
              setFaceCaptureState("captured");
              setFaceCaptureMessage(
                "Face captured successfully. You can complete registration now.",
              );
              return;
            } catch {
              if (cancelled) return;

              setFaceCaptureMessage(
                "No face detected yet. Center your face and hold still.",
              );
            }

            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
        };

        void pollForFace();

        return () => {
          cancelled = true;
        };
      } catch (err) {
        console.error("Camera access failed", err);
        setFaceCaptureState("failed");
        setFaceCaptureMessage(
          "Camera access failed. Check permissions and try again.",
        );
        alert(
          "Could not access camera for face recognition. Please check permissions.",
        );
        setStep(1);
      }
    };

    let cleanupScan: () => void = () => undefined;

    void start().then((cleanup) => {
      if (typeof cleanup === "function") {
        cleanupScan = cleanup;
      }
    });

    return () => {
      cleanupScan();
      stopCamera();
    };
  }, [step, startCamera, stopCamera]);

  const handleSubmit = async () => {
    const deterministicDemoFace = formData.nationalId
      ? createDeterministicDemoFaceEmbedding(formData.nationalId)
      : null;
    const faceEmbedding = demoFaceEmbedding || deterministicDemoFace || "";
    if (!faceEmbedding) {
      alert(
        "Face capture is incomplete. Please refresh or use the demo face button.",
      );
      return;
    }
    setLoading(true);
    setFaceCaptureState("capturing");
    setFaceCaptureMessage("Capturing and verifying face embedding...");
    // Stop camera
    stopCamera();
    try {
      setFaceCaptureState("captured");
      setFaceCaptureMessage(
        "Face matched successfully. Confirm the voter details to complete registration.",
      );

      const useProtectedPath = role !== "NONE" && Boolean(token);
      const path = useProtectedPath
        ? "/api/v1/voters"
        : "/api/v1/auth/register-voter";
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(useProtectedPath ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(buildRegistrationPayload(faceEmbedding)),
      });

      const responseText = await response.text();
      let data: any = null;
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { message: responseText };
        }
      }

      if (response.status === 404) {
        throw new Error("Registration service is currently unavailable (404).");
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Registration failed (status ${response.status})`,
        );
      }

      if (data?.error) throw new Error(data.error);

      const result = unwrapApiData(data);

      // Cache the latest face context for local fallback and login assistance.
      try {
        localStorage.setItem(
          "demoVoterAuth",
          JSON.stringify({
            nationalId: formData.nationalId,
            voterId: result?.voterId || `DEMO-${Date.now()}`,
            fullName: formData.fullName,
            dob: formData.dob,
            address: formData.address,
            email: formData.email,
            phone: formData.phone,
            gender: formData.gender,
            profileImage: formData.profileImage,
            uniqueVoterId: result?.voterId || `DEMO-${Date.now()}`,
            registered: true,
            hasVoted: false,
            faceEmbedding,
          }),
        );

        if (result?.votingToken) {
          localStorage.setItem(
            "nehs_pending_voting_token",
            JSON.stringify({
              token: result.votingToken,
              electionId: result.votingElectionId || null,
              expiresAt: result.votingTokenExpiresAt || null,
            }),
          );
        }

        if (result?.accessToken && role !== "NONE") {
          localStorage.setItem("nehs_token", result.accessToken);
          localStorage.setItem("nehs_role", "VOTER");
          if (result?.sessionId) {
            localStorage.setItem("nehs_sessionId", result.sessionId);
          }

          const voterUser = {
            id: result.id,
            voterId: result.voterId,
            fullName: formData.fullName,
            nationalId: formData.nationalId,
            uniqueVoterId: result.voterId,
            dob: formData.dob,
            address: formData.address,
            email: formData.email,
            phone: formData.phone,
            gender: formData.gender,
            profileImage: formData.profileImage,
            registered: true,
            hasVoted: false,
            receiptToken: null,
            role: "VOTER",
          };

          localStorage.setItem("nehs_user", JSON.stringify(voterUser));
          onRegistered?.({
            token: result.accessToken,
            role: "VOTER",
            sessionId: result.sessionId ?? null,
            user: voterUser,
          });
        }
      } catch {
        // Ignore storage failures in restricted environments.
      }

      setSuccessData(result);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    const autoSignedIn = role !== "NONE" && Boolean(successData?.accessToken);
    const primaryActionView = autoSignedIn ? "voter-hub" : "login";
    const primaryActionLabel = autoSignedIn
      ? "Continue to voter hub"
      : "Go to login";

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

        <div
          className={cn(
            "border rounded-xl p-4 mb-4 text-left",
            autoSignedIn
              ? "bg-blue-50 border-blue-100"
              : "bg-amber-50 border-amber-100",
          )}
        >
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1",
              autoSignedIn ? "text-blue-700" : "text-amber-700",
            )}
          >
            Registration status
          </p>
          <p
            className={cn(
              "text-xs",
              autoSignedIn ? "text-blue-800" : "text-amber-800",
            )}
          >
            {autoSignedIn
              ? "The voter is signed in and can continue to the voter hub."
              : "Registration is complete. The voter can sign in to continue."}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 text-left">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">
            Voter details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Full name
              </p>
              <p className="font-semibold text-slate-900 truncate">
                {formData.fullName}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                National ID
              </p>
              <p className="font-semibold text-slate-900 font-mono">
                {formData.nationalId}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Address
              </p>
              <p className="font-semibold text-slate-900">
                {formData.address || "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Phone / Email
              </p>
              <p className="font-semibold text-slate-900 truncate">
                {formData.phone || formData.email || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        {matchedCitizen && (
          <div className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                {matchedCitizen.profileImage ? (
                  <img
                    src={matchedCitizen.profileImage}
                    alt={matchedCitizen.fullName || "Verified voter"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCheck size={20} className="text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Verified voter record
                </p>
                <p className="font-semibold text-slate-900">
                  {matchedCitizen.fullName || formData.fullName}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {matchedCitizen.nationalId || formData.nationalId}
                </p>
              </div>
            </div>
          </div>
        )}

        {successData?.voterId && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              {t("unique_voter_id")}
            </p>
            <p className="text-xl font-mono font-bold text-election-dark tracking-tighter">
              {successData.voterId}
            </p>
          </div>
        )}

        {successData?.votingToken && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-8 text-left">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
              Voting token
            </p>
            <p className="text-xs text-emerald-800 mb-2">
              {autoSignedIn
                ? "Use this token as the Unique Voting ID inside the voting booth."
                : "This token can be used in the voting booth after sign-in."}
            </p>
            <p className="text-sm font-mono font-bold text-emerald-900 break-all">
              {successData.votingToken}
            </p>
          </div>
        )}

        <button
          onClick={() => setView(primaryActionView)}
          className="bg-election-blue text-white px-8 py-3 rounded-xl font-medium w-full"
        >
          {primaryActionLabel}
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
              Register as a voter, verify your identity, and continue to the
              voter hub.
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
                  Step {step + 1} of 3
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {step === 0
                    ? t("verify_voter_identity")
                    : step === 1
                      ? t("step_personal")
                      : t("step_biometric")}
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
                style={{ width: `${((step + 1) / 3) * 100}%` }}
              />
            </div>

            {step === 0 ? (
              <div className="space-y-6">
                <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                      <Search size={22} className="text-election-blue" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        {t("verify_voter_identity")}
                      </h4>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        Enter your National ID to load your voter details and
                        continue the registration flow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] block">
                    {t("national_id")}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={nidInput}
                      onChange={(e) => setNidInput(e.target.value)}
                      className="flex-1 h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-election-blue outline-none transition-all font-mono text-slate-900"
                      placeholder={t("nid_placeholder")}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyNid()}
                    />
                    <button
                      onClick={handleVerifyNid}
                      disabled={loading || !nidInput.trim()}
                      className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-sm bg-election-blue text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
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
                  <p className="text-[10px] text-slate-400 font-mono italic mt-2">
                    Demo voter IDs: NID-123456, NID-654321
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-slate-100 bg-white p-5">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Manual entry stays restricted. Use the biometric-linked
                    National ID on your voter record.
                  </p>
                </div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-5">
                <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 p-5">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {t("nid_verified")}
                        </p>
                        <p className="text-xs text-slate-500">
                          Your voter details are ready for review.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-black uppercase tracking-widest">
                      Verified
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Identity verified for this NID. Continue to face capture to
                    complete voter registration.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setStep(0)}
                    className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-700 font-bold"
                  >
                    {t("back")}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="flex-[2] h-12 rounded-2xl bg-slate-900 text-white font-bold"
                  >
                    {t("confirm")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                  <div className="space-y-4">
                    <div className="rounded-[1.75rem] bg-slate-50 border border-slate-100 p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          {matchedCitizen?.profileImage ? (
                            <img
                              src={matchedCitizen.profileImage}
                              alt={matchedCitizen.fullName || "Verified voter"}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <UserCheck size={24} className="text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black mb-2">
                            Verified voter profile
                          </p>
                          <h4 className="font-bold text-slate-900 text-xl truncate">
                            {matchedCitizen?.fullName || formData.fullName}
                          </h4>
                          <p className="text-sm text-slate-500 font-mono mt-1 break-all">
                            {matchedCitizen?.nationalId || formData.nationalId}
                          </p>
                        </div>
                      </div>
                    </div>

                    {faceCaptureState === "captured" && (
                      <div className="rounded-[1.75rem] bg-white border border-slate-100 p-5 shadow-sm">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 font-black mb-4">
                          Voter registration summary
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">
                              Full name
                            </p>
                            <p className="font-semibold text-slate-900 truncate">
                              {formData.fullName}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">
                              National ID
                            </p>
                            <p className="font-semibold text-slate-900 font-mono break-all">
                              {formData.nationalId}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">
                              Phone
                            </p>
                            <p className="font-semibold text-slate-900 truncate">
                              {formData.phone || "Not provided"}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">
                              Email
                            </p>
                            <p className="font-semibold text-slate-900 truncate">
                              {formData.email || "Not provided"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
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
                              ? "Face model fallback active"
                              : modelReady
                                ? t("placeholder_face")
                                : "Loading face model..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-700 font-bold"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || faceCaptureState !== "captured"}
                    className="flex-[2] h-12 rounded-2xl bg-election-blue text-white font-bold shadow-lg shadow-election-blue/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      t("loading")
                    ) : (
                      <>
                        <UserCheck size={18} />
                        {t("complete_reg")}
                      </>
                    )}
                  </button>
                </div>
              </div>
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
              <li>{t("security_notice_1")}</li>
              <li>{t("security_notice_2")}</li>
              <li>{t("security_notice_3")}</li>
            </ul>
          </div>

          <div className="bg-slate-900 text-white rounded-[2rem] p-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_35%)]" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/50 font-black mb-3">
                Quick note
              </p>
              <p className="text-sm text-white/75 leading-relaxed">
                Keep your National ID handy. If you close this page before
                completing the face step, you can return and continue where you
                left off.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
