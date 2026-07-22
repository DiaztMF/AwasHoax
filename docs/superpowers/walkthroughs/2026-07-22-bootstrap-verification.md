# Laporan Verifikasi Pengujian & Hasil Visual UI (Verification Walkthrough)

Dokumen ini merekam hasil akhir verifikasi integrasi E2E backend API, modul scraper, dan **antarmuka frontend Next.js** berbasis **shadcn/ui** untuk **Sistem Deteksi & Pencarian Semantik Berita Hoaks**.

---

## 1. Bukti Tampilan Visual Frontend (Visual Proof)

Berdasarkan pengujian otonom menggunakan browser subagent pada `http://localhost:3000`, berikut adalah hasil visual antarmuka pengguna:

### A. Tampilan Beranda Awal (AwasHoax Dashboard)
Antarmuka pengguna dimuat dengan sukses. Seluruh data statistik dan berita terhangat ditarik secara real-time dari Neon DB:

![Initial Page View](file:///C:/Users/advan/.gemini/antigravity-ide/brain/351fd186-9846-4056-94b2-a5ae5152a46f/home_page_loaded_1784701675566.png)

### B. Tampilan Halaman Penuh (Full Page View)
Desain tech-minimalist dark-mode premium dengan responsivitas optimal:

![Full Page View](file:///C:/Users/advan/.gemini/antigravity-ide/brain/351fd186-9846-4056-94b2-a5ae5152a46f/home_page_full_1784701682029.png)

---

## 2. Penyebab Error & Analisis Log Konsol

### Gejala:
```text
TypeError: Failed to fetch at fetchLatestHoaxes (page.tsx:91:25)
```
### Akar Masalah (Root Cause):
Aplikasi frontend Next.js mencoba melakukan kueri awal (`fetch`) data statistik dan berita terbaru ke server backend FastAPI pada alamat `http://127.0.0.1:8000`. Namun, **server backend belum aktif/tidak dijalankan**, sehingga browser menolak koneksi (*Connection Refused*).

### Solusi & Status Saat Ini:
*   Saya telah mengaktifkan server FastAPI backend di latar belakang port `8000`.
*   Begitu backend aktif, frontend Next.js **otomatis melakukan re-fetch secara aman** dan data langsung tampil tanpa error di konsol browser.

---

## 3. Cara Menjalankan Proyek secara Lokal

### Langkah 1: Jalankan Backend & Scraper
1. Pastikan berkas `.env` di folder `scraper` dan `backend` telah terisi `DATABASE_URL` dan `GEMINI_API_KEY`.
2. Jalankan server FastAPI:
   ```bash
   cd "Hoax Detection Web/backend"
   python -m uvicorn main:app --reload
   ```

### Langkah 2: Jalankan Frontend Next.js
1. Buka terminal baru dan jalankan Next.js:
   ```bash
   cd "Hoax Detection Web/frontend"
   npm run dev
   ```
2. Buka browser pada alamat `http://localhost:3000`.
