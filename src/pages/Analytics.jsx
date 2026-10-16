import React, { useState, useEffect } from 'react';
import { Play, Eye, ThumbsUp, MessageCircle, Loader2, Search } from 'lucide-react';

export default function Analytics() {
  const [videos, setVideos] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("MrBeast"); // Updated default to name
  const [searchInput, setSearchInput] = useState("");

  const fetchTopVideos = async (searchQuery) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/youtube/top-videos/${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.top_videos);
        setChannelName(data.channel_name); // Capture the resolved channel name
      } else {
        setError("Could not find a YouTube channel matching that name or handle.");
      }
    } catch (err) {
      setError("Failed to connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopVideos(query);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setQuery(searchInput.trim());
      fetchTopVideos(searchInput.trim());
      setSearchInput("");
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Content Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {channelName ? `Top-performing videos for ` : 'Analyzing top-performing videos.'}
            {channelName && <span className="font-semibold text-indigo-600">{channelName}</span>}
          </p>
        </div>

        <form onSubmit={handleSearch} className="w-full lg:max-w-md">
          <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all p-1">
            <Search className="w-4 h-4 text-gray-400 ml-3 pointer-events-none absolute" />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
              placeholder="Search channel name or @handle..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Analyze
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-gray-500 font-medium text-sm">Fetching live video data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div key={video.video_id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-gray-100">
                <img 
                  src={video.thumbnail} 
                  alt={video.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <a 
                  href={`https://www.youtube.com/watch?v=${video.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <div className="bg-red-600 text-white p-3 rounded-full">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </a>
              </div>

              {/* Video Details */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Published: {new Date(video.published_at).toLocaleDateString()}
                </p>
                
                {/* Metrics */}
                <div className="mt-auto grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Eye className="w-4 h-4 text-sky-500 mb-1" />
                    <span className="text-xs font-semibold text-gray-700">{formatNumber(video.views)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center">
                    <ThumbsUp className="w-4 h-4 text-emerald-500 mb-1" />
                    <span className="text-xs font-semibold text-gray-700">{formatNumber(video.likes)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center">
                    <MessageCircle className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-xs font-semibold text-gray-700">{formatNumber(video.comments)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}