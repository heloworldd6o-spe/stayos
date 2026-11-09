import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  UtensilsCrossed,
  ChefHat,
  Calendar,
  Clock,
  Edit2,
  CheckCircle2,
  Sparkles,
  Plus,
  X
} from 'lucide-react';

export default function FoodManagementPage() {
  const { activeProperty, showToast } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('monday');

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [formData, setFormData] = useState({
    propertyId: '',
    dayOfWeek: 'monday',
    mealType: 'breakfast',
    menuTitle: '',
    timing: '',
    menuItems: []
  });
  const [newItemInput, setNewItemInput] = useState('');

  const days = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' }
  ];

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const data = await api.getMealSchedule(activeProperty?.id || null);
      setSchedule(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [activeProperty]);

  const openEdit = (meal) => {
    setEditingMeal(meal);
    setFormData({
      propertyId: activeProperty?.id,
      dayOfWeek: meal.day_of_week,
      mealType: meal.meal_type,
      menuTitle: meal.menu_title,
      timing: meal.timing || '',
      menuItems: Array.isArray(meal.menu_items) ? [...meal.menu_items] : []
    });
    setNewItemInput('');
    setEditModalOpen(true);
  };

  const handleAddItem = () => {
    if (!newItemInput.trim()) return;
    setFormData({
      ...formData,
      menuItems: [...formData.menuItems, newItemInput.trim()]
    });
    setNewItemInput('');
  };

  const handleRemoveItem = (idx) => {
    setFormData({
      ...formData,
      menuItems: formData.menuItems.filter((_, i) => i !== idx)
    });
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      await api.updateMealSchedule(formData);
      showToast('Weekly meal schedule updated.', 'success');
      setEditModalOpen(false);
      fetchSchedule();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const dayMeals = schedule.filter(s => s.day_of_week === selectedDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display">Food & Weekly Mess Menu Planner</h1>
          <p className="text-xs text-slate-500 mt-1">Configure authentic 7-day Indian meal schedules for breakfast, lunch, snacks, and dinner</p>
        </div>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {days.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedDay(d.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${selectedDay === d.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Meals Grid for Selected Day */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400">Loading weekly menu...</div>
      ) : dayMeals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No meal plan recorded for {selectedDay}</h3>
          <p className="text-xs text-slate-400 mt-1">Click below to initialize meals for this day.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {['breakfast', 'lunch', 'snacks', 'dinner'].map((mType) => {
            const meal = dayMeals.find(m => m.meal_type === mType);
            if (!meal) return null;

            return (
              <div key={meal.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-emerald-300 transition">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-black capitalize text-slate-900 font-display text-sm flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>{meal.meal_type}</span>
                    </span>
                    <button
                      onClick={() => openEdit(meal)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      title="Edit Menu"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-3">
                    <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{meal.menu_title}</h4>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{meal.timing || 'Standard Meal Hours'}</span>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                      {(meal.menu_items || []).map((dish, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></span>
                          <span>{dish}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium text-center">
                  Live menu synced to resident app
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Menu Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900 font-display capitalize">
                Edit {formData.dayOfWeek} {formData.mealType} Menu
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meal Title / Theme *</label>
                <input
                  type="text"
                  required
                  value={formData.menuTitle}
                  onChange={(e) => setFormData({ ...formData, menuTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  placeholder="e.g. Idli & Vada Combo / Royal Paneer Thali"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Serving Hours</label>
                <input
                  type="text"
                  value={formData.timing}
                  onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  placeholder="e.g. 7:30 AM - 9:30 AM"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dishes & Menu Items</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newItemInput}
                    onChange={(e) => setNewItemInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs"
                    placeholder="Enter dish name (e.g. Steamed Idli)"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-2 bg-slate-900 text-white font-bold rounded-xl"
                  >
                    + Add Dish
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {formData.menuItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
