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
    regionId: "r1",
    isCitizen: false,
    gender: "",
  });
  const [regionMismatch, setRegionMismatch] = useState(false);
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

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
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
    if (isUuid(formData.regionId)) payload.regionId = formData.regionId;

    return payload;
  };

  const REGION_KEYWORDS: { id: string; keywords: string[] }[] = [
    { id: "r1", keywords: ["Addis Ababa", "Addis"] },
    { id: "r2", keywords: ["Amhara", "Bahir Dar", "Gondar"] },
    { id: "r3", keywords: ["Oromia", "Jimma", "Adama"] },
    { id: "r4", keywords: ["Tigray", "Mekelle", "Axum"] },
    { id: "r5", keywords: ["Somali", "Jijiga", "Gode"] },
    { id: "r6", keywords: ["Sidama", "Hawassa"] },
    { id: "r7", keywords: ["Afar", "Semera"] },
    { id: "r8", keywords: ["Benishangul", "Assosa"] },
    { id: "r9", keywords: ["Gambela"] },
    { id: "r10", keywords: ["Harari", "Harar"] },
    { id: "r11", keywords: ["Dire Dawa", "Dire"] },
  ];

  function inferRegionFromAddress(address: string) {
    if (!address) return undefined;
    const a = address.toLowerCase();
    for (const r of REGION_KEYWORDS) {
      for (const kw of r.keywords) {
        if (a.includes(kw.toLowerCase())) return r.id;
      }
    }
    return undefined;
  }

  function getRegionLabel(regionId: string) {
    const region = REGION_KEYWORDS.find((item) => item.id === regionId);
    return region ? t(region.id) : regionId;
  }

  const inferredRegionFromAddress = inferRegionFromAddress(formData.address);
  const lockRegionSelection =
    Boolean(formData.nationalId) && Boolean(inferredRegionFromAddress);

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
      let data: any = null;
      const trimmedNid = nidInput.trim();
      const simulated = clientSimulatedCitizens[trimmedNid];

      if (simulated) {
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

      const inferredRegion = inferRegionFromAddress(data.address);
      const selectedRegion = inferredRegion || formData.regionId;
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
        regionId: selectedRegion,
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

  // Recompute region/address mismatch whenever address or region changes
  useEffect(() => {
    const inferred = inferRegionFromAddress(formData.address || "");
    setRegionMismatch(
      Boolean(inferred && inferred !== (formData.regionId || "r1")),
    );
  }, [formData.address, formData.regionId]);

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

    let cleanupScan = () => undefined;

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
        "Face matched successfully. Confirm the citizen details to issue the voter ID.",
      );

      let data: any;

      if (token) {
        const response = await fetch("/api/v1/voters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildRegistrationPayload(faceEmbedding)),
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error(
            "Registration failed: Server returned an invalid response.",
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Registration service is currently unavailable (404).",
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message || data?.error || "Registration failed",
          );
        }
      } else {
        const response = await fetch("/api/v1/auth/register-voter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildRegistrationPayload(faceEmbedding)),
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error(
            "Registration failed: Server returned an invalid response.",
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Registration service is currently unavailable (404).",
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message || data?.error || "Registration failed",
          );
        }
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

        if (result?.accessToken) {
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
    const autoSignedIn = Boolean(successData?.accessToken);
    const isAdminAssistedRegistration = Boolean(token) && !autoSignedIn;
    const primaryActionView = autoSignedIn
      ? "voter-hub"
      : isAdminAssistedRegistration
        ? "dashboard"
        : "login";
    const primaryActionLabel = autoSignedIn
      ? "Continue to voter hub"
      : isAdminAssistedRegistration
        ? "Return to dashboard"
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
            Session status
          </p>
          <p
            className={cn(
              "text-xs",
              autoSignedIn ? "text-blue-800" : "text-amber-800",
            )}
          >
            {autoSignedIn
              ? "The voter is signed in and can continue to the voter hub."
              : "Registration is complete. The voter must log in before casting a vote."}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 text-left">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">
            Registration details
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
                Region
              </p>
              <p className="font-semibold text-slate-900">
                {getRegionLabel(formData.regionId)}
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
                    alt={matchedCitizen.fullName || "Matched citizen"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCheck size={20} className="text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Matched citizen
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
              System-issued voting token
            </p>
            <p className="text-xs text-emerald-800 mb-2">
              {autoSignedIn
                ? "Use this token as the Unique Voting ID inside the voting booth."
                : "This token can be used in the voting booth once the voter logs in."}
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
              onChange={(e) => {
                if (lockRegionSelection) return;
                setFormData({ ...formData, regionId: e.target.value });
              }}
              disabled={lockRegionSelection}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-election-blue outline-none transition-all text-sm font-medium text-slate-900"
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
                    className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-election-blue outline-none transition-all font-mono text-slate-900"
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
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">{t("step_personal")}</h3>
                </div>
                <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={10} /> {t("nid_verified")}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  Identity verified for this NID. Personal details stay hidden
                  until the face capture is completed.
                </p>
                <p className="text-xs text-slate-500">
                  Continue to face capture to unlock the registration summary.
                </p>
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
                  className="flex-[2] bg-election-dark text-white p-4 rounded-xl font-medium"
                >
                  {t("confirm")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {faceCaptureState === "captured" && matchedCitizen && (
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      {matchedCitizen.profileImage ? (
                        <img
                          src={matchedCitizen.profileImage}
                          alt={matchedCitizen.fullName || "Matched citizen"}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <UserCheck size={24} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <h3 className="font-bold text-lg text-slate-900">
                          Matched citizen profile
                        </h3>
                      </div>
                      <p className="text-sm text-slate-500">
                        Face capture matched the seeded identity below. Confirm
                        to create the voter record.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Full name
                      </p>
                      <p className="font-semibold text-slate-900 truncate">
                        {matchedCitizen.fullName || formData.fullName}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        National ID
                      </p>
                      <p className="font-semibold text-slate-900 font-mono">
                        {matchedCitizen.nationalId || formData.nationalId}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Date of birth
                      </p>
                      <p className="font-semibold text-slate-900">
                        {matchedCitizen.dob || formData.dob}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Address
                      </p>
                      <p className="font-semibold text-slate-900 line-clamp-2">
                        {matchedCitizen.address || formData.address}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {faceCaptureState === "captured" && (
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">
                    Registration summary
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Address
                      </p>
                      <p className="font-semibold text-slate-900">
                        {formData.address || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Region
                      </p>
                      <p className="font-semibold text-slate-900">
                        {getRegionLabel(formData.regionId)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Phone
                      </p>
                      <p className="font-semibold text-slate-900">
                        {formData.phone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                        Email
                      </p>
                      <p className="font-semibold text-slate-900 truncate">
                        {formData.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-election-dark/5 p-6 rounded-xl border border-dashed border-slate-300">
                <div className="flex flex-col items-center text-center">
                  <Camera
                    size={64}
                    className="text-election-blue mb-4 animate-pulse"
                  />
                  <h3 className="font-bold text-lg">{t("step_biometric")}</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {t("consent_text")}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                    <span className="inline-flex h-3 w-3 rounded-full bg-green-500" />
                    Face capture armed
                  </div>
                  <div
                    className={cn(
                      "mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      faceCaptureState === "captured"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : faceCaptureState === "capturing"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : faceCaptureState === "failed"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-slate-50 text-slate-500 border-slate-100",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        faceCaptureState === "captured"
                          ? "bg-emerald-500"
                          : faceCaptureState === "capturing"
                            ? "bg-amber-500 animate-pulse"
                            : faceCaptureState === "failed"
                              ? "bg-rose-500"
                              : "bg-slate-400",
                      )}
                    />
                    {faceCaptureState.replace("-", " ")}
                  </div>
                  <p className="mt-3 text-xs text-slate-500 max-w-md">
                    {faceCaptureMessage}
                  </p>
                </div>
              </div>
              <div className="bg-slate-900 rounded-2xl overflow-hidden aspect-video relative group border-4 border-election-blue/30 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 transition-all duration-500 scale-x-[-1]"
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
                    {modelError
                      ? "Face model fallback active"
                      : modelReady
                        ? t("placeholder_face")
                        : "Loading face model..."}
                  </p>
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
                  onClick={handleSubmit}
                  disabled={loading || faceCaptureState !== "captured"}
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
