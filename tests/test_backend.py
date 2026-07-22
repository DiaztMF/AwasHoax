import sys
import os
from unittest.mock import MagicMock, patch

# Tambahkan backend ke path import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

# Mock psycopg2 sebelum mengimpor main/database untuk mencegah error saat import
sys.modules['psycopg2'] = MagicMock()
sys.modules['psycopg2.extras'] = MagicMock()

import database
import main

def test_get_latest_hoaxes():
    # Setup mock connection & cursor
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    mock_rows = [
        {"id": 1, "title": "Hoax Vaksin", "url": "http://link1", "publish_date": "2026-07-22", "summary": "Info hoax"},
        {"id": 2, "title": "Hoax Gempa", "url": "http://link2", "publish_date": "2026-07-21", "summary": "Info hoax 2"}
    ]
    mock_cur.fetchall.return_value = mock_rows
    
    # Patch fungsi get_db_connection
    with patch('main.get_db_connection', return_value=mock_conn):
        res = main.get_latest_hoaxes(limit=2)
        
        # Verifikasi data dikembalikan
        assert len(res) == 2
        assert res[0]["title"] == "Hoax Vaksin"
        
        # Verifikasi execute dipanggil dengan query yang benar
        mock_cur.execute.assert_called_once()
        query = mock_cur.execute.call_args[0][0]
        assert "SELECT id, title, url, publish_date::text, summary" in query
        assert "ORDER BY publish_date DESC, created_at DESC" in query

def test_get_stats():
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    mock_cur.fetchone.return_value = {"total": 42}
    
    with patch('main.get_db_connection', return_value=mock_conn):
        res = main.get_stats()
        
        assert res["total_hoaxes"] == 42
        mock_cur.execute.assert_called_once_with("SELECT COUNT(*) as total FROM hoax_articles;")

def test_search_hoax_semantic_success():
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    mock_rows = [
        {"id": 1, "title": "Hoax Vaksin", "url": "http://link1", "publish_date": "2026-07-22", "summary": "Info hoax", "similarity_score": 0.85}
    ]
    mock_cur.fetchall.return_value = mock_rows
    
    # Mock Gemini Client & Embedding values
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_embeddings = MagicMock()
    mock_embeddings.values = [0.1] * 768
    mock_response.embeddings = [mock_embeddings]
    mock_client.models.embed_content.return_value = mock_response
    
    with patch('main.get_db_connection', return_value=mock_conn), \
         patch('main.genai.Client', return_value=mock_client):
         
        res = main.search_hoax(q="vaksin berbahaya", limit=1, min_score=0.5)
        
        assert len(res) == 1
        assert res[0]["title"] == "Hoax Vaksin"
        assert res[0]["similarity_score"] == 0.85
        
        # Verifikasi pemanggilan embedding Gemini
        mock_client.models.embed_content.assert_called_once_with(
            model="text-embedding-004",
            contents="vaksin berbahaya"
        )
        
        # Verifikasi query SQL
        mock_cur.execute.assert_called_once()
        query = mock_cur.execute.call_args[0][0]
        assert "1 - (embedding <=> %s::vector)" in query
        assert "ORDER BY embedding <=> %s::vector ASC" in query

def test_search_hoax_lexical_fallback_on_api_error():
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    mock_rows = [
        {"id": 1, "title": "Hoax Vaksin Leksikal", "url": "http://link1", "publish_date": "2026-07-22", "summary": "Info hoax", "similarity_score": 1.0}
    ]
    mock_cur.fetchall.return_value = mock_rows
    
    # Mock client yang melempar exception saat dipanggil
    mock_client = MagicMock()
    mock_client.models.embed_content.side_effect = Exception("API Key Expired")
    
    with patch('main.get_db_connection', return_value=mock_conn), \
         patch('main.genai.Client', return_value=mock_client):
         
        # Jalankan pencarian
        res = main.search_hoax(q="vaksin", limit=1)
        
        # Verifikasi data dikembalikan via fallback
        assert len(res) == 1
        assert res[0]["title"] == "Hoax Vaksin Leksikal"
        
        # Verifikasi kueri fallback ILIKE dijalankan
        assert mock_cur.execute.call_count == 1
        query = mock_cur.execute.call_args[0][0]
        assert "title ILIKE %s OR summary ILIKE %s" in query
        assert mock_cur.execute.call_args[0][1] == ("%vaksin%", "%vaksin%", 1)
