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
