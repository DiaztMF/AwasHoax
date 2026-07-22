# Laporan Verifikasi Pengujian & Implementasi UI (Verification Walkthrough)

Dokumen ini merekam hasil akhir verifikasi implementasi backend API, modul scraper, dan **antarmuka frontend Next.js** berbasis **shadcn/ui** untuk **Sistem Deteksi & Pencarian Semantik Berita Hoaks**.

---

## 1. Tinjauan Hasil Pengujian Backend (`tests/`)

Uji coba diimplementasikan menggunakan `pytest` dan `unittest.mock` untuk memastikan logika API backend dan scraper bebas dari error sintaksis dan berjalan 100% sukses di lingkungan terisolasi.

### Hasil Log Pengujian (Test Output Log):
```text
============================= test session starts =============================
platform win32 -- Python 3.13.3, pytest-9.0.0, pluggy-1.6.0
rootdir: D:\Project\Web Project\Enuma\Project Mas Evan
plugins: anyio-4.14.2, dash-3.2.0, cov-6.3.0
collected 8 items

Hoax Detection Web\tests\test_backend.py ....                            [ 50%]
Hoax Detection Web\tests\test_scraper.py ....                            [100%]

============================== 8 passed in 1.75s ==============================
```

---

## 2. Desain & Fitur Frontend (`frontend/`)

Antarmuka frontend dirancang dengan gaya **tech-minimalist dark-mode** menggunakan standar desain **shadcn/ui** dan performa tinggi (tanpa visual layout shifts).

### Fitur Utama UI:
1.  **Asymmetric Two-Column Layout:**
    *   **Kolom Kiri (Pencarian & Hasil):** Headline bergradasi, formulir pencarian semantik terintegrasi slider nilai kemiripan (`min_score`), batas pengambilan, dan daftar kartu hasil pencarian.
    *   **Kolom Kanan (Statistik & Data Terbaru):** Kartu metadata Neon DB live (total berita terindeks, tombol re-connect untuk mengantisipasi *cold-start*), daftar 5 berita hoaks terhangat, dan panduan edukasi sistem.
2.  **Graceful Degradation Alert:** Jika backend berstatus `lexical` (fallback pencarian kata kunci biasa), UI otomatis menampilkan Alert Banner kuning *"Mode Pencarian Darurat Aktif"* untuk menjaga transparansi sistem.
3.  **Skeleton Loader:** Saat data sedang dimuat, elemen loading skeleton shadcn yang halus akan ditampilkan untuk menjaga kenyamanan visual (*perceived latency*).
4.  **SEO & A11y Compliant:** Metadata judul dan deskripsi deskriptif tersemat di `layout.tsx`. Setiap tombol aksi interaktif memiliki status tactile `:active` dan kontras rasio WCAG AA minimal 4.5:1.

---

## 3. Struktur Berkas Akhir Proyek

Proyek telah di-bootstrap lengkap dan di-push ke GitHub di repositori [https://github.com/DiaztMF/AwasHoax](https://github.com/DiaztMF/AwasHoax):

```
Hoax Detection Web/
├── .gitignore               # Mengabaikan berkas kredensial (.env, node_modules)
├── scraper/
│   ├── init_db.py           # Script inisialisasi skema tabel & ekstensi vector di Neon DB
│   └── hoax_scraper.py      # Script scraper TurnBackHoax.id
├── backend/
│   ├── database.py          # Pool database Neon Postgres
│   └── main.py              # Rest API FastAPI
├── frontend/
│   ├── components.json      # Konfigurasi shadcn/ui
│   └── src/
│       ├── app/
│       │   ├── layout.tsx   # Root layout (mengunci tema gelap global)
│       │   └── page.tsx     # Landing page & Dashboard pencari semantik
│       └── components/ui/   # Komponen UI: button, card, input, badge, skeleton, alert
└── tests/
    ├── test_backend.py      # Pengujian unit backend
    └── test_scraper.py      # Pengujian unit scraper
```

---

## 4. Cara Menjalankan Proyek secara Lokal

### Langkah 1: Jalankan Backend & Scraper
1. Isi berkas `.env` di dalam folder `scraper` dan `backend` dengan database Neon URL dan Gemini API Key Anda.
2. Jalankan inisialisasi database Neon (hanya perlu sekali di awal):
   ```bash
   cd "Hoax Detection Web/scraper"
   pip install psycopg2-binary dotenv google-genai
   python init_db.py
   ```
3. Jalankan scraper untuk mengisi data:
   ```bash
   python hoax_scraper.py
   ```
4. Jalankan server FastAPI:
   ```bash
   cd "../backend"
   pip install uvicorn fastapi
   python -m uvicorn main:app --reload
   ```

### Langkah 2: Jalankan Frontend Next.js
1. Buka terminal baru dan masuk ke folder frontend:
   ```bash
   cd "Hoax Detection Web/frontend"
   ```
2. Jalankan server pembangunan Next.js:
   ```bash
   npm run dev
   ```
3. Buka browser Anda di alamat `http://localhost:3000`. Dashboard antarmuka siap digunakan!
