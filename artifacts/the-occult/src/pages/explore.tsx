import { Layout } from "@/components/layout";
import { useListExperiments, useGetCategoryStats, useGetFailureReasons } from "@workspace/api-client-react";
import { ExperimentCard } from "@/components/experiment-card";
import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { Search, Filter, PieChart, Tag, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { ListExperimentsSortBy } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
const PAGE_SIZE = 12;

interface TagStat { id: number; name: string; count: number; }

/* ── Pagination component ──────────────────────────────────────────────── */
function Pagination({ page, total, limit, onPage }: {
  page: number; total: number; limit: number; onPage: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const getPages = (): (number | "…")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "…", totalPages];
    if (page >= totalPages - 3) return [1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "…", page - 1, page, page + 1, "…", totalPages];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 pt-6 border-t border-white/[0.06]">
      <span className="text-xs text-muted-foreground font-mono order-2 sm:order-1">
        共 <span className="text-foreground font-bold">{total}</span> 个失败实验 &nbsp;·&nbsp;
        第 <span className="text-foreground font-bold">{page}</span> / <span className="text-foreground font-bold">{totalPages}</span> 页
      </span>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPage(1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-white/10 hover:border-primary/40 hover:text-primary text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          title="第一页"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-white/10 hover:border-primary/40 hover:text-primary text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          title="上一页"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPages().map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-muted-foreground/40 font-mono select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all border",
                  p === page
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "border-white/[0.08] text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/[0.06]"
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-white/10 hover:border-primary/40 hover:text-primary text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          title="下一页"
        >
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-white/10 hover:border-primary/40 hover:text-primary text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          title="最后一页"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function Explore() {
  const searchStr = useSearch();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<ListExperimentsSortBy>("newest");
  const [page, setPage] = useState(1);
  const [activeTag, setActiveTag] = useState<string | null>(() => {
    const p = new URLSearchParams(searchStr);
    return p.get("tag") || null;
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(searchStr);
    const t = p.get("tag") || null;
    setActiveTag(t);
    setPage(1);
  }, [searchStr]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const handleCategory = (val: string) => { setCategory(val); setPage(1); };
  const handleSort = (val: ListExperimentsSortBy) => { setSortBy(val); setPage(1); };
  const handleTag = (tag: string | null) => { setActiveTag(tag); setPage(1); };

  const handlePage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const { data: listData, isLoading, isFetching } = useListExperiments({
    search: debouncedSearch || undefined,
    category: category !== "all" ? category : undefined,
    tag: activeTag ?? undefined,
    sortBy,
    page,
    limit: PAGE_SIZE,
  });

  const { data: categoryStats } = useGetCategoryStats();
  const { data: failureStats } = useGetFailureReasons();
  const { data: allTags } = useQuery<TagStat[]>({
    queryKey: ["tags"],
    queryFn: () => fetch(`${base}/api/tags`, { credentials: "include" }).then(r => r.json()),
  });

  const total = listData?.total ?? 0;
  const experiments = listData?.experiments ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div ref={topRef} className="pb-8 occult-divider">
          <h1 className="text-3xl font-bold gradient-text mb-6 uppercase tracking-widest">
            探索_失败深渊
          </h1>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="搜索失败实验..."
                className="pl-10 bg-card border-white/[0.08] rounded-xl focus-visible:ring-primary h-11 text-sm font-mono"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Select value={category} onValueChange={handleCategory}>
                <SelectTrigger className="w-[180px] bg-card border-white/[0.08] rounded-xl h-11">
                  <Filter size={14} className="mr-2 shrink-0" />
                  <SelectValue placeholder="研究领域" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-card">
                  <SelectItem value="all">全部领域</SelectItem>
                  {categoryStats?.map(stat => (
                    <SelectItem key={stat.category} value={stat.category}>
                      {stat.category} ({stat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(val: any) => handleSort(val)}>
                <SelectTrigger className="w-[160px] bg-card border-white/[0.08] rounded-xl h-11">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-card">
                  <SelectItem value="newest">最新失败</SelectItem>
                  <SelectItem value="mostLiked">最多认同</SelectItem>
                  <SelectItem value="mostCommented">最多讨论</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active tag badge */}
          {activeTag && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">当前标签：</span>
              <button
                type="button"
                onClick={() => handleTag(null)}
                className="flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/30 text-primary px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors"
              >
                <Tag size={11} />
                #{activeTag}
                <X size={11} />
              </button>
            </div>
          )}
        </div>

        {/* ── Content + sidebar ───────────────────────────────────────── */}
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main results */}
          <div className="lg:col-span-3 space-y-0">
            {/* Loading skeleton */}
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="h-52 glass-card animate-pulse" />
                ))}
              </div>
            ) : experiments.length === 0 ? (
              <div className="text-center py-28 glass-card text-muted-foreground font-mono text-sm">
                没有符合条件的失败实验
              </div>
            ) : (
              <>
                {/* Fetching overlay hint */}
                <div className={cn(
                  "grid md:grid-cols-2 gap-4 transition-opacity duration-200",
                  isFetching && "opacity-60 pointer-events-none"
                )}>
                  {experiments.map(exp => (
                    <ExperimentCard key={exp.id} experiment={exp} />
                  ))}
                </div>

                <Pagination
                  page={page}
                  total={total}
                  limit={PAGE_SIZE}
                  onPage={handlePage}
                />
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tag cloud */}
            {allTags && allTags.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-primary text-sm uppercase tracking-wider occult-divider pb-3">
                  <Tag size={14} /> 标签云
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 30).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTag(activeTag === t.name ? null : t.name)}
                      className={cn(
                        "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all font-mono",
                        activeTag === t.name
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "bg-white/[0.03] border-white/10 text-muted-foreground hover:border-primary/30 hover:text-primary"
                      )}
                    >
                      #{t.name}
                      <span className="opacity-50">{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Failure reason stats */}
            <div className="glass-card p-5">
              <h3 className="font-bold mb-5 flex items-center gap-2 text-destructive text-sm uppercase tracking-wider occult-divider pb-3">
                <PieChart size={16} /> 失败根因
              </h3>
              <div className="space-y-4">
                {failureStats?.map((stat, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="truncate pr-3 text-muted-foreground" title={stat.reason}>
                        {stat.reason}
                      </span>
                      <span className="font-mono font-bold text-foreground">{stat.count}</span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive/50 rounded-full"
                        style={{ width: `${Math.max(6, (stat.count / (failureStats[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
