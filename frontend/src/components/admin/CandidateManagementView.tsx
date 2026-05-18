import { useEffect, useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";
import { cn } from "../../utils/cn";
import { getScopeAccessModel, getUserRegionId, getUserDistrictId } from "../../utils/scope";

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
};

type Election = {
  id: string;
  title: string;
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

interface Props {
  setView: (view: string) => void;
  token: string | null;
  user: any;
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

export function CandidateManagementView({ setView, token, user }: Props) {
  const scopeAccess = getScopeAccessModel(user);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => !form.regionId || d.regionId === form.regionId);
  }, [districts, form.regionId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [candidatesRes, electionsRes, regionsRes, districtsRes] = await Promise.all([
        apiRequest<{ data: Candidate[] }>("/candidates", token),
        apiRequest<{ data: Election[] }>("/elections", token),
        apiRequest<{ data: Region[] }>("/regions", token),
        apiRequest<{ data: District[] }>("/districts", token),
      ]);

      setCandidates(candidatesRes.data || []);
      setElections(electionsRes.data || []);
      setRegions(regionsRes.data || []);
      setDistricts(districtsRes.data || []);

      if (electionsRes.data?.length > 0 && !form.electionId) {
        setForm((prev) => ({ ...prev, electionId: electionsRes.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to load candidate management data", err);
    } finally {
      setLoading(false);
    }
  }, [token, form.electionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.party.trim() || !form.electionId) return;

    setSubmitting(true);
    try {
      const bodyPayload = {
        ...form,
        regionId: form.regionId || undefined,
        districtId: form.districtId || undefined,
        photoUrl: form.photoUrl || "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=150",
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
      alert(err.message || "Failed to save candidate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: Candidate["status"]) => {
    try {
      await apiRequest(`/candidates/${id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: "Administrative review" }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to disqualify/delete this candidate?")) return;
    try {
      await apiRequest(`/candidates/${id}`, token, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete candidate");
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm({
      electionId: elections[0]?.id || "",
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
            Verify party symbols, register contestants, and audit candidacy credentials per regional jurisdiction.
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
                    src={cand.photoUrl || "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=150"}
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
                          cand.status === "APPROVED" && "bg-green-50 text-green-600 border-green-200",
                          cand.status === "PENDING" && "bg-amber-50 text-amber-600 border-amber-200",
                          cand.status === "DISQUALIFIED" && "bg-rose-50 text-rose-600 border-rose-200",
                          !["APPROVED", "PENDING", "DISQUALIFIED"].includes(cand.status) && "bg-slate-50 text-slate-500",
                        )}
                      >
                        {cand.status}
                      </span>
                    </div>
                    <h4 className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                      {cand.fullName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Globe size={12} /> {cand.election?.title || "National Ballot"}
                    </p>
                    <p className="text-[9px] text-slate-300 font-black uppercase">
                      ID: {cand.id} · Region: {cand.regionId || "National Scope"}
                    </p>
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
                        onClick={() => handleStatusChange(cand.id, "DISQUALIFIED")}
                        className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-650 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        Disqualify
                      </button>
                    </>
                  )}

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
                {modalMode === "create" ? "Register Candidate" : "Edit Candidate"}
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
                <select
                  required
                  value={form.electionId}
                  onChange={(e) => setForm({ ...form, electionId: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                >
                  <option value="">Select an election</option>
                  {elections.map((el) => (
                    <option key={el.id} value={el.id}>{el.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                    Full Name
                  </label>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, party: e.target.value })}
                    placeholder="e.g. Unity Alliance"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Candidate Bio
                </label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Contestant professional background and political focus..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900 min-h-20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                    Region Jurisdiction
                  </label>
                  <select
                    value={form.regionId}
                    onChange={(e) => setForm({ ...form, regionId: e.target.value, districtId: "" })}
                    disabled={!scopeAccess.canPickRegion && scopeAccess.regionId !== null}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="">National Scope</option>
                    {regions.map((rg) => (
                      <option key={rg.id} value={rg.id}>{rg.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                    District Jurisdiction
                  </label>
                  <select
                    value={form.districtId}
                    onChange={(e) => setForm({ ...form, districtId: e.target.value })}
                    disabled={!scopeAccess.canPickDistrict && scopeAccess.districtId !== null}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="">Regional/Global Scope</option>
                    {filteredDistricts.map((ds) => (
                      <option key={ds.id} value={ds.id}>{ds.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 block">
                  Photo URL
                </label>
                <input
                  value={form.photoUrl}
                  onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-50"
              >
                {modalMode === "create" ? "Register Contestant" : "Save Changes"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
