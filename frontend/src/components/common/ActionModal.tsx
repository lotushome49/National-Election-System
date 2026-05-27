import { motion } from "motion/react";

interface ActionModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "info" | "warning" | "danger";
  busy?: boolean;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
}

const toneStyles = {
  info: {
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    confirm: "bg-slate-900 hover:bg-slate-800 text-white",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-100",
    confirm: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  danger: {
    badge: "bg-rose-50 text-rose-700 border-rose-100",
    confirm: "bg-rose-500 hover:bg-rose-600 text-white",
  },
} as const;

export function ActionModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Close",
  tone = "info",
  busy = false,
  onConfirm,
  onClose,
}: ActionModalProps) {
  if (!open) return null;

  const styles = toneStyles[tone];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="w-full max-w-xl rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-2xl"
      >
        <div
          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${styles.badge}`}
        >
          {tone}
        </div>
        <h3 className="mt-4 text-2xl font-display font-black tracking-tighter text-slate-900 uppercase">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">{message}</p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            {cancelLabel}
          </button>
          {confirmLabel && onConfirm && (
            <button
              onClick={onConfirm}
              disabled={busy}
              className={`rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${styles.confirm}`}
            >
              {busy ? "Working..." : confirmLabel}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
