import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Globe2,
  MapPinned,
  Plus,
  Trash2,
  Waypoints,
} from "lucide-react";
import { motion } from "motion/react";
import { fetchJson } from "../../services/api/client";
import { cn } from "../../utils/cn";
import {
  getScopeAccessModel,
  getUserDistrictId,
  getUserRegionId,
} from "../../utils/scope";

type Region = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  _count?: { districts?: number; pollingStations?: number };
};

type District = {
  id: string;
  regionId: string;
  name: string;
  code: string;
  description?: string | null;
  region?: { id: string; name: string; code: string };
  _count?: { pollingStations?: number };
};

type PollingStation = {
  id: string;
  regionId: string;
  districtId: string;
  name: string;
  code: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity: number;
  isActive: boolean;
  region?: { id: string; name: string; code: string };
  district?: { id: string; name: string; code: string };
};

interface Props {
  setView: (view: string) => void;
  token: string | null;
  user: any;
}

function isUnauthorized(error: unknown) {
  return Boolean((error as any)?.status === 401);
}

function isRateLimited(error: unknown) {
  return Boolean((error as any)?.status === 429);
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

export function GeographyManagementView({ setView, token, user }: Props) {
  const scopeAccess = getScopeAccessModel(user);
  const isRegionalAdmin = scopeAccess.role === "REGIONAL_ADMIN";
  const isDistrictAdmin = scopeAccess.role === "DISTRICT_ADMIN";
  const [tab, setTab] = useState<"regions" | "districts" | "stations">(
    isDistrictAdmin ? "stations" : isRegionalAdmin ? "districts" : "regions",
  );
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    getUserRegionId(user),
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    getUserDistrictId(user),
  );
  const [regionForm, setRegionForm] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [districtForm, setDistrictForm] = useState({
    name: "",
    code: "",
    description: "",
  });
  const [stationForm, setStationForm] = useState({
    name: "",
    code: "",
    address: "",
    capacity: "0",
    latitude: "",
    longitude: "",
    isActive: true,
  });
  const [regionEditingId, setRegionEditingId] = useState<string | null>(null);
  const [districtEditingId, setDistrictEditingId] = useState<string | null>(
    null,
  );
  const [stationEditingId, setStationEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isRegionalAdmin && tab === "regions") {
      setTab("districts");
    }
  }, [isRegionalAdmin, tab]);

  useEffect(() => {
    if (isDistrictAdmin && tab !== "stations") {
      setTab("stations");
    }
  }, [isDistrictAdmin, tab]);

  if (isDistrictAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto pb-20 space-y-10"
      >
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div className="space-y-4">
            <button
              onClick={() => setView("dashboard")}
              className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2 transition-colors"
            >
              <ChevronLeft size={14} /> Back to dashboard
            </button>
            <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase">
              District Geography
            </h2>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-2xl">
              Read-only view of the district and polling stations assigned to
              your scope.
            </p>
          </div>

          <div className="px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 h-fit">
            {scopeAccess.summaryLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
              <MapPinned className="text-slate-900" />
              <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
                Districts
              </h3>
            </div>
            {loading ? (
              <div className="p-16 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
                Loading districts
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {districts.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                    No districts found in your scope.
                  </div>
                ) : (
                  districts.map((district) => (
                    <div key={district.id} className="px-10 py-6 space-y-1">
                      <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                        {district.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {district.code} ·{" "}
                        {district.region?.name ?? "Assigned region"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
              <Waypoints className="text-slate-900" />
              <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
                Polling Stations
              </h3>
            </div>
            {loading ? (
              <div className="p-16 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
                Loading polling stations
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {stations.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                    No polling stations found in your scope.
                  </div>
                ) : (
                  stations.map((station) => (
                    <div key={station.id} className="px-10 py-6 space-y-1">
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      if (isDistrictAdmin) {
        const districtParams = new URLSearchParams();
        districtParams.set("page", "1");
        districtParams.set("limit", "1000");
        if (scopeAccess.regionId) {
          districtParams.set("regionId", scopeAccess.regionId);
        }
        if (scopeAccess.districtId) {
          districtParams.set("districtId", scopeAccess.districtId);
        }

        const stationParams = new URLSearchParams();
        stationParams.set("page", "1");
        stationParams.set("limit", "1000");
        if (scopeAccess.regionId) {
          stationParams.set("regionId", scopeAccess.regionId);
        }
        if (scopeAccess.districtId) {
          stationParams.set("districtId", scopeAccess.districtId);
        }

        const [districtRes, stationRes] = await Promise.all([
          apiRequest<{ data: District[] }>(
            `/districts?${districtParams.toString()}`,
            token,
          ),
          apiRequest<{ data: PollingStation[] }>(
            `/polling-stations?${stationParams.toString()}`,
            token,
          ),
        ]);

        setRegions([]);
        setDistricts(Array.isArray(districtRes.data) ? districtRes.data : []);
        setStations(Array.isArray(stationRes.data) ? stationRes.data : []);
        setSelectedRegionId(scopeAccess.regionId);
        setSelectedDistrictId(scopeAccess.districtId);
        return;
      }

      const districtQuery = selectedRegionId
        ? `?page=1&limit=1000&regionId=${selectedRegionId}`
        : "";
      const stationParams = new URLSearchParams();
      stationParams.set("page", "1");
      stationParams.set("limit", "100");
      if (selectedRegionId) stationParams.set("regionId", selectedRegionId);
      if (selectedDistrictId)
        stationParams.set("districtId", selectedDistrictId);
      const stationQuery = stationParams.toString()
        ? `?${stationParams.toString()}`
        : "";

      const [regionRes, districtRes, stationRes] = await Promise.all([
        apiRequest<{ data: Region[] }>("/regions", token),
        apiRequest<{ data: District[] }>(`/districts${districtQuery}`, token),
        apiRequest<{ data: PollingStation[] }>(
          `/polling-stations${stationQuery}`,
          token,
        ),
      ]);

      setRegions(Array.isArray(regionRes.data) ? regionRes.data : []);
      setDistricts(Array.isArray(districtRes.data) ? districtRes.data : []);
      setStations(Array.isArray(stationRes.data) ? stationRes.data : []);

      if (!selectedRegionId && regionRes.data.length > 0) {
        setSelectedRegionId(getUserRegionId(user) ?? regionRes.data[0].id);
      }
    } catch (error) {
      if (isUnauthorized(error)) {
        setView("login");
        return;
      }
      if (isRateLimited(error)) {
        alert(
          "Too many geography requests right now. Please wait a moment and try again.",
        );
        return;
      }
      console.error("Failed to load geography data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [selectedRegionId, selectedDistrictId]);

  const createRegion = async () => {
    setSubmitting(true);
    try {
      if (regionEditingId) {
        await apiRequest(`/regions/${regionEditingId}`, token, {
          method: "PATCH",
          body: JSON.stringify(buildRegionPayload()),
        });
        setRegionEditingId(null);
      } else {
        await apiRequest("/regions", token, {
          method: "POST",
          body: JSON.stringify(buildRegionPayload()),
        });
      }
      setRegionForm({ name: "", code: "", description: "" });
      await loadAll();
    } catch (error) {
      if (isUnauthorized(error)) {
        setView("login");
        return;
      }
      if (isRateLimited(error)) {
        alert(
          "Too many geography requests right now. Please wait a moment and try again.",
        );
        return;
      }
      alert((error as any)?.message || "Failed to save region");
    } finally {
      setSubmitting(false);
    }
  };

  const createDistrict = async () => {
    if (!selectedRegionId) return;
    setSubmitting(true);
    try {
      if (districtEditingId) {
        await apiRequest(`/districts/${districtEditingId}`, token, {
          method: "PATCH",
          body: JSON.stringify(buildDistrictPayload()),
        });
        setDistrictEditingId(null);
      } else {
        await apiRequest("/districts", token, {
          method: "POST",
          body: JSON.stringify(buildDistrictPayload()),
        });
      }
      setDistrictForm({ name: "", code: "", description: "" });
      await loadAll();
    } catch (error) {
      if (isUnauthorized(error)) {
        setView("login");
        return;
      }
      if (isRateLimited(error)) {
        alert(
          "Too many geography requests right now. Please wait a moment and try again.",
        );
        return;
      }
      alert((error as any)?.message || "Failed to save district");
    } finally {
      setSubmitting(false);
    }
  };

  const createStation = async () => {
    if (!selectedRegionId || !selectedDistrictId) return;
    setSubmitting(true);
    try {
      if (stationEditingId) {
        await apiRequest(`/polling-stations/${stationEditingId}`, token, {
          method: "PATCH",
          body: JSON.stringify(buildStationPayload()),
        });
        setStationEditingId(null);
      } else {
        await apiRequest("/polling-stations", token, {
          method: "POST",
          body: JSON.stringify(buildStationPayload()),
        });
      }
      setStationForm({
        name: "",
        code: "",
        address: "",
        capacity: "0",
        latitude: "",
        longitude: "",
        isActive: true,
      });
      await loadAll();
    } catch (error) {
      if (isUnauthorized(error)) {
        setView("login");
        return;
      }
      if (isRateLimited(error)) {
        alert(
          "Too many geography requests right now. Please wait a moment and try again.",
        );
        return;
      }
      alert((error as any)?.message || "Failed to save polling station");
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = async (path: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await apiRequest(path, token, { method: "DELETE" });
      // clear any editing selection if the deleted item was being edited
      if (regionEditingId && path.includes(`/regions/${regionEditingId}`))
        setRegionEditingId(null);
      if (districtEditingId && path.includes(`/districts/${districtEditingId}`))
        setDistrictEditingId(null);
      if (
        stationEditingId &&
        path.includes(`/polling-stations/${stationEditingId}`)
      )
        setStationEditingId(null);
      await loadAll();
    } catch (error) {
      if (isUnauthorized(error)) {
        setView("login");
        return;
      }
      if (isRateLimited(error)) {
        alert(
          "Too many geography requests right now. Please wait a moment and try again.",
        );
        return;
      }
      alert((error as any)?.message || "Failed to delete item");
    }
  };

  if (isDistrictAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto pb-20 space-y-10"
      >
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div className="space-y-4">
            <button
              onClick={() => setView("dashboard")}
              className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2 transition-colors"
            >
              <ChevronLeft size={14} /> Back to dashboard
            </button>
            <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase">
              District Geography
            </h2>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-2xl">
              Read-only view of the district and polling stations assigned to
              your scope.
            </p>
          </div>

          <div className="px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 h-fit">
            {scopeAccess.summaryLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
              <MapPinned className="text-slate-900" />
              <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
                Districts
              </h3>
            </div>
            {loading ? (
              <div className="p-16 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
                Loading districts
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {districts.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                    No districts found in your scope.
                  </div>
                ) : (
                  districts.map((district) => (
                    <div key={district.id} className="px-10 py-6 space-y-1">
                      <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                        {district.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {district.code} · {district.region?.name ?? "Assigned region"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
              <Waypoints className="text-slate-900" />
              <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
                Polling Stations
              </h3>
            </div>
            {loading ? (
              <div className="p-16 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
                Loading polling stations
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {stations.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
                    No polling stations found in your scope.
                  </div>
                ) : (
                  stations.map((station) => (
                    <div key={station.id} className="px-10 py-6 space-y-1">
                      <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                        {station.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {station.code} · {station.district?.name ?? "Assigned district"} · Capacity {station.capacity}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto pb-20 space-y-10"
    >
      <div className="flex flex-col lg:flex-row justify-between gap-8">
        <div className="space-y-4">
          <button
            onClick={() => setView("dashboard")}
            className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} /> Back to dashboard
          </button>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase">
            Geographic Administration
          </h2>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-2xl">
            Manage regions, districts, and polling stations with server-enforced
            jurisdiction rules.
          </p>
        </div>

        <div className="px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 h-fit">
          {scopeAccess.summaryLabel}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-100 rounded-[2rem] shadow-sm w-fit">
        {!isRegionalAdmin && !isDistrictAdmin && (
          <button
            onClick={() => setTab("regions")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
              tab === "regions" ? "bg-slate-900 text-white" : "text-slate-500",
            )}
          >
            Regions
          </button>
        )}
        {!isDistrictAdmin && (
          <button
            onClick={() => setTab("districts")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
              tab === "districts"
                ? "bg-slate-900 text-white"
                : "text-slate-500",
            )}
          >
            Districts
          </button>
        )}
        <button
          onClick={() => setTab("stations")}
          className={cn(
            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
            tab === "stations" ? "bg-slate-900 text-white" : "text-slate-500",
          )}
        >
          Polling Stations
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
        <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
            {tab === "regions" && <Globe2 className="text-slate-900" />}
            {tab === "districts" && <MapPinned className="text-slate-900" />}
            {tab === "stations" && <Waypoints className="text-slate-900" />}
            <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
              {tab === "regions"
                ? "Regions"
                : tab === "districts"
                  ? "Districts"
                  : "Polling Stations"}
            </h3>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
              Loading geography
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tab === "regions" &&
                !isRegionalAdmin &&
                regions.map((region) => (
                  <div
                    key={region.id}
                    className={cn(
                      "px-10 py-6 flex items-center justify-between gap-4",
                      regionEditingId === region.id ? "bg-slate-50" : "",
                    )}
                  >
                    <div
                      onClick={() => {
                        setRegionEditingId(region.id);
                        setRegionForm({
                          name: region.name,
                          code: region.code,
                          description: region.description ?? "",
                        });
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                        {region.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {region.code} · {region._count?.districts ?? 0}{" "}
                        districts
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeItem(`/regions/${region.id}`)}
                        className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

              {tab === "districts" &&
                filteredDistricts.map((district) => (
                  <div
                    key={district.id}
                    className={cn(
                      "px-10 py-6 flex items-center justify-between gap-4",
                      districtEditingId === district.id ? "bg-slate-50" : "",
                    )}
                  >
                    <div
                      onClick={() => {
                        setDistrictEditingId(district.id);
                        setDistrictForm({
                          name: district.name,
                          code: district.code,
                          description: district.description ?? "",
                        });
                        setSelectedRegionId(district.regionId);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                        {district.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {district.code} · {district.region?.name} ·{" "}
                        {district._count?.pollingStations ?? 0} polling stations
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeItem(`/districts/${district.id}`)}
                        className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

              {tab === "stations" &&
                filteredStations.map((station) => (
                  <div
                    key={station.id}
                    className={cn(
                      "px-10 py-6 flex items-center justify-between gap-4",
                      stationEditingId === station.id ? "bg-slate-50" : "",
                    )}
                  >
                    <div
                      onClick={() => {
                        setStationEditingId(station.id);
                        setStationForm({
                          name: station.name,
                          code: station.code,
                          address: station.address ?? "",
                          capacity: String(station.capacity),
                          latitude:
                            station.latitude === null ||
                            station.latitude === undefined
                              ? ""
                              : String(station.latitude),
                          longitude:
                            station.longitude === null ||
                            station.longitude === undefined
                              ? ""
                              : String(station.longitude),
                          isActive: !!station.isActive,
                        });
                        setSelectedRegionId(station.regionId);
                        setSelectedDistrictId(station.districtId);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">
                        {station.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        {station.code} · {station.district?.name} · Capacity{" "}
                        {station.capacity} ·{" "}
                        {station.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          removeItem(`/polling-stations/${station.id}`)
                        }
                        className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase flex items-center gap-3">
              <Plus size={18} /> Create{" "}
              {tab === "regions"
                ? "Region"
                : tab === "districts"
                  ? "District"
                  : "Polling Station"}
            </h3>

            {tab !== "regions" &&
              ((isRegionalAdmin || isDistrictAdmin) &&
              (selectedRegionId || isDistrictAdmin) ? (
                <div className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black uppercase tracking-widest text-slate-500">
                  {isDistrictAdmin
                    ? "District scope locked to assigned station area"
                    : "Region locked to assigned scope"}
                </div>
              ) : (
                <select
                  value={selectedRegionId ?? ""}
                  onChange={(event) =>
                    setSelectedRegionId(event.target.value || null)
                  }
                  disabled={
                    !scopeAccess.canPickRegion && scopeAccess.regionId !== null
                  }
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
                >
                  <option value="">Select region</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              ))}

            {tab === "stations" && !isDistrictAdmin && (
              <select
                value={selectedDistrictId ?? ""}
                onChange={(event) =>
                  setSelectedDistrictId(event.target.value || null)
                }
                disabled={
                  !scopeAccess.canPickDistrict &&
                  scopeAccess.districtId !== null
                }
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
              >
                <option value="">Select district</option>
                {filteredDistricts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            )}

            {tab === "stations" && isDistrictAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black uppercase tracking-widest text-slate-500">
                  Region: {selectedRegionId ?? "Assigned"}
                </div>
                <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black uppercase tracking-widest text-slate-500">
                  District: {selectedDistrictId ?? "Assigned"}
                </div>
              </div>
            )}

            {tab === "regions" && !isRegionalAdmin && (
              <>
                <input
                  value={regionForm.name}
                  onChange={(e) =>
                    setRegionForm({ ...regionForm, name: e.target.value })
                  }
                  placeholder="Region name"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
                />
                <input
                  value={regionForm.code}
                  onChange={(e) =>
                    setRegionForm({ ...regionForm, code: e.target.value })
                  }
                  placeholder="Code"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
                />
                <textarea
                  value={regionForm.description}
                  onChange={(e) =>
                    setRegionForm({
                      ...regionForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900 min-h-28"
                />
                <div className="flex gap-3">
                  <button
                    disabled={submitting}
                    onClick={() => void createRegion()}
                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest"
                  >
                    {regionEditingId ? "Update region" : "Create region"}
                  </button>
                  {regionEditingId && (
                    <button
                      onClick={() => {
                        setRegionEditingId(null);
                        setRegionForm({ name: "", code: "", description: "" });
                      }}
                      className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}

            {tab === "districts" && !isDistrictAdmin && (
              <>
                <input
                  value={districtForm.name}
                  onChange={(e) =>
                    setDistrictForm({ ...districtForm, name: e.target.value })
                  }
                  placeholder="District name"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
                />
                <input
                  value={districtForm.code}
                  onChange={(e) =>
                    setDistrictForm({ ...districtForm, code: e.target.value })
                  }
                  placeholder="Code"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
                />
                <textarea
                  value={districtForm.description}
                  onChange={(e) =>
                    setDistrictForm({
                      ...districtForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900 min-h-28"
                />
                <div className="flex gap-3">
                  <button
                    disabled={submitting || !selectedRegionId}
                    onClick={() => void createDistrict()}
                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {districtEditingId ? "Update district" : "Create district"}
                  </button>
                  {districtEditingId && (
                    <button
                      onClick={() => {
                        setDistrictEditingId(null);
                        setDistrictForm({
                          name: "",
                          code: "",
                          description: "",
                        });
                      }}
                      className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}

            {tab === "stations" && (
              <>
                <input
                  value={stationForm.name}
                  onChange={(e) =>
                    setStationForm({ ...stationForm, name: e.target.value })
                  }
                  placeholder="Polling station name"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
                />
                <input
                  value={stationForm.code}
                  onChange={(e) =>
                    setStationForm({ ...stationForm, code: e.target.value })
                  }
                  placeholder="Code"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
                />
                <input
                  value={stationForm.address}
                  onChange={(e) =>
                    setStationForm({ ...stationForm, address: e.target.value })
                  }
                  placeholder="Address"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    value={stationForm.latitude}
                    onChange={(e) =>
                      setStationForm({
                        ...stationForm,
                        latitude: e.target.value,
                      })
                    }
                    placeholder="Latitude"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900"
                  />
                  <input
                    value={stationForm.longitude}
                    onChange={(e) =>
                      setStationForm({
                        ...stationForm,
                        longitude: e.target.value,
                      })
                    }
                    placeholder="Longitude"
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900"
                  />
                </div>
                <input
                  value={stationForm.capacity}
                  onChange={(e) =>
                    setStationForm({ ...stationForm, capacity: e.target.value })
                  }
                  placeholder="Capacity"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900"
                />
                <label className="flex items-center gap-3 px-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={stationForm.isActive}
                    onChange={(e) =>
                      setStationForm({
                        ...stationForm,
                        isActive: e.target.checked,
                      })
                    }
                  />
                  Active
                </label>
                <div className="flex gap-3">
                  <button
                    disabled={
                      submitting || !selectedRegionId || !selectedDistrictId
                    }
                    onClick={() => void createStation()}
                    className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {stationEditingId
                      ? "Update polling station"
                      : "Create polling station"}
                  </button>
                  {stationEditingId && (
                    <button
                      onClick={() => {
                        setStationEditingId(null);
                        setStationForm({
                          name: "",
                          code: "",
                          address: "",
                          capacity: "0",
                          isActive: true,
                        });
                      }}
                      className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
