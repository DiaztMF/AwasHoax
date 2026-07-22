import sys
import os
from unittest.mock import MagicMock, patch

# Tambahkan scraper ke path import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../scraper')))

# Mock psycopg2 sebelum import
sys.modules['psycopg2'] = MagicMock()
sys.modules['psycopg2.extras'] = MagicMock()

import hoax_scraper

def test_get_latest_urls():
    # Mock requests.get response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = """
    <html>
        <body>
            <h3 class="entry-title"><a href="https://turnbackhoax.id/artikel-1/">Judul 1</a></h3>
            <h3 class="entry-title"><a href="https://turnbackhoax.id/artikel-2/">Judul 2</a></h3>
        </body>
    </html>
    """
    
    with patch('requests.get', return_value=mock_response):
        urls = hoax_scraper.get_latest_urls(pages=1)
        assert len(urls) == 2
        assert urls[0] == "https://turnbackhoax.id/artikel-1/"
        assert urls[1] == "https://turnbackhoax.id/artikel-2/"

def test_filter_existing_urls():
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    # URL di DB sudah ada artikel-1
    mock_cur.fetchall.return_value = [{"url": "https://turnbackhoax.id/artikel-1/"}]
    
    urls = [
        "https://turnbackhoax.id/artikel-1/",
        "https://turnbackhoax.id/artikel-2/",
        "https://turnbackhoax.id/artikel-3/"
    ]
    
    filtered = hoax_scraper.filter_existing_urls(mock_conn, urls)
    
    # Harus menyisakan artikel-2 dan artikel-3
    assert len(filtered) == 2
    assert "https://turnbackhoax.id/artikel-2/" in filtered
    assert "https://turnbackhoax.id/artikel-3/" in filtered
    assert "https://turnbackhoax.id/artikel-1/" not in filtered
    
    # Verifikasi kueri batch dijalankan
    mock_cur.execute.assert_called_once_with(
        "SELECT url FROM hoax_articles WHERE url = ANY(%s);",
        (urls,)
    )

def test_scrape_article_detail():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = """
    <html>
        <body>
            <h1 class="entry-title">Klarifikasi Hoax Vaksin</h1>
            <div class="entry-content">Ini adalah penjelasan rinci bahwa kabar vaksin magnet itu hoax.</div>
            <time datetime="2026-07-22">22 Juli 2026</time>
        </body>
    </html>
    """
    
    with patch('requests.get', return_value=mock_response):
        detail = hoax_scraper.scrape_article_detail("https://turnbackhoax.id/artikel-detail/")
        assert detail is not None
        assert detail["title"] == "Klarifikasi Hoax Vaksin"
        assert detail["publish_date"] == "2026-07-22"
        assert "kabar vaksin magnet itu hoax" in detail["summary"]

def test_scraper_main_loop():
    # Setup mock data & dependencies
    mock_urls = ["https://turnbackhoax.id/artikel-baru/"]
    mock_detail = {
        "title": "Hoax Baru",
        "url": "https://turnbackhoax.id/artikel-baru/",
        "publish_date": "2026-07-22",
        "summary": "Deskripsi hoax baru"
    }
    
    # Mock psycopg2 connect & database cursor
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    # Mock Gemini Client & response
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_embeddings = MagicMock()
    mock_embeddings.values = [0.05] * 768
    mock_response.embeddings = [mock_embeddings]
    mock_client.models.embed_content.return_value = mock_response
    
    # Patch helper functions to prevent real network and database activity
    with patch('hoax_scraper.get_latest_urls', return_value=mock_urls), \
         patch('hoax_scraper.filter_existing_urls', return_value=mock_urls), \
         patch('hoax_scraper.scrape_article_detail', return_value=mock_detail), \
         patch('hoax_scraper.psycopg2.connect', return_value=mock_conn), \
         patch('hoax_scraper.genai.Client', return_value=mock_client), \
         patch('hoax_scraper.time.sleep') as mock_sleep:
         
        hoax_scraper.main()
        
        # Verifikasi execute insert dipanggil ke DB
        mock_cur.execute.assert_called_once()
        query = mock_cur.execute.call_args[0][0]
        assert "INSERT INTO hoax_articles" in query
        assert "ON CONFLICT (url) DO NOTHING" in query
        
        # Verifikasi data dikirim ke DB dengan parameter yang benar (termasuk mock embedding)
        params = mock_cur.execute.call_args[0][1]
        assert params[0] == "Hoax Baru"
        assert params[1] == "https://turnbackhoax.id/artikel-baru/"
        assert params[4] == [0.05] * 768
        
        # Verifikasi rate limit (time.sleep) dipanggil untuk etika scraping
        mock_sleep.assert_called_once_with(1.5)
