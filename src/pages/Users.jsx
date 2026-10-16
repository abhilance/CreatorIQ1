import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { json, api, getMe } from "../lib/api";

const ROLES = { creator: "Creator", agency: "Agency", marketing: "Marketing Team", admin: "Administrator" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState("");
  const load = () => Promise.all([json("/api/admin/users"), json("/api/admin/stats")]).then(([u, s]) => { setUsers(u); setStats(s); }).catch((e) => setError(e.message));
  useEffect(() => { load(); getMe().then((m) => setMeId(m.id)); }, []);
  const patch = async (id, body) => { setError(""); try { await api(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }); load(); } catch (e) { setError(e.message); } };
  const del = async (u) => { if (confirm(`Delete ${u.email} and all their data?`)) { try { await api(`/api/admin/users/${u.id}`, { method: "DELETE" }); load(); } catch (e) { setError(e.message); } } };
  return (
    <div className="min-h-full bg-[#080b14] p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div><h1 className="text-2xl font-bold">User management</h1><p className="text-sm text-slate-400">Change roles, deactivate accounts and review platform totals.</p></div>
        {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[["Total users", stats.total_users], ["Revenue entries", stats.revenue_entries], ["Tracked channels", stats.tracked_channels],
              ["Creators / Agencies / Marketing", `${stats.by_role.creator} / ${stats.by_role.agency} / ${stats.by_role.marketing}`]].map(([l, v]) => (
              <div key={l} className="rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5"><p className="text-sm text-slate-400">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></div>))}
          </div>)}
        <div className="overflow-x-auto rounded-2xl border border-[#1b2238] bg-[#0e1322] p-5">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="text-left text-slate-400"><th className="py-3">User</th><th>Role</th><th>Status</th><th>Entries</th><th /></tr></thead>
            <tbody>{users.map((u) => { const self = u.id === meId; return (
              <tr key={u.id} className="border-t border-[#1b2238]">
                <td className="py-3"><p className="font-medium">{u.full_name || u.email.split("@")[0]}{self && <span className="ml-2 rounded-full bg-blue-600/20 px-2 py-0.5 text-xs text-blue-300">You</span>}</p><p className="text-xs text-slate-400">{u.email}</p></td>
                <td><select disabled={self} value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} className="rounded-lg border border-[#1b2238] bg-[#080b14] px-2 py-1.5 disabled:opacity-50">
                  {Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                <td><button disabled={self} onClick={() => patch(u.id, { is_active: !u.is_active })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50 ${u.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{u.is_active ? "Active" : "Deactivated"}</button></td>
                <td>{u.entries}</td>
                <td className="text-right"><button aria-label="Delete user" disabled={self} onClick={() => del(u)} className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></td>
              </tr>); })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}