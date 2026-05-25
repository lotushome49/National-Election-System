import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, AlertCircle, ArrowLeft, Search } from "lucide-react";
import { fetchJson } from "../../services/api/client";

function getErrorMessage(error: unknown, fallback: string) {
  const body = (error as any)?.body;
  if (typeof body?.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (typeof (error as any)?.message === "string") {
    return (error as any).message;
  }

  return fallback;
}

interface Props {
  setView: (view: string) => void;
  homeView: string;
  token: string | null;
  t: (key: string) => string;
}

export function ReceiptVerificationView({
  setView,
  homeView,
  token,
  t,
}: Props) {
  const [receiptHash, setReceiptHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    verified: boolean;
    electionId: string;
    castAt: string;
  } | null>(null);

  useEffect(() => {
    const cachedHash = sessionStorage.getItem("nehs_last_receipt_hash");
    if (cachedHash) {
      setReceiptHash(cachedHash);
    }
  }, []);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receiptHash.trim()) {
      setError("Enter a receipt hash to verify.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetchJson<{
        data: { verified: boolean; electionId: string; castAt: string };
      }>(`/api/v1/voting/verify/${encodeURIComponent(receiptHash.trim())}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setResult(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Receipt verification failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto pb-20"
    >
      <button
        onClick={() => setView(homeView)}
        className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2 transition-colors mb-8"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="bg-white border border-slate-100 shadow-sm rounded-[3rem] p-10 lg:p-14 space-y-8">
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
            Receipt Verification
          </div>
          <h2 className="text-4xl font-display font-black tracking-tighter text-slate-900 uppercase">
            Verify Ballot Receipt
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
            Enter the receipt hash you received after voting to confirm the
            ballot is in the public ledger.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
              Receipt Hash
            </label>
            <input
              value={receiptHash}
              onChange={(e) => setReceiptHash(e.target.value)}
              placeholder="Paste receipt hash here"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-mono text-slate-900 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Search size={16} />
            {loading ? "Verifying..." : "Verify Receipt"}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {result && (
          <div className="p-6 rounded-[2rem] bg-emerald-50 border border-emerald-100 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-black uppercase tracking-widest text-[10px]">
              <CheckCircle2 size={16} /> Receipt Verified
            </div>
            <p className="text-sm text-emerald-800">
              Your ballot was recorded successfully.
            </p>
            <div className="text-[10px] font-mono text-emerald-900 break-all space-y-1">
              <p>Election ID: {result.electionId}</p>
              <p>Cast at: {new Date(result.castAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
