"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Database, 
  AlertTriangle, 
  TrendingUp, 
  Newspaper, 
  ShieldAlert, 
  ExternalLink,
  RefreshCw,
  Info,
  Sun,
  Moon
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface HoaxItem {
  id: number;
  title: string;
  url: string;
  publish_date?: string;
  summary?: string;
  similarity_score?: number;
}

interface StatsData {
  total_hoaxes: number;
  last_updated: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0.4);
  const [limit, setLimit] = useState(5);
  const [isDark, setIsDark] = useState(true);
  
  // States untuk data
  const [stats, setStats] = useState<StatsData | null>(null);
  const [latestHoaxes, setLatestHoaxes] = useState<HoaxItem[]>([]);
  const [searchResults, setSearchResults] = useState<HoaxItem[] | null>(null);
  const [searchMode, setSearchMode] = useState<"semantic" | "lexical">("semantic");
  
  // Loading & Error States
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    fetchStats();
    fetchLatestHoaxes();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/stats`);
      if (!res.ok) throw new Error("Gagal mengambil data statistik");
      const data = await res.json();
      setStats(data);
      setDbError(null);
    } catch (err: any) {
      console.error(err);
      setDbError("Koneksi server terputus.");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchLatestHoaxes = async () => {
    setLoadingLatest(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hoaxes/latest?limit=5`);
      if (!res.ok) throw new Error("Gagal mengambil data hoaks terbaru");
      const data = await res.json();
      setLatestHoaxes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLatest(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoadingSearch(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}&min_score=${minScore}`
      );
      if (!res.ok) throw new Error("Gagal melakukan pencarian");
      const data = await res.json();
      
      const isLexical = data.some((item: HoaxItem) => item.similarity_score === 1.0);
      setSearchMode(isLexical ? "lexical" : "semantic");
      setSearchResults(data);
    } catch (err) {
      console.error(err);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleClearSearch = () => {
    setQuery("");
    setSearchResults(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-500">
      
      {/* 1. Header/Navigation */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl tracking-tight text-foreground flex items-center gap-2">
              AwasHoax 
              <Badge variant="outline" className="text-[11px] font-normal border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                Verifikasi Fakta
              </Badge>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="size-9 border-border text-foreground hover:bg-accent rounded-lg transition-colors cursor-pointer"
              aria-label="Ubah Tema"
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-zinc-700" />}
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Search & Results */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-2xl text-foreground">
              Cek Kebenaran & Fakta Berita Hoaks
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl leading-relaxed">
              Masukkan klaim atau isu berita yang ingin Anda verifikasi kebenarannya berdasarkan sumber data tepercaya.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col gap-4 bg-card border border-border p-5 rounded-xl shadow-xs">
            <div className="flex flex-col gap-2">
              <label htmlFor="search" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Klaim / Topik Berita</label>
              <div className="relative flex items-center">
                <Input
                  id="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ketik klaim berita (contoh: 'vaksin mengandung cip magnetik')..."
                  className="bg-background border-border text-foreground h-11 pl-10 pr-4 rounded-lg focus-visible:ring-emerald-500/50"
                />
                <Search className="absolute left-3.5 size-4 text-muted-foreground" />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="minScore" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tingkat Keakuratan Minimal: {(minScore * 100).toFixed(0)}%</label>
                </div>
                <input
                  id="minScore"
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={minScore}
                  onChange={(e) => setMinScore(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="limit" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jumlah Tampilan: {limit} Artikel</label>
                </div>
                <div className="flex gap-2">
                  {[3, 5, 10].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={limit === val ? "default" : "outline"}
                      onClick={() => setLimit(val)}
                      className={`flex-1 text-xs h-8 rounded-md cursor-pointer ${
                        limit === val 
                          ? "bg-emerald-500 text-white dark:text-zinc-950 hover:bg-emerald-600 border-none font-bold" 
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-1">
              <Button 
                type="submit" 
                disabled={loadingSearch || !query.trim()}
                className="flex-1 bg-emerald-500 text-white dark:text-zinc-950 hover:bg-emerald-600 h-10 font-bold active:scale-[0.98] transition-transform duration-100 disabled:opacity-50 cursor-pointer"
              >
                {loadingSearch ? "Memeriksa Data..." : "Cari Klaim Relevan"}
              </Button>
              
              {searchResults !== null && (
                <Button 
                  type="button" 
                  onClick={handleClearSearch}
                  variant="outline"
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-accent h-10 cursor-pointer"
                >
                  Reset
                </Button>
              )}
            </div>
          </form>

          {/* Search Results */}
          {loadingSearch && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Memeriksa Database...</h2>
              <Skeleton className="h-28 w-full bg-muted rounded-lg" />
              <Skeleton className="h-28 w-full bg-muted rounded-lg" />
            </div>
          )}

          {!loadingSearch && searchResults !== null && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hasil Verifikasi Berita</h2>
                <Badge variant={searchMode === "semantic" ? "default" : "destructive"} className={
                  searchMode === "semantic" 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                }>
                  {searchMode === "semantic" ? "Verifikasi Cerdas" : "Pencarian Kata Kunci"}
                </Badge>
              </div>

              {searchMode === "lexical" && (
                <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-300">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <AlertTitle className="font-bold">Pencarian Kata Kunci Aktif</AlertTitle>
                  <AlertDescription className="text-xs leading-normal opacity-90">
                    Pencarian dialihkan ke pencarian kata kunci literal pada database.
                  </AlertDescription>
                </Alert>
              )}

              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-xl text-center gap-3">
                  <ShieldAlert className="size-10 text-muted-foreground opacity-60" />
                  <h3 className="font-bold text-foreground">Tidak Ada Berita Cocok</h3>
                  <p className="text-muted-foreground text-xs max-w-xs leading-normal">
                    Tidak ditemukan data klarifikasi berita hoaks dengan tingkat keakuratan di atas {(minScore * 100).toFixed(0)}%. Silakan coba turunkan tingkat keakuratan atau gunakan kata kunci lain.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {searchResults.map((item) => (
                    <Card key={item.id} className="bg-card border-border hover:border-emerald-500/40 transition-colors duration-150 rounded-xl">
                      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-muted-foreground">{item.publish_date || "Tanggal tidak diketahui"}</span>
                          <CardTitle className="text-base font-bold text-foreground hover:text-emerald-500 transition-colors duration-150 leading-snug">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                              {item.title}
                              <ExternalLink className="size-3.5 inline-block shrink-0 text-muted-foreground" />
                            </a>
                          </CardTitle>
                        </div>
                        {item.similarity_score !== undefined && (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono text-[11px] py-0.5 px-2 shrink-0">
                            {(item.similarity_score * 100).toFixed(0)}% Cocok
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {item.summary || "Tidak ada ringkasan penjelasan."}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Column - Stats & Latest News */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Stats Card */}
          <Card className="bg-card border-border rounded-xl overflow-hidden shadow-xs">
            <CardHeader className="bg-muted/40 p-4 border-b border-border flex flex-row items-center gap-3">
              <Database className="size-4 text-emerald-500" />
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Pusat Data Klarifikasi</CardTitle>
                <CardDescription className="text-[11px] text-muted-foreground">Data Terverifikasi</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              {loadingStats ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-24 bg-muted" />
                  <Skeleton className="h-4 w-40 bg-muted" />
                </div>
              ) : dbError ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-amber-500 flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="size-4" />
                    Server Belum Merespon
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Server sedang memuat data awal. Silakan coba hubungkan ulang.
                  </p>
                  <Button onClick={fetchStats} size="sm" variant="outline" className="mt-2 text-xs border-border hover:bg-accent text-muted-foreground hover:text-foreground gap-1.5 h-8 cursor-pointer">
                    <RefreshCw className="size-3.5" /> Hubungkan Ulang
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-500 font-mono">
                      {stats?.total_hoaxes ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">Total Berita Terverifikasi</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                    <TrendingUp className="size-4 text-muted-foreground opacity-70" />
                    <span>Diperbarui secara otomatis dari sumber tepercaya</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Articles List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Newspaper className="size-3.5 text-muted-foreground" />
                Klarifikasi Hoaks Terbaru
              </h2>
              <span className="text-[11px] text-muted-foreground">5 Teratas</span>
            </div>

            {loadingLatest ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-16 w-full bg-muted rounded-lg" />
                <Skeleton className="h-16 w-full bg-muted rounded-lg" />
                <Skeleton className="h-16 w-full bg-muted rounded-lg" />
              </div>
            ) : dbError || latestHoaxes.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-card border border-border rounded-lg text-muted-foreground text-xs justify-center text-center">
                <Info className="size-4 text-muted-foreground" />
                <span>Belum ada data berita yang dimuat.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {latestHoaxes.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-card border border-border hover:border-emerald-500/40 transition-all duration-150 rounded-xl flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{item.publish_date || "Klarifikasi Baru"}</span>
                      <span className="text-emerald-500 font-medium">Terverifikasi</span>
                    </div>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-foreground hover:text-emerald-500 transition-colors duration-150 leading-snug flex items-start gap-1"
                    >
                      {item.title}
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground mt-0.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-border bg-background mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>&copy; 2026 AwasHoax. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="https://turnbackhoax.id" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Sumber Data: TurnBackHoax</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
