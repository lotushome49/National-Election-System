import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Fingerprint,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { getScopeAccessModel } from "../../utils/scope";

export function VoterRegistryView({ setView, token, t, i18n, user }: any) {
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);
  const [voters, setVoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedVoter, setSelectedVoter] = useState<any | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<"all" | "pending" | "verified">("all");
  const [updatingVerificationId, setUpdatingVerificationId] = useState<string | null>(null);
  const [auditSuccess, setAuditSuccess] = useState(false);

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        const response = await fetch("/api/admin/voters", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setVoters(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVoters();
  }, [token]);

  const filteredVoters = voters.filter((v) => {
    const matchesSearch =
      v.fullName.toLowerCase().includes(search.toLowerCase()) ||
      v.nationalId.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (verificationFilter === "pending") {
      return !v.isVerified;
    }
    if (verificationFilter === "verified") {
      return v.isVerified;
    }
    return true;
  });

  const handleVerifyVoter = async (voterId: string, verified: boolean) => {
    setUpdatingVerificationId(voterId);
    try {
      const response = await fetch(`/api/admin/voters/${voterId}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verified }),
      });
      const resData = await response.json();
      if (response.ok) {
        setVoters((prev) =>
          prev.map((v) => (v.id === voterId ? { ...v, isVerified: verified } : v))
        );
        if (selectedVoter && selectedVoter.id === voterId) {
          setSelectedVoter((prev: any) => prev ? { ...prev, isVerified: verified } : null);
        }
      } else {
        alert(resData.error || "Failed to update voter verification status");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update voter verification status");
    } finally {
      setUpdatingVerificationId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-20"
    >
      <div className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
        <div className="space-y-4">
          <button
            onClick={() => setView("dashboard")}
            className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} /> {t("back_to_dashboard")}
          </button>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase leading-none">
            {t("citizen_registry")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("voter_registry_desc")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {scopeAccess.role !== "ADMIN" && (
            <div className="px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100">
              {scopeAccess.summaryLabel}
            </div>
          )}
          <div className="relative group flex-1 min-w-[300px]">
            <Search
              size={18}
              className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors"
            />
            <input
              type="text"
              placeholder={t("search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-16 pr-8 py-5 bg-white border border-slate-100 rounded-[2rem] w-full outline-none focus:ring-4 focus:ring-slate-50 focus:border-slate-300 transition-all shadow-sm font-medium text-slate-900"
            />
          </div>
          <div className="flex gap-2 p-2 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
            <button
              onClick={() =>
                i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
              }
              className="px-6 py-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all"
            >
              {lang === "en" ? "አማርኛ" : "English"}
            </button>
          </div>
        </div>
      </div>
      {/* Verification Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-50 border border-slate-100 p-2 rounded-[2rem] w-fit shadow-sm">
        <button
          onClick={() => setVerificationFilter("all")}
          className={cn(
            "px-6 py-3 rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-2",
            verificationFilter === "all"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
              : "text-slate-400 hover:text-slate-900"
          )}
        >
          {lang === "en" ? "All Citizens" : "ሁሉንም ዜጎች"}
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black",
            verificationFilter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          )}>
            {voters.length}
          </span>
        </button>
        <button
          onClick={() => setVerificationFilter("pending")}
          className={cn(
            "px-6 py-3 rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-2",
            verificationFilter === "pending"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
              : "text-slate-400 hover:text-amber-600"
          )}
        >
          {lang === "en" ? "Pending Audit" : "ኦዲት የሚጠብቁ"}
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black",
            verificationFilter === "pending" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-600"
          )}>
            {voters.filter(v => !v.isVerified).length}
          </span>
        </button>
        <button
          onClick={() => setVerificationFilter("verified")}
          className={cn(
            "px-6 py-3 rounded-[1.5rem] font-black uppercase tracking-widest text-[9px] transition-all flex items-center gap-2",
            verificationFilter === "verified"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
              : "text-slate-400 hover:text-emerald-600"
          )}
        >
          {lang === "en" ? "Verified" : "የተረጋገጡ"}
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black",
            verificationFilter === "verified" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
          )}>
            {voters.filter(v => v.isVerified).length}
          </span>
        </button>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden mb-12">
        {loading ? (
          <div className="p-32 text-center animate-pulse text-slate-300 font-display font-black uppercase tracking-[0.4em]">
            {t("fetching_registry")}
          </div>
        ) : filteredVoters.length === 0 ? (
          <div className="p-32 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em] font-black font-black">
            {t("no_voters_found")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 uppercase text-[9px] tracking-[0.3em] text-slate-400 font-black">
                  <th className="px-10 py-6">{t("full_name_label")}</th>
                  <th className="px-10 py-6">{t("national_id_label")}</th>
                  <th className="px-10 py-6">{t("region")}</th>
                  <th className="px-10 py-6">{t("biometric_token_label")}</th>
                  <th className="px-10 py-6 text-center">
                    {lang === "en" ? "Verification" : "ማረጋገጫ"}
                  </th>
                  <th className="px-10 py-6 text-center">
                    {t("status_label_table")}
                  </th>
                  <th className="px-10 py-6 text-right">
                    {t("actions_label")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVoters.map((voter: any) => (
                  <tr
                    key={voter.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-10 py-6 font-display">
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tighter leading-none mb-1 group-hover:translate-x-1 transition-transform">
                        {voter.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {voter.email}
                      </p>
                    </td>
                    <td className="px-10 py-6">
                      <span className="font-mono text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm font-black">
                        {voter.nationalId}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {t(voter.regionId)}
                      </span>
                    </td>
                    <td className="px-10 py-6">
                      <span
                        className="text-[10px] text-slate-300 font-mono uppercase tracking-tighter truncate max-w-[120px] block group-hover:text-slate-900 transition-colors"
                        title={voter.biometricHash}
                      >
                        {voter.biometricHash.slice(0, 16)}...
                      </span>
                    </td>
                    {/* Verification Status Badge */}
                    <td className="px-10 py-6 text-center">
                      <span
                        className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-2 w-fit mx-auto",
                          voter.isVerified
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-amber-50 text-amber-600 border border-amber-100",
                        )}
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            voter.isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse",
                          )}
                        />
                        {voter.isVerified
                          ? (lang === "en" ? "Verified" : "የተረጋገጠ")
                          : (lang === "en" ? "Pending Audit" : "ኦዲት የሚጠብቅ")}
                      </span>
                    </td>

                    {/* Voting Status Badge */}
                    <td className="px-10 py-6 text-center">
                      <span
                        className={cn(
                          "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-2 w-fit mx-auto",
                          voter.hasVoted
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-slate-50 text-slate-400 border border-slate-100",
                        )}
                      >
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            voter.hasVoted
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-slate-200",
                          )}
                        />
                        {voter.hasVoted ? t("ballot_cast") : t("awaiting_vote")}
                      </span>
                    </td>

                    {/* Actions Button */}
                    <td className="px-10 py-6 text-right">
                      <button
                        onClick={() => {
                          setSelectedVoter(voter);
                          setIsAuditModalOpen(true);
                          setAuditSuccess(false);
                        }}
                        className={cn(
                          "px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-sm transition-all flex items-center gap-2 w-fit ml-auto border",
                          voter.isVerified
                            ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-100"
                            : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900"
                        )}
                      >
                        {voter.isVerified
                          ? (lang === "en" ? "View ID" : "መታወቂያ")
                          : (lang === "en" ? "Audit" : "ኦዲት")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:opacity-100 transition-opacity opacity-0" />
        <div className="relative z-10">
          <p className="text-5xl font-display font-black tracking-tighter leading-none mb-2">
            {voters.length.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.4em]">
            {t("total_registered_citizens")}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 relative z-10 mt-8 md:mt-0">
          <button className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-3">
            <ShieldCheck size={18} className="text-emerald-500" />
            {t("integrity_check")}
          </button>
          <button className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-slate-900 group-hover:bg-slate-100 transition-all flex items-center gap-3">
            <Download size={18} />
            {t("export_registry")}
          </button>
        </div>
      </div>

      {/* Document Review and Verification Modal */}
      <AnimatePresence>
        {isAuditModalOpen && selectedVoter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden max-w-3xl w-full flex flex-col relative max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="absolute top-6 right-6 p-3 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-950 transition-colors z-20"
              >
                <X size={20} />
              </button>

              <div className="p-8 lg:p-12 overflow-y-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <ShieldCheck size={14} className="text-indigo-500" />
                    {lang === "en" ? "National Security Registry Audit" : "ብሔራዊ ደህንነት መዝገብ ኦዲት"}
                  </p>
                  <h3 className="text-3xl font-display font-black tracking-tighter text-slate-900 uppercase">
                    {lang === "en" ? "Voter Verification Audit" : "የመራጭ ማረጋገጫ ኦዲት"}
                  </h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest leading-relaxed">
                    {lang === "en"
                      ? "Cross-examine biometric template hash with government issued physical credentials."
                      : "በባዮሜትሪክስ እና በብሔራዊ መታወቂያ ሰነዶች መካከል ያለውን ተዛማጅነት ያረጋግጡ::"}
                  </p>
                </div>

                {auditSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-16 text-center space-y-6 bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center"
                  >
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                      <CheckCircle2 size={36} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-display font-black text-emerald-900 uppercase">
                        {lang === "en" ? "Audit Approved Successfully" : "ኦዲቱ በተሳካ ሁኔታ ጸድቋል"}
                      </h4>
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">
                        {lang === "en" ? "Voter credentials locked and biometric voting enabled." : "የመራጭ ማረጋገጫ ተቆልፏል: ባዮሜትሪክ ድምጽ መስጠት ተፈቅዷል::"}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* The Premium Digital ID Card */}
                    <div className="relative rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white shadow-2xl border border-slate-800 overflow-hidden group">
                      {/* Grid background watermark */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:16px_16px]" />
                      {/* Holographic glowing seal */}
                      <div className="absolute top-8 right-8 w-24 h-24 bg-gradient-to-tr from-yellow-500/10 via-teal-500/10 to-indigo-500/10 rounded-full blur-xl border border-white/5 opacity-80 group-hover:scale-110 transition-transform duration-500" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row gap-8">
                        {/* Biometric Portrait Frame */}
                        <div className="w-36 h-48 bg-slate-900/60 border border-slate-700/50 rounded-xl relative flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {/* Laser Scan line animation */}
                          <div className="absolute inset-x-0 h-0.5 bg-emerald-500/80 shadow-[0_0_8px_#10b981] animate-[pulse_2s_infinite] top-1/4" />
                          <Fingerprint size={64} className="text-emerald-500/80 animate-pulse" />
                          <p className="absolute bottom-3 text-[7px] text-slate-400 font-mono tracking-widest uppercase">
                            {lang === "en" ? "BIOMETRIC SECURE" : "ባዮሜትሪክ ጥበቃ"}
                          </p>
                        </div>

                        {/* ID Fields */}
                        <div className="flex-1 space-y-6">
                          <div className="border-b border-white/10 pb-4 flex justify-between items-start">
                            <div>
                              <p className="text-[7px] font-black text-amber-500 uppercase tracking-[0.2em] leading-none mb-1">
                                {lang === "en" ? "FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA" : "የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ"}
                              </p>
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                                {lang === "en" ? "National Identity Card" : "ብሔራዊ መታወቂያ ካርድ"}
                              </h4>
                            </div>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/10 border border-white/10",
                              selectedVoter.isVerified ? "text-emerald-400 border-emerald-500/20" : "text-amber-400 border-amber-500/20"
                            )}>
                              {selectedVoter.isVerified ? "VERIFIED" : "PENDING AUDIT"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{lang === "en" ? "Full Name" : "ሙሉ ስም"}</p>
                              <p className="text-sm font-black uppercase tracking-tight text-white leading-none">{selectedVoter.fullName}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{lang === "en" ? "National ID" : "ብሔራዊ መታወቂያ"}</p>
                              <p className="text-sm font-mono font-black text-amber-400 leading-none">{selectedVoter.nationalId}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{lang === "en" ? "Date of Birth" : "የትውልድ ቀን"}</p>
                              <p className="text-xs font-bold text-white leading-none">{selectedVoter.dob}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{lang === "en" ? "Region / District" : "ክልል / ወረዳ"}</p>
                              <p className="text-xs font-bold text-white uppercase leading-none">{t(selectedVoter.regionId)} / {selectedVoter.districtId || "Bole"}</p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/5">
                            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-1">{lang === "en" ? "Secure Cryptographic Biometric Hash (SHA-256)" : "ደህንነቱ የተጠበቀ ምስጠራ ሃሽ (SHA-256)"}</p>
                            <p className="text-[9px] font-mono text-slate-400 tracking-tighter truncate max-w-md uppercase">{selectedVoter.biometricHash}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Audit Checklist */}
                    <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                        {lang === "en" ? "Verification Checklist" : "የማረጋገጫ ዝርዝር"}
                      </h5>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          <span>{lang === "en" ? "Biometric template integrity hash check passed (100% Unique)" : "የባዮሜትሪክ ታማኝነት ማረጋገጫ አልፏል (100% ልዩ)"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          <span>{lang === "en" ? "National Citizenship Registry matches applicant credentials" : "ብሔራዊ ዜግነት ምዝገባ ከማመልከቻው ጋር ይዛመዳል"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          <span>{lang === "en" ? "Regional boundary jurisdiction and polling station scope validated" : "የክልል ወሰን ክልል እና የድምጽ መስጫ ጣቢያ ወሰን ተረጋግጧል"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Decision Controls */}
                    <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                      {!selectedVoter.isVerified ? (
                        <button
                          onClick={async () => {
                            await handleVerifyVoter(selectedVoter.id, true);
                            setAuditSuccess(true);
                            setTimeout(() => {
                              setIsAuditModalOpen(false);
                              setAuditSuccess(false);
                            }, 1800);
                          }}
                          disabled={updatingVerificationId === selectedVoter.id}
                          className="flex-1 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded-[1.8rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                        >
                          <ShieldCheck size={18} />
                          {updatingVerificationId === selectedVoter.id
                            ? (lang === "en" ? "Approving..." : "እያጸደቀ...")
                            : (lang === "en" ? "Approve Verification" : "ማረጋገጫውን አጽድቅ")}
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await handleVerifyVoter(selectedVoter.id, false);
                            setIsAuditModalOpen(false);
                          }}
                          disabled={updatingVerificationId === selectedVoter.id}
                          className="flex-1 px-8 py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white rounded-[1.8rem] font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-500/10 transition-all flex items-center justify-center gap-2"
                        >
                          <AlertCircle size={18} />
                          {updatingVerificationId === selectedVoter.id
                            ? (lang === "en" ? "Revoking..." : "እየሻረ...")
                            : (lang === "en" ? "Revoke / Mark Pending" : "ማረጋገጫውን ሽር / ወደ ኦዲት መልስ")}
                        </button>
                      )}
                      
                      <button
                        onClick={() => setIsAuditModalOpen(false)}
                        className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[1.8rem] font-black uppercase tracking-widest text-[10px] transition-all"
                      >
                        {lang === "en" ? "Close" : "ዝጋ"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
