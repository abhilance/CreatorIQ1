import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Search, Loader2, Star } from "lucide-react";

const API = "http://127.0.0.1:8000/api/social";
const compact = (n) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
const CFG = {
  github: { title: "GitHub", placeholder: "GitHub username (e.g. torvalds)", first: "torvalds" },
  bluesky: { title: "Bluesky", placeholder: "Bluesky handle (e.g. bsky.app)", first: "bsky.app" },
};
const Card = ({ className = "", children }) => <div className={`rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5 ${className}`}>{children}</div>;

export default function PlatformProfile({ platform }) {
  const cfg = CFG[platform];
  const [input, setInput] = useState("");
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (q) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/${platform}/${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error((await res.json()).detail || "Not found");
      setD(await res.json());
    } catch (e) { setError(e.message || "Could not reach the server"); } finally { setLoading(false); }
  };
  useEffect(() => { load(cfg.first); }, []); // eslint-disable-line

  const gh = platform === "github";
  const cards = d ? (gh
    ? [["Followers", d.followers], ["Following", d.following], ["Public repos", d.public_repos], ["Total stars", d.total_stars]]
    : [["Followers", d.followers], ["Following", d.following], ["Posts", d.posts]]) : [];

  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <form onSubmit={(e) => { e.preventDefault(); input.trim() && load(input.trim()); }} className="flex items-center gap-3 rounded-full border border-[#1b2238] px-5 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={cfg.placeholder} className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-500" />
          <button className="rounded-full bg-blue-600 px-5 py-1.5 text-sm font-semibold hover:bg-blue-500">Search</button>
        </form>
        {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {loading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}

        {d && !loading && (<>
          <div className="flex items-center gap-4">
            {d.avatar && <img src={d.avatar} alt="" className="h-20 w-20 rounded-full object-cover" />}
            <div className="min-w-0"><h1 className="truncate text-2xl font-bold">{d.name}</h1><p className="text-sm text-slate-400">@{d.handle} · {cfg.title}</p>
              {d.bio && <p className="mt-1 max-w-2xl text-sm text-slate-300">{d.bio}</p>}</div>
          </div>
          <div className={`grid gap-4 sm:grid-cols-2 ${cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {cards.map(([l, v]) => <Card key={l}><p className="text-sm text-slate-400">{l}</p><p className="mt-1 text-3xl font-bold">{v.toLocaleString()}</p></Card>)}
          </div>

          {gh && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card><h2 className="mb-3 text-lg font-bold">Top repositories</h2>
                {d.repos.map((r) => (
                  <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between border-t border-[#1b2238] py-3 text-sm hover:text-blue-400">
                    <span><span className="font-semibold">{r.name}</span> <span className="text-slate-500">{r.language}</span></span>
                    <span className="flex items-center gap-1 text-slate-300"><Star className="h-3.5 w-3.5 text-amber-400" />{compact(r.stars)}</span>
                  </a>))}
                {d.repos.length === 0 && <p className="text-sm text-slate-400">No public repositories.</p>}</Card>
              <Card><h2 className="mb-3 text-lg font-bold">Languages (by repo count)</h2>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.languages}>
                  <CartesianGrid stroke="#1e2538" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#8b93ad", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8b93ad", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0e1322", border: "1px solid #1b2238", borderRadius: 12 }} />
                  <Bar dataKey="count" fill="#1a6dff" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
            </div>)}

          {!gh && (
            <Card><h2 className="mb-3 text-lg font-bold">Recent posts</h2>
              {d.recent_posts.map((p, i) => (
                <div key={i} className="border-t border-[#1b2238] py-3">
                  <p className="text-sm">{p.text || "(media post)"}</p>
                  <p className="mt-1 text-xs text-slate-400">{compact(p.likes)} likes · {compact(p.reposts)} reposts · {compact(p.replies)} replies</p>
                </div>))}
              {d.recent_posts.length === 0 && <p className="text-sm text-slate-400">No recent posts.</p>}</Card>)}
        </>)}
      </div>
    </div>
  );
}