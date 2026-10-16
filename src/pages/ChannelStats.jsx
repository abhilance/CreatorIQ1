import { useEffect, useMemo, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Search, Loader2, Play, Star, Eye, ArrowUp, ArrowDown } from "lucide-react";

const API = "http://127.0.0.1:8000";
const EST_CPM = 1.15; // dollars per 1,000 views, a rough public estimate
const compact = (n) => (n == null ? "Hidden" : Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n));
const full = (n) => (n == null ? "Hidden" : Number(n).toLocaleString());
const money = (n) => "$" + compact(n);
const fmtDay = (d) => new Date(d + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" });
const TABS = ["Views", "Subscribers", "Estimated Earnings", "Achievements"];
const RANGES = { Views: ["7D", "28D", "3M", "1Y", "Max"], Subscribers: ["28D", "3M", "1Y", "Max"], "Estimated Earnings": ["7D", "28D"] };
const DAYS = { "7D": 7, "28D": 28, "3M": 90, "1Y": 365, Max: 9999 };
const GREEN = "#12d08a", BLUE = "#1a6dff", ORANGE = "#ff8a2b";

function makeSample(subs, views) {
  let s = 7, u = subs, v = views;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  for (let i = 0; i < 366; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out.unshift({ day: d.toISOString().slice(0, 10), subs: Math.round(u), views: Math.round(v), long_share: 0.2 + r() * 0.15 });
    v -= views * (0.0002 + r() * 0.0012);
    u -= subs * (r() < 0.1 ? 0.002 : 0.00005);
  }
  return out;
}

const Card = ({ className = "", children }) => <div className={`rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5 ${className}`}>{children}</div>;
const Row = ({ label, children }) => (
  <div className="flex items-center justify-between py-2 text-sm"><span>{label}</span><span className="font-semibold">{children}</span></div>
);
const Seg = ({ items, value, onChange, small }) => (
  <div className="inline-flex rounded-xl border border-[#1b2238] bg-[#080b14] p-1">
    {items.map((i) => (
      <button key={i} onClick={() => onChange(i)}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${small ? "" : "sm:px-5"} ${value === i ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>{i}</button>
    ))}
  </div>
);

function ChartPanel({ data, sample }) {
  const [tab, setTab] = useState("Views");
  const [range, setRange] = useState("28D");
  const [fmt, setFmt] = useState("All Views");
  const switchTab = (t) => { setTab(t); if (RANGES[t] && !RANGES[t].includes(range)) setRange("28D"); };

  const daily = useMemo(() => {
    const h = data.history;
    return h.slice(1).map((p, i) => {
      const dv = Math.max(p.views - h[i].views, 0);
      return { day: p.day, views: dv, subs: Math.max(p.subs - h[i].subs, 0), long: dv * p.long_share, short: dv * (1 - p.long_share) };
    });
  }, [data.history]);

  const n = DAYS[range] || 28;
  const win = daily.slice(-n), prev = daily.slice(-2 * n, -n);
  const key = tab === "Subscribers" ? "subs" : "views";
  const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0);
  const mult = tab === "Estimated Earnings" ? EST_CPM / 1000 : 1;
  const total = sum(win, key) * mult;
  const before = prev.length === n ? sum(prev, key) * mult : null;
  const delta = before ? total - before : null;
  const up = delta >= 0;
  const chart = win.map((d) => ({ day: d.day, all: d[key] * mult, long: d.long, short: d.short }));
  const label = tab === "Estimated Earnings" ? money : compact;
  const label2 = range === "Max" ? "All time" : `Past ${n} days`;

  return (
    <Card className="p-0">
      <div className="flex flex-wrap gap-x-8 border-b border-[#1b2238] px-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            className={`border-b-2 py-4 text-sm font-medium ${tab === t ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}>{t}</button>
        ))}
      </div>
      {tab === "Achievements" ? (
        <Achievements items={data.achievements} name={data.channel.name} />
      ) : (
        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">{label2}</p>
              <p className="text-3xl font-bold">{label(total)} <span className="text-base font-normal text-slate-400">{tab === "Views" ? "views" : tab === "Subscribers" ? "subscribers" : ""}</span>
                {delta != null && (
                  <span className={`ml-2 inline-flex items-center gap-1 text-sm font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
                    {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}{label(Math.abs(delta))} ({Math.abs((delta / before) * 100).toFixed(1)}%)
                  </span>)}
              </p>
              {tab === "Views" && (
                <p className="mt-2 flex gap-4 text-sm font-semibold">
                  <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: BLUE }} />Long-form <span className="font-normal text-slate-400">{compact(sum(win, "long"))}</span></span>
                  <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: ORANGE }} />Shorts <span className="font-normal text-slate-400">{compact(sum(win, "short"))}</span></span>
                </p>)}
            </div>
            <div className="flex flex-col items-end gap-3">
              <Seg items={RANGES[tab]} value={range} onChange={setRange} small />
              {tab === "Views" && <Seg items={["All Views", "Long-form", "Shorts"]} value={fmt} onChange={setFmt} small />}
            </div>
          </div>
          {sample && <p className="mb-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Sample curve for layout only. Real daily history builds up as CreatorIQ saves a snapshot each day.</p>}
          <div className="h-72">
            {chart.length < 2 ? (
              <p className="pt-24 text-center text-sm text-slate-400">Tracking started today. Come back tomorrow to see the first data points.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs><pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.9" fill="#2a3350" /></pattern></defs>
                  <CartesianGrid stroke="#1e2538" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: "#8b93ad", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis tickFormatter={label} tick={{ fill: "#8b93ad", fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip labelFormatter={fmtDay} formatter={(v) => label(v)} contentStyle={{ background: "#0e1322", border: "1px solid #1b2238", borderRadius: 12 }} />
                  {tab === "Views" ? (
                    <>
                      {fmt !== "Shorts" && <Area dataKey="long" name="Long-form" stroke={BLUE} strokeWidth={2} fill="url(#dots)" />}
                      {fmt !== "Long-form" && <Area dataKey="short" name="Shorts" stroke={ORANGE} strokeWidth={2} fill="url(#dots)" />}
                    </>
                  ) : (
                    <Area dataKey="all" name={tab} stroke={GREEN} strokeWidth={2} fill="url(#dots)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>)}
          </div>
        </div>)}
    </Card>
  );
}

function Achievements({ items, name }) {
  const groups = {};
  items.forEach((a) => { const y = a.day ? a.day.slice(0, 4) : "Before tracking"; (groups[y] ||= []).push(a); });
  const order = Object.keys(groups).sort((a, b) => (a === "Before tracking") - (b === "Before tracking") || b.localeCompare(a));
  const Icon = { videos: <Play className="h-4 w-4 text-red-500" />, subs: <Star className="h-4 w-4 text-amber-400" />, views: <Eye className="h-4 w-4 text-sky-400" /> };
  return (
    <div className="p-5">
      <h3 className="font-bold">Achievements for {name}</h3>
      <p className="mb-3 text-sm text-slate-400">Milestones reached. Dates appear once CreatorIQ has tracked the channel across a milestone.</p>
      <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
        {order.map((y) => (
          <div key={y}>
            <p className="my-2 text-sm font-semibold text-slate-400">{y}</p>
            {groups[y].map((a) => (
              <div key={a.kind + a.label} className="mb-2 flex items-center gap-3 rounded-xl bg-[#131a2e] px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0b0f1c]">{Icon[a.kind]}</span>
                <span className="flex-1 font-semibold">{a.label}</span>
                <span className="text-sm text-slate-400">{a.day ? fmtDay(a.day) : ""}</span>
              </div>))}
          </div>))}
      </div>
    </div>
  );
}

function LatestVideo({ v }) {
  if (!v) return null;
  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">Latest video</h2>
      <div className="mb-3 flex gap-3">
        <img src={v.thumbnail} alt="" className="h-[68px] w-[120px] shrink-0 rounded-lg object-cover" />
        <div><p className="text-sm font-semibold leading-snug">{v.title}</p><p className="mt-1 text-xs text-slate-400">{new Date(v.published_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p></div>
      </div>
      <p className="mb-2 text-sm text-slate-400">{v.age_text}</p>
      <Row label="Total views">{compact(v.views)}</Row>
      <Row label="VPH">{compact(v.vph)}</Row>
      <Row label="Outlier score">{v.outlier ? <span className="rounded-full bg-[#1b2238] px-2.5 py-0.5 text-xs">{v.outlier}x</span> : "–"}</Row>
      <Row label="Rank by views">{v.rank_of_last_5 ? `${v.rank_of_last_5} of last 5` : "–"}</Row>
      <Row label="Engagement rate">{v.engagement}%</Row>
    </Card>
  );
}

const ago = (iso) => {
  const d = (Date.now() - new Date(iso)) / 864e5;
  if (d < 1) return "today";
  if (d < 31) return `${Math.floor(d)} days ago`;
  if (d < 365) { const m = Math.floor(d / 30); return `${m} month${m > 1 ? "s" : ""} ago`; }
  const y = Math.floor(d / 365); return `${y} year${y > 1 ? "s" : ""} ago`;
};
const Pill = ({ children, hot }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hot ? "bg-violet-500 text-white" : "bg-[#1b2238]"}`}>{children}</span>
);

function VideosTable({ data }) {
  const [mode, setMode] = useState("Top videos");
  const [fmt, setFmt] = useState("Long-form");
  const short = fmt === "Shorts";
  const rows = mode === "Top videos" ? (short ? data.top_shorts : data.top_videos) : short ? data.latest_shorts : data.latest_long;
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6">
          {["Top videos", "Latest videos"].map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`border-b-2 pb-2 text-sm font-medium ${mode === m ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}>{m}</button>))}
        </div>
        <Seg items={["Long-form", "Shorts"]} value={fmt} onChange={setFmt} small />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] text-sm">
          <thead><tr className="text-left"><th className="py-3">Videos</th><th className="text-center">Total views</th><th className="text-center">VPH</th><th className="text-center">Outlier score</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No {fmt.toLowerCase()} videos in the last 50 uploads.</td></tr>}
            {rows.map((v) => (
              <tr key={v.video_id} className="border-t border-[#1b2238]">
                <td className="py-3"><div className="flex items-center gap-3">
                  <img src={v.thumbnail} alt="" className={`${short ? "h-14 w-9" : "h-12 w-20"} shrink-0 rounded-md object-cover`} />
                  <div><p className="font-semibold leading-snug">{v.title}</p><p className="text-xs text-slate-400">{ago(v.published_at)}</p></div></div></td>
                <td className="text-center font-semibold">{compact(v.views)}</td>
                <td className="text-center"><Pill>{compact(v.vph)}</Pill></td>
                <td className="text-center">{v.outlier ? <Pill hot={v.outlier >= 2}>{v.outlier}x</Pill> : "–"}</td>
                <td className="text-right"><a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noreferrer" className="rounded-full bg-blue-600 px-4 py-1.5 font-semibold hover:bg-blue-500">Watch</a></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <a href={`https://www.youtube.com/${data.channel.handle}/videos`} target="_blank" rel="noreferrer" className="mt-4 block rounded-full border border-[#1b2238] bg-[#131a2e] py-3 text-center text-sm font-semibold hover:bg-[#1b2238]">View full details</a>
      <p className="mt-2 text-xs text-slate-500">Based on the channel's last 50 uploads.</p>
    </Card>
  );
}

function Donut({ a, b }) {
  const C = 2 * Math.PI * 40, t = a + b;
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
      <circle cx="50" cy="50" r="40" fill="none" stroke={ORANGE} strokeWidth="11" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={BLUE} strokeWidth="11" strokeDasharray={`${t ? (a / t) * C : 0} ${C}`} />
    </svg>
  );
}
const Legend = ({ color, label, value, pct }) => (
  <div className="border-l-2 pl-3" style={{ borderColor: color }}>
    <p className="text-xs text-slate-400">{label}</p>
    <p className="text-2xl font-bold">{value} <span className="text-sm font-normal text-slate-400">{pct}%</span></p>
  </div>
);

function SplitCard({ videos }) {
  const [r, setR] = useState("YTD");
  const start = r === "YTD" ? new Date(new Date().getFullYear(), 0, 1) : new Date(Date.now() - DAYS[r] * 864e5);
  const inR = videos.filter((v) => new Date(v.published_at) >= start);
  const lg = inR.filter((v) => !v.is_short), sh = inR.filter((v) => v.is_short);
  const lv = lg.reduce((a, v) => a + v.views, 0), sv = sh.reduce((a, v) => a + v.views, 0);
  const p = (a, b) => (a + b ? Math.round((a / (a + b)) * 100) : 0);
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">Long-form vs Shorts</h2>
      <Seg items={["7D", "28D", "3M", "1Y", "YTD"]} value={r} onChange={setR} small />
      {[["Uploads", lg.length, sh.length, (x) => x], ["Views", lv, sv, compact]].map(([t, a, b, f]) => (
        <div key={t} className="mt-6">
          <h3 className="mb-3 font-bold">{t}</h3>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-4"><Legend color={BLUE} label="Long-form" value={f(a)} pct={p(a, b)} /><Legend color={ORANGE} label="Shorts" value={f(b)} pct={p(b, a)} /></div>
            <Donut a={a} b={b} />
          </div>
        </div>))}
      <p className="mt-4 text-xs text-slate-500">Videos uploaded in this period (from the last 50 uploads). Views are lifetime views.</p>
    </Card>
  );
}

function DailyTable({ history, name }) {
  const [sort, setSort] = useState({ key: "day", dir: -1 });
  const [n, setN] = useState(10);
  const rows = useMemo(() => history.slice(1).map((p, i) => {
    const dv = p.views - history[i].views;
    return { day: p.day, subs: p.subs, ds: p.subs - history[i].subs, views: p.views, dv, earn: Math.max(dv, 0) * EST_CPM / 1000 };
  }), [history]);
  const shown = [...rows].sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : -1) * sort.dir).slice(0, n);
  const th = (k, l) => (
    <th className="cursor-pointer select-none py-3 text-left font-semibold" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? -s.dir : -1 }))}>{l} <span className="text-slate-500">⇅</span></th>);
  return (
    <Card>
      <h2 className="mb-2 text-lg font-bold">Daily subscribers &amp; views for {name}</h2>
      {rows.length === 0 ? <p className="py-6 text-sm text-slate-400">Tracking started today. Daily rows appear from tomorrow.</p> : (<>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
          <thead><tr>{th("day", "Date")}{th("subs", "Subscribers")}{th("views", "Views")}{th("dv", "Views Change")}{th("earn", "Estimated Earnings")}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.day} className="border-t border-[#1b2238]">
              <td className="py-3.5">{new Date(r.day + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
              <td>{compact(r.subs)} {r.ds > 0 && <span className="ml-1 text-emerald-400">+{compact(r.ds)}</span>}</td>
              <td>{compact(r.views)}</td>
              <td className={r.dv >= 0 ? "text-emerald-400" : "text-red-400"}>{r.dv >= 0 ? "+" : "-"}{compact(Math.abs(r.dv))}</td>
              <td>${r.earn.toLocaleString("en", { maximumFractionDigits: 2 })}</td>
            </tr>))}</tbody></table></div>
        {n < rows.length && <button onClick={() => setN(n + 20)} className="mt-3 w-full rounded-full border border-[#1b2238] py-2.5 text-sm font-semibold hover:bg-[#131a2e]">Show more</button>}
      </>)}
    </Card>
  );
}

export default function ChannelStats() {
  const [input, setInput] = useState("");
  const [data, setData] = useState(null);
  const [audience, setAudience] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (handle) => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/youtube/channel/${encodeURIComponent(handle)}`);
      if (!res.ok) throw new Error((await res.json()).detail || "Channel not found");
      setData(await res.json());
    } catch (e) { setError(e.message || "Could not reach the server"); } finally { setLoading(false); }
  };
  useEffect(() => {
    load("@mrbeast");
    fetch(`${API}/api/analytics/audience`).then((r) => r.json()).then(setAudience).catch(() => {});
  }, []);

  const sample = data && data.history.length < 8;
  const shown = useMemo(() => (data && sample ? { ...data, history: makeSample(data.stats.subscribers || 1e6, data.stats.total_views), achievements: data.achievements } : data), [data, sample]);
  const c = data?.channel;
  const maxLoc = audience ? Math.max(...audience.locations.map((l) => l.viewers)) : 1;

  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <form onSubmit={(e) => { e.preventDefault(); input.trim() && load(input.trim()); }} className="flex items-center gap-3 rounded-full border border-[#1b2238] px-5 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Find channel (e.g. @mrbeast)" className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-slate-500" />
          <button className="rounded-full bg-blue-600 px-5 py-1.5 text-sm font-semibold hover:bg-blue-500">Search</button>
        </form>
        {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {loading && <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}

        {data && !loading && (<>
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="flex items-center gap-4">
              <img src={c.avatar} alt="" className="h-20 w-20 rounded-full object-cover" />
              <div className="min-w-0"><h1 className="truncate text-2xl font-bold">{c.name}</h1>
                <p className="text-sm text-slate-400">{c.handle} · {full(data.stats.total_videos)} videos · {new Date().getFullYear() - new Date(c.joined).getFullYear()} yrs</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[["Subscribers", full(data.stats.subscribers)], ["Total views", full(data.stats.total_views)],
                ["Est. earnings (last 50 uploads)", `${money(data.insights.est_earnings_recent.low)} – ${money(data.insights.est_earnings_recent.high)}`]].map(([l, v]) => (
                <Card key={l}><p className="text-sm text-slate-400">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></Card>))}
            </div>
          </div>

          <div className="flex border-b border-[#1b2238]">
            {["Overview", "Audience", "About"].map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 border-b-2 py-4 text-sm font-medium ${tab === k ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`}>{k}</button>))}
          </div>

          {tab === "Overview" && (<>
            <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
              <ChartPanel data={shown} sample={sample} />
              <LatestVideo v={data.latest_video} />
            </div>
            <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
              <VideosTable data={data} />
              <SplitCard videos={data.recent_videos} />
            </div>
            <DailyTable history={shown.history} name={c.name} />
          </>)}

          {tab === "Audience" && (
            <Card><h2 className="text-lg font-bold">Audience analytics</h2><p className="mb-4 text-sm text-slate-400">Top countries by viewers</p>
              {audience?.locations.map((l) => (
                <div key={l.country} className="grid grid-cols-[120px_1fr_60px] items-center gap-3 py-1.5 text-sm"><span>{l.country}</span>
                  <div className="h-2.5 rounded-full bg-[#1b2238]"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(l.viewers / maxLoc) * 100}%` }} /></div>
                  <span className="text-right text-slate-400">{compact(l.viewers)}</span></div>))}
              <p className="mt-4 text-xs text-amber-300">Sample data. Real country and state numbers need the channel owner to sign in with Google.</p></Card>)}
          {tab === "About" && (
            <Card><h2 className="mb-3 text-lg font-bold">About {c.name}</h2>
              <p className="mb-4 whitespace-pre-line text-sm text-slate-300">{c.description || "No description."}</p>
              <Row label="Handle">{c.handle}</Row><Row label="Joined">{new Date(c.joined).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}</Row>
              <Row label="Country">{c.country || "Not listed"}</Row><Row label="Uploads per week">{data.insights.uploads_per_week}</Row>
              <Row label="Engagement rate (last 50 uploads)">{data.insights.engagement_rate}%</Row><Row label="Average long-form length">{data.insights.avg_video_minutes} min</Row></Card>)}
        </>)}
      </div>
    </div>
  );
}