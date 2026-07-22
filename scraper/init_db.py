import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def init_database():
    print("Menghubungkan ke Neon database untuk inisialisasi skema...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # 1. Aktifkan ekstensi vector
        print("Mengaktifkan ekstensi pgvector...")
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        
        # 2. Buat tabel hoax_articles
        print("Membuat tabel hoax_articles jika belum ada...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS hoax_articles (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                publish_date DATE,
                summary TEXT,
                embedding VECTOR(768),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 3. Buat indeks HNSW untuk pencarian vektor cepat
        print("Membuat indeks HNSW untuk kolom embedding...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS hoax_articles_embedding_hnsw_idx 
            ON hoax_articles USING hnsw (embedding vector_cosine_ops);
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        print("Database Neon berhasil diinisialisasi dengan sukses!")
    except Exception as e:
        print(f"Error saat inisialisasi database: {e}")

if __name__ == "__main__":
    init_database()
