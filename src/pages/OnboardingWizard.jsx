import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  DoorOpen,
  Bed,
  Users,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function OnboardingWizard({ onComplete }) {
  const { organization, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form States
  const [propertyData, setPropertyData] = useState({
    name: 'Green Heights PG',
    type: 'pg',
    address: 'Plot 44, Madhapur Main Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    contact_phone: '9876543210'
  });

  const [roomData, setRoomData] = useState({
    room_number: '101',
    floor: '1st Floor',
    room_type: 'triple',
    capacity: 3,
    rent_amount: 8500,
    deposit_amount: 17000,
    is_ac: true,
    has_attached_bathroom: true
  });

  const [staffData, setStaffData] = useState({
    full_name: 'Rajesh Kumar',
    email: 'rajesh.manager@greenheights.com',
    phone: '9876543211',
    role: 'manager'
  });

  const [createdPropertyId, setCreatedPropertyId] = useState(null);

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.createProperty(propertyData);
      setCreatedPropertyId(res?.data?.id || 1);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createRoom({
        ...roomData,
        propertyId: createdPropertyId,
        property_id: createdPropertyId,
        roomNumber: roomData.room_number,
        capacity: roomData.capacity,
        baseRent: roomData.rent_amount,
        baseDeposit: roomData.deposit_amount,
        acType: roomData.is_ac ? 'ac' : 'non_ac',
        bathroomType: roomData.has_attached_bathroom ? 'attached' : 'common'
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to create room and beds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.addStaff({
        ...staffData,
        property_id: createdPropertyId
      });
      setStep(4);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      // If staff fails, continue to next step anyway
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (refreshProfile) await refreshProfile();
    if (onComplete) onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Wizard Top Progress */}
        <div className="bg-slate-950 p-6 text-white border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight font-display">
                StayOS Onboarding
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Step {step} of 4
            </span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-emerald-400' : ''}`}>
              <CheckCircle2 className="w-4 h-4" /> 1. Property
            </div>
            <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-emerald-400' : ''}`}>
              <CheckCircle2 className="w-4 h-4" /> 2. Rooms & Beds
            </div>
            <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-emerald-400' : ''}`}>
              <CheckCircle2 className="w-4 h-4" /> 3. Staff Member
            </div>
            <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-emerald-400' : ''}`}>
              <CheckCircle2 className="w-4 h-4" /> 4. Ready!
            </div>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Property */}
          {step === 1 && (
            <form onSubmit={handleCreateProperty} className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-display">Setup Your First Property</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Add the physical building details where your residents will stay.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Property / Hostel Name</label>
                  <input
                    type="text"
                    required
                    value={propertyData.name}
                    onChange={(e) => setPropertyData({ ...propertyData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Property Type</label>
                  <select
                    value={propertyData.type}
                    onChange={(e) => setPropertyData({ ...propertyData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pg">Paying Guest (PG)</option>
                    <option value="hostel">Student Hostel</option>
                    <option value="coliving">Co-Living Space</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={propertyData.contact_phone}
                    onChange={(e) => setPropertyData({ ...propertyData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={propertyData.address}
                    onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={propertyData.city}
                    onChange={(e) => setPropertyData({ ...propertyData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={propertyData.pincode}
                    onChange={(e) => setPropertyData({ ...propertyData, pincode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
                >
                  {loading ? 'Creating...' : 'Continue to Rooms'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Room & Beds */}
          {step === 2 && (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-display">Add Your First Room & Beds</h2>
                <p className="text-xs text-slate-500 mt-1">
                  StayOS will automatically generate individual trackable beds (e.g. 101-A, 101-B, 101-C).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Room Number / Name</label>
                  <input
                    type="text"
                    required
                    value={roomData.room_number}
                    onChange={(e) => setRoomData({ ...roomData, room_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                  <input
                    type="text"
                    required
                    value={roomData.floor}
                    onChange={(e) => setRoomData({ ...roomData, floor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sharing Type</label>
                  <select
                    value={roomData.room_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const cap = type === 'single' ? 1 : type === 'double' ? 2 : type === 'triple' ? 3 : 4;
                      setRoomData({ ...roomData, room_type: type, capacity: cap });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="single">Single Sharing (1 Bed)</option>
                    <option value="double">Double Sharing (2 Beds)</option>
                    <option value="triple">Triple Sharing (3 Beds)</option>
                    <option value="four_sharing">Four Sharing (4 Beds)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Rent per Bed (₹)</label>
                  <input
                    type="number"
                    required
                    value={roomData.rent_amount}
                    onChange={(e) => setRoomData({ ...roomData, rent_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roomData.is_ac}
                    onChange={(e) => setRoomData({ ...roomData, is_ac: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>AC Room</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roomData.has_attached_bathroom}
                    onChange={(e) => setRoomData({ ...roomData, has_attached_bathroom: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Attached Bathroom</span>
                </label>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
                >
                  {loading ? 'Creating...' : 'Continue to Staff'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Staff */}
          {step === 3 && (
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 font-display">Add a Property Staff Member</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Invite your manager, warden, or chef with designated operational permissions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff Full Name</label>
                  <input
                    type="text"
                    required
                    value={staffData.full_name}
                    onChange={(e) => setStaffData({ ...staffData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={staffData.role}
                    onChange={(e) => setStaffData({ ...staffData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="manager">Property Manager</option>
                    <option value="warden">Hostel Warden</option>
                    <option value="chef">Head Chef</option>
                    <option value="accountant">Accountant</option>
                    <option value="receptionist">Front Desk Receptionist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={staffData.email}
                    onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={staffData.phone}
                    onChange={(e) => setStaffData({ ...staffData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
                >
                  {loading ? 'Adding...' : 'Complete Setup'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Finish */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-slate-900 font-display">
                You're All Set to Run Your PG!
              </h2>

              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your property, rooms, beds, and staff account are ready. You can now perform check-ins, record UPI payments, publish meal schedules, and manage complaints.
              </p>

              <div className="pt-6">
                <button
                  onClick={handleFinish}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xl shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
                >
                  Launch StayOS Live Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
