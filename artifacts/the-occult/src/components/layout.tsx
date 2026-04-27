import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { useAuth } from "./auth-context";
import { useLogout, useGetNotifications } from "@workspace/api-client-react";
import { FlaskConical, Home, Compass, Plus, LogOut, Bell, Monitor, ShieldAlert } from "lucide-react";
import { ParticleBg } from "./particle-bg";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const { data: notifData } = useGetNotifications({
    query: { enabled: !!user, refetchInterval: 30000, retry: false },
  });
  const unreadCount = notifData?.unreadCount ?? 0;

  const handleLogout = async () => {
    await logout.mutateAsync(undefined);
    window.location.href = "/auth";
  };

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col font-mono selection:bg-primary selection:text-primary-foreground">
      <ParticleBg />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/75 backdrop-blur-xl">
        {/* Top accent line — the teal signature */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* ── Brand ── */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-200">
              <FlaskConical size={14} className="text-primary" />
            </div>
            <span className="font-bold tracking-widest text-sm gradient-text hidden sm:inline">
              THE_OCCULT
            </span>
          </Link>

          {/* ── Navigation ── */}
          {user ? (
            <nav className="flex items-center gap-1">
              {/* Ghost nav links */}
              <NavPill href="/" active={isActive("/")} label="动态" icon={<Home size={14} />} />
              <NavPill href="/explore" active={isActive("/explore")} label="探索" icon={<Compass size={14} />} />
              <NavPill href="/wall" active={isActive("/wall")} label="作品库" icon={<Monitor size={14} />} />
              {user.isAdmin && (
                <NavPill href="/admin" active={isActive("/admin")} label="管理" icon={<ShieldAlert size={14} />} />
              )}

              {/* CTA: submit */}
              <Link
                href="/submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors ml-1"
              >
                <Plus size={13} />
                <span className="hidden sm:inline">投稿失败</span>
              </Link>

              {/* Notification bell */}
              <Link
                href="/notifications"
                className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/[0.06] transition-colors ml-0.5",
                  isActive("/notifications") && "bg-white/[0.06]"
                )}
              >
                <Bell
                  size={15}
                  className={cn(
                    "transition-colors",
                    unreadCount > 0 ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-0.5 bg-destructive text-white text-[9px] font-bold flex items-center justify-center rounded-full leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* User avatar + username */}
              <Link
                href={`/users/${user.id}`}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors ml-0.5",
                  isActive(`/users/${user.id}`) && "bg-white/[0.06]"
                )}
              >
                <div className="h-5 w-5 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  {user.username}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/[0.06] text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut size={14} />
              </button>
            </nav>
          ) : (
            <nav>
              <Link
                href="/auth"
                className="px-4 py-1.5 rounded-full border border-primary/40 text-primary text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                登录 / 注册
              </Link>
            </nav>
          )}
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="relative flex-1 container max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="relative border-t border-white/[0.05] py-8 text-center text-xs text-muted-foreground/50">
        <p className="mb-1 font-mono">"失败是成功TA妈，我来帮你避坑"</p>
        <p className="opacity-50 tracking-widest">SYSTEM_VOID_ONLINE // 破碎假设的避难所</p>
      </footer>
    </div>
  );
}

/* ── Helper: pill nav link ───────────────────────────────────────────────── */
function NavPill({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200",
        active
          ? "bg-white/[0.08] text-foreground"
          : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
