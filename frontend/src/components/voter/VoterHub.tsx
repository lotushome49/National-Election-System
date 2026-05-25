import React from "react";
import { motion } from "motion/react";
import { Vote, CheckCircle2, Clock, Search } from "lucide-react";
import { cn } from "../../utils/cn";
import { getScopeAccessModel } from "../../utils/scope";

export function VoterHub({ user, setView, t, electionPhase, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const scopeAccess = getScopeAccessModel(user);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-20"
    >
      {/* Phase banner */}
      <div className="mb-8">
        <div
          className={cn(
            "px-4 py-2 rounded-xl inline-flex items-center gap-3",
            electionPhase === "VOTING"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700",
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              electionPhase === "VOTING" ? "bg-emerald-500" : "bg-blue-500",
            )}
          />
          <span className="text-xs font-black uppercase tracking-wide">
            {t(`phase_${electionPhase.toLowerCase()}`)}
          </span>
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-10 rounded-3xl shadow-sm">
        <h2 className="text-2xl font-black mb-4">{t("voter_hub_title")}</h2>
        <p className="text-sm text-slate-500 mb-6">{t("voter_hub_subtitle")}</p>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                {t("registration_status")}
              </p>
              <p className="font-bold mt-1">
                {user.registered ? t("registered") : t("not_registered")}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                {t("voting_availability")}
              </p>
              <p className="font-bold mt-1">
                {electionPhase === "VOTING" ? t("open") : t("closed")}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            {user.hasVoted ? (
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 />
                  <div>
                    <p className="font-black">{t("vote_recorded")}</p>
                    <p className="text-xs text-slate-500">
                      {t("receipt_token")}
                    </p>
                    <p className="font-mono text-sm">
                      {user.receiptToken ??
                        "TX-" +
                          Math.random().toString(36).slice(2, 12).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setView("receipt-verification")}
                    className="px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] bg-slate-900 text-white"
                  >
                    <Search size={14} className="inline-block mr-2" /> Verify
                    Receipt
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() =>
                    electionPhase === "VOTING" && setView("voting-booth")
                  }
                  disabled={electionPhase !== "VOTING"}
                  className={cn(
                    "px-6 py-3 rounded-xl font-black",
                    electionPhase === "VOTING"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-400",
                  )}
                >
                  <Vote className="inline-block mr-2" />{" "}
                  {electionPhase === "VOTING"
                    ? t("cast_ballot")
                    : t("voting_inactive")}
                </button>
                <button
                  onClick={() => setView("receipt-verification")}
                  className="px-6 py-3 rounded-xl font-black border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400"
                >
                  <Search size={14} className="inline-block mr-2" />
                  Verify Receipt
                </button>
                <div className="text-sm text-slate-500">
                  <Clock size={16} /> {t("polls_close_in_short")}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={() => setView("help")}
            className="text-xs text-slate-500 underline"
          >
            {t("learn_more")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
