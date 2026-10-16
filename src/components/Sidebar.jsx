import { useEffect, useState } from "react";
import { json, getMe } from "../lib/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Share2, ChevronDown, Play, GitBranch, Cloud, LogOut, DollarSign, FileText, Bell, Briefcase, Users, UserCog } from "lucide-react";

const PLATFORMS = [
  { to: "/", label: "YouTube", hint: "Channel stats", Icon: Play, tone: "text-red-400" },
  { to: "/github", label: "GitHub", hint: "Profile and repos", Icon: GitBranch, tone: "text-slate-200" },
  { to: "/bluesky", label: "Bluesky", hint: "Followers and posts", Icon: Cloud, tone: "text-sky-400" },
];

const ALL = ["creator", "agency", "marketing", "admin"];
const ROLE_LABEL = { creator: "Creator", agency: "Agency", marketing: "Marketing Team", admin: "Administrator" };
const MONEY = [
  { to: "/revenue", label: "Revenue", hint: "Income & sponsorships", Icon: DollarSign, tone: "text-emerald-400", roles: ["creator", "agency", "admin"] },
  { to: "/reports", label: "Reports", hint: "PDF & Excel export", Icon: FileText, tone: "text-purple-400", roles: ALL },
  { to: "/alerts", label: "Alerts", hint: "Notifications", Icon: Bell, tone: "text-amber-400", roles: ALL },
  { to: "/clients", label: "Clients", hint: "Creators you manage", Icon: Briefcase, tone: "text-sky-400", roles: ["agency"] },
  { to: "/users", label: "Users", hint: "Roles & access", Icon: Users, tone: "text-rose-400", roles: ["admin"] },
  { to: "/account", label: "Account", hint: "Profile & password", Icon: UserCog, tone: "text-slate-300", roles: ALL },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [role, setRole] = useState(null);
  useEffect(() => { getMe().then((m) => setRole(m.role)).catch(() => setRole(null)); }, [pathname]);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const f = () => json("/api/notifications").then((d) => setUnread(d.unread)).catch(() => {});
    f();
    const t = setInterval(f, 60000);
    return () => clearInterval(t);
  }, [pathname]);
  const logout = () => { localStorage.removeItem("token"); navigate("/auth"); };

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[#1b2238] bg-[#0b1020] text-white">
      <div className="border-b border-[#1b2238] p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Creator<span className="text-blue-500">IQ</span></h1>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="group flex w-full items-center gap-3 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-600/25 to-transparent p-3 text-left transition hover:border-blue-400/60"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30"><Share2 className="h-4 w-4" /></span>
          <span className="flex-1 font-semibold">Social Platforms</span>
          <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>

        <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="ml-5 mt-1 space-y-1 border-l border-[#1b2238] pl-3">
              {PLATFORMS.map(({ to, label, hint, Icon, tone }) => {
                const active = pathname === to;
                return (
                  <Link key={to} to={to}
                    className={`flex items-center gap-3 rounded-lg p-2.5 transition ${active ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-300 hover:bg-[#131a2e]"}`}>
                    <Icon className={`h-4 w-4 ${active ? "text-white" : tone}`} />
                    <span className="leading-tight"><span className="block text-sm font-semibold">{label}</span><span className={`block text-xs ${active ? "text-blue-100" : "text-slate-500"}`}>{hint}</span></span>
                  </Link>);
              })}
            </div>
          </div>
        </div>
        <p className="px-2 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Workspace</p>
        {MONEY.filter((m) => role && m.roles.includes(role)).map(({ to, label, hint, Icon, tone }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} className={`flex items-center gap-3 rounded-xl p-3 transition ${active ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-300 hover:bg-[#131a2e]"}`}>
              <Icon className={`h-4 w-4 ${active ? "text-white" : tone}`} />
              <span className="flex-1 leading-tight"><span className="block text-sm font-semibold">{label}</span><span className={`block text-xs ${active ? "text-blue-100" : "text-slate-500"}`}>{hint}</span></span>
              {to === "/alerts" && unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
            </Link>);
        })}
      </nav>

      <div className="border-t border-[#1b2238] p-4">
        {role && <p className="mb-2 rounded-lg bg-blue-600/15 py-1.5 text-center text-xs font-semibold text-blue-300">{ROLE_LABEL[role]}</p>}
        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-lg p-3 font-medium text-red-400 transition hover:bg-red-600 hover:text-white">
          <LogOut className="h-4 w-4" /> Log Out
        </button>
      </div>
    </aside>
  );
}