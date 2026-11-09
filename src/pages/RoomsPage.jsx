import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  DoorOpen,
  Bed,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wind,
  Bath,
  Sparkles,
  X,
  User,
  ArrowRight
} from 'lucide-react';

export default function RoomsPage({ onAllocateBed, onNavigate }) {
  const { user, activeProperty, showToast } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Filters
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [acFilter, setAcFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Add Room form state
  const [formData, setFormData] = useState({
    propertyId: '',
    buildingId: '',
    floorId: '',
    roomNumber: '',
    roomType: 'double',
    capacity: 2,
    acType: 'ac',
    bathroomType: 'attached',
    baseRent: 12000,
    baseDeposit: 20000,
    amenities: ['Geyser', 'Study Desk', 'Dual Wardrobe', 'Balcony']
  });

  const [propertyDetails, setPropertyDetails] = useState(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const propId = activeProperty?.id || '';
      const data = await api.getRooms({
        propertyId: propId,
        roomType: roomTypeFilter,
        acType: acFilter,
        status: statusFilter,
        search
      });
      setRooms(data);

      if (propId) {
        const propFull = await api.getProperty(propId);
        setPropertyDetails(propFull);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [activeProperty, roomTypeFilter, acFilter, statusFilter, search]);

  const openAddRoomModal = async () => {
    let details = propertyDetails;
    if (!details && activeProperty?.id) {
      try {
        details = await api.getProperty(activeProperty.id);
        setPropertyDetails(details);
      } catch (e) {
        console.warn('Could not pre-fetch property details:', e);
      }
    }

    const firstBldgId = details?.buildings?.[0]?.id || '';
    const matchingFloors = firstBldgId && details?.floors ? details.floors.filter(f => !f.building_id || f.building_id === firstBldgId) : (details?.floors || []);
    const firstFloorId = matchingFloors?.[0]?.id || details?.floors?.[0]?.id || '';

    setFormData({
      propertyId: activeProperty?.id || '',
      buildingId: firstBldgId,
      floorId: firstFloorId,
      roomNumber: '',
      roomType: 'double',
      capacity: 2,
      acType: 'ac',
      bathroomType: 'attached',
      baseRent: 12000,
      baseDeposit: 20000,
      amenities: ['Geyser', 'Study Desk', 'Dual Wardrobe']
    });
    setModalOpen(true);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!formData.roomNumber.trim()) {
      showToast('Please enter a room number', 'error');
      return;
    }
    try {
      const payload = {
        ...formData,
        propertyId: formData.propertyId || activeProperty?.id,
        buildingId: formData.buildingId || propertyDetails?.buildings?.[0]?.id || undefined,
        floorId: formData.floorId || propertyDetails?.floors?.[0]?.id || undefined
      };
      await api.createRoom(payload);
      showToast(`Room ${formData.roomNumber} created with ${formData.capacity} lettered beds!`, 'success');
      setModalOpen(false);
      fetchRooms();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Rooms & Bed Matrix</h1>
          <p className="text-xs text-slate-500 mt-1">Live visual floor layout and bed allocations</p>
        </div>

        <button
          onClick={openAddRoomModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Room (+ Auto Beds)</span>
        </button>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search room number or building..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={roomTypeFilter}
          onChange={(e) => setRoomTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Room Types</option>
          <option value="single">Single Room</option>
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
          <option value="ac">AC Only</option>
          <option value="non_ac">Non-AC Only</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="available">Available (Has vacant bed)</option>
          <option value="partially_occupied">Partially Occupied</option>
          <option value="fully_occupied">Fully Occupied</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Room Matrix Cards */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading room matrix...</div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <DoorOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No rooms match your filters</h3>
          <p className="text-xs text-slate-400 mt-1">Add a new room or adjust search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map(room => {
            const isFull = room.status === 'fully_occupied';
            const isPartial = room.status === 'partially_occupied';
            const isAvailable = room.status === 'available';

            return (
              <div
                key={room.id}
                className={`bg-white rounded-2xl border p-5 transition flex flex-col justify-between ${isFull ? 'border-slate-200 bg-slate-50/40' : (isPartial ? 'border-amber-200 shadow-sm' : 'border-emerald-200 shadow-sm')}`}
              >
                <div>
                  {/* Room Card Top Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center font-display font-extrabold shadow-md">
                        <span className="text-base leading-none">{room.room_number}</span>
                        <span className="text-[9px] text-slate-400 font-normal uppercase">Room</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 capitalize">
                          {room.room_type.replace('_', ' ')} • {room.capacity} Sharing
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {room.floor_name || '1st Floor'} • {room.building_name || 'Main Wing'}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isFull ? 'bg-slate-200 text-slate-700' : (isPartial ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}`}>
                      {room.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Bed Allocation Status Chips */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Beds ({room.occupied_beds} Occupied / {room.available_beds} Vacant):
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(room.beds || []).map(bed => {
                        const isBedOcc = bed.status === 'occupied';
                        const isBedMaint = bed.status === 'maintenance';

                        return (
                          <div
                            key={bed.id}
                            className={`p-2 rounded-xl border text-[11px] flex items-center justify-between ${isBedOcc ? 'bg-slate-100 border-slate-200 text-slate-700' : (isBedMaint ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50/70 border-emerald-200 text-emerald-800 font-semibold')}`}
                          >
                            <div className="truncate">
                              <div className="font-bold flex items-center gap-1">
                                <Bed className="w-3 h-3" />
                                <span>{bed.bed_number}</span>
                              </div>
                              <div className="text-[10px] truncate opacity-80">
                                {isBedOcc ? bed.resident_name : (isBedMaint ? 'Maintenance' : 'Vacant')}
                              </div>
                            </div>
                            {!isBedOcc && !isBedMaint && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onAllocateBed) {
                                    onAllocateBed({ roomId: room.id, bedId: bed.id, monthlyRent: bed.monthly_rent || room.base_rent, propertyId: room.property_id });
                                  } else if (onNavigate) {
                                    onNavigate('checkin');
                                  }
                                }}
                                className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] rounded-md shadow-xs cursor-pointer"
                                title="Allocate Bed"
                              >
                                Allocate
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Bottom Meta */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px] uppercase">
                      {room.ac_type === 'ac' ? '❄️ AC' : 'Non-AC'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px] capitalize">
                      {room.bathroom_type}
                    </span>
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    ₹{room.base_rent?.toLocaleString('en-IN')}<span className="text-[10px] text-slate-400 font-normal">/mo</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-display">Add Room (+ Auto Generate Beds)</h3>
                <p className="text-xs text-slate-500">Beds (e.g. 101-A, 101-B) will be created automatically</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-4 text-xs">
              {/* Building & Floor Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Building / Wing</label>
                  <select
                    value={formData.buildingId}
                    onChange={(e) => {
                      const newBldgId = e.target.value;
                      const matchingFloors = propertyDetails?.floors?.filter(f => !f.building_id || f.building_id === newBldgId);
                      setFormData({
                        ...formData,
                        buildingId: newBldgId,
                        floorId: matchingFloors?.[0]?.id || formData.floorId
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    {propertyDetails?.buildings && propertyDetails.buildings.length > 0 ? (
                      propertyDetails.buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))
                    ) : (
                      <option value="">Main Wing</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Floor</label>
                  <select
                    value={formData.floorId}
                    onChange={(e) => setFormData({ ...formData, floorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                  >
                    {propertyDetails?.floors && propertyDetails.floors.length > 0 ? (
                      propertyDetails.floors
                        .filter(f => !formData.buildingId || !f.building_id || f.building_id === formData.buildingId)
                        .map(f => (
                          <option key={f.id} value={f.id}>{f.floor_name || `Floor ${f.floor_number}`}</option>
                        ))
                    ) : (
                      <option value="">1st Floor (Default)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                    placeholder="e.g. 204"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Room Capacity (Beds)</label>
                  <select
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value={1}>1 Bed (Single Room)</option>
                    <option value={2}>2 Beds (Double Sharing)</option>
                    <option value={3}>3 Beds (Triple Sharing)</option>
                    <option value={4}>4 Beds (4-Sharing)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">AC Type</label>
                  <select
                    value={formData.acType}
                    onChange={(e) => setFormData({ ...formData, acType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="ac">Air Conditioned (AC)</option>
                    <option value="non_ac">Non-AC</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bathroom</label>
                  <select
                    value={formData.bathroomType}
                    onChange={(e) => setFormData({ ...formData, bathroomType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="attached">Attached Bathroom</option>
                    <option value="common">Common Bathroom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Rent / Bed (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.baseRent}
                    onChange={(e) => setFormData({ ...formData, baseRent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={formData.baseDeposit}
                    onChange={(e) => setFormData({ ...formData, baseDeposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Create Room & Beds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
