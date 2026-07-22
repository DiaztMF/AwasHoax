# Spesifikasi Desain: Redesign Frontend & Theme Toggle AwasHoax

Dokumen ini menjelaskan spesifikasi perancangan ulang (*redesign*) antarmuka aplikasi **AwasHoax** untuk meningkatkan kualitas estetika visual, penyederhanaan bahasa bagi pengguna awam, serta penambahan fitur mode terang/gelap (*Theme Toggle*).

---

## 1. Tujuan & Sasaran (Goals)

1.  **Peningkatan Tipografi:** Mengganti font bawaan menjadi `Plus Jakarta Sans` untuk estetika teknologi modern yang bersih, profesional, dan mudah dibaca.
2.  **Pembersihan Istilah Teknis:** Mengubah istilah berbau teknis (*vektor AI*, *neon db*, *scraper*, *min_score*, *ambang batas*, *metadata live*) menjadi bahasa Indonesia sehari-hari yang ramah pengguna.
3.  **Dukungan Theme Toggle (Light & Dark Mode):** Menyediakan saklar pengubah tema di bagian navigasi atas dengan kontras rasio warna yang memenuhi standar aksesibilitas WCAG AA.
4.  **Pembersihan Elemen Tidak Relevan:** Menghapus lencana developer di header, kartu penjelas arsitektur teknis di bagian bawah, serta tautan eksternal yang tidak diperlukan.

---

## 2. Spesifikasi Tipografi & Warna

### Tipografi
*   **Font Family:** `Plus Jakarta Sans` diimpor via `next/font/google` di `layout.tsx`.
*   **Font Variable:** `--font-plus-jakarta` di-map ke `--font-sans` di `globals.css`.
*   **Judul (Headings):** `font-extrabold tracking-tight` dengan gradasi teks atau kontras tinggi.
*   **Body Text:** `font-normal leading-relaxed` dengan warna yang disesuaikan terhadap tema aktif.

### Sistem Warna & Tema
*   **Dark Mode (Default):**
    *   Latar Belakang: `zinc-950` / `bg-background`
    *   Teks Utama: `zinc-50` / `text-foreground`
    *   Kartu & Panel: `zinc-900/40` dengan pembatas `zinc-800/60`
    *   Warna Aksen: `emerald-500` / `emerald-400`
*   **Light Mode:**
    *   Latar Belakang: `zinc-50` / `white`
    *   Teks Utama: `zinc-900`
    *   Kartu & Panel: `white` / `zinc-100/80` dengan pembatas `zinc-200`
    *   Warna Aksen: `emerald-600` / `emerald-700`

---

## 3. Komponen & Penyederhanaan Konten

### A. Header / Navigasi
*   **Brand:** Logotype *"AwasHoax"* dengan lencana kecil *"Verifikasi Fakta"*.
*   **Theme Toggle Button:** Saklar berbasis ikon `Sun` / `Moon` dari `lucide-react` untuk mengubah tema secara instan.
*   **Pembersihan:** Menghapus badge developer (`Neon DB Connected`, `Gemini API Active`).

### B. Formulir Pencarian (Kolom Kiri)
*   **Judul Utama:** *"Cek Kebenaran & Fakta Berita Hoaks"*
*   **Deskripsi:** *"Masukkan klaim atau topik berita yang ingin Anda verifikasi kebenarannya berdasarkan data klarifikasi tepercaya."*
*   **Form Control:**
    *   Label Input: *"Klaim / Topik Berita"*
    *   Slider Keakuratan: *"Tingkat Keakuratan Minimal: X%"*
    *   Tombol Hasil: *"Jumlah Tampilan: X Artikel"*

### C. Kartu Hasil Pencarian & Berita Terbaru
*   **Badge Keakuratan:** Menampilkan label persentase kecocokan (misal: `85% Cocok`) dengan warna emerald.
*   **Alert Fallback:** Banner peringatan kuning ramah pengguna jika pencarian beralih ke mode pencarian darurat.
*   **Pusat Data Klarifikasi (Kolom Kanan):**
    *   Kartu ringkas *"Total Berita Terverifikasi"*.
    *   Daftar 5 berita klarifikasi terbaru.
*   **Pembersihan:** Menghapus kartu penjelas teknis backend di kanan bawah.

---

## 4. Rencana Verifikasi (Verification Plan)

1.  **TypeScript & Build Verification:** Jalankan `npx tsc --noEmit` untuk memastikan tidak ada kesalahan tipe data.
2.  **Theme Toggle Verification:** Uji pengubahan tema (Light/Dark mode) melalui tombol saklar di browser dan pastikan warna latar serta kontras teks berubah secara mulus.
3.  **Functional Verification:** Uji pencarian semantik dan pastikan penyederhanaan teks tidak merusak pemanggilan API backend (`/api/search`, `/api/stats`, `/api/hoaxes/latest`).
