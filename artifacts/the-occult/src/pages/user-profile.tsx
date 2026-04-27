import { Layout } from "@/components/layout";
import { ExperimentCard } from "@/components/experiment-card";
import { useAuth } from "@/components/auth-context";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  FlaskConical,
  MessageSquare,
  Bookmark,
  ThumbsUp,
  Calendar,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  researchField: string | null;
  avatarUrl: string | null;
  createdAt: string;
  experimentCount: number;
  totalLikes: number;
}

interface UserComment {
  id: number;
  content: string;
  createdAt: string;
  experimentId: number;
  experimentTitle: string;
}

type Tab = "experiments" | "comments" | "bookmarks";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export default function UserProfile() {
  const [, params] = useRoute("/users/:id");
  const { user: me } = useAuth();
  const userId = parseInt(params?.id ?? "0", 10);
  const [activeTab, setActiveTab] = useState<Tab>("experiments");

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchJson<UserProfile>(`${base}/api/users/${userId}`),
    enabled: !!userId,
  });

  const { data: experiments, isLoading: expLoading } = useQuery<any[]>({
    queryKey: ["userExperiments", userId],
    queryFn: () => fetchJson<any[]>(`${base}/api/users/${userId}/experiments`),
    enabled: !!userId && activeTab === "experiments",
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<UserComment[]>({
    queryKey: ["userComments", userId],
    queryFn: () => fetchJson<UserComment[]>(`${base}/api/users/${userId}/comments`),
    enabled: !!userId && activeTab === "comments",
  });

  const { data: collections, isLoading: collectionsLoading } = useQuery<any[]>({
    queryKey: ["userCollections", userId],
    queryFn: () => fetchJson<any[]>(`${base}/api/users/${userId}/collections`),
    enabled: !!userId && activeTab === "bookmarks",
  });

  const isOwnProfile = me?.id === userId;

  if (profileLoading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-40 glass-card" />
          <div className="h-64 glass-card" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="glass-card p-12 text-center text-muted-foreground">
          <p className="text-lg mb-2">用户不存在</p>
          <p className="text-sm opacity-60">可能已被删除，或者从未存在过。</p>
        </div>
      </Layout>
    );
  }

  const joinedDate = formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true, locale: zhCN });

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl mx-auto">

        {/* ── Profile header ───────────────────────────────────────────── */}
        <div className="glass-card p-8 relative overflow-hidden border border-primary/20">
          <div className="absolute -right-8 -top-8 text-primary/[0.04] pointer-events-none select-none">
            <FlaskConical size={180} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">

            {/* Avatar */}
            <div className="h-20 w-20 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-3xl font-bold text-primary glow-primary shrink-0">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start mb-1">
                <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                {isOwnProfile && (
                  <Link
                    href="/dashboard"
                    className="text-xs font-mono px-2 py-0.5 rounded border border-primary/30 text-primary/70 hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    编辑
                  </Link>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground justify-center md:justify-start font-mono mb-3">
                <span>@{profile.username}</span>
                {profile.researchField && (
                  <>
                    <span className="text-primary/30">·</span>
                    <span>{profile.researchField}</span>
                  </>
                )}
                <span className="text-primary/30">·</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  加入于 {joinedDate}
                </span>
              </div>
              {profile.bio && (
                <p className="text-sm text-foreground/70 italic border-l-2 border-primary/30 pl-3">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 shrink-0">
              <div className="glass-card px-5 py-3 text-center border border-secondary/20">
                <div className="text-2xl font-bold text-secondary">{profile.experimentCount}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">失败记录</div>
              </div>
              <div className="glass-card px-5 py-3 text-center border border-primary/20">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <ThumbsUp size={18} />
                  {profile.totalLikes}
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">获得认同</div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-white/[0.07] pb-0">
          {([
            { key: "experiments" as Tab, label: "实验作品", icon: <FlaskConical size={14} /> },
            { key: "comments" as Tab, label: "评论记录", icon: <MessageSquare size={14} /> },
            { key: "bookmarks" as Tab, label: "我的收藏", icon: <Bookmark size={14} /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-mono transition-all border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/20"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────── */}

        {activeTab === "experiments" && (
          <div>
            {expLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-44 glass-card" />
                <div className="h-44 glass-card" />
              </div>
            ) : experiments && experiments.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {experiments.map((exp: any) => (
                  <ExperimentCard key={exp.id} experiment={exp} />
                ))}
              </div>
            ) : (
              <div className="glass-card border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground">
                <FlaskConical size={36} className="mx-auto mb-3 opacity-30" />
                <p>{isOwnProfile ? "还没有失败实验？你真的在搞科研吗？" : "该研究员尚未公开任何实验记录。"}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div>
            {commentsLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-20 glass-card" />
                <div className="h-20 glass-card" />
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="glass-card p-4 group">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <Link
                        href={`/experiments/${c.experimentId}`}
                        className="flex items-center gap-1.5 text-xs font-mono text-primary/70 hover:text-primary transition-colors line-clamp-1 min-w-0"
                      >
                        <BookOpen size={11} className="shrink-0" />
                        <span className="truncate">{c.experimentTitle}</span>
                        <ExternalLink size={10} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: zhCN })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed font-sans">{c.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground">
                <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
                <p>{isOwnProfile ? "你还没有发表过任何评论。" : "该研究员还没有参与过评论。"}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "bookmarks" && (
          <div>
            {collectionsLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-44 glass-card" />
                <div className="h-44 glass-card" />
              </div>
            ) : collections && collections.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {collections.map((exp: any) => (
                  <ExperimentCard key={exp.id} experiment={exp} />
                ))}
              </div>
            ) : (
              <div className="glass-card border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground">
                <Bookmark size={36} className="mx-auto mb-3 opacity-30" />
                <p>{isOwnProfile ? "还没有收藏任何实验，去发现一些有趣的失败吧。" : "该研究员还没有收藏任何实验。"}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}
