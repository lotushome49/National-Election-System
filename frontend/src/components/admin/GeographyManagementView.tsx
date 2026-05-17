import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Globe2, MapPinned, Plus, Trash2, Waypoints } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchJson } from '../../services/api/client';
import { cn } from '../../utils/cn';
import { getScopeAccessModel, getUserDistrictId, getUserRegionId } from '../../utils/scope';

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

async function apiRequest<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  return fetchJson<T>(`/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export function GeographyManagementView({ setView, token, user }: Props) {
  const scopeAccess = getScopeAccessModel(user);
  const [tab, setTab] = useState<'regions' | 'districts' | 'stations'>('regions');
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(getUserRegionId(user));
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(getUserDistrictId(user));
  const [regionForm, setRegionForm] = useState({ name: '', code: '', description: '' });
  const [districtForm, setDistrictForm] = useState({ name: '', code: '', description: '' });
  const [stationForm, setStationForm] = useState({ name: '', code: '', address: '', capacity: '0', isActive: true });

  const filteredDistricts = useMemo(
    () => districts.filter((district) => !selectedRegionId || district.regionId === selectedRegionId),
    [districts, selectedRegionId],
  );

  const filteredStations = useMemo(
    () =>
      stations.filter((station) => {
        if (selectedRegionId && station.regionId !== selectedRegionId) return false;
        if (selectedDistrictId && station.districtId !== selectedDistrictId) return false;
        return true;
      }),
    [stations, selectedRegionId, selectedDistrictId],
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const regionQuery = '';
      const districtQuery = selectedRegionId ? `?regionId=${selectedRegionId}` : '';
      const stationParams = new URLSearchParams();
      if (selectedRegionId) stationParams.set('regionId', selectedRegionId);
      if (selectedDistrictId) stationParams.set('districtId', selectedDistrictId);
      const stationQuery = stationParams.toString() ? `?${stationParams.toString()}` : '';

      const [regionRes, districtRes, stationRes] = await Promise.all([
        apiRequest<{ data: Region[] }>('/regions', token),
        apiRequest<{ data: District[] }>(`/districts${districtQuery}`, token),
        apiRequest<{ data: PollingStation[] }>(`/polling-stations${stationQuery}`, token),
      ]);

      setRegions(regionRes.data);
      setDistricts(districtRes.data);
      setStations(stationRes.data);

      if (!selectedRegionId && regionRes.data.length > 0) {
        setSelectedRegionId(getUserRegionId(user) ?? regionRes.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load geography data', error);
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
      await apiRequest('/regions', token, {
        method: 'POST',
        body: JSON.stringify(regionForm),
      });
      setRegionForm({ name: '', code: '', description: '' });
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const createDistrict = async () => {
    if (!selectedRegionId) return;
    setSubmitting(true);
    try {
      await apiRequest('/districts', token, {
        method: 'POST',
        body: JSON.stringify({ ...districtForm, regionId: selectedRegionId }),
      });
      setDistrictForm({ name: '', code: '', description: '' });
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const createStation = async () => {
    if (!selectedRegionId || !selectedDistrictId) return;
    setSubmitting(true);
    try {
      await apiRequest('/polling-stations', token, {
        method: 'POST',
        body: JSON.stringify({
          ...stationForm,
          regionId: selectedRegionId,
          districtId: selectedDistrictId,
          capacity: Number(stationForm.capacity),
        }),
      });
      setStationForm({ name: '', code: '', address: '', capacity: '0', isActive: true });
      await loadAll();
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = async (path: string) => {
    if (!confirm('Delete this item?')) return;
    await apiRequest(path, token, { method: 'DELETE' });
    await loadAll();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto pb-20 space-y-10">
      <div className="flex flex-col lg:flex-row justify-between gap-8">
        <div className="space-y-4">
          <button
            onClick={() => setView('dashboard')}
            className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2 transition-colors"
          >
            <ChevronLeft size={14} /> Back to dashboard
          </button>
          <h2 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-slate-900 uppercase">
            Geographic Administration
          </h2>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-2xl">
            Manage regions, districts, and polling stations with server-enforced jurisdiction rules.
          </p>
        </div>

        <div className="px-5 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 h-fit">
          {scopeAccess.summaryLabel}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-2 bg-white border border-slate-100 rounded-[2rem] shadow-sm w-fit">
        <button onClick={() => setTab('regions')} className={cn('px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest', tab === 'regions' ? 'bg-slate-900 text-white' : 'text-slate-500')}>
          Regions
        </button>
        <button onClick={() => setTab('districts')} className={cn('px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest', tab === 'districts' ? 'bg-slate-900 text-white' : 'text-slate-500')}>
          Districts
        </button>
        <button onClick={() => setTab('stations')} className={cn('px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest', tab === 'stations' ? 'bg-slate-900 text-white' : 'text-slate-500')}>
          Polling Stations
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
        <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-100 flex items-center gap-4">
            {tab === 'regions' && <Globe2 className="text-slate-900" />}
            {tab === 'districts' && <MapPinned className="text-slate-900" />}
            {tab === 'stations' && <Waypoints className="text-slate-900" />}
            <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase">
              {tab === 'regions' ? 'Regions' : tab === 'districts' ? 'Districts' : 'Polling Stations'}
            </h3>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-300 font-display font-black uppercase tracking-[0.4em]">
              Loading geography
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tab === 'regions' && regions.map((region) => (
                <div key={region.id} className="px-10 py-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">{region.name}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{region.code} · {(region._count?.districts ?? 0)} districts</p>
                  </div>
                  <button onClick={() => removeItem(`/regions/${region.id}`)} className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {tab === 'districts' && filteredDistricts.map((district) => (
                <div key={district.id} className="px-10 py-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">{district.name}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {district.code} · {district.region?.name} · {(district._count?.pollingStations ?? 0)} polling stations
                    </p>
                  </div>
                  <button onClick={() => removeItem(`/districts/${district.id}`)} className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              {tab === 'stations' && filteredStations.map((station) => (
                <div key={station.id} className="px-10 py-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display font-black text-slate-900 text-xl uppercase tracking-tighter">{station.name}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {station.code} · {station.district?.name} · Capacity {station.capacity} · {station.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <button onClick={() => removeItem(`/polling-stations/${station.id}`)} className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="font-display font-black text-2xl tracking-tighter text-slate-900 uppercase flex items-center gap-3">
              <Plus size={18} /> Create {tab === 'regions' ? 'Region' : tab === 'districts' ? 'District' : 'Polling Station'}
            </h3>

            {tab !== 'regions' && (
              <select
                value={selectedRegionId ?? ''}
                onChange={(event) => setSelectedRegionId(event.target.value || null)}
                disabled={!scopeAccess.canPickRegion && scopeAccess.regionId !== null}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
              >
                <option value="">Select region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            )}

            {tab === 'stations' && (
              <select
                value={selectedDistrictId ?? ''}
                onChange={(event) => setSelectedDistrictId(event.target.value || null)}
                disabled={!scopeAccess.canPickDistrict && scopeAccess.districtId !== null}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900"
              >
                <option value="">Select district</option>
                {filteredDistricts.map((district) => (
                  <option key={district.id} value={district.id}>{district.name}</option>
                ))}
              </select>
            )}

            {tab === 'regions' && (
              <>
                <input value={regionForm.name} onChange={(e) => setRegionForm({ ...regionForm, name: e.target.value })} placeholder="Region name" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900" />
                <input value={regionForm.code} onChange={(e) => setRegionForm({ ...regionForm, code: e.target.value })} placeholder="Code" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900" />
                <textarea value={regionForm.description} onChange={(e) => setRegionForm({ ...regionForm, description: e.target.value })} placeholder="Description" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900 min-h-28" />
                <button disabled={submitting} onClick={() => void createRegion()} className="w-full px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest">
                  Create region
                </button>
              </>
            )}

            {tab === 'districts' && (
              <>
                <input value={districtForm.name} onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })} placeholder="District name" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900" />
                <input value={districtForm.code} onChange={(e) => setDistrictForm({ ...districtForm, code: e.target.value })} placeholder="Code" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900" />
                <textarea value={districtForm.description} onChange={(e) => setDistrictForm({ ...districtForm, description: e.target.value })} placeholder="Description" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900 min-h-28" />
                <button disabled={submitting || !selectedRegionId} onClick={() => void createDistrict()} className="w-full px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest disabled:opacity-50">
                  Create district
                </button>
              </>
            )}

            {tab === 'stations' && (
              <>
                <input value={stationForm.name} onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })} placeholder="Polling station name" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900" />
                <input value={stationForm.code} onChange={(e) => setStationForm({ ...stationForm, code: e.target.value })} placeholder="Code" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-slate-900" />
                <input value={stationForm.address} onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })} placeholder="Address" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900" />
                <input value={stationForm.capacity} onChange={(e) => setStationForm({ ...stationForm, capacity: e.target.value })} placeholder="Capacity" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-medium text-slate-900" />
                <label className="flex items-center gap-3 px-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={stationForm.isActive} onChange={(e) => setStationForm({ ...stationForm, isActive: e.target.checked })} />
                  Active
                </label>
                <button disabled={submitting || !selectedRegionId || !selectedDistrictId} onClick={() => void createStation()} className="w-full px-6 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest disabled:opacity-50">
                  Create polling station
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
