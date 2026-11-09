import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  ChefHat,
  UtensilsCrossed,
  Bell,
  CheckCircle2,
  Clock,
  Users,
  Flame,
  CheckCheck,
  Sparkles
} from 'lucide-react';

export default function ChefDashboardPage() {
  const { activeProperty, showToast } = useAuth();
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingMeal, setUpdatingMeal] = useState(null);

  const fetchDaily = async () => {
    try {
      setLoading(true);
      const data = await api.getDailyMealStatus({
        propertyId: activeProperty?.id || null
      });
      setDailyData(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaily();
  }, [activeProperty]);

  const handleUpdateStatus = async (mealType, newStatus) => {
    setUpdatingMeal(mealType);
    try {
      const res = await api.updateDailyMealStatus({
        propertyId: activeProperty?.id || null,
        mealType,
        status: newStatus
      });

      if (newStatus === 'ready') {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
        showToast(`🍽️ ${mealType.toUpperCase()} marked READY! All residents notified via in-app alerts!`, 'success');
      } else {
        showToast(res.message, 'info');
      }

      fetchDaily();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpdatingMeal(null);
    }
  };

  if (loading || !dailyData) {
    return <div className="text-center py-20 text-xs text-slate-400">Loading Chef Live Kitchen Display...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* KDS Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 text-white p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-display tracking-tight">Chef Live Kitchen Display (KDS)</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-xs text-orange-100 mt-1">
              Today: <span className="font-bold text-white capitalize">{dailyData.day}, {dailyData.date}</span> • Total Active Stayers: {dailyData.totalResidents}
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="text-[10px] uppercase tracking-widest text-orange-200 font-bold">1-Click Broadcast</div>
          <div className="text-xs text-white font-medium">Marking ready notifies residents instantly</div>
        </div>
      </div>

      {/* 4 Meal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(dailyData.meals || []).map((meal) => {
          const isPending = meal.status === 'pending';
          const isPreparing = meal.status === 'preparing';
          const isReady = meal.status === 'ready';
          const isCompleted = meal.status === 'completed';

          return (
            <div
              key={meal.mealType}
              className={`bg-white rounded-3xl border p-6 transition flex flex-col justify-between ${isReady ? 'border-emerald-400 ring-4 ring-emerald-100 shadow-xl bg-emerald-50/20' : (isPreparing ? 'border-amber-300 ring-2 ring-amber-100 shadow-md' : 'border-slate-200 shadow-sm')}`}
            >
              <div>
                {/* Top status bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 font-display capitalize">
                      {meal.mealType}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">({meal.timing || 'Service Hours'})</span>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${isReady ? 'bg-emerald-500 text-white animate-pulse' : (isPreparing ? 'bg-amber-100 text-amber-800' : (isCompleted ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'))}`}>
                    {meal.status}
                  </span>
                </div>

                {/* Headcount Box */}
                <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EXPECTED MEAL COUNT:</div>
                    <div className="text-3xl font-black text-slate-900 font-display mt-0.5">
                      {meal.expectedCount} <span className="text-xs text-slate-500 font-normal">portions</span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                    <div>Opted Out (Skip): <span className="font-bold text-rose-600">{meal.optedOutCount}</span></div>
                    {meal.guestCount > 0 && <div>Extra Guests: <span className="font-bold text-emerald-600">+{meal.guestCount}</span></div>}
                  </div>
                </div>

                {/* Menu items planned */}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-800">{meal.title}</div>
                  <div className="text-slate-500 leading-relaxed">
                    {(meal.menuItems || []).join(' • ')}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Chef */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={updatingMeal === meal.mealType}
                    onClick={() => handleUpdateStatus(meal.mealType, 'preparing')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${isPreparing ? 'bg-amber-500 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    1. Preparing
                  </button>

                  <button
                    type="button"
                    disabled={updatingMeal === meal.mealType}
                    onClick={() => handleUpdateStatus(meal.mealType, 'ready')}
                    className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${isReady ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'}`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>2. Mark READY</span>
                  </button>

                  <button
                    type="button"
                    disabled={updatingMeal === meal.mealType}
                    onClick={() => handleUpdateStatus(meal.mealType, 'completed')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${isCompleted ? 'bg-slate-800 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    3. Completed
                  </button>
                </div>

                {isReady && (
                  <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-900 font-bold text-[11px] text-center flex items-center justify-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Broadcast alert sent to residents! Dining hall open.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
