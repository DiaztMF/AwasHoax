# Spesifikasi Desain: Sistem Deteksi & Pencarian Semantik Berita Hoaks

Dokumen ini mendefinisikan arsitektur, skema database, spesifikasi API, rancangan scraper, dan strategi ketahanan (*resilience*) untuk **Sistem Pencarian Semantik Berita Hoaks** berbasis Next.js, Python FastAPI, Neon Serverless Postgres (`pgvector`), dan Gemini Embeddings API.

---

## 1. Tinjauan Arsitektur & Struktur Direktori

Sistem ini menggunakan arsitektur terpisah (*decoupled*) dengan backend Python untuk pemrosesan data AI, database cloud serverless, dan frontend Next.js yang dideploy ke platform Vercel/Render.

### Struktur Folder
```
hoax-detection-system/
├── scraper/
│   ├── hoax_scraper.py      # Script parser harian TurnBackHoax.id & generator embedding
│   ├── requirements.txt     # Requests, BeautifulSoup4, psycopg2-binary, google-genai
│   └── .env                 # Konfigurasi: DATABASE_URL, GEMINI_API_KEY
├── backend/
│   ├── main.py              # Rest API (FastAPI) & CORS setup
│   ├── database.py          # Session & connection pool Neon DB
│   ├── requirements.txt     # FastAPI, Uvicorn, psycopg2-binary, google-genai, pydantic
│   └── .env                 # Konfigurasi: DATABASE_URL, GEMINI_API_KEY
└── frontend/
    ├── package.json         # Dependensi Next.js & React
    ├── src/
    │   ├── app/             # App Router (Search, Dashboard, Layout)
    │   └── components/      # UI: SearchBar, ResultCard, Stats, SkeletonLoading
    └── .env.local           # NEXT_PUBLIC_API_URL (menunjuk ke Render/FastAPI)
```

---

## 2. Skema Database (Neon Postgres & pgvector)

Penyimpanan data memanfaatkan PostgreSQL dengan ekstensi `pgvector` di cloud Neon untuk pencarian kedekatan vektor.

```sql
-- Aktifkan ekstensi vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabel Artikel Hoaks
CREATE TABLE IF NOT EXISTS hoax_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,                     -- Judul klarifikasi hoaks
    url TEXT UNIQUE NOT NULL,                -- URL sumber (unique untuk pencegahan duplikasi)
    publish_date DATE,                       -- Tanggal penerbitan artikel dari sumber
    summary TEXT,                            -- Isi konten / ringkasan klarifikasi hoaks
    embedding VECTOR(768),                   -- Vektor 768 dimensi (Gemini text-embedding-004)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeks HNSW (Hierarchical Navigable Small World) untuk pencarian vektor cepat
CREATE INDEX IF NOT EXISTS hoax_articles_embedding_hnsw_idx 
ON hoax_articles USING hnsw (embedding vector_cosine_ops);
```

---

## 3. Spesifikasi API (FastAPI)

Semua endpoint backend mengembalikan respon JSON terstandar.

### 1. `GET /api/search`
*   **Parameter:**
    *   `q` (string, required): Kueri teks pencarian.
    *   `limit` (int, optional, default: 5): Jumlah hasil maksimal.
    *   `min_score` (float, optional, default: 0.4): Ambang batas kemiripan (0.0 sampai 1.0).
*   **Kueri SQL Utama:**
    ```sql
    SELECT id, title, url, publish_date, summary, 
           1 - (embedding <=> :query_vector) AS similarity_score
    FROM hoax_articles
    WHERE 1 - (embedding <=> :query_vector) >= :min_score
    ORDER BY embedding <=> :query_vector ASC
    LIMIT :limit;
    ```

### 2. `GET /api/hoaxes/latest`
*   **Tujuan:** Mengambil berita hoaks terbaru untuk halaman awal tanpa membebani kuota API Gemini.
*   **Parameter:**
    *   `limit` (int, optional, default: 5): Jumlah artikel yang diambil.
*   **Kueri SQL:**
    ```sql
    SELECT id, title, url, publish_date, summary
    FROM hoax_articles
    ORDER BY publish_date DESC, created_at DESC
    LIMIT :limit;
    ```

### 3. `GET /api/stats`
*   **Tujuan:** Menyediakan data analitik ringkas untuk header/dashboard utama.
*   **Respon:**
    ```json
    {
      "total_hoaxes": 1540,
      "last_updated": "2026-07-22T10:00:00Z"
    }
    ```

---

## 4. Desain Alur Kerja Scraper (Python)

Skraper dirancang untuk berjalan secara berkala dan hemat sumber daya (tidak melakukan kueri N+1 ke database dan menghemat kuota API Gemini).

### Tahapan Eksekusi Scraper:
1.  **Ekstraksi Batch URL:** Mengambil 20 URL artikel terbaru dari halaman utama `turnbackhoax.id` menggunakan BeautifulSoup4.
2.  **Kueri Validasi Duplikat (Batch Check):**
    Mengirimkan 1 kueri tunggal ke database Neon untuk menyaring URL yang sudah tersimpan:
    ```sql
    SELECT url FROM hoax_articles WHERE url = ANY(:scraped_urls);
    ```
3.  **Proses Data Baru:**
    Untuk setiap URL yang belum ada di database:
    *   Kunjungi halaman detail artikel untuk mengekstrak isi klarifikasi penuh (`summary`) dan tanggal rilis (`publish_date`).
    *   Kirim gabungan `title` dan `summary` ke Gemini API (`text-embedding-004`) untuk menghasilkan vektor embedding 768 dimensi.
    *   Masukkan data artikel beserta vektornya ke tabel `hoax_articles` menggunakan instruksi SQL insert.
4.  **Rate Limiting:** Jeda eksekusi selama 1,5 detik di setiap request HTTP detail artikel untuk mematuhi etika scraping.

---

## 5. Matriks Ketahanan Sistem (Resilience & Error Handling)

Sistem didesain dengan tingkat ketersediaan tinggi menggunakan mekanisme berikut:

| Skenario Potensial Masalah | Dampak Sistem | Mitigasi & Solusi Sistem | Respon UI di Next.js |
| :--- | :--- | :--- | :--- |
| **Gemini API Limit (429) / Down** | Gagal menghasilkan vektor kueri pencarian | Otomatis dialihkan ke mode **Lexical Fallback** (pencarian teks biasa menggunakan SQL `ILIKE '%keyword%'` pada kolom `title` dan `summary`). Metadata response menyertakan `"search_mode": "lexical"`. | Menampilkan badge kuning *"Mode Pencarian Darurat"* |
| **Neon DB Sleep (Cold Start)** | Kueri tertahan / delay 5–10 detik karena database dinonaktifkan sementara di cloud Neon | Menyetel FastAPI connection pool pre-ping untuk memelihara koneksi, dan mengaktifkan timeout toleran. | Menampilkan skeleton loading halus dengan tulisan *"Menghubungkan ke database..."* |
| **Artikel dengan Layout Rusak** | Parsing HTML terganggu saat loop scraping | Setiap pemrosesan artikel detail dibungkus dalam blok `try-except` individual. Artikel yang rusak diabaikan dan dicatat di log tanpa mematikan program scraper. | Tidak memengaruhi sistem, data valid lain tetap berhasil tersimpan |
| **URL Duplikat di Database** | Redundansi data & pemborosan pemanggilan API Gemini | *Batch URL Check* memfilter URL sebelum dikirim ke API Gemini. Pengaman tambahan di sisi database menggunakan constraint `UNIQUE` pada kolom `url`. | Data terjamin bersih dan unik |
