import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  FileText,
  Search as SearchIcon,
  Clock,
  Download,
  LogOut,
  MoreHorizontal,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { rangeApi } from "../lib/api";
import { todayKey, addDays } from "../lib/date";
import { MonthlyCalendarModal } from "./MonthlyCalendarModal";
import { DailyActivityModal } from "./DailyActivityModal";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = todayKey();

  // On-demand prefetch for Daily Activity Modal when interacting with menu
  const prefetchActivity = () => {
    const actFrom = addDays(today, -30);
    const actTo = today;
    queryClient.prefetchQuery({
      queryKey: ["days", actFrom, actTo],
      queryFn: () => rangeApi.get(actFrom, actTo),
      staleTime: 60_000,
    });
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  const handleOpenCalendar = () => {
    setOpen(false);
    setCalendarModalOpen(true);
  };

  const handleOpenActivity = () => {
    setOpen(false);
    setActivityModalOpen(true);
  };

  return (
    <>
      <header className="relative w-full flex items-center justify-between py-2 px-1">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group transition">
          <div className="relative flex items-center justify-center">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-400/20 via-zinc-900 to-black p-0.5 ring-1 ring-white/10 group-hover:ring-emerald-500/50 shadow-lg shadow-black/60 transition-all duration-300">
              <img
                src="/icon-192.png"
                alt="DailyOS"
                className="h-full w-full rounded-[14px] object-cover"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-[#07070a]" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 group-hover:text-emerald-300 transition-colors">
                DailyOS
              </span>
              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono tracking-wide flex items-center gap-1 mt-0.5">
              <span>IST</span>
              <span className="text-zinc-600">•</span>
              <span>Asia/Kolkata</span>
            </p>
          </div>
        </Link>

        {/* Right-side controls: Theme toggle button + Meatballs 3-dot menu */}
        <div className="flex items-center gap-2">
          {/* Theme toggle button (Sun in dark mode, Moon in light mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{ touchAction: "manipulation" }}
            className="h-9 w-9 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08]"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-transform duration-200 hover:rotate-12" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700 hover:text-zinc-900 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          {/* Meatballs 3-dot menu toggle */}
          <div className="relative">
            <button
              ref={buttonRef}
              aria-label="Menu options"
              aria-expanded={open}
              onClick={() => {
                if (!open) prefetchActivity();
                setOpen((prev) => !prev);
              }}
              onMouseEnter={prefetchActivity}
              onPointerDown={prefetchActivity}
              style={{ touchAction: "manipulation" }}
              className={`h-9 w-9 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer backdrop-blur-xl ${
                open
                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/40"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08]"
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {open && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-2 w-60 rounded-3xl bg-[#0f0f16]/95 backdrop-blur-2xl border border-white/[0.1] p-2 shadow-2xl shadow-black/80 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Calendar & Activity Section */}
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Calendar & Logs</span>
                </div>

                {/* Calendar modal trigger */}
                <button
                  type="button"
                  onClick={handleOpenCalendar}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-2xl transition text-left cursor-pointer"
                >
                  <span className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-400">
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </span>
                  <span>Calendar Modal</span>
                </button>

                {/* Daily Activity modal trigger */}
                <button
                  type="button"
                  onClick={handleOpenActivity}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-2xl transition text-left cursor-pointer"
                >
                  <span className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-400">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <span>Daily Activity Logs</span>
                </button>

                <div className="my-1.5 h-px bg-white/[0.06]" />

                {/* Quick Navigation Section */}
                <div className="px-3 pt-1 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest font-mono">
                  Navigation
                </div>

                <Link
                  to="/search"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-2xl transition text-left"
                >
                  <span className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-400">
                    <SearchIcon className="w-3.5 h-3.5" />
                  </span>
                  <span>Search Logs</span>
                </Link>

                <Link
                  to="/timeline"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-2xl transition text-left"
                >
                  <span className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                  <span>Timeline</span>
                </Link>

                <Link
                  to="/calendar"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-2xl transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-400">
                      <CalendarIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>Calendar View</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Pro
                  </span>
                </Link>

                <Link
                  to="/export"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-2xl transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-400">
                      <Download className="w-3.5 h-3.5" />
                    </span>
                    <span>Export (JSON / CSV)</span>
                  </div>
                </Link>

                <div className="my-1.5 h-px bg-white/[0.06]" />

                {/* Sign out */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-2xl transition text-left cursor-pointer"
                >
                  <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400">
                    <LogOut className="w-3.5 h-3.5" />
                  </span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals triggered from 3-dot menu */}
      <MonthlyCalendarModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
      />
      <DailyActivityModal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
      />
    </>
  );
}
