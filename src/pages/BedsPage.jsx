import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Bed,
  DoorOpen,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function BedsPage({ onAllocateBed, onNavigate }) {
  const { activeProperty, showToast } = useAuth();
  const [vacantBeds, setVacantBeds] = useState([]);
  const [allBeds, setAllBeds] = useState([]);
  const [viewMode, setViewMode] = useState('vacant'); // 'vacant' or 'all'
  const [loading, setLoading] = useState(true);

  // Filters
  const [acFilter, setAcFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchBeds = async () => {
    try {
      setLoading(true);
      if (viewMode === 'vacant') {
        const data = await api.getVacantBeds({
          propertyId: activeProperty?.id || '',
          acType: acFilter,
          roomType: roomTypeFilter
        });
        setVacantBeds(data);
      } else {
        const data = await api.getBeds({
          propertyId: activeProperty?.id || ''
        });
        setAllBeds(data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [activeProperty, viewMode, acFilter, roomTypeFilter]);

  const handleUpdateStatus = async (bedId, newStatus) => {
    try {
      await api.updateBedStatus(bedId, { status: newStatus });
      showToast(`Bed status updated to ${newStatus}.`);
      fetchBeds();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const list = viewMode === 'vacant' ? vacantBeds : allBeds;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              {viewMode === 'vacant' ? '⚡ Available / Vacant Beds Finder' : 'All Bed Roster'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {vacantBeds.length} Vacant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Instantly search empty beds by room type & AC for rapid prospect onboarding
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex p-1 rounded-xl bg-slate-200/80 border border-slate-300">
          <button
            onClick={() => setViewMode('vacant')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'vacant' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Vacant Only ({vacantBeds.length})
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All Beds
          </button>
        </div>
      </div>

      {/* Fast Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <select
          value={roomTypeFilter}
          onChange={(e) => setRoomTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Sharing Types</option>
          <option value="single">Single Sharing</option>
          <option value="double">Double Sharing</option>
          <option value="triple">Triple Sharing</option>
          <option value="four_sharing">4-Sharing</option>
        </select>

        <select
          value={acFilter}
          onChange={(e) => setAcFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">AC & Non-AC</option>
          <option value="ac">Air Conditioned Only</option>
          <option value="non_ac">Non-AC Only</option>
        </select>
      </div>

      {/* Bed Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Scanning inventory...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Bed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No vacant beds matching filters</h3>
          <p className="text-xs text-slate-400 mt-1">Try relaxing the AC or room type criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map(bed => {
            const isVacant = bed.status === 'available';
            const isOccupied = bed.status === 'occupied';
            const isMaintenance = bed.status === 'maintenance';

            return (
              <div
                key={bed.id}
                className={`bg-white rounded-2xl border p-4 transition flex flex-col justify-between ${isVacant ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-sm' : 'border-slate-200'}`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-extrabold ${isVacant ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 text-slate-700'}`}>
                        {bed.bed_number}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">Room {bed.room_number}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{bed.floor_name || '1st Floor'}</div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isVacant ? 'bg-emerald-100 text-emerald-800' : (isOccupied ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800')}`}>
                      {bed.status}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Room Type:</span>
                      <span className="font-semibold capitalize text-slate-800">{bed.room_type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Cooling / Bath:</span>
                      <span className="font-semibold text-slate-800 uppercase text-[10px]">
                        {bed.ac_type === 'ac' ? '❄️ AC' : 'Non-AC'} • {bed.bathroom_type}
                      </span>
                    </div>
                    {isOccupied && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Resident:</span>
                        <span className="font-bold text-slate-900 truncate max-w-[120px]">{bed.resident_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">Monthly Rent</div>
                    <div className="text-sm font-extrabold text-slate-900">₹{bed.monthly_rent?.toLocaleString('en-IN')}</div>
                  </div>

                  {isVacant ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onAllocateBed) {
                          onAllocateBed({ roomId: bed.room_id, bedId: bed.id, monthlyRent: bed.monthly_rent, propertyId: bed.property_id });
                        } else if (onNavigate) {
                          onNavigate('checkin');
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Allocate</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      {isMaintenance ? (
                        <button
                          onClick={() => handleUpdateStatus(bed.id, 'available')}
                          className="text-[10px] text-emerald-600 font-bold hover:underline"
                        >
                          Mark Ready
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(bed.id, 'maintenance')}
                          className="text-[10px] text-slate-400 hover:text-rose-600"
                        >
                          Maintenance
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
