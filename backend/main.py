import os
import requests
from bs4 import BeautifulSoup
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
        # Panggil Gemini API gemini-embedding-2 dengan dimensi 768
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=q,
            config={"output_dimensionality": 768}
        )
        query_vector = response.embeddings[0].values

        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Cari secara lokal terlebih dahulu
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
        
        # 2. Cek apakah hasil lokal tidak ada atau nilai kemiripan tertinggi kurang dari 55% (cache-miss)
        best_score = rows[0]["similarity_score"] if rows else 0
        if not rows or best_score < 0.55:
            print(f"Pencarian lokal kurang memuaskan (Skor terbaik: {best_score}). Memicu pencarian On-Demand...")
            search_url = f"https://turnbackhoax.id/search?query={q}"
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                r = requests.get(search_url, headers=headers, timeout=10)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, 'html.parser')
                    titles = soup.select("a:has(h2)")
                    scraped_urls = []
                    for t in titles[:3]:  # Ambil maksimal 3 hasil pencarian untuk di-index secara cepat
                        href = t.get("href")
                        if href and href not in scraped_urls:
                            scraped_urls.append(href)
                            
                    if scraped_urls:
                        # Batch check mana URL yang belum pernah di-scrape ke database
                        cur.execute(
                            "SELECT url FROM hoax_articles WHERE url = ANY(%s);",
                            (scraped_urls,)
                        )
                        existing_rows = cur.fetchall()
                        existing_urls = [row["url"] for row in existing_rows]
                        new_urls = [url for url in scraped_urls if url not in existing_urls]
                        
                        if new_urls:
                            print(f"Mengindeks {len(new_urls)} berita baru secara On-Demand.")
                            for url in new_urls:
                                try:
                                    det_res = requests.get(url, headers=headers, timeout=10)
                                    if det_res.status_code == 200:
                                        det_soup = BeautifulSoup(det_res.text, 'html.parser')
                                        title_el = det_soup.select_one("h1")
                                        title = title_el.get_text(strip=True) if title_el else "No Title"
                                        
                                        content_el = det_soup.select_one("section.article-origin")
                                        if not content_el:
                                            content_el = det_soup.select_one("article")
                                        summary = content_el.get_text(strip=True) if content_el else "No Content"
                                        
                                        date_el = det_soup.select_one("time")
                                        date_str = date_el.get("datetime") if date_el else None
                                        if not date_str and date_el:
                                            date_str = date_el.get_text(strip=True)
                                            
                                        text_to_embed = f"Judul: {title}\nKlarifikasi: {summary}"
                                        emb_resp = client.models.embed_content(
                                            model="gemini-embedding-2",
                                            contents=text_to_embed,
                                            config={"output_dimensionality": 768}
                                        )
                                        embedding = emb_resp.embeddings[0].values
                                        
                                        cur.execute(
                                            """
                                            INSERT INTO hoax_articles (title, url, publish_date, summary, embedding)
                                            VALUES (%s, %s, %s, %s, %s)
                                            ON CONFLICT (url) DO NOTHING;
                                            """,
                                            (title, url, date_str, summary, embedding)
                                        )
                                        conn.commit()
                                        print(f"On-Demand: Berhasil mengindeks & menyimpan {url}")
                                except Exception as inner_e:
                                    print(f"Error saat mengindeks URL secara On-Demand {url}: {inner_e}")
                            
                            # Kueri ulang database lokal setelah mengindeks data baru
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
            except Exception as outer_e:
                print(f"Error saat menjalankan pencarian On-Demand: {outer_e}")
        
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
