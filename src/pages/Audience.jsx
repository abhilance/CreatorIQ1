import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { Loader2, Users, MapPin, Clock } from 'lucide-react';

export default function Audience() {
  const [audienceData, setAudienceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudience = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/analytics/audience");
        if (res.ok) {
          const data = await res.json();
          setAudienceData(data);
        }
      } catch (error) {
        console.error("Failed to fetch audience data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAudience();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-gray-500 font-medium">Loading audience data...</p>
      </div>
    );
  }

  if (!audienceData) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Audience Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Deep dive into viewer demographics and behavior.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Age & Gender Demographics */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Age & Gender</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={audienceData.demographics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="male" name="Male (%)" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="female" name="Female (%)" fill="#EC4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Geographies */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Top Geographies</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={audienceData.locations} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="country" type="category" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="viewers" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Hours */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-gray-900">Viewer Active Hours</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={audienceData.active_hours} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Line type="smooth" dataKey="active" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}