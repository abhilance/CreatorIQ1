import { useEffect, useState } from "react";
import { Bell, DollarSign, TrendingUp, AlertTriangle, FileText, CheckCheck } from "lucide-react";
import { json, api } from "../lib/api";

const ICON = { revenue: [DollarSign, "text-emerald-400"], growth: [TrendingUp, "text-blue-400"], warning: [AlertTriangle, "text-amber-400"], report: [FileText, "text-purple-400"] };

export default function Alerts() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { json("/api/notifications").then(setData).catch((e) => setError(e.message)); }, []);
  const readAll = async () => { await api("/api/notifications/read-all", { method: "POST" }); setData(await json("/api/notifications")); };
  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Alerts</h1><p className="text-sm text-slate-400">Performance, revenue and weekly report notifications.</p></div>
          <button onClick={readAll} className="flex items-center gap-2 rounded-xl border border-[#1b2238] px-4 py-2 text-sm hover:bg-[#131a2e]"><CheckCheck className="h-4 w-4" />Mark all read</button></div>
        {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {data?.items.length === 0 && <p className="py-16 text-center text-slate-400"><Bell className="mx-auto mb-2 h-8 w-8" />No alerts yet.</p>}
        {data?.items.map((n) => { const [Icon, tone] = ICON[n.kind] || ICON.report; return (
          <div key={n.id} className={`flex items-start gap-3 rounded-2xl border p-4 ${n.is_read ? "border-[#1b2238] bg-[#0e1322]" : "border-blue-500/40 bg-blue-500/5"}`}>
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} /><div className="flex-1"><p className="text-sm font-medium">{n.message}</p>
              <p className="mt-1 text-xs text-slate-500">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</p></div>
            {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />}</div>); })}
      </div>
    </div>
  );
}