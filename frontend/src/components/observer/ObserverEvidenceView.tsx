import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";
import { cn } from "../../utils/cn";
import { unwrapApiData } from "../../utils/mfa";

type EvidenceRecord = {
  id: string;
  reportId?: string | null;
  uploadedBy: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  publicUrl: string;
  checksum?: string | null;
  caption?: string | null;
  createdAt: string;
  updatedAt: string;
  report?: { id: string; title: string } | null;
  uploader?: { id: string; fullName: string; username: string };
};

type ReportDraft = {
  electionId: string;
  pollingStationId: string;
  type: "INCIDENT" | "IRREGULARITY" | "COMPLAINT" | "GENERAL_OBSERVATION";
  title: string;
  description: string;
};

type ReportRecord = {
  id: string;
  electionId: string;
  pollingStationId?: string | null;
  observerId: string;
  type: ReportDraft["type"];
  status: "SUBMITTED" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
  title: string;
  description: string;
  resolution?: string | null;
  resolvedAt?: string | null;
  observer?: { id: string; fullName: string };
  evidenceItems?: Array<{
    id: string;
    originalName: string;
    publicUrl: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

interface Props {
  token: string | null;
  role: string;
  setView: (view: string) => void;
}

type EvidenceListResponse = {
  data: EvidenceRecord[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
};

type ReportListResponse = {
  data: ReportRecord[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
};

async function fetchAuthedRaw<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  return fetchJson<T>(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

async function fetchAuthed<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchJson<T | { data: T }>(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  return unwrapApiData(response);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function previewKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.includes("pdf")) return "pdf";
  return "file";
}

export function ObserverEvidenceView({ token, role, setView }: Props) {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("ALL");
  const [reportStatusDrafts, setReportStatusDrafts] = useState<
    Record<string, string>
  >({});
  const [reportResolutionDrafts, setReportResolutionDrafts] = useState<
    Record<string, string>
  >({});
  const [files, setFiles] = useState<File[]>([]);
  const [report, setReport] = useState<ReportDraft>({
    electionId: "",
    pollingStationId: "",
    type: "GENERAL_OBSERVATION",
    title: "",
    description: "",
  });

  const ownedOnly = role === "OBSERVER";

  const loadEvidence = async () => {
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const payload = await fetchAuthedRaw<EvidenceListResponse>(
        `/api/observer/evidence?ownedOnly=${ownedOnly ? "true" : "false"}`,
        token,
      );
      setEvidence(payload.data ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    if (!token) return;

    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportStatusFilter !== "ALL") {
        params.set("status", reportStatusFilter);
      }

      const payload = await fetchAuthedRaw<ReportListResponse>(
        `/api/observer${params.toString() ? `?${params.toString()}` : ""}`,
        token,
      );

      setReports(payload.data ?? []);
      setReportStatusDrafts((current) => {
        const next = { ...current };
        for (const item of payload.data ?? []) {
          if (!next[item.id]) next[item.id] = item.status;
        }
        return next;
      });
      setReportResolutionDrafts((current) => {
        const next = { ...current };
        for (const item of payload.data ?? []) {
          if (next[item.id] === undefined)
            next[item.id] = item.resolution ?? "";
        }
        return next;
      });
    } catch (err: any) {
      setError(err.message ?? "Failed to load reports");
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvidence();
  }, [token, ownedOnly]);

  useEffect(() => {
    void loadReports();
  }, [token, reportStatusFilter, role]);

  const selectedCount = selectedEvidenceIds.length;
  const evidenceCount = evidence.length;

  const selectedEvidence = useMemo(
    () => evidence.filter((item) => selectedEvidenceIds.includes(item.id)),
    [evidence, selectedEvidenceIds],
  );

  const uploadFiles = async () => {
    if (!token || files.length === 0) return;

    setUploading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const payload = await fetchAuthed<EvidenceRecord[]>(
        "/api/observer/evidence/upload",
        token,
        {
          method: "POST",
          body: formData,
        },
      );

      setEvidence((current) => [...payload, ...current]);
      setFiles([]);
      setSelectedEvidenceIds((current) =>
        Array.from(new Set([...payload.map((item) => item.id), ...current])),
      );
      setMessage(
        `Uploaded ${payload.length} file${payload.length === 1 ? "" : "s"}`,
      );
    } catch (err: any) {
      setError(err.message ?? "Failed to upload evidence");
    } finally {
      setUploading(false);
    }
  };

  const toggleEvidence = (id: string) => {
    setSelectedEvidenceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const removeEvidence = async (id: string) => {
    if (!token) return;

    setError("");
    try {
      await fetchAuthed(`/api/observer/evidence/${id}`, token, {
        method: "DELETE",
      });
      setEvidence((current) => current.filter((item) => item.id !== id));
      setSelectedEvidenceIds((current) =>
        current.filter((item) => item !== id),
      );
      setMessage("Evidence removed");
    } catch (err: any) {
      setError(err.message ?? "Failed to delete evidence");
    }
  };

  const submitReport = async () => {
    if (!token) return;

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await fetchAuthed("/api/observer", token, {
        method: "POST",
        body: JSON.stringify({
          ...report,
          pollingStationId: report.pollingStationId || undefined,
          evidenceIds: selectedEvidenceIds,
        }),
      });

      setReport({
        electionId: "",
        pollingStationId: "",
        type: "GENERAL_OBSERVATION",
        title: "",
        description: "",
      });
      setSelectedEvidenceIds([]);
      setMessage("Report submitted with attached evidence");
      await loadReports();
    } catch (err: any) {
      setError(err.message ?? "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const updateReportStatus = async (reportId: string) => {
    if (!token) return;

    setStatusSavingId(reportId);
    setError("");
    setMessage("");
    try {
      const nextStatus = reportStatusDrafts[reportId] ?? "SUBMITTED";
      const resolution = reportResolutionDrafts[reportId]?.trim() ?? "";

      await fetchAuthed(`/api/observer/${reportId}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          resolution: resolution || undefined,
        }),
      });

      setMessage("Report status updated");
      await loadReports();
    } catch (err: any) {
      setError(err.message ?? "Failed to update report status");
    } finally {
      setStatusSavingId(null);
    }
  };

  const isAdminViewer = role === "ADMIN" || role === "SUPER_ADMIN";
  const workspaceTitle = isAdminViewer
    ? "Evidence review"
    : "Observer evidence";
  const workspaceSummary = isAdminViewer
    ? "Review, moderate, and resolve submitted observer evidence and reports."
    : "Upload photos, videos, and PDFs, preview them locally, and attach selected evidence to a submitted observer report.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-20 space-y-10"
    >
      <button
        onClick={() => setView("dashboard")}
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to dashboard
      </button>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 lg:p-14 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              <ShieldCheck size={14} className="text-slate-900" />
              Controlled evidence lifecycle
            </div>
            <h2 className="text-4xl lg:text-6xl font-display font-black tracking-tighter text-slate-900 uppercase leading-[0.9]">
              {workspaceTitle}
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-2xl uppercase tracking-widest">
              {workspaceSummary}
            </p>
          </div>

          <div className="px-6 py-4 rounded-[2rem] border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 w-fit">
            {evidenceCount} uploaded / {selectedCount} selected
          </div>
        </div>

        {error && (
          <div className="px-5 py-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold">
            {error}
          </div>
        )}
        {message && (
          <div className="px-5 py-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-8">
          {role === "OBSERVER" ? (
            <section className="rounded-[2.5rem] border border-slate-100 bg-slate-50/70 p-8 space-y-6">
              <div className="flex items-center gap-3">
                <UploadCloud size={20} className="text-slate-900" />
                <h3 className="text-xl font-display font-black tracking-tighter uppercase text-slate-900">
                  Upload files
                </h3>
              </div>

              <label className="block border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center cursor-pointer hover:border-slate-900 hover:bg-white transition-all">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf"
                  className="hidden"
                  onChange={(event) =>
                    setFiles(Array.from(event.target.files ?? []))
                  }
                />
                <Plus size={28} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-600">
                  Drop images, videos, or PDFs here
                </p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mt-2">
                  Max 25MB per file, 10 files per upload
                </p>
              </label>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Queued files
                  </p>
                  {files.map((file) => (
                    <div
                      key={`${file.name}-${file.size}`}
                      className="flex items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        Ready
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={uploadFiles}
                disabled={uploading || files.length === 0}
                className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 disabled:opacity-50"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UploadCloud size={18} />
                )}
                Upload evidence
              </button>

              <div className="rounded-[2rem] bg-slate-900 text-white p-6 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
                  Report linkage
                </h4>
                <p className="text-sm leading-relaxed opacity-80">
                  Submit a report using the selected evidence items. Each
                  selected file is linked to the created observer report.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Election ID
                  </label>
                  <input
                    value={report.electionId}
                    onChange={(event) =>
                      setReport({ ...report, electionId: event.target.value })
                    }
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900"
                    placeholder="Paste election UUID"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Polling station ID
                  </label>
                  <input
                    value={report.pollingStationId}
                    onChange={(event) =>
                      setReport({
                        ...report,
                        pollingStationId: event.target.value,
                      })
                    }
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900"
                    placeholder="Optional station UUID"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Report type
                  </label>
                  <select
                    value={report.type}
                    onChange={(event) =>
                      setReport({
                        ...report,
                        type: event.target.value as ReportDraft["type"],
                      })
                    }
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900"
                  >
                    <option value="INCIDENT">Incident</option>
                    <option value="IRREGULARITY">Irregularity</option>
                    <option value="COMPLAINT">Complaint</option>
                    <option value="GENERAL_OBSERVATION">
                      General observation
                    </option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Title
                  </label>
                  <input
                    value={report.title}
                    onChange={(event) =>
                      setReport({ ...report, title: event.target.value })
                    }
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900"
                    placeholder="Short summary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Description
                  </label>
                  <textarea
                    value={report.description}
                    onChange={(event) =>
                      setReport({ ...report, description: event.target.value })
                    }
                    className="w-full min-h-40 p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 resize-y"
                    placeholder="Describe what happened"
                  />
                </div>
              </div>

              <button
                onClick={submitReport}
                disabled={
                  submitting ||
                  !report.electionId ||
                  !report.title ||
                  !report.description
                }
                className="w-full bg-emerald-600 text-white p-5 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-100 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Submit report with evidence
              </button>
            </section>
          ) : (
            <section className="rounded-[2.5rem] border border-slate-100 bg-slate-50/70 p-8 space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-slate-900" />
                <h3 className="text-xl font-display font-black tracking-tighter uppercase text-slate-900">
                  Evidence review mode
                </h3>
              </div>
              <div className="rounded-[2rem] border border-slate-100 bg-white p-8 text-slate-600">
                <p className="font-semibold">
                  {isAdminViewer
                    ? "You can review uploaded evidence, manage report status, and resolve submissions."
                    : "Upload and report creation are restricted to accredited observers."}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {isAdminViewer
                    ? "Evidence uploads remain the observer's responsibility; admin-level users focus on review and moderation."
                    : "You can view uploaded evidence but cannot create or attach new evidence."}
                </p>
              </div>
            </section>
          )}

          <section className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-slate-900" />
                <h3 className="text-xl font-display font-black tracking-tighter uppercase text-slate-900">
                  Evidence library
                </h3>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Preview and select
              </div>
            </div>

            {loading ? (
              <div className="text-slate-300 font-display font-black uppercase tracking-[0.3em]">
                Loading evidence...
              </div>
            ) : evidence.length === 0 ? (
              <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-slate-500 text-sm">
                No evidence uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {evidence.map((item) => {
                  const kind = previewKind(item.mimeType);
                  const selected = selectedEvidenceIds.includes(item.id);

                  return (
                    <article
                      key={item.id}
                      className={cn(
                        "rounded-[2.25rem] border p-4 shadow-sm bg-white transition-all",
                        selected
                          ? "border-slate-900 ring-4 ring-slate-900/5"
                          : "border-slate-100",
                      )}
                    >
                      <div className="aspect-[4/3] rounded-[1.5rem] bg-slate-50 overflow-hidden flex items-center justify-center relative group">
                        {kind === "image" ? (
                          <img
                            src={item.publicUrl}
                            alt={item.originalName}
                            className="w-full h-full object-cover"
                          />
                        ) : kind === "video" ? (
                          <video
                            src={item.publicUrl}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : kind === "pdf" ? (
                          <div className="text-center p-6">
                            <FileText
                              size={48}
                              className="mx-auto text-slate-300 mb-2"
                            />
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                              PDF document
                            </p>
                          </div>
                        ) : (
                          <div className="text-center p-6">
                            <ImageIcon
                              size={48}
                              className="mx-auto text-slate-300 mb-2"
                            />
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                              File preview unavailable
                            </p>
                          </div>
                        )}

                        <button
                          onClick={() =>
                            window.open(
                              item.publicUrl,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="absolute top-3 right-3 px-3 py-2 rounded-xl bg-white/90 backdrop-blur text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-2"
                        >
                          <Eye size={12} /> Open
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-slate-900 break-all">
                              {item.originalName}
                            </h4>
                            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mt-1">
                              {formatFileSize(item.fileSize)} · {item.mimeType}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleEvidence(item.id)}
                            className={cn(
                              "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] transition-all",
                              selected
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {selected ? "Selected" : "Select"}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 bg-slate-50 px-3 py-2 rounded-xl">
                            {item.report?.title
                              ? `Linked to ${item.report.title}`
                              : "Unlinked"}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 bg-slate-50 px-3 py-2 rounded-xl">
                            {item.uploader?.username || item.uploadedBy}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => toggleEvidence(item.id)}
                            className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            Toggle
                          </button>
                          <button
                            onClick={() => removeEvidence(item.id)}
                            className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.25em] hover:bg-rose-100 transition-colors inline-flex items-center gap-2"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="rounded-[2.5rem] border border-slate-100 bg-slate-50 p-8 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Selected evidence
              </h4>
              {selectedEvidence.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Select evidence items above to attach them to the next report.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedEvidence.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleEvidence(item.id)}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.25em] inline-flex items-center gap-2"
                    >
                      <CheckCircle2 size={12} />
                      {item.originalName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 space-y-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-display font-black tracking-tighter uppercase text-slate-900">
                    Report ledger
                  </h3>
                  <p className="text-sm text-slate-400 font-medium uppercase tracking-widest mt-1">
                    Track submitted reports and review their resolution state.
                  </p>
                </div>

                <select
                  value={reportStatusFilter}
                  onChange={(event) =>
                    setReportStatusFilter(event.target.value)
                  }
                  className="px-4 py-3 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900"
                >
                  <option value="ALL">All statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>

              {reportsLoading ? (
                <div className="text-slate-300 font-display font-black uppercase tracking-[0.3em]">
                  Loading reports...
                </div>
              ) : reports.length === 0 ? (
                <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-slate-500 text-sm">
                  No reports found for the current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {reports.map((item) => {
                    const canEdit = isAdminViewer;
                    const currentStatus =
                      reportStatusDrafts[item.id] ?? item.status;
                    const currentResolution =
                      reportResolutionDrafts[item.id] ?? item.resolution ?? "";

                    return (
                      <article
                        key={item.id}
                        className="rounded-[2rem] border border-slate-100 bg-slate-50/80 p-5 space-y-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.25em]">
                                {item.status}
                              </span>
                              <span className="px-3 py-2 rounded-xl bg-white text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">
                                {item.type}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">
                              {item.title}
                            </h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {item.description}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                              {item.observer?.fullName || item.observerId} ·{" "}
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>

                          {canEdit ? (
                            <div className="min-w-[280px] space-y-3">
                              <select
                                value={currentStatus}
                                onChange={(event) =>
                                  setReportStatusDrafts((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900"
                              >
                                <option value="SUBMITTED">Submitted</option>
                                <option value="UNDER_REVIEW">
                                  Under review
                                </option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="DISMISSED">Dismissed</option>
                              </select>
                              <textarea
                                value={currentResolution}
                                onChange={(event) =>
                                  setReportResolutionDrafts((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                placeholder="Resolution or review notes"
                                className="w-full min-h-28 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 resize-y"
                              />
                              <button
                                onClick={() => updateReportStatus(item.id)}
                                disabled={statusSavingId === item.id}
                                className="w-full px-4 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.25em] disabled:opacity-50"
                              >
                                {statusSavingId === item.id
                                  ? "Saving..."
                                  : "Update status"}
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-[280px] rounded-[1.5rem] bg-white border border-slate-100 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                  Resolution
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                  {item.resolvedAt
                                    ? new Date(
                                        item.resolvedAt,
                                      ).toLocaleDateString()
                                    : "Pending"}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {item.resolution ||
                                  "No resolution has been recorded yet."}
                              </p>
                            </div>
                          )}
                        </div>

                        {item.evidenceItems?.length ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.evidenceItems.map((evidenceItem) => (
                              <a
                                key={evidenceItem.id}
                                href={evidenceItem.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 rounded-xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-slate-900 transition-colors"
                              >
                                {evidenceItem.originalName}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
