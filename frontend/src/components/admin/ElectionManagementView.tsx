import { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  Boxes,
  Play,
} from "lucide-react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";
import { cn } from "../../utils/cn";

type Election = {
  id: string;
  title: string;
  description?: string | null;
  type:
    | "PRESIDENTIAL"
    | "PARLIAMENTARY"
    | "LOCAL"
    | "BY_ELECTION"
    | "REFERENDUM";
  status:
    | "DRAFT"
    | "SCHEDULED"
    | "NOMINATION_OPEN"
    | "NOMINATION_CLOSED"
    | "CAMPAIGN"
    | "VOTING_OPEN"
    | "VOTING_CLOSED"
    | "COUNTING"
    | "RESULTS_DECLARED"
    | "DISPUTED"
    | "CANCELLED";
  isNational: boolean;
  maxVotesPerVoter: number;
  nominationStart?: string | null;
  nominationEnd?: string | null;
  campaignStart?: string | null;
  campaignEnd?: string | null;
  votingStart?: string | null;
  votingEnd?: string | null;
};

interface Props {
  setView: (view: string) => void;
  token: string | null;
  user: any;
}

function isUnauthorized(error: unknown) {
  return Boolean((error as any)?.status === 401);
}

function getErrorMessage(error: unknown, fallback: string) {
  const body = (error as any)?.body;
  if (typeof body?.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (body?.errors && typeof body.errors === "object") {
    const firstField = Object.values(body.errors).find(
      (value) => Array.isArray(value) && value.length > 0,
    ) as unknown[] | undefined;

    if (firstField && typeof firstField[0] === "string") {
      return firstField[0];
    }
  }

  if (typeof (error as any)?.message === "string") {
    return (error as any).message;
  }

  return fallback;
}

async function apiRequest<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  return fetchJson<T>(`/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export function ElectionManagementView({ setView, token }: Props) {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "PRESIDENTIAL" as Election["type"],
    isNational: true,
    maxVotesPerVoter: 1,
    nominationStart: "",
    nominationEnd: "",
    campaignStart: "",
    campaignEnd: "",
    votingStart: "",
    votingEnd: "",
  });

  const toInputValue = (value?: string | null) =>
    value ? new Date(value).toISOString().slice(0, 16) : "";

  const toApiValue = (value: string) =>
    value ? new Date(value).toISOString() : undefined;

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      type: form.type,
      isNational: form.isNational,
      maxVotesPerVoter: Number(form.maxVotesPerVoter),
    };

    if (form.description.trim()) {
      payload.description = form.description.trim();
    }

    const nominationStart = toApiValue(form.nominationStart);
    const nominationEnd = toApiValue(form.nominationEnd);
    const campaignStart = toApiValue(form.campaignStart);
    const campaignEnd = toApiValue(form.campaignEnd);
    const votingStart = toApiValue(form.votingStart);
    const votingEnd = toApiValue(form.votingEnd);

    if (nominationStart) payload.nominationStart = nominationStart;
    if (nominationEnd) payload.nominationEnd = nominationEnd;
    if (campaignStart) payload.campaignStart = campaignStart;
    if (campaignEnd) payload.campaignEnd = campaignEnd;
    if (votingStart) payload.votingStart = votingStart;
    if (votingEnd) payload.votingEnd = votingEnd;

    return payload;
  };

  const statusActions: Partial<
    Record<
      Election["status"],
      { label: string; nextStatus: Election["status"]; className: string }
    >
  > = {
    DRAFT: {
      label: "Schedule",
      nextStatus: "SCHEDULED",
      className:
        "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100",
    },
    SCHEDULED: {
      label: "Open Nomination",
      nextStatus: "NOMINATION_OPEN",
      className:
        "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100",
    },
    NOMINATION_OPEN: {
      label: "Close Nomination",
      nextStatus: "NOMINATION_CLOSED",
      className:
        "bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border-orange-100",
    },
    NOMINATION_CLOSED: {
      label: "Start Campaign",
      nextStatus: "CAMPAIGN",
      className:
        "bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border-purple-100",
    },
    CAMPAIGN: {
      label: "Open Voting",
      nextStatus: "VOTING_OPEN",
      className:
        "bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border-orange-100",
    },
    VOTING_OPEN: {
      label: "Close Voting",
      nextStatus: "VOTING_CLOSED",
      className:
        "bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border-rose-100",
    },
    VOTING_CLOSED: {
      label: "Start Counting",
      nextStatus: "COUNTING",
      className:
        "bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white border-slate-100",
    },
    COUNTING: {
      label: "Declare Results",
      nextStatus: "RESULTS_DECLARED",
      className:
        "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100",
    },
    DISPUTED: {
      label: "Resume Counting",
      nextStatus: "COUNTING",
      className:
        "bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white border-amber-100",
    },
  };

  const setViewRef = useRef(setView);
  useEffect(() => {
    setViewRef.current = setView;
  }, [setView]);

  const loadElections = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiRequest<{ data: Election[] }>(
        "/elections?page=1&limit=100",
        token,
      );
      const serverElections = Array.isArray(res.data) ? res.data : [];
      setElections(serverElections);
    } catch (err) {
      if (isUnauthorized(err)) {
        setViewRef.current("login");
        return;
      }
      setElections([]);
      setLoadError(
        getErrorMessage(
          err,
          "Failed to load elections from the online database",
        ),
      );
      console.error("Failed to load elections", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!mounted) return;
      await loadElections();
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);
    try {
      if (modalMode === "create") {
        await apiRequest<{ data: Election }>("/elections", token, {
          method: "POST",
          body: JSON.stringify(buildPayload()),
        });
      } else if (editingId) {
        try {
          await apiRequest(`/elections/${editingId}`, token, {
            method: "PATCH",
            body: JSON.stringify(buildPayload()),
          });
        } catch (updateErr: any) {
          if (
            (updateErr as any)?.status >= 400 &&
            (updateErr as any)?.status < 500
          ) {
            throw updateErr;
          }
          throw updateErr;
        }
      }
      setShowModal(false);
      await loadElections();
    } catch (err: any) {
      if (isUnauthorized(err)) {
        setView("login");
        return;
      }
      alert(getErrorMessage(err, "Failed to save election"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (
    id: string,
    newStatus: Election["status"],
  ) => {
    if (!confirm(`Transition election status to ${newStatus}?`)) return;
    try {
      await apiRequest(`/elections/${id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          reason: "Admin UI phase transition",
        }),
      });
      await loadElections();
    } catch (err: any) {
      if (isUnauthorized(err)) {
        setView("login");
        return;
      }
      alert(getErrorMessage(err, "Failed to transition status"));
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you absolutely sure you want to delete this election? This will delete all candidates and results!",
      )
    )
      return;
    try {
      await apiRequest(`/elections/${id}`, token, {
        method: "DELETE",
      });
      await loadElections();
    } catch (err: any) {
      if (isUnauthorized(err)) {
        setView("login");
        return;
      }
      alert(getErrorMessage(err, "Failed to delete election"));
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      type: "PRESIDENTIAL",
      isNational: true,
      maxVotesPerVoter: 1,
      nominationStart: "",
      nominationEnd: "",
      campaignStart: "",
      campaignEnd: "",
      votingStart: "",
      votingEnd: "",
    });
    setShowModal(true);
  };

  const openEdit = (el: Election) => {
    setModalMode("edit");
    setEditingId(el.id);
    setForm({
      title: el.title,
      description: el.description || "",
      type: el.type,
      isNational: el.isNational,
      maxVotesPerVoter: el.maxVotesPerVoter,
      nominationStart: toInputValue(el.nominationStart),
      nominationEnd: toInputValue(el.nominationEnd),
      campaignStart: toInputValue(el.campaignStart),
      campaignEnd: toInputValue(el.campaignEnd),
      votingStart: toInputValue(el.votingStart),
      votingEnd: toInputValue(el.votingEnd),
    });
    setShowModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-20 space-y-10"
    >
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between gap-8 items-start">
        <div className="space-y-4">
          <button
            onClick={() => setView("dashboard")}
            className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} /> Back to dashboard
          </button>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase leading-none">
            Elections Administration
          </h2>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-2xl leading-relaxed">
            Create elections, define voting scopes, and transition system phases
            from planning to results.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setView("voter-hub-admin")}
            className="px-8 py-4 bg-white border border-slate-100 text-slate-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.35em] shadow-sm hover:text-slate-900 transition-all flex items-center gap-3"
          >
            Open Election Manager
          </button>
          <button
            onClick={openCreate}
            className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.35em] shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            <Plus size={16} />
            Create Election
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
          <Boxes className="text-slate-900" />
          <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
            Active & Pending Elections
          </h3>
        </div>

        {loading ? (
          <div className="p-24 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em] animate-pulse">
            Fetching Elections
          </div>
        ) : loadError ? (
          <div className="p-24 text-center text-rose-500 font-bold uppercase tracking-widest text-sm space-y-4">
            <AlertCircle size={40} className="mx-auto text-rose-200" />
            <p>{loadError}</p>
            <p className="text-slate-400 text-[10px] tracking-[0.25em]">
              Check the backend connection to the online database, then reload.
            </p>
          </div>
        ) : elections.length === 0 ? (
          <div className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-sm space-y-4">
            <AlertCircle size={40} className="mx-auto text-slate-200" />
            <p>No elections found in database</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {elections.map((el) => (
              <div
                key={el.id}
                className="px-10 py-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:bg-slate-50/50 transition-all"
              >
                {/* Details */}
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 uppercase font-black tracking-widest shadow-sm">
                      {el.type}
                    </span>
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                        el.status === "DRAFT" && "bg-slate-100 text-slate-500",
                        el.status === "VOTING_OPEN" &&
                          "bg-orange-100 text-orange-600 border border-orange-200",
                        el.status === "RESULTS_DECLARED" &&
                          "bg-green-100 text-green-600 border border-green-200",
                        el.status === "NOMINATION_OPEN" &&
                          "bg-blue-100 text-blue-600 border border-blue-200",
                        ![
                          "DRAFT",
                          "VOTING_OPEN",
                          "RESULTS_DECLARED",
                          "NOMINATION_OPEN",
                        ].includes(el.status) &&
                          "bg-purple-100 text-purple-600",
                      )}
                    >
                      ● {el.status.replace("_", " ")}
                    </span>
                  </div>
                  <h4 className="font-display font-black text-slate-900 text-2xl uppercase tracking-tighter">
                    {el.title}
                  </h4>
                  {el.description && (
                    <p className="text-slate-400 text-xs font-medium leading-relaxed">
                      {el.description}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    ID: {el.id} · Scope:{" "}
                    {el.isNational ? "NATIONAL" : "REGIONAL"} · Limit:{" "}
                    {el.maxVotesPerVoter} vote
                  </p>
                </div>

                {/* Operations & Phase Transitions */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Transition phase buttons */}
                  {statusActions[el.status] && (
                    <button
                      onClick={() =>
                        handleStatusTransition(
                          el.id,
                          statusActions[el.status]!.nextStatus,
                        )
                      }
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border",
                        statusActions[el.status]!.className,
                      )}
                    >
                      <Play size={12} /> {statusActions[el.status]!.label}
                    </button>
                  )}

                  <button
                    onClick={() => openEdit(el)}
                    className="px-5 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(el.id)}
                    className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Creation/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-xl w-full p-10 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-2xl text-slate-900 uppercase tracking-tighter">
                {modalMode === "create" ? "Create Election" : "Edit Election"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Title
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. 2026 Presidential Election"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Brief synopsis of the scope and ballot conditions..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900 min-h-24 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as Election["type"],
                      })
                    }
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="PRESIDENTIAL">Presidential</option>
                    <option value="PARLIAMENTARY">Parliamentary</option>
                    <option value="LOCAL">Local</option>
                    <option value="BY_ELECTION">By-Election</option>
                    <option value="REFERENDUM">Referendum</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                    Max Votes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxVotesPerVoter}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maxVotesPerVoter: Number(e.target.value),
                      })
                    }
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["nominationStart", "Nomination Start"],
                  ["nominationEnd", "Nomination End"],
                  ["campaignStart", "Campaign Start"],
                  ["campaignEnd", "Campaign End"],
                  ["votingStart", "Voting Start"],
                  ["votingEnd", "Voting End"],
                ].map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                      {label}
                    </label>
                    <input
                      type="datetime-local"
                      value={form[key as keyof typeof form] as string}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [key]: e.target.value,
                        })
                      }
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  id="isNational"
                  checked={form.isNational}
                  onChange={(e) =>
                    setForm({ ...form, isNational: e.target.checked })
                  }
                  className="w-5 h-5 rounded-md border-slate-300"
                />
                <label
                  htmlFor="isNational"
                  className="text-xs font-bold text-slate-700 uppercase tracking-widest cursor-pointer select-none"
                >
                  National Scope Election
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-50"
              >
                {modalMode === "create"
                  ? "Create Election Profile"
                  : "Save Changes"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
