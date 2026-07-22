# AwasHoax - Platform Pencarian & Verifikasi Fakta Berita Hoaks Indonesia

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_pgvector-4169E1?logo=postgresql)](https://neon.tech/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Embedding_2-8E75B2?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**AwasHoax** adalah aplikasi web modern berbasis pencarian semantik (Semantic Search) untuk memverifikasi kebenaran klaim dan isu berita hoaks di Indonesia. Menggabungkan teknologi kecerdasan buatan (*vector embeddings*) dengan data verifikasi fakta dari [TurnBackHoax.id](https://turnbackhoax.id), platform ini mampu memahami konteks dan makna di balik sebuah kalimat berita bohong secara cerdas dan akurat.

---

## 🌟 Fitur Utama

- 🧠 **Pencarian Semantik Berbasis AI (`gemini-embedding-2`)**  
  Mendeteksi kesamaan konteks berita secara cerdas menggunakan representasi vektor 768-dimensi dari Google Gemini API. Pencarian tidak lagi terbatas pada kecocokan kata kunci (*keyword matching*), melainkan memahami arti dan maksud klaim.

- 🔄 **Scraping & Indexing Otomatis (*Self-Learning On-Demand Search*)**  
  Ketika pengguna mencari topik baru yang belum ada di database lokal (*cache-miss*), sistem secara otomatis melakukan scraping langsung ke TurnBackHoax.id, mengunduh detail berita, membuat vektor embedding-nya, dan menyimpannya ke database Neon secara real-time.

- ⚡ **Lexical Search Fallback**  
  Sistem memiliki mekanisme keamanan (*fail-safe*) yang akan secara otomatis beralih ke pencarian kata kunci literal (ILIKE query) pada database Postgres jika kuota API atau koneksi AI mengalami kendala.

- 🌗 **Antarmuka Modern dengan Theme Toggle (Mode Terang & Gelap)**  
  Desain antarmuka bersih berbasis tipografi **Plus Jakarta Sans** dengan palet warna yang sangat lembut dan nyaman di mata, responsif di berbagai perangkat, serta dilengkapi saklar pengubah mode terang/gelap secara instan.

- 📊 **Dasbor Ringkasan Real-Time**  
  Menampilkan statistik total berita terverifikasi di database serta daftar 5 berita klarifikasi hoaks terbaru secara otomatis.

---

## 🏗️ Arsitektur & Alur Kerja Sistem

```mermaid
graph TD
    A[Pengguna / Web Frontend] -->|Kueri Pencarian| B[Backend FastAPI]
    B -->|1. Kueri Vektor Cosine| C[(Neon Postgres + pgvector)]
    
    C -->|Kecocokan > 55%| B
    
    C -.->|Kecocokan < 55% (Cache-Miss)| D[Scraper On-Demand]
    D -->|Scrape Berita Baru| E[TurnBackHoax.id]
    E -->|Konten Berita| D
    D -->|Generate Embedding| F[Google Gemini API]
    F -->|Vektor 768-dim| C
    
    B -->|Respon JSON Berita & Skor| A
```

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

### Frontend
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4, Vanilla CSS Design System
- **UI Components:** Radix UI / shadcn/ui primitives
- **Tipografi:** Plus Jakarta Sans (`next/font/google`)
- **Ikon:** Lucide React

### Backend
- **Framework:** Python 3.13, FastAPI, Uvicorn
- **Web Scraping:** BeautifulSoup4, Requests
- **Database Driver:** `psycopg2-binary` (RealDictCursor)
- **AI Integrasi:** Google GenAI SDK (`google-genai`)

### Database & Infrastruktur
- **Database:** Neon Serverless Postgres
- **Vector Extension:** `pgvector` (`vector(768)`)
- **Model Embedding:** `models/text-embedding-004` / `gemini-embedding-2`

---

## 🚀 Panduan Memulai (Quick Start)

### Prasyarat System
- Node.js versi 18.0.0 atau lebih baru
- Python versi 3.10 atau lebih baru
- Akun [Neon DB](https://neon.tech) dengan ekstensi `pgvector` diaktifkan
- Kunci API Google Gemini ([Google AI Studio](https://aistudio.google.com))

---

### 1. Konfigurasi Backend (FastAPI)

1. Masuk ke direktori `backend`:
   ```bash
   cd "Hoax Detection Web/backend"
   ```

2. Buat dan aktifkan *virtual environment*:
   ```bash
   python -m venv venv
   # Di Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # Di Linux/macOS:
   source venv/bin/activate
   ```

3. Pasang dependensi Python:
   ```bash
   pip install -r requirements.txt
   ```

4. Buat berkas `.env` di dalam folder `backend/`:
   ```env
   DATABASE_URL=postgresql://user:password@ep-cool-endpoint-pooler.neon.tech/neondb?sslmode=require
   GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
   ```

5. Jalankan server backend FastAPI:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   Backend akan berjalan di `http://127.0.0.1:8000`.

---

### 2. Konfigurasi Frontend (Next.js)

1. Masuk ke direktori `frontend`:
   ```bash
   cd "Hoax Detection Web/frontend"
   ```

2. Pasang dependensi Node.js:
   ```bash
   npm install
   ```

3. Buat berkas `.env.local` di dalam folder `frontend/` (Opsional jika backend di host lokal):
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

4. Jalankan server pengembangan Next.js:
   ```bash
   npm run dev
   ```
   Buka browser dan akses `http://localhost:3000`.

---

## 📁 Struktur Direktori Proyek

```
Hoax Detection Web/
├── backend/
│   ├── main.py              # Aplikasi FastAPI, endpoint API & logika On-Demand Scraper
│   ├── database.py          # Koneksi database Neon Postgres
│   ├── scraper.py           # Utilitas scraping awal TurnBackHoax.id
│   ├── requirements.txt     # Dependensi Python
│   └── .env                 # Variabel lingkungan backend
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx     # Komponen utama antarmuka (Search, Stats, Theme Toggle)
│   │   │   ├── layout.tsx   # Root Layout dengan Plus Jakarta Sans
│   │   │   └── globals.css  # Tema OKLCH Light & Dark mode
│   │   └── components/ui/   # Komponen UI shadcn (Button, Card, Input, Slider, dll)
│   ├── package.json         # Dependensi Node.js
│   └── tsconfig.json        # Konfigurasi TypeScript
├── docs/
│   └── superpowers/         # Dokumentasi spesifikasi & rencana pengembangan
└── README.md
```

---

## 📡 Endpoint API Utama

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/search?q={kueri}&limit=5&min_score=0.4` | Melakukan pencarian semantik (memicu scraper On-Demand jika skor < 55%) |
| `GET` | `/api/hoaxes/latest?limit=5` | Mengambil daftar berita klarifikasi hoaks 5 teratas |
| `GET` | `/api/stats` | Mengembalikan total jumlah berita hoaks terindeks di database |

---

## 📜 Lisensi & Sumber Data

- **Lisensi Proyek:** MIT License.
- **Sumber Data Berita:** [TurnBackHoax.id](https://turnbackhoax.id) oleh MAFINDO (Masyarakat Anti Fitnah Indonesia).
