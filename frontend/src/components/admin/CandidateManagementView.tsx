import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  Users,
  Image,
  Globe,
  MapPin,
  CheckCircle,
  FileText,
  Upload,
  Download,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";
import { cn } from "../../utils/cn";
import {
  getScopeAccessModel,
  getUserRegionId,
  getUserDistrictId,
} from "../../utils/scope";

type Candidate = {
  id: string;
  fullName: string;
  party: string;
  partyCode?: string | null;
  bio?: string | null;
  manifesto?: string | null;
  symbol?: string | null;
  photoUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "DISQUALIFIED";
  electionId: string;
  regionId?: string | null;
  districtId?: string | null;
  election?: { title: string };
  documentsJson?: string | null;
};

type Election = {
  id: string;
  title: string;
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
};

type Region = {
  id: string;
  name: string;
};

type District = {
  id: string;
  regionId: string;
  name: string;
};

type CandidateDocument = {
  id?: string;
  publicUrl?: string;
  checksum?: string;
  originalName?: string;
  fileSize?: number;
  uploadedAt?: string;
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

function isNominationReady(status: Election["status"]) {
  return ["NOMINATION_OPEN", "NOMINATION_CLOSED"].includes(status);
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

function parseCandidateDocuments(
  documentsJson?: string | null,
): CandidateDocument[] {
  if (!documentsJson) return [];

  try {
    const parsed = JSON.parse(documentsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CandidateManagementView({ setView, token, user }: Props) {
  const scopeAccess = getScopeAccessModel(user);
  const initialLoadTokenRef = useRef<string | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedCandidateForDocs, setSelectedCandidateForDocs] =
    useState<Candidate | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    electionId: "",
    fullName: "",
    party: "",
    bio: "",
    manifesto: "",
    photoUrl: "",
    regionId: getUserRegionId(user) ?? "",
    districtId: getUserDistrictId(user) ?? "",
  });

  const nominationEligibleElections = useMemo(
    () => elections.filter((election) => isNominationReady(election.status)),
    [elections],
  );

  const selectedElection = useMemo(
    () => elections.find((election) => election.id === form.electionId) ?? null,
    [elections, form.electionId],
  );

  const filteredDistricts = useMemo(() => {
    return districts.filter(
      (d) => !form.regionId || d.regionId === form.regionId,
    );
  }, [districts, form.regionId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [candidatesRes, electionsRes, regionsRes, districtsRes] =
        await Promise.all([
          apiRequest<{ data: Candidate[] }>("/candidates", token),
          apiRequest<{ data: Election[] }>("/elections", token),
          apiRequest<{ data: Region[] }>("/regions", token),
          apiRequest<{ data: District[] }>("/districts", token),
        ]);

      setCandidates(
        Array.isArray(candidatesRes.data) ? candidatesRes.data : [],
      );
      const serverElections = Array.isArray(electionsRes.data)
        ? electionsRes.data
        : [];
      setElections(serverElections);
      setRegions(Array.isArray(regionsRes.data) ? regionsRes.data : []);
      setDistricts(Array.isArray(districtsRes.data) ? districtsRes.data : []);
    } catch (err) {
      if (isUnauthorized(err)) {
        setView("login");
        return;
      }
      setElections([]);
    } finally {
      setLoading(false);
    }
  }, [token, setView]);

  useEffect(() => {
    if (!token) return;
    if (initialLoadTokenRef.current === token) return;
    initialLoadTokenRef.current = token;
    void loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.party.trim() || !form.electionId) {
      alert(
        "Please fill in the election, full name, and party before registering a candidate.",
      );
      return;
    }

    if (!selectedElection) {
      alert("Please select a target election first.");
      return;
    }

    if (!isNominationReady(selectedElection.status)) {
      alert(
        `${selectedElection.title} is currently ${selectedElection.status.replace("_", " ")}. Open nomination before registering candidates.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const bodyPayload = {
        ...form,
        regionId: form.regionId || undefined,
        districtId: form.districtId || undefined,
        photoUrl:
          form.photoUrl ||
          "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=150",
      };

      if (modalMode === "create") {
        await apiRequest("/candidates", token, {
          method: "POST",
          body: JSON.stringify(bodyPayload),
        });
      } else if (editingId) {
        await apiRequest(`/candidates/${editingId}`, token, {
          method: "PATCH",
          body: JSON.stringify(bodyPayload),
        });
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      if (isUnauthorized(err)) {
        setView("login");
        return;
      }
      alert(getErrorMessage(err, "Failed to save candidate"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: Candidate["status"],
  ) => {
    try {
      await apiRequest(`/candidates/${id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: "Administrative review" }),
      });
      await loadData();
    } catch (err: any) {
      if (isUnauthorized(err)) {
        setView("login");
        return;
      }
      alert(getErrorMessage(err, "Failed to update status"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to disqualify/delete this candidate?"))
      return;
    try {
      await apiRequest(`/candidates/${id}`, token, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      if (isUnauthorized(err)) {
        setView("login");
        return;
      }
      alert(getErrorMessage(err, "Failed to delete candidate"));
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm({
      electionId: nominationEligibleElections[0]?.id || elections[0]?.id || "",
      fullName: "",
      party: "",
      bio: "",
      manifesto: "",
      photoUrl: "",
      regionId: getUserRegionId(user) ?? "",
      districtId: getUserDistrictId(user) ?? "",
    });
    setShowModal(true);
  };

  const openEdit = (cand: Candidate) => {
    setModalMode("edit");
    setEditingId(cand.id);
    setForm({
      electionId: cand.electionId,
      fullName: cand.fullName,
      party: cand.party,
      bio: cand.bio || "",
      manifesto: cand.manifesto || "",
      photoUrl: cand.photoUrl || "",
      regionId: cand.regionId || "",
      districtId: cand.districtId || "",
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
            Candidates Registry
          </h2>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-2xl leading-relaxed">
            Verify party symbols, register contestants, and audit candidacy
            credentials per regional jurisdiction.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="px-5 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 flex items-center">
            {scopeAccess.summaryLabel}
          </div>
          <button
            onClick={openCreate}
            className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.35em] shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3"
          >
            <Plus size={16} />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
          <Users className="text-slate-900" />
          <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
            Registered Contestants
          </h3>
        </div>

        {loading ? (
          <div className="p-24 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em] animate-pulse">
            Loading Candidates
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-sm space-y-4">
            <AlertCircle size={40} className="mx-auto text-slate-200" />
            <p>No candidates registered in system</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {candidates.map((cand) => (
              <div
                key={cand.id}
                className="px-10 py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/50 transition-all"
              >
                {/* Left Profile */}
                <div className="flex gap-6 items-start">
                  <img
                    src={
                      cand.photoUrl ||
                      "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=150"
                    }
                    alt={cand.fullName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=150";
                    }}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border border-slate-200 shadow-sm"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-black tracking-widest shadow-sm">
                        {cand.party}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                          cand.status === "APPROVED" &&
                            "bg-green-50 text-green-600 border-green-200",
                          cand.status === "PENDING" &&
                            "bg-amber-50 text-amber-600 border-amber-200",
                          cand.status === "DISQUALIFIED" &&
                            "bg-rose-50 text-rose-600 border-rose-200",
                          !["APPROVED", "PENDING", "DISQUALIFIED"].includes(
                            cand.status,
                          ) && "bg-slate-50 text-slate-500",
                        )}
                      >
                        {cand.status}
                      </span>
                    </div>
                    <h4 className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                      {cand.fullName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Globe size={12} />{" "}
                      {cand.election?.title || "National Ballot"}
                    </p>
                    <p className="text-[9px] text-slate-300 font-black uppercase">
                      ID: {cand.id} · Region:{" "}
                      {cand.regionId || "National Scope"}
                    </p>
                    {parseCandidateDocuments(cand.documentsJson).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {parseCandidateDocuments(cand.documentsJson).map(
                          (doc: CandidateDocument) => (
                            <a
                              key={doc.id || doc.publicUrl || doc.originalName}
                              href={doc.publicUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded border border-slate-100 text-[8px] font-bold uppercase tracking-wider transition-colors"
                              title={`Checksum: ${doc.checksum || "Unknown"}`}
                            >
                              <FileText size={10} className="text-slate-400" />
                              {doc.originalName || "Document"}
                            </a>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                  {cand.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(cand.id, "APPROVED")}
                        className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(cand.id, "DISQUALIFIED")
                        }
                        className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-650 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Disqualify
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setSelectedCandidateForDocs(cand)}
                    className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                  >
                    <FileText size={10} /> Credentials
                  </button>

                  <button
                    onClick={() => openEdit(cand)}
                    className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(cand.id)}
                    className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
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
            className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-xl w-full p-10 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-2xl text-slate-900 uppercase tracking-tighter">
                {modalMode === "create"
                  ? "Register Candidate"
                  : "Edit Candidate"}
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
                  Select Target Election
                </label>
                {modalMode === "create" ? (
                  elections.length > 0 ? (
                    <>
                      <select
                        required
                        value={form.electionId}
                        onChange={(e) =>
                          setForm({ ...form, electionId: e.target.value })
                        }
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                      >
                        <option value="">Select an election</option>
                        {elections.map((el) => (
                          <option key={el.id} value={el.id}>
                            {el.title} · {el.status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      {selectedElection &&
                        !isNominationReady(selectedElection.status) && (
                          <div className="w-full px-6 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] text-amber-700 text-sm font-semibold">
                            {selectedElection.title} is currently{" "}
                            {selectedElection.status.replace("_", " ")}. Open
                            nomination before registering candidates.
                          </div>
                        )}
                      {!selectedElection &&
                        nominationEligibleElections.length === 0 && (
                          <div className="w-full px-6 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] text-amber-700 text-sm font-semibold">
                            No elections are currently in nomination phase. Open
                            nomination on an election first.
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="w-full px-6 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] text-amber-700 text-sm font-semibold">
                      No elections available. Create an election first.
                    </div>
                  )
                ) : elections.length > 0 ? (
                  <select
                    required
                    value={form.electionId}
                    onChange={(e) =>
                      setForm({ ...form, electionId: e.target.value })
                    }
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="">Select an election</option>
                    {elections.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-6 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] text-amber-700 text-sm font-semibold">
                    No elections available. Create an election first.
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Full Name
                </label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  placeholder="e.g. Haile Gebrselassie"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Political Party
                </label>
                <input
                  required
                  value={form.party}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, party: e.target.value })
                  }
                  placeholder="e.g. Unity Alliance"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Candidate Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setForm({ ...form, bio: e.target.value })
                  }
                  placeholder="Contestant professional background and political focus..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900 min-h-20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                    Region Jurisdiction
                  </label>
                  {regions.length > 0 ? (
                    <select
                      value={form.regionId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setForm({
                          ...form,
                          regionId: e.target.value,
                          districtId: "",
                        })
                      }
                      disabled={
                        !scopeAccess.canPickRegion &&
                        scopeAccess.regionId !== null
                      }
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="">National Scope</option>
                      {regions.map((rg) => (
                        <option key={rg.id} value={rg.id}>
                          {rg.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-6 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] text-amber-700 text-sm font-semibold">
                      No regions available. Create a region first.
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                    District Jurisdiction
                  </label>
                  {filteredDistricts.length > 0 ? (
                    <select
                      value={form.districtId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setForm({ ...form, districtId: e.target.value })
                      }
                      disabled={
                        !scopeAccess.canPickDistrict &&
                        scopeAccess.districtId !== null
                      }
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                    >
                      <option value="">Regional/Global Scope</option>
                      {filteredDistricts.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-6 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] text-amber-700 text-sm font-semibold">
                      No districts available. Create a district first.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Photo URL
                </label>
                <input
                  value={form.photoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm({ ...form, photoUrl: e.target.value })
                  }
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-50"
              >
                {modalMode === "create"
                  ? "Register Contestant"
                  : "Save Changes"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Credentials Modal */}
      {selectedCandidateForDocs && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full p-10 space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-2xl text-slate-900 uppercase tracking-tighter">
                  Candidacy Credentials
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Contestant: {selectedCandidateForDocs.fullName} · Party:{" "}
                  {selectedCandidateForDocs.party}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCandidateForDocs(null);
                  setDocUploadError(null);
                }}
                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
                <ShieldCheck size={12} /> Compliance Requirements
              </h4>
              <p className="text-[10px] text-amber-700/80 leading-relaxed font-medium">
                Please upload academic certificates, endorsement letters, and
                clean record audits in secure PDF format. Maximum size per file
                is 25MB.
              </p>
            </div>

            {/* Document List */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Uploaded Credentials
              </h4>

              {(() => {
                const docs = parseCandidateDocuments(
                  selectedCandidateForDocs.documentsJson,
                );

                if (docs.length === 0) {
                  return (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      No credentials uploaded yet. Please use the section below
                      to upload.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {docs.map((doc: CandidateDocument) => (
                      <div
                        key={doc.id || doc.publicUrl || doc.originalName}
                        className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-slate-50 rounded-lg text-slate-400">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate uppercase tracking-tight">
                              {doc.originalName || "Document"}
                            </p>
                            <p className="text-[8px] text-slate-400 font-medium uppercase mt-0.5">
                              {doc.fileSize
                                ? `${Math.round(doc.fileSize / 1024)} KB`
                                : "Size unknown"}{" "}
                              · Uploaded{" "}
                              {doc.uploadedAt
                                ? new Date(doc.uploadedAt).toLocaleDateString()
                                : "Unknown"}
                            </p>
                            <p
                              className="text-[7px] font-mono text-slate-300 truncate mt-0.5"
                              title={`SHA-256: ${doc.checksum || "Unknown"}`}
                            >
                              SHA-256: {doc.checksum || "Unknown"}
                            </p>
                          </div>
                        </div>

                        <a
                          href={doc.publicUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-lg text-slate-500 transition-all flex items-center justify-center shrink-0"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Upload Area */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-display">
                Upload New Credentials
              </h4>

              <div className="relative group border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-[2rem] p-8 text-center transition-all bg-slate-50/50 hover:bg-slate-50">
                <input
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setUploadingDocs(true);
                    setDocUploadError(null);

                    try {
                      const formData = new FormData();
                      for (let i = 0; i < files.length; i++) {
                        if (files[i].type !== "application/pdf") {
                          throw new Error(
                            "Only secure PDF documents are permitted.",
                          );
                        }
                        formData.append("files", files[i]);
                      }

                      const res = await fetchJson<any>(
                        `/api/v1/candidates/${selectedCandidateForDocs.id}/documents`,
                        {
                          method: "POST",
                          body: formData,
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        },
                      );

                      // Re-load the main candidate list
                      await loadData();

                      // Update the selected candidate modal state
                      if (res && res.data) {
                        setSelectedCandidateForDocs(res.data);
                      }
                    } catch (err: any) {
                      setDocUploadError(
                        err.message || "Failed to upload document",
                      );
                    } finally {
                      setUploadingDocs(false);
                    }
                  }}
                  disabled={uploadingDocs}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />

                <div className="space-y-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 group-hover:scale-110 transition-transform">
                    <Upload size={18} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {uploadingDocs
                      ? "Uploading credentials..."
                      : "Drag & drop or click to upload PDF"}
                  </div>
                  <div className="text-[8px] text-slate-400 font-medium uppercase">
                    Verification documents, certificates, letters (Max 25MB)
                  </div>
                </div>
              </div>

              {docUploadError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} /> {docUploadError}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
