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
