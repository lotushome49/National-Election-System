import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Activity, Shield } from "lucide-react";
import { cn } from "../../utils/cn";

export function HelpView({ setView, role, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const faqs = [
    {
      q: t("faq_q1", { defaultValue: "What is the NEHS Platform?" }),
      a: t("faq_a1", {
        defaultValue:
          "The National Election Hub System (NEHS) is Ethiopia's state-of-the-art electronic voting platform designed to ensure transparent, secure, and accessible democratic participation.",
      }),
    },
    {
      q: t("faq_q2", {
        defaultValue: "How does the biometric verification work?",
      }),
      a: t("faq_a2", {
        defaultValue:
          "We use SHA-256 cryptographic hashing to turn your physical fingerprint or facial features into a unique digital string. Your actual biometric image is never stored, ensuring your privacy is protected even in the event of a breach.",
      }),
    },
    {
      q: t("faq_q3", { defaultValue: "Is my vote anonymous?" }),
      a: t("faq_a3", {
        defaultValue:
          "Yes. NEHS uses a multi-layered encryption protocol (Mix-nets). Your vote is decoupled from your identity using cryptographic shuffling before it is added to the public ledger, making it mathematically impossible to link a specific ballot back to a voter.",
      }),
    },
    {
      q: t("faq_q4", { defaultValue: "What is the 'Receipt Hash'?" }),
      a: t("faq_a4", {
        defaultValue:
          "After voting, you receive a unique transaction hash. This hash allows you to independently verify that your ballot was included in the final tally without revealing who you voted for.",
      }),
    },
    {
      q: t("faq_q5", { defaultValue: "How can I register to vote?" }),
      a: t("faq_a5", {
        defaultValue:
          "You can start the pre-registration process online by visiting the registration portal. You'll then need to visit a local election center once to capture your biometric data for identity verification.",
      }),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-6xl mx-auto pb-20"
    >
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-20">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <ShieldCheck size={14} className="text-slate-900" />
            {t("support_terminal_active")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("help_support")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("understanding_infra")}
          </p>
        </div>

        <div className="flex flex-col lg:items-end gap-6">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === "en" ? "am" : "en")
            }
            className="px-8 py-4 bg-white border border-slate-100 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
          >
            {lang === "en" ? "Amharic (አማርኛ)" : "English"}
          </button>
          <button
            onClick={() =>
              setView(
                role === "NONE"
                  ? "login"
                  : role === "VOTER"
                    ? "voter-hub"
                    : "dashboard",
              )
            }
            className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] hover:underline transition-all"
          >
            {t("return_portal")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity size={160} />
            </div>
            <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
              <Activity className="text-slate-900" size={28} />
              {t("faq")}
            </h3>
            <div className="space-y-12 relative z-10">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="border-b border-slate-100 pb-10 last:border-0 last:pb-0 hover:translate-x-1 transition-transform group-faq"
                >
                  <h4 className="font-display font-black text-xl text-slate-900 mb-4 uppercase tracking-[0.02em]">
                    {faq.q}
                  </h4>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck size={160} />
            </div>
            <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
              <ShieldCheck className="text-emerald-500" size={28} />
              {t("security_whitepaper")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-3 tracking-widest">
                  {t("data_at_rest")}
                </p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed uppercase tracking-widest">
                  {t("data_at_rest_desc")}
                </p>
              </div>
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-3 tracking-widest">
                  {t("in_flight_verifiability")}
                </p>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed uppercase tracking-widest">
                  {t("in_flight_verifiability_desc")}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-2xl font-display font-black mb-6 uppercase tracking-tighter leading-none relative z-10">
              {t("need_support")}
            </h3>
            <p className="text-[10px] text-white/50 mb-10 font-bold uppercase tracking-[0.2em] leading-relaxed relative z-10">
              {t("support_desc_v2")}
            </p>
            <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-inner relative z-10 group-hover:bg-white/10 transition-colors">
              <p className="text-[9px] uppercase opacity-40 font-black mb-2 tracking-[0.3em]">
                {t("priority_hotline")}
              </p>
              <p className="text-5xl font-display font-black tracking-tighter text-white">
                8800
              </p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <h4 className="text-[10px] font-black text-slate-900 mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
              {t("platform_stats")}
            </h4>
            <div className="space-y-6 mb-12">
              <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {t("system_uptime")}
                </span>
                <span className="text-[10px] font-mono text-emerald-500 font-black uppercase">
                  {t("uptime_val")}
                </span>
              </div>
              <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {t("encryption_layer")}
                </span>
                <span className="text-[10px] font-mono text-slate-900 font-black uppercase">
                  {t("tls_pgp")}
                </span>
              </div>
              <div className="flex justify-between items-center group-hover:translate-x-1 transition-transform">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  {t("ledger_type")}
                </span>
                <span className="text-[10px] font-mono text-slate-900 font-black uppercase">
                  {t("permissioned")}
                </span>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50">
              <h4 className="font-black text-[9px] mb-8 uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
                <Shield size={12} className="text-slate-900" />
                {t("tech_stack_verified")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Frontend",
                    val: "React 18",
                    color: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    label: "Database",
                    val: "Node 20",
                    color: "bg-slate-900 text-white",
                  },
                  {
                    label: "Security",
                    val: "AES-256",
                    color: "bg-indigo-50 text-indigo-600",
                  },
                  {
                    label: "Network",
                    val: "gRPC/TLS",
                    color: "bg-rose-50 text-rose-600",
                  },
                ].map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <span
                      className={cn(
                        "text-[8px] font-black uppercase px-2 py-0.5 rounded-md inline-block",
                        stat.color,
                      )}
                    >
                      {stat.label}
                    </span>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate">
                      {stat.val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-32 text-center text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] pt-12 border-t border-slate-50 italic">
        {t("unauthorized_access_prohibited")}
      </div>
    </motion.div>
  );
}
