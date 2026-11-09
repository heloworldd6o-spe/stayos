import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Users,
  DoorOpen,
  Bed,
  Percent,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';

export default function PropertiesPage() {
  const { user, showToast } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProp, setEditingProp] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'pg',
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    contactNumber: '',
    email: '',
    rentDueDay: 5,
    gracePeriodDays: 3,
    lateFeeAmount: 250,
    amenities: ['High-Speed Wi-Fi', 'Daily 3-Time Chef Meals', 'Air Conditioned Rooms', '24/7 Power Backup', 'RO Water Purifier', 'Laundry & Washing Machines', 'CCTV Security'],
    rules: ['No smoking inside rooms', 'Visitors allowed until 9:30 PM', 'Quiet hours from 11:00 PM to 6:00 AM']
  });

  const fetchProps = async () => {
    try {
      setLoading(true);
      const data = await api.getProperties();
      setProperties(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProps();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProp) {
        await api.updateProperty(editingProp.id, formData);
        showToast('Property updated successfully.');
      } else {
        await api.createProperty(formData);
        showToast('New property created successfully with default floors.');
      }
      setModalOpen(false);
      setEditingProp(null);
      fetchProps();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openCreateModal = () => {
    setEditingProp(null);
    setFormData({
      name: '',
      type: 'coliving',
      address: '',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      contactNumber: '+91 ',
      email: '',
      rentDueDay: 5,
      gracePeriodDays: 3,
      lateFeeAmount: 250,
      amenities: ['High-Speed 5G Wi-Fi', '3-Time Chef Meals', 'Air Conditioning', 'Power Backup', 'RO Water Purifier', 'Biometric CCTV', 'Housekeeping'],
      rules: ['No smoking inside rooms', 'Visitor hours 8 AM to 9:30 PM', 'Quiet hours after 11 PM']
    });
    setModalOpen(true);
  };

  const openEditModal = (prop) => {
    setEditingProp(prop);
    setFormData({
      name: prop.name,
      type: prop.type,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      pincode: prop.pincode,
      contactNumber: prop.contact_number,
      email: prop.email || '',
      rentDueDay: prop.rent_due_day || 5,
      gracePeriodDays: prop.grace_period_days || 3,
      lateFeeAmount: prop.late_fee_amount || 250,
      amenities: Array.isArray(prop.amenities) ? prop.amenities : [],
      rules: Array.isArray(prop.rules) ? prop.rules : []
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Properties & Facilities</h1>
          <p className="text-xs text-slate-500 mt-1">Manage multiple PG branches, buildings, and master amenities</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Property</span>
        </button>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {properties.map(prop => (
          <div key={prop.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 font-display">{prop.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{prop.address}, {prop.city}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openEditModal(prop)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  title="Edit Property"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 p-4 bg-slate-50/70 border-b border-slate-100 text-center text-xs">
                <div>
                  <div className="text-slate-400 text-[11px] font-medium">Occupancy</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{prop.occupancy_percent || 0}%</div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-slate-400 text-[11px] font-medium">Beds (Occ / Tot)</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{prop.occupied_beds || 0} / {prop.total_beds || 0}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px] font-medium">Active Stayers</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-0.5">{prop.active_residents || 0}</div>
                </div>
              </div>

              {/* Amenities */}
              <div className="p-5 space-y-3">
                <div className="text-xs font-bold text-slate-700">Included Amenities:</div>
                <div className="flex flex-wrap gap-1.5">
                  {(prop.amenities || []).map((amen, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                      ✓ {amen}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact & Meta Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{prop.contact_number}</span>
              </div>
              <div className="font-semibold text-emerald-700">
                Rent Due: {prop.rent_due_day || 5}th of month
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display">
                {editingProp ? 'Edit Property Settings' : 'Add New Property Branch'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Property Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. UrbanStay Gachibowli"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Property Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pg">Executive PG</option>
                    <option value="coliving">Luxury Co-Living</option>
                    <option value="hostel">Student Hostel</option>
                    <option value="student">Student Accommodation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Plot/Road/Landmark"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rent Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.rentDueDay}
                    onChange={(e) => setFormData({ ...formData, rentDueDay: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-emerald-800 font-semibold">Automatic Building & Floor Initialization</span>
                <span className="text-[11px] text-emerald-600">✓ 2 default floors created</span>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  {editingProp ? 'Save Changes' : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
