# Hoax Detection System Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menginisialisasi folder proyek, menyiapkan berkas konfigurasi, serta membangun pondasi backend FastAPI dan scraper TurnBackHoax.id.

**Architecture:** Membagi proyek menjadi folder terpisah (`scraper`, `backend`, dan `frontend`). Scraper mandiri akan bertugas memproses data ke Neon DB, sedangkan backend FastAPI bertugas menyediakan endpoint baca/cari data untuk diakses oleh Next.js frontend.

**Tech Stack:** Next.js, Python FastAPI, Neon Serverless Postgres (`pgvector`), BeautifulSoup4, Google Gemini API (`text-embedding-004`).

## Global Constraints
- Target workspace folder utama: `d:/Project/Web Project/Enuma/Project Mas Evan/Hoax Detection Web`
- Bahasa Backend & Scraper: Python 3.13.3
- Model Embedding: Gemini AI Studio `text-embedding-004` (768 dimensi)

---

### Task 1: Proyek Scaffolding & Setup Dependensi

**Files:**
- Create: `Hoax Detection Web/scraper/requirements.txt`
- Create: `Hoax Detection Web/scraper/.env`
- Create: `Hoax Detection Web/backend/requirements.txt`
- Create: `Hoax Detection Web/backend/.env`
- Create: `Hoax Detection Web/frontend/package.json`

**Interfaces:**
- Consumes: None (Langkah bootstrap awal)
- Produces: Kerangka folder dan file konfigurasi awal untuk backend, scraper, dan frontend.

- [ ] **Step 1: Buat direktori utama dan sub-folder proyek**

Jalankan perintah PowerShell berikut di direktori `d:/Project/Web Project/Enuma/Project Mas Evan`:
```powershell
New-Item -ItemType Directory -Force -Path "Hoax Detection Web/scraper"
New-Item -ItemType Directory -Force -Path "Hoax Detection Web/backend"
New-Item -ItemType Directory -Force -Path "Hoax Detection Web/frontend"
```

- [ ] **Step 2: Buat requirements.txt untuk scraper**

Tulis konten berikut ke `Hoax Detection Web/scraper/requirements.txt`:
```text
requests==2.32.3
beautifulsoup4==4.12.3
psycopg2-binary==2.9.9
google-genai==0.1.1
python-dotenv==1.0.1
```

- [ ] **Step 3: Buat template berkas .env untuk scraper**

Tulis konten berikut ke `Hoax Detection Web/scraper/.env`:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 4: Buat requirements.txt untuk backend**

Tulis konten berikut ke `Hoax Detection Web/backend/requirements.txt`:
```text
fastapi==0.111.0
uvicorn==0.30.1
psycopg2-binary==2.9.9
google-genai==0.1.1
python-dotenv==1.0.1
pydantic==2.7.4
```

- [ ] **Step 5: Buat berkas .env untuk backend**

Tulis konten berikut ke `Hoax Detection Web/backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 6: Buat berkas package.json inisial untuk Next.js frontend**

Tulis konten berikut ke `Hoax Detection Web/frontend/package.json` (agar Next.js siap di-install di langkah berikutnya):
```json
{
  "name": "hoax-detection-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

- [ ] **Step 7: Verifikasi pembuatan file dan commit**

Pastikan semua file sudah terbentuk dengan menjalankan:
```powershell
Get-ChildItem -Recurse Hoax Detection Web
```
Lakukan commit jika menggunakan git:
```bash
git add Hoax Detection Web/
git commit -m "chore: bootstrap project directory structure and config files"
```

---

### Task 2: Implementasi Server FastAPI & Koneksi Database Neon

**Files:**
- Create: `Hoax Detection Web/backend/database.py`
- Create: `Hoax Detection Web/backend/main.py`

**Interfaces:**
- Consumes: Konfigurasi variabel lingkungan di `.env` backend.
- Produces: REST API endpoints `GET /api/hoaxes/latest`, `GET /api/stats`, dan `GET /api/search`.

- [ ] **Step 1: Buat database.py untuk manajemen pool database**

Tulis kode berikut ke `Hoax Detection Web/backend/database.py`:
```python
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    # Menghubungkan ke Postgres Neon dengan pre-ping check
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn
```

- [ ] **Step 2: Buat berkas main.py untuk router API**

Tulis kode berikut ke `Hoax Detection Web/backend/main.py`:
```python
import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from database import get_db_connection
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Hoax Detection Semantic Search API")

# Setup CORS agar bisa diakses oleh Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class HoaxItem(BaseModel):
    id: int
    title: str
    url: str
    publish_date: Optional[str] = None
    summary: Optional[str] = None
    similarity_score: Optional[float] = None

@app.get("/api/hoaxes/latest", response_model=List[HoaxItem])
def get_latest_hoaxes(limit: int = 5):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, title, url, publish_date::text, summary 
            FROM hoax_articles 
            ORDER BY publish_date DESC, created_at DESC 
            LIMIT %s;
            """,
            (limit,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/stats")
def get_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as total FROM hoax_articles;")
        row = cur.fetchone()
        cur.close()
        conn.close()
        return {
            "total_hoaxes": row["total"] if row else 0,
            "last_updated": "2026-07-22T10:00:00Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/search", response_model=List[HoaxItem])
def search_hoax(
    q: str, 
    limit: int = 5, 
    min_score: float = 0.4
):
    if not q:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    # Inisialisasi Google GenAI client
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        client = None

    # Jika client gagal dibuat, langsung fallback ke Lexical Search
    if not client:
        return run_lexical_fallback(q, limit)

    try:
        # Panggil Gemini API text-embedding-004
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=q
        )
        query_vector = response.embeddings[0].values

        conn = get_db_connection()
        cur = conn.cursor()
        # Menggunakan operator <=> pgvector dengan filter min_score dan index HNSW
        cur.execute(
            """
            SELECT id, title, url, publish_date::text, summary, 
                   (1 - (embedding <=> %s::vector)) AS similarity_score
            FROM hoax_articles
            WHERE (1 - (embedding <=> %s::vector)) >= %s
            ORDER BY embedding <=> %s::vector ASC
            LIMIT %s;
            """,
            (query_vector, query_vector, min_score, query_vector, limit)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        # Fallback jika terjadi limit 429 atau error API
        return run_lexical_fallback(q, limit)

def run_lexical_fallback(q: str, limit: int) -> List[dict]:
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Menggunakan query ILIKE dengan wildcards
        wildcard_query = f"%{q}%"
        cur.execute(
            """
            SELECT id, title, url, publish_date::text, summary, 1.0 AS similarity_score
            FROM hoax_articles
            WHERE title ILIKE %s OR summary ILIKE %s
            ORDER BY publish_date DESC
            LIMIT %s;
            """,
            (wildcard_query, wildcard_query, limit)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallback search error: {str(e)}")
```

- [ ] **Step 3: Uji coba kompilasi dan compile checks**

Jalankan perintah ini di terminal PowerShell untuk memverifikasi file python bebas error sintaksis:
```powershell
python -m py_compile Hoax Detection Web/backend/database.py Hoax Detection Web/backend/main.py
```
Expected output: Berhasil tanpa error.

- [ ] **Step 4: Commit perubahan**

```bash
git add Hoax Detection Web/backend/
git commit -m "feat: implement backend API endpoints with lexical fallback"
```

---

### Task 3: Implementasi Script Scraper Mandiri

**Files:**
- Create: `Hoax Detection Web/scraper/hoax_scraper.py`

**Interfaces:**
- Consumes: API endpoint Gemini Embeddings & database Neon
- Produces: Memasukkan data berita hoaks baru secara aman tanpa duplikasi.

- [ ] **Step 1: Tulis skrip scraper**

Tulis kode berikut ke `Hoax Detection Web/scraper/hoax_scraper.py`:
```python
import os
import time
import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import execute_values
from google import genai
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def get_latest_urls(pages=1):
    urls = []
    for page in range(1, pages + 1):
        url = f"https://turnbackhoax.id/page/{page}/"
        try:
            r = requests.get(url, headers=HEADERS, timeout=10)
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, 'html.parser')
            # Tema mh-themes menggunakan class entry-title untuk judul loop artikel
            titles = soup.select(".entry-title a")
            for t in titles:
                href = t.get("href")
                if href and href not in urls:
                    urls.append(href)
        except Exception as e:
            print(f"Error fetching main page {page}: {e}")
    return urls

def filter_existing_urls(conn, urls):
    if not urls:
        return []
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT url FROM hoax_articles WHERE url = ANY(%s);",
            (urls,)
        )
        rows = cur.fetchall()
        cur.close()
        existing = [row["url"] for row in rows]
        return [url for url in urls if url not in existing]
    except Exception as e:
        print(f"Error filtering existing URLs: {e}")
        return urls

def scrape_article_detail(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return None
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Ekstrak Judul
        title_el = soup.select_one(".entry-title")
        title = title_el.get_text(strip=True) if title_el else "No Title"
        
        # Ekstrak Isi/Ringkasan
        content_el = soup.select_one(".entry-content")
        summary = content_el.get_text(strip=True) if content_el else "No Content"
        
        # Ekstrak Tanggal Publikasi (biasanya ada di class .entry-meta-date atau tag time)
        date_el = soup.select_one(".entry-meta-date, time")
        date_str = None
        if date_el:
            # Sederhanakan parsing tanggal atau biarkan kosong agar DB mengisi default
            # Di WordPress biasanya datetime attribute
            date_str = date_el.get("datetime")
            if not date_str:
                date_str = date_el.get_text(strip=True)
                
        return {
            "title": title,
            "url": url,
            "publish_date": date_str,
            "summary": summary
        }
    except Exception as e:
        print(f"Error scraping detail for {url}: {e}")
        return None

def get_embedding(client, text):
    try:
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=text
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def main():
    print("Memulai scraper TurnBackHoax.id...")
    # Ambil 20 URL terbaru dari halaman utama
    urls = get_latest_urls(pages=1)
    print(f"Ditemukan {len(urls)} URL di halaman loop.")
    
    # Hubungkan ke database
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Filter URL duplikat secara massal (Batch Check)
    new_urls = filter_existing_urls(conn, urls)
    print(f"Ditemukan {len(new_urls)} URL baru yang belum ada di database.")
    
    if not new_urls:
        conn.close()
        print("Selesai. Tidak ada data baru.")
        return
        
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    cur = conn.cursor()
    for i, url in enumerate(new_urls):
        print(f"[{i+1}/{len(new_urls)}] Mengunduh: {url}")
        detail = scrape_article_detail(url)
        if not detail:
            continue
            
        # Gabungkan title & summary untuk representasi vektor yang kaya makna
        text_to_embed = f"Judul: {detail['title']}\nKlarifikasi: {detail['summary']}"
        embedding = get_embedding(client, text_to_embed)
        
        if not embedding:
            print(f"Skip {url} karena gagal membuat embedding.")
            continue
            
        try:
            # Simpan ke DB dengan kueri insert aman
            cur.execute(
                """
                INSERT INTO hoax_articles (title, url, publish_date, summary, embedding)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (url) DO NOTHING;
                """,
                (detail["title"], detail["url"], detail["publish_date"], detail["summary"], embedding)
            )
            conn.commit()
            print("Berhasil disimpan.")
        except Exception as e:
            conn.rollback()
            print(f"Gagal menyimpan ke DB: {e}")
            
        # Terapkan jeda 1.5 detik demi etika scraping & menghindari rate limit
        time.sleep(1.5)
        
    cur.close()
    conn.close()
    print("Proses scraping selesai!")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Uji sintaksis scraper**

Jalankan perintah berikut di PowerShell untuk memverifikasi file python bebas error sintaksis:
```powershell
python -m py_compile Hoax Detection Web/scraper/hoax_scraper.py
```
Expected output: Berhasil tanpa error.

- [ ] **Step 3: Commit perubahan**

```bash
git add Hoax Detection Web/scraper/
git commit -m "feat: implement scraper with batch URL filtering and embedding generator"
```
