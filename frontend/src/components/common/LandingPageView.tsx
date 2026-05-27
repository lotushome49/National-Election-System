import React from "react";
import { motion } from "motion/react";
import {
  Vote,
  Fingerprint,
  ShieldCheck,
  UserCheck,
  FileCheck,
  Lock,
  Shield,
  Globe,
  Activity,
  ChevronRight,
  Clock,
  BarChart3,
  Users,
  CheckCircle2,
  HelpCircle,
  Database,
} from "lucide-react";

type LandingPageViewProps = {
  setView: (view: string) => void;
  token: string | null;
  role: string;
  t: (key: string) => string;
  i18n: any;
};

export function LandingPageView({
  setView,
  token,
  role,
  t,
  i18n,
}: LandingPageViewProps) {
  const lang = i18n.language as "en" | "am";
  const isLoggedIn = Boolean(token);

  // Translation helpers specifically for Landing page
  const text = {
    heroTitle:
      lang === "en"
        ? "Secure, Biometric &Cryptographically Verifiable Elections"
        : "ባዮሜትሪክስ እና ክሪፕቶግራፊ የታገዘ አስተማማኝ ምርጫ",
    heroSubtitle:
      lang === "en"
        ? "NEHS is Ethiopia's state-of-the-art secure election platform. Using advanced facial structure algorithms, cryptographic isolation of voter identities, and immutable dual-audits to ensure every single vote is secure and private."
        : "የኢትዮጵያ ብሔራዊ ምርጫ ሥርዓት ዘመናዊ፣ አስተማማኝ እና ግልጽ ቴክኖሎጂ። በባዮሜትሪክስ የፊት ገጽታ መለያ፣ በሚስጥራዊ ማንነት መለየት እና በማይለወጥ የኦዲት መዝገብ የተገነባ።",
    ctaRegister: lang === "en" ? "Register as Voter" : "አዲስ መራጭ ይመዝገቡ",
    ctaLogin: lang === "en" ? "Sign In to Portal" : "ወደ መግቢያ ገጽ ይሂዱ",
    ctaDashboard: lang === "en" ? "Go to Dashboard" : "ወደ ዳሽቦርድ ይሂዱ",
    ctaVerify: lang === "en" ? "Verify Audit Receipt" : "ደረሰኝ ያረጋግጡ",
    sectionFeatures: lang === "en" ? "Key Pillars" : "ዋና መሠረቶች",
    sectionFeaturesSub:
      lang === "en"
        ? "Engineered for unmatched security and voter confidence"
        : "ለላቀ ደህንነት እና ለመራጮች እምነት ታስቦ የተሰራ",
    sectionAbout: lang === "en" ? "How the System Works" : "ሥርዓቱ እንዴት ይሰራል?",
    sectionAboutSub:
      lang === "en"
        ? "Follow the four simple stages to cast your vote securely"
        : "ደህንነቱ በተጠበቀ ሁኔታ ለመምረጥ አራቱን ደረጃዎች ይከተሉ",
    statsTitle: lang === "en" ? "Live Network Status" : "የቀጥታ ስርጭት መረብ መረጃ",
    statsSub:
      lang === "en"
        ? "System-wide cryptographic assurance metrics"
        : "በመላው ሀገሪቱ ያሉ የክሪፕቶግራፊክ ማረጋገጫዎች",
  };

  const features = [
    {
      icon: <Fingerprint className="text-et-green" size={28} />,
      title:
        lang === "en"
          ? "Biometric Facial Recognition"
          : "በባዮሜትሪክ የፊት ገጽታ ማረጋገጫ",
      desc:
        lang === "en"
          ? "Powered by state-of-the-art Euclidean and Cosine distance similarity algorithms to prevent identity fraud and ensure one-person-one-vote enforcement."
          : "የማንነት ማጭበርበርን ለመከላከል እና የአንድ ሰው ድምፅ በአንድ ጊዜ ብቻ መቆጠሩን ለማረጋገጥ ዘመናዊ የፊት ገጽታ መለኪያ ቀመርን ይጠቀማል።",
      badge: lang === "en" ? "Zero Fraud" : "ዜሮ ማጭበርበር",
    },
    {
      icon: <ShieldCheck className="text-election-accent" size={28} />,
      title:
        lang === "en"
          ? "Identity-Ballot Decoupling"
          : "የማንነት እና የድምፅ ሚስጥራዊ መለያየት",
      desc:
        lang === "en"
          ? "Voter verification is cryptographically separated from candidate selections. Nobody, not even the election board, can link your identity to your vote."
          : "የመራጩ ማንነት ማረጋገጫ ከድምፅ ምርጫው ጋር በክሪፕቶግራፊክ ተለያይቷል። ማንም ሰው የእርስዎን ማንነት ከሰጡት ድምፅ ጋር ማገናኘት አይችልም።",
      badge: lang === "en" ? "100% Confidential" : "100% ሚስጥራዊ",
    },
    {
      icon: <FileCheck className="text-election-orange" size={28} />,
      title: lang === "en" ? "Dual-Audit Verification" : "የኦዲት ደረሰኝ ማረጋገጫ",
      desc:
        lang === "en"
          ? "Upon voting, get a unique cryptographic token receipt. Verify that your ballot was successfully recorded in the ledger without exposing choices."
          : "ድምፅ ሲሰጡ ልዩ የሆነ የክሪፕቶግራፊክ ደረሰኝ ያገኛሉ። በዚህ ደረሰኝ ምርጫዎ በትክክል መመዝገቡን ማረጋገጥ ይችላሉ።",
      badge: lang === "en" ? "Verifiable" : "ኦዲት የሚደረግ",
    },
    {
      icon: <Globe className="text-slate-700" size={28} />,
      title: lang === "en" ? "Universal Accessibility" : "ለሁሉም ምቹ የሆነ ተደራሽነት",
      desc:
        lang === "en"
          ? "Multilingual interface with complete translation in English, Amharic, and regional languages. Adaptive voter hubs tailored for absolute clarity."
          : "በእንግሊዝኛ፣ በአማርኛ እና በሌሎች ክልላዊ ቋንቋዎች የተዘጋጀ የትርጉም አማራጭ። ለመራጮች ግልጽ በሆነ መንገድ የተሰራ።",
      badge: lang === "en" ? "Inclusive" : "ሁሉንም ያካተተ",
    },
  ];

  const steps = [
    {
      num: "01",
      title: lang === "en" ? "Secure Registration" : "አስተማማኝ ምዝገባ",
      desc:
        lang === "en"
          ? "Provide your National ID and details. Scan your face using our high-fidelity web biometric scanner to establish facial identity nodes."
          : "ብሔራዊ መታወቂያዎን እና አስፈላጊ መረጃዎችን ያስገቡ። የፊት ገጽታዎን በባዮሜትሪክ ስካነራችን አማካኝነት ይመዝግቡ።",
    },
    {
      num: "02",
      title: lang === "en" ? "Strict Biometric Login" : "የባዮሜትሪክ ማረጋገጫ መግቢያ",
      desc:
        lang === "en"
          ? "Access the system via secure face scanning. The system verifies matching biometric templates using local neural computing comparisons."
          : "በፊት ገጽታ መለያ ስካነር በኩል ይግቡ። ስርአቱ ፊቶን ካለፈው ምዝገባ ጋር በማነፃፀር ትክክለኛ ማንነትን ያረጋግጣል።",
    },
    {
      num: "03",
      title: lang === "en" ? "Confidential Voting" : "ሚስጥራዊ ድምፅ አሰጣጥ",
      desc:
        lang === "en"
          ? "Review candidates and make your selections in a highly isolated browser sandboxed environment. Your ballot is immediately encrypted."
          : "እጩዎችን ይመልከቱ እና ምርጫዎን በልዩ ጥበቃ በተደረገለት ገጽ ላይ ያካሂዱ። የሰጡት ድምፅ ወዲያውኑ ይመሰጠራል።",
    },
    {
      num: "04",
      title:
        lang === "en" ? "Instant Cryptographic Receipt" : "የክሪፕቶግራፊክ ደረሰኝ ማግኘት",
      desc:
        lang === "en"
          ? "Receive your digital receipt token. You can verify that your vote remains untampered with inside the immutable central database."
          : "ዲጂታል የደረሰኝ ኮድዎን ይቀበሉ። ድምፅዎ ሳይለወጥ በማእከላዊ ዳታቤዝ ውስጥ መቀመጡን በቀላሉ ያረጋግጡ።",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Dynamic Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-950 p-2.5 rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center">
              <Vote size={24} className="text-white" />
            </div>
            <div>
              <span className="font-display font-extrabold text-2xl tracking-tighter text-slate-900 leading-none block">
                NEHS
              </span>
              <div className="flex gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-et-green"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-et-gold"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-et-red"></span>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">
                  {lang === "en" ? "National Election System" : "ብሔራዊ ምርጫ ሥርዓት"}
                </p>
              </div>
            </div>
          </div>

          {/* Nav Anchors */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#about"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
            >
              {lang === "en" ? "How It Works" : "እንዴት ይሰራል"}
            </a>
            <a
              href="#features"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
            >
              {lang === "en" ? "Features" : "ዋና መለያዎች"}
            </a>
            <a
              href="#stats"
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
            >
              {lang === "en" ? "Live Network" : "ቀጥታ መረጃ"}
            </a>
            <button
              onClick={() => i18n.changeLanguage(lang === "en" ? "am" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Globe size={13} />
              {lang === "en" ? "አማርኛ" : "English"}
            </button>
          </nav>

          {/* Action CTAs based on login status */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button
                onClick={() =>
                  setView(role === "VOTER" ? "voter-hub" : "dashboard")
                }
                className="btn-primary flex items-center gap-2 group shadow-lg shadow-slate-200 cursor-pointer"
              >
                <span>{text.ctaDashboard}</span>
                <ChevronRight
                  size={14}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setView("login")}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {text.ctaLogin}
                </button>
                <button
                  onClick={() => setView("registration")}
                  className="btn-primary shadow-lg shadow-slate-200 cursor-pointer"
                >
                  {text.ctaRegister}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="md:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-et-green/10 border border-et-green/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-et-green animate-pulse" />
              <span className="text-[10px] font-bold text-et-green uppercase tracking-widest">
                {lang === "en"
                  ? "Next-Gen Voting System Enabled"
                  : "ቀጣዩ ትውልድ የምርጫ ቴክኖሎጂ"}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-slate-900 leading-[1.1] max-w-2xl">
              {text.heroTitle}
            </h1>

            <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
              {text.heroSubtitle}
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              {isLoggedIn ? (
                <button
                  onClick={() =>
                    setView(role === "VOTER" ? "voter-hub" : "dashboard")
                  }
                  className="btn-primary px-8 py-4 text-xs tracking-[0.25em] shadow-xl shadow-slate-200 flex items-center gap-2 group cursor-pointer"
                >
                  <span>{text.ctaDashboard}</span>
                  <ChevronRight
                    size={16}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setView("registration")}
                    className="btn-primary px-8 py-4 text-xs tracking-[0.25em] shadow-xl shadow-slate-200 cursor-pointer"
                  >
                    {text.ctaRegister}
                  </button>
                  <button
                    onClick={() => setView("receipt-verification")}
                    className="px-6 py-4 border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-800 text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl transition-all cursor-pointer flex items-center gap-2"
                  >
                    <FileCheck size={14} className="text-slate-400" />
                    {text.ctaVerify}
                  </button>
                </>
              )}
            </div>

            {/* Quick Security Badges */}
            <div className="pt-8 border-t border-slate-100 max-w-md flex justify-between gap-6">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  AES-256 GCM
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  E2E ENCRYPTED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Database size={16} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  IMMUTABLE AUDITS
                </span>
              </div>
            </div>
          </div>

          {/* Hero Right - Interactive Biometric scanner widget */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-80 h-96 bg-slate-900 rounded-[3rem] p-8 shadow-2xl shadow-slate-950/20 overflow-hidden flex flex-col justify-between border border-slate-800/80">
              {/* Graphic Ambient BG */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />

              {/* Grid Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {/* Status Header */}
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-mono text-green-500 uppercase tracking-widest">
                    SYSTEM SECURE
                  </span>
                </div>
                <Fingerprint size={18} className="text-slate-700" />
              </div>

              {/* Scan Area with SVG Face Node Mesh */}
              <div className="relative flex-1 flex items-center justify-center py-6 z-10">
                {/* Scanner Grid Lines */}
                <div className="absolute w-56 h-56 rounded-full border border-dashed border-slate-800 flex items-center justify-center">
                  <div className="absolute w-44 h-44 rounded-full border border-dashed border-slate-800/60" />
                </div>

                {/* Animated Scan Line */}
                <div className="absolute w-60 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent top-[10%] animate-[scan_3s_ease-in-out_infinite] shadow-lg shadow-blue-500/50" />

                {/* Face Scanning SVG Mesh */}
                <svg
                  className="w-36 h-36 text-slate-700/80"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  {/* Outer Face Outline */}
                  <path
                    d="M50 15 C20 15 20 60 30 75 C38 87 45 90 50 90 C55 90 62 87 70 75 C80 60 80 15 50 15 Z"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Facial Nodes */}
                  <circle
                    cx="50"
                    cy="30"
                    r="1.5"
                    className="fill-blue-500 animate-pulse"
                  />
                  <circle cx="38" cy="45" r="1.5" className="fill-blue-500" />
                  <circle cx="62" cy="45" r="1.5" className="fill-blue-500" />
                  <circle cx="50" cy="55" r="1.5" className="fill-blue-500" />
                  <circle
                    cx="50"
                    cy="70"
                    r="1.5"
                    className="fill-blue-500 animate-pulse"
                  />

                  <circle cx="32" cy="62" r="1" className="fill-slate-600" />
                  <circle cx="68" cy="62" r="1" className="fill-slate-600" />

                  {/* Node connecting lines */}
                  <line
                    x1="50"
                    y1="30"
                    x2="38"
                    y2="45"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1="50"
                    y1="30"
                    x2="62"
                    y2="45"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1="38"
                    y1="45"
                    x2="50"
                    y2="55"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1="62"
                    y1="45"
                    x2="50"
                    y2="55"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <line
                    x1="50"
                    y1="55"
                    x2="50"
                    y2="70"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />

                  <line
                    x1="38"
                    y1="45"
                    x2="32"
                    y2="62"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                  <line
                    x1="62"
                    y1="45"
                    x2="68"
                    y2="62"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                  <line
                    x1="32"
                    y1="62"
                    x2="50"
                    y2="70"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                  <line
                    x1="68"
                    y1="62"
                    x2="50"
                    y2="70"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                </svg>

                {/* Euclidean/Cosine Live Output box */}
                <div className="absolute bottom-2 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 font-mono text-[9px] text-slate-400 flex flex-col gap-0.5">
                  <div className="flex justify-between gap-6">
                    <span>EUCLIDEAN DISTANCE:</span>
                    <span className="text-green-500 font-bold">
                      0.428 (PASSED)
                    </span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span>COSINE SIMILARITY:</span>
                    <span className="text-green-500 font-bold">
                      0.962 (PASSED)
                    </span>
                  </div>
                </div>
              </div>

              {/* Secure Token Info Footer */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                    DECOUPLED VERIFIER ACTIVE
                  </span>
                </div>
                <div className="font-mono text-[8px] text-slate-500 tracking-tighter truncate">
                  TXID: 0x8a92bf3d...2ef21a48c (VERIFIED IMMUTABLE)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Status Bar */}
      <section id="stats" className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <span className="text-micro block mb-1">{text.statsTitle}</span>
              <p className="text-slate-500 text-sm font-semibold">
                {text.statsSub}
              </p>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-600">
              <Clock size={14} className="text-slate-400" />
              <span>
                {lang === "en" ? "System Epoch time matches: " : "የመረብ ሰዓት: "}
                {new Date().getFullYear()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-50 border border-slate-100/50 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <Users size={16} className="text-slate-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <h4 className="text-2xl font-display font-black text-slate-900">
                32.4M
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {lang === "en" ? "Registered Voters" : "የተመዘገቡ መራጮች"}
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-100/50 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <Activity size={16} className="text-slate-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <h4 className="text-2xl font-display font-black text-slate-900">
                42,500+
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {lang === "en" ? "Polling Stations" : "የምርጫ ጣቢያዎች"}
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-100/50 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <ShieldCheck size={16} className="text-slate-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <h4 className="text-2xl font-display font-black text-slate-900">
                100%
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {lang === "en" ? "Zero-Trust Ledger" : "ዜሮ ትረስት ኦዲት"}
              </p>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-100/50 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <BarChart3 size={16} className="text-slate-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <h4 className="text-2xl font-display font-black text-slate-900">
                Live
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {lang === "en" ? "Decoupled Verification" : "የተቆራረጠ ማረጋገጫ"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-micro block mb-2 text-et-green">
            {text.sectionFeatures}
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900">
            {text.sectionFeaturesSub}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="bento-card p-8 flex flex-col justify-between hover:translate-y-[-4px] duration-300"
            >
              <div>
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feat.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {feat.desc}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100/50 flex justify-between items-center">
                <span className="px-3 py-1 bg-slate-100 border border-slate-200/50 rounded-xl text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {feat.badge}
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  SECURED BY NEHS{" "}
                  <CheckCircle2 size={12} className="text-green-500" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works / About Timeline Section */}
      <section
        id="about"
        className="py-24 bg-slate-100 border-y border-slate-200/50"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-24">
            <span className="text-micro block mb-2 text-slate-400">
              {text.sectionAbout}
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-slate-900">
              {text.sectionAboutSub}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="relative bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-4xl font-black text-slate-100 block mb-6 leading-none">
                    {st.num}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    {st.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {st.desc}
                  </p>
                </div>

                {/* Small indicator dots/lines */}
                <div className="pt-6 mt-6 border-t border-slate-50 flex items-center justify-between">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Wrapper */}
      <section className="py-24 text-center max-w-4xl mx-auto px-6">
        <div className="bg-slate-900 text-white rounded-[3rem] p-12 md:p-16 relative overflow-hidden border border-slate-800 shadow-2xl">
          {/* Decorative ambient spots */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-et-green/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-display font-black leading-tight max-w-xl mx-auto">
              {lang === "en"
                ? "Ready to Secure the Democratic Process?"
                : "የዴሞክራሲያዊ ሂደታችንን አስተማማኝነት ለማረጋገጥ ዝግጁ ኖት?"}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              {lang === "en"
                ? "Join millions of Ethiopian citizens registering and casting their confidential votes with unmatched safety assurance."
                : "ሚሊዮኖችን በመቀላቀል ደህንነቱ እና ሚስጥራዊነቱ በተጠበቀ ዘመናዊ የምርጫ ሥርዓት ላይ ይመዝገቡ፤ ይሳተፉ።"}
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              {isLoggedIn ? (
                <button
                  onClick={() =>
                    setView(role === "VOTER" ? "voter-hub" : "dashboard")
                  }
                  className="px-8 py-3.5 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer shadow-lg"
                >
                  {text.ctaDashboard}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setView("registration")}
                    className="px-8 py-3.5 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer shadow-lg"
                  >
                    {text.ctaRegister}
                  </button>
                  <button
                    onClick={() => setView("login")}
                    className="px-6 py-3.5 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer"
                  >
                    {text.ctaLogin}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/60 py-12 text-slate-400 text-[11px] font-bold">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Vote size={18} className="text-slate-900" />
            <span className="font-display font-bold text-sm tracking-tight text-slate-900">
              NEHS
            </span>
            <span className="text-slate-300">|</span>
            <span>
              {lang === "en"
                ? "National Election Board of Ethiopia"
                : "የኢትዮጵያ ብሔራዊ ምርጫ ቦርድ"}
            </span>
          </div>

          <div className="flex gap-6">
            <span>
              © {new Date().getFullYear()} NEHS.{" "}
              {lang === "en" ? "All Rights Reserved" : "መብቱ በህግ የተጠበቀ ነው"}
            </span>
            <a
              href="#about"
              className="hover:text-slate-950 transition-colors uppercase tracking-wider"
            >
              {lang === "en" ? "Documentation" : "ዶክመንቴሽን"}
            </a>
            <a
              href="#features"
              className="hover:text-slate-950 transition-colors uppercase tracking-wider"
            >
              {lang === "en" ? "Privacy Policy" : "የግላዊነት ፖሊሲ"}
            </a>
          </div>
        </div>
      </footer>

      {/* CSS Animation injection for the scan bar */}
      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0.1; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}
