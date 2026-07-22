# Implementation Plan: Redesign Frontend & Theme Toggle AwasHoax

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti font aplikasi menjadi Plus Jakarta Sans, menambahkan fitur Theme Toggle (Light/Dark mode), dan menyederhanakan bahasa serta tata letak antarmuka agar ramah pengguna tanpa istilah teknis.

**Architecture:** Menggunakan `Plus Jakarta Sans` dari `next/font/google` di `layout.tsx` dan `globals.css`, mengimplementasikan state/class theme toggle pada komponen React Next.js, serta melakukan pembersihan teks dan perapihan layout pada `page.tsx`.

**Tech Stack:** Next.js App Router (TypeScript), Tailwind CSS v4, shadcn/ui, Lucide Icons.

## Global Constraints

- **Font Family:** `Plus Jakarta Sans` (CSS variable `--font-plus-jakarta`).
- **Color Tokens:** `zinc-950` / `zinc-50` untuk latar belakang, `emerald-500` / `emerald-600` untuk warna aksen.
- **Tone of Voice:** Bahasa Indonesia ramah pengguna, bebas dari istilah teknis (*vector*, *neon*, *scraper*, *min_score*, *ambang batas*, *metadata live*).

---

### Task 1: Konfigurasi Font Plus Jakarta Sans

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Consumes: `Plus_Jakarta_Sans` dari `next/font/google`
- Produces: CSS variable `--font-plus-jakarta` yang di-map ke `--font-sans` di Tailwind.

- [ ] **Step 1: Impor Plus_Jakarta_Sans di layout.tsx**

Ubah impor font di `frontend/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AwasHoax - Cek Kebenaran & Fakta Berita",
  description: "Platform verifikasi fakta berita hoaks Indonesia secara cerdas dan akurat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakarta.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Update CSS Variable di globals.css**

Perbarui baris `@theme` di `frontend/src/app/globals.css`:
```css
@theme inline {
  --font-sans: var(--font-plus-jakarta);
  --font-mono: var(--font-geist-mono);
}
```

- [ ] **Step 3: Verifikasi Tipe Data & Kompilasi**

Run: `npx tsc --noEmit` di folder `frontend`
Expected: PASS tanpa error.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/globals.css
git commit -m "style: configure Plus Jakarta Sans font as primary font"
```

---

### Task 2: Implementasi Komponen Theme Toggle (Mode Terang & Gelap)

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/layout.tsx`

**Interfaces:**
- Consumes: Ikon `Sun` dan `Moon` dari `lucide-react`.
- Produces: State `theme` ("dark" | "light") yang mengalihkan kelas `dark` pada tag `<html>`.

- [ ] **Step 1: Tambahkan state theme & tombol saklar di Header page.tsx**

Tambahkan fungsi pengalih tema di `frontend/src/app/page.tsx`:
```tsx
const [isDark, setIsDark] = useState(true);

const toggleTheme = () => {
  const newTheme = !isDark;
  setIsDark(newTheme);
  if (newTheme) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};
```

Di dalam Header:
```tsx
<Button
  type="button"
  variant="outline"
  size="icon"
  onClick={toggleTheme}
  className="size-9 border-border text-foreground hover:bg-accent rounded-lg"
  aria-label="Ubah Tema"
>
  {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-zinc-700" />}
</Button>
```

- [ ] **Step 2: Verifikasi Tipe Data**

Run: `npx tsc --noEmit` di folder `frontend`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: add light/dark mode theme toggle to header"
```

---

### Task 3: Pembersihan Bahasa Teknis & Konten Tidak Relevan pada page.tsx

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: API backend `/api/search`, `/api/stats`, `/api/hoaxes/latest`
- Produces: Tampilan antarmuka yang bersih dari istilah teknis.

- [ ] **Step 1: Perbarui Teks & Hapus Konten Tidak Relevan**

Di `frontend/src/app/page.tsx`:
1. Ubah Judul Utama: *"Cek Kebenaran & Fakta Berita Hoaks"*
2. Ubah Deskripsi: *"Masukkan klaim atau isu berita yang ingin Anda verifikasi kebenarannya berdasarkan sumber data tepercaya."*
3. Ubah Label Input: *"Klaim / Topik Berita"*
4. Ubah Label Slider: `"Tingkat Keakuratan Minimal: " + (minScore * 100).toFixed(0) + "%"`
5. Ubah Label Limit: `"Jumlah Tampilan: " + limit + " Artikel"`
6. Ubah Judul Statistik: *"Pusat Data Klarifikasi"* dan label *"Total Berita Terverifikasi"*.
7. Hapus lencana developer di header (`Neon DB Connected`, `Gemini API Active`).
8. Hapus kartu penjelas teknis di kanan bawah (*Bagaimana Riset Ini Bekerja?*).

- [ ] **Step 2: Verifikasi Tipe Data**

Run: `npx tsc --noEmit` di folder `frontend`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "refactor: simplify UI copy, remove technical jargon and unused sections"
```

---

### Task 4: Polish Visual Layouting & Final Verification

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Uji Kompilasi TypeScript**

Run: `npx tsc --noEmit` di folder `frontend`
Expected: PASS.

- [ ] **Step 2: Push Perubahan ke GitHub**

```bash
git add .
git commit -m "style: final polish for frontend redesign and theme toggle"
git push origin main
```
