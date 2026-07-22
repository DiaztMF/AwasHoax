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
        if page == 1:
            url = "https://turnbackhoax.id/"
        else:
            url = f"https://turnbackhoax.id/page/{page}/"
        try:
            r = requests.get(url, headers=HEADERS, timeout=10)
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, 'html.parser')
            # Penyelarasan pemilih dengan struktur web terbaru (tag a yang membungkus h3)
            titles = soup.select("a:has(h3)")
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
        
        # Ekstrak Judul (menggunakan tag h1 utama di halaman artikel detail)
        title_el = soup.select_one("h1")
        title = title_el.get_text(strip=True) if title_el else "No Title"
        
        # Ekstrak Isi/Ringkasan (menggunakan section.article-origin atau fallback ke tag article)
        content_el = soup.select_one("section.article-origin")
        if not content_el:
            content_el = soup.select_one("article")
        summary = content_el.get_text(strip=True) if content_el else "No Content"
        
        # Ekstrak Tanggal Publikasi (menggunakan tag time dengan atribut datetime jika ada)
        date_el = soup.select_one("time")
        date_str = None
        if date_el:
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
            model="gemini-embedding-2",
            contents=text,
            config={"output_dimensionality": 768}
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
