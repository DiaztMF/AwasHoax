"use client";

/*
 * Reading this as: Web search and dashboard interface for design-conscious users and project managers, 
 * with a sleek, tech-minimalist dark-mode language, leaning toward shadcn/ui primitives + Geist + custom responsive layouts + restrained micro-motion.
 * 
 * Core Dials Configuration:
 * DESIGN_VARIANCE: 6 (Asymmetric two-column layout, restrained borders)
 * MOTION_INTENSITY: 4 (Smooth entry animations, active button scales)
 * VISUAL_DENSITY: 5 (Clean spacing, grid-based card results)
 */

import { useState, useEffect } from "react";
import { 
  Search, 
  Database, 
  Cpu, 
  AlertTriangle, 
  TrendingUp, 
  Newspaper, 
  ShieldAlert, 
  ExternalLink,
  RefreshCw,
  Info
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

  // Ambil data statistik dan berita terbaru saat inisialisasi
  useEffect(() => {
    fetchStats();
    fetchLatestHoaxes();
  }, []);

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
      setDbError("Koneksi database Neon terputus atau sedang cold-start.");
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
      if (!res.ok) throw new Error("Gagal melakukan pencarian semantik");
      const data = await res.json();
      
      // Deteksi apakah respon menggunakan lexical fallback
      // Jika salah satu item memiliki similarity_score = 1.0 tetapi kueri bukan persis judulnya, 
      // atau jika API mengembalikan header khusus (kita asumsikan lexical jika score persis 1.0)
      const isLexical = data.some((item: HoaxItem) => item.similarity_score === 1.0);
      setSearchMode(isLexical ? "lexical" : "semantic");
      setSearchResults(data);
    } catch (err) {
      console.error(err);
      // Fallback lokal client-side jika koneksi backend gagal total
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
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      
      {/* 1. Header/Navigation */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Monogram Logo SVG */}
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono tracking-tighter">
              AH
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
              AwasHoax <span className="text-emerald-400 font-normal text-sm font-mono ml-1">Semantik v1</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Status Indicators */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 bg-zinc-900 py-1 px-2.5 rounded-full border border-zinc-800">
                <span className={`size-2 rounded-full ${dbError ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}></span>
                {dbError ? "DB Wakeup / Error" : "Neon DB Connected"}
              </span>
              <span className="flex items-center gap-1.5 bg-zinc-900 py-1 px-2.5 rounded-full border border-zinc-800">
                <Cpu className="size-3 text-zinc-500" />
                Gemini API Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area - Asymmetric 2 Column Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (col-span-7) - Headline, Search, Results */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight max-w-2xl bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-600 bg-clip-text text-transparent">
              Pencarian Semantik Berita Hoaks Indonesia
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-xl leading-relaxed">
              Ketikkan klaim atau isu berita yang ingin Anda verifikasi. Sistem menggunakan representasi vektor AI untuk mendeteksi makna konteks berita bohong secara cerdas.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col gap-4 bg-zinc-900/50 border border-zinc-900 p-5 rounded-xl">
            <div className="flex flex-col gap-2">
              <label htmlFor="search" className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Kueri Klaim / Isu Berita</label>
              <div className="relative flex items-center">
                <Input
                  id="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ketik di sini (contoh: 'vaksin mengandung cip magnetik'...)"
                  className="bg-zinc-950 border-zinc-800 text-zinc-50 h-11 pl-10 pr-4 rounded-lg focus-visible:ring-emerald-500/50 placeholder:text-zinc-600"
                />
                <Search className="absolute left-3.5 size-4 text-zinc-500" />
              </div>
            </div>

            {/* Advanced Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="minScore" className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Skor Kemiripan Min: {(minScore * 100).toFixed(0)}%</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Ambang Batas</span>
                </div>
                <input
                  id="minScore"
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={minScore}
                  onChange={(e) => setMinScore(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="limit" className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Batas Hasil: {limit} Artikel</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Max Output</span>
                </div>
                <div className="flex gap-2">
                  {[3, 5, 10].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={limit === val ? "default" : "outline"}
                      onClick={() => setLimit(val)}
                      className={`flex-1 text-xs h-8 rounded-md ${
                        limit === val 
                          ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 border-none font-bold" 
                          : "border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
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
                className="flex-1 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 h-10 font-bold active:scale-[0.98] transition-transform duration-100 disabled:opacity-50"
              >
                {loadingSearch ? "Memproses Vektor..." : "Cari Klaim Relevan"}
              </Button>
              
              {searchResults !== null && (
                <Button 
                  type="button" 
                  onClick={handleClearSearch}
                  variant="outline"
                  className="border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 h-10"
                >
                  Reset
                </Button>
              )}
            </div>
          </form>

          {/* 3. Search Results Block */}
          {loadingSearch && (
            <div className="flex flex-col gap-4">
              <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Mencari Data di Vektor Database...</h2>
              <Skeleton className="h-28 w-full bg-zinc-900 rounded-lg" />
              <Skeleton className="h-28 w-full bg-zinc-900 rounded-lg" />
            </div>
          )}

          {!loadingSearch && searchResults !== null && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Hasil Pencarian Semantik</h2>
                <Badge variant={searchMode === "semantic" ? "default" : "destructive"} className={
                  searchMode === "semantic" 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }>
                  {searchMode === "semantic" ? "Semantic Match (Gemini)" : "Lexical Fallback (ILIKE)"}
                </Badge>
              </div>

              {/* Warning Banner for Lexical Fallback Mode */}
              {searchMode === "lexical" && (
                <Alert className="bg-amber-500/5 border-amber-500/20 text-amber-200">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <AlertTitle className="font-bold">Mode Pencarian Darurat Aktif</AlertTitle>
                  <AlertDescription className="text-xs text-amber-300/80 leading-normal">
                    Koneksi ke Gemini API limit atau tidak terkonfigurasi. Pencarian dialihkan ke pencarian kata kunci literal (Lexical Search) pada database Neon.
                  </AlertDescription>
                </Alert>
              )}

              {searchResults.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center p-12 bg-zinc-950 border border-zinc-900 rounded-xl text-center gap-3">
                  <ShieldAlert className="size-10 text-zinc-600" />
                  <h3 className="font-bold text-zinc-300">Tidak Ada Hasil Cocok</h3>
                  <p className="text-zinc-500 text-xs max-w-xs leading-normal">
                    Tidak ditemukan data klarifikasi berita hoaks dengan nilai kemiripan di atas {(minScore * 100).toFixed(0)}%. Silakan coba turunkan ambang batas skor kemiripan atau gunakan kueri lain.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {searchResults.map((item) => (
                    <Card key={item.id} className="bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 transition-colors duration-150 rounded-lg">
                      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-zinc-500 font-mono">{item.publish_date || "Tanggal tidak diketahui"}</span>
                          <CardTitle className="text-base font-bold text-zinc-100 hover:text-emerald-400 transition-colors duration-150 leading-snug">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                              {item.title}
                              <ExternalLink className="size-3.5 inline-block shrink-0 text-zinc-500" />
                            </a>
                          </CardTitle>
                        </div>
                        {item.similarity_score !== undefined && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] py-0.5 px-2 shrink-0">
                            {(item.similarity_score * 100).toFixed(0)}% Match
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
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

        {/* Right Column (col-span-5) - Stats & Latest News */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Database & Stats Card */}
          <Card className="bg-zinc-900/50 border-zinc-900 rounded-xl overflow-hidden">
            <CardHeader className="bg-zinc-950/60 p-4 border-b border-zinc-900 flex flex-row items-center gap-3">
              <Database className="size-4 text-emerald-400" />
              <div>
                <CardTitle className="text-sm font-bold text-zinc-200">Statistik Dataset Neon</CardTitle>
                <CardDescription className="text-[10px] text-zinc-500 font-mono">Metadata Live</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              {loadingStats ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-24 bg-zinc-800" />
                  <Skeleton className="h-4 w-40 bg-zinc-800" />
                </div>
              ) : dbError ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="size-4" />
                    Database Sedang Tertidur
                  </span>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Neon database dalam mode ditangguhkan (*suspended*). Panggilan pencarian semantik pertama akan memakan waktu 5-10 detik untuk membangunkan server database.
                  </p>
                  <Button onClick={fetchStats} size="sm" variant="outline" className="mt-2 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 gap-1.5 h-8">
                    <RefreshCw className="size-3.5" /> Hubungkan Ulang
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                      {stats?.total_hoaxes ?? 0}
                    </span>
                    <span className="text-xs text-zinc-400">Total Berita Hoaks Terindeks</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-900/80 pt-3">
                    <TrendingUp className="size-4 text-zinc-600" />
                    <span>Sinkronisasi terakhir via scraper lokal</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Articles List (Always visible unless stats failed) */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Newspaper className="size-3.5 text-zinc-500" />
                Klarifikasi Hoaks Terbaru
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">5 Teratas</span>
            </div>

            {loadingLatest ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-16 w-full bg-zinc-900 rounded-lg" />
                <Skeleton className="h-16 w-full bg-zinc-900 rounded-lg" />
                <Skeleton className="h-16 w-full bg-zinc-900 rounded-lg" />
              </div>
            ) : dbError || latestHoaxes.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-zinc-900/10 border border-zinc-900 rounded-lg text-zinc-500 text-xs justify-center text-center">
                <Info className="size-4 text-zinc-600" />
                <span>Belum ada data berita yang dimuat dari database.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {latestHoaxes.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 transition-all duration-150 rounded-lg flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                      <span>{item.publish_date || "Klarifikasi Baru"}</span>
                      <span className="text-emerald-500/80">Terindeks</span>
                    </div>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-zinc-200 hover:text-emerald-400 transition-colors duration-150 leading-snug flex items-start gap-1"
                    >
                      {item.title}
                      <ExternalLink className="size-3 shrink-0 text-zinc-500 mt-0.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Informational / About Section */}
          <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl flex flex-col gap-2">
            <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Info className="size-3.5 text-emerald-400" /> Bagaimana Riset Ini Bekerja?
            </h3>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Aplikasi frontend ini memanggil server backend Python FastAPI. Backend melakukan kueri pencarian semantik terhadap Neon Serverless Postgres menggunakan modul <code className="text-zinc-400 font-mono">pgvector</code> untuk melakukan pembandingan kedekatan sudut kosinus antara vektor kueri teks dan vektor dokumen.
            </p>
          </div>

        </section>
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600 font-mono">
          <span>&copy; 2026 AwasHoax. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="https://turnbackhoax.id" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">TurnBackHoax</a>
            <span>&middot;</span>
            <a href="https://www.kaggle.com/docs/mcp" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400">Kaggle MCP</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
