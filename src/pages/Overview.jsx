import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, Eye, TrendingUp, DollarSign, Search, Activity, 
  ArrowUpRight, Radio, Sparkles, Loader2 
} from 'lucide-react';

export default function Overview() {
  const [data, setData] = useState({ chart_data: [], metrics: null });
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search States
  const [searchInput, setSearchInput] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("youtube");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const fetchStats = async (query, platform) => {
    setIsSearching(true);
    setSearchError("");
    try {
      let url = "";
      if (platform === "youtube") url = `http://127.0.0.1:8000/api/youtube/search/${encodeURIComponent(query)}`;
      if (platform === "bluesky") url = `http://127.0.0.1:8000/api/bluesky/stats/${encodeURIComponent(query)}`;
      if (platform === "github") url = `http://127.0.0.1:8000/api/github/stats/${encodeURIComponent(query)}`;

      const res = await fetch(url);
      if (res.ok) {
        const statsData = await res.json();
        setPlatformStats(statsData);
        setSearchInput("");
      } else {
        setSearchError(`User or channel not found on ${platform.toUpperCase()}.`);
      }
    } catch (error) {
      setSearchError("Error connecting to backend server.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const analyticsRes = await fetch("http://127.0.0.1:8000/api/analytics/overview");
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setData(analyticsData);
        }
        await fetchStats("MrBeast", "youtube");
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchStats(searchInput.trim(), selectedPlatform);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-gray-500 font-medium text-sm">Loading analytics dashboard...</p>
      </div>
    );
  }

  if (!data.metrics) return null;

  const formatNumber = (num) => {
    return num ? Number(num).toLocaleString() : "0";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Unified Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Engine
            </span>
          </div>

          {platformStats && (
            <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-2">
              <span>Tracking:</span>
              <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                {platformStats.platform}
              </span>
              <span className="font-medium text-indigo-600 truncate max-w-xs">
                {platformStats.channel_name || platformStats.handle}
              </span>
            </p>
          )}
        </div>

        {/* Seamless Unified Search Bar */}
        <form onSubmit={handleSearch} className="w-full lg:max-w-xl">
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-sm p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            
            {/* Platform Selector */}
            <div className="relative border-r border-gray-200 pr-2 mr-2">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-700 py-2 pl-3 pr-6 rounded-xl focus:outline-none cursor-pointer appearance-none uppercase tracking-wider"
              >
                <option value="youtube">YouTube</option>
                <option value="bluesky">Bluesky</option>
                <option value="github">GitHub</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400 text-xs">
                ▼
              </div>
            </div>

            {/* Input Field */}
            <div className="relative flex-grow flex items-center">
              <Search className="w-4 h-4 text-gray-400 ml-2 pointer-events-none" />
              <input
                type="text"
                className="w-full pl-2.5 pr-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
                placeholder={
                  selectedPlatform === "youtube"
                    ? "Channel name or @handle..."
                    : selectedPlatform === "github"
                    ? "GitHub username..."
                    : "Bluesky handle (user.bsky.social)..."
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSearching}
              className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching</span>
                </>
              ) : (
                <span>Track</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {searchError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <p>{searchError}</p>
          <button onClick={() => setSearchError("")} className="font-semibold text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <ModernMetricCard
          title={platformStats?.platform === "GitHub" ? "Total Repos" : "Total Content"}
          value={platformStats ? formatNumber(platformStats.total_posts || platformStats.total_videos) : "—"}
          badge="Live Feed"
          icon={<Activity className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
        <ModernMetricCard
          title="Followers / Subscribers"
          value={platformStats ? formatNumber(platformStats.subscribers) : "—"}
          badge="Live Feed"
          icon={<Users className="w-5 h-5 text-sky-600" />}
          iconBg="bg-sky-50"
        />
        <ModernMetricCard
          title="Avg Engagement Rate"
          value={data.metrics.engagement_rate}
          trend={data.metrics.engagement_trend}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <ModernMetricCard
          title="Estimated Revenue"
          value={data.metrics.est_revenue}
          trend={data.metrics.revenue_trend}
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
        />
      </div>

      {/* Interactive Chart Container */}
      <div className="bg-white p-7 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 gap-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Audience Growth & Engagement</h2>
            <p className="text-sm text-gray-500">Weekly trajectory of views vs reader interactions</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-indigo-600">
              <span className="w-3 h-3 rounded-full bg-indigo-500"></span> Views
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Engagement
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '13px'
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#6366F1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorViews)"
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorEngagement)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ModernMetricCard({ title, value, trend, badge, icon, iconBg }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
        {trend ? (
          <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            {trend}
          </span>
        ) : (
          <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}