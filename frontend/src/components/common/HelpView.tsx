import React from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  CircleCheckBig,
  Fingerprint,
  HelpCircle,
  Vote,
} from "lucide-react";
import { cn } from "../../utils/cn";

export function HelpView({ setView, role, homeView, t, i18n }: any) {
  const lang = i18n.language as "en" | "am";
  const faqs = [
    {
      q: t("voter_help_q1", {
        defaultValue: "How do I sign in as a voter?",
      }),
      a: t("faq_a1", {
        defaultValue:
          "Use the voter login on the home screen, then complete biometric verification if prompted. After that, you will be taken to your voter hub.",
      }),
    },
    {
      q: t("voter_help_q2", {
        defaultValue: "What do I do after I enter the voter hub?",
      }),
      a: t("faq_a2", {
        defaultValue:
          "Check the current election status, read the ballot instructions, and open the voting booth only when voting is active.",
      }),
    },
    {
      q: t("voter_help_q3", {
        defaultValue: "How do I cast my vote?",
      }),
      a: t("faq_a3", {
        defaultValue:
          "Open the voting booth, select your candidate, review your choice carefully, and submit your ballot once you are certain.",
      }),
    },
    {
      q: t("voter_help_q4", {
        defaultValue: "How do I verify my voting receipt?",
      }),
      a: t("faq_a4", {
        defaultValue:
          "After you vote, save your receipt code and use the receipt verification page if you want to confirm your ballot was recorded.",
      }),
    },
    {
      q: t("voter_help_q5", {
        defaultValue: "What should I do if I need help?",
      }),
      a: t("faq_a5", {
        defaultValue:
          "Return to your voter hub, check the help notes on the page, or contact your local election officer if the issue continues.",
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
            {t("voter_help_center")}
          </div>
          <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-slate-900 leading-[0.9] uppercase">
            {t("help_support")}
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl uppercase tracking-widest">
            {t("voter_help_intro")}
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
              setView(homeView || (role === "VOTER" ? "voter-hub" : "login"))
            }
            className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] hover:underline transition-all"
          >
            {t("return_voter_hub")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <section className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <HelpCircle size={160} />
            </div>
            <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
              <Vote className="text-slate-900" size={28} />
              {t("voter_help_steps")}
            </h3>
            <div className="space-y-6 relative z-10">
              {[
                {
                  title: t("voter_help_step_1_title", {
                    defaultValue: "Sign in safely",
                  }),
                  body: t("voter_help_step_1_body", {
                    defaultValue:
                      "Use your voter account and complete biometric verification if requested.",
                  }),
                },
                {
                  title: t("voter_help_step_2_title", {
                    defaultValue: "Review your ballot",
                  }),
                  body: t("voter_help_step_2_body", {
                    defaultValue:
                      "Read the election status and candidate information before you vote.",
                  }),
                },
                {
                  title: t("voter_help_step_3_title", {
                    defaultValue: "Cast and confirm",
                  }),
                  body: t("voter_help_step_3_body", {
                    defaultValue:
                      "Select your choice, submit your ballot, and keep your receipt code for verification.",
                  }),
                },
              ].map((step) => (
                <div
                  className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100"
                  key={step.title}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <CircleCheckBig size={18} className="text-emerald-500" />
                    <h4 className="font-display font-black text-xl text-slate-900 uppercase tracking-[0.02em]">
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-12 lg:p-16 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Fingerprint size={160} />
            </div>
            <h3 className="text-3xl font-display font-black mb-12 flex items-center gap-4 text-slate-900 uppercase tracking-tighter">
              <Fingerprint className="text-slate-900" size={28} />
              {t("voter_help_faq")}
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
                  <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-2xl font-display font-black mb-6 uppercase tracking-tighter leading-none relative z-10">
              {t("voter_help_tip_title")}
            </h3>
            <p className="text-[10px] text-white/50 mb-10 font-bold uppercase tracking-[0.2em] leading-relaxed relative z-10">
              {t("voter_help_tip_body")}
            </p>
            <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-inner relative z-10 group-hover:bg-white/10 transition-colors">
              <p className="text-[9px] uppercase opacity-40 font-black mb-2 tracking-[0.3em]">
                {t("voter_help_hotline_label")}
              </p>
              <p className="text-5xl font-display font-black tracking-tighter text-white">
                8800
              </p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <h4 className="text-[10px] font-black text-slate-900 mb-8 uppercase tracking-[0.3em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
              {t("voter_help_quick_notes")}
            </h4>
            <div className="space-y-5">
              {[
                t("voter_help_note_1", {
                  defaultValue:
                    "Keep your receipt code private until you verify your ballot.",
                }),
                t("voter_help_note_2", {
                  defaultValue:
                    "Use the voter hub to review election updates and current phase.",
                }),
                t("voter_help_note_3", {
                  defaultValue:
                    "If voting is closed, return when the election opens again.",
                }),
              ].map((note) => (
                <p
                  key={note}
                  className="text-[11px] font-medium text-slate-500 leading-relaxed uppercase tracking-widest"
                >
                  {note}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
