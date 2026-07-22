# AwasHoax - Semantic Search and Fact-Verification Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_pgvector-4169E1?logo=postgresql)](https://neon.tech/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Embedding_2-8E75B2?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

AwasHoax is a modern web application leveraging AI-powered semantic search to verify claim accuracy and fact-check Indonesian news hoaxes. By combining 768-dimensional vector embeddings with fact-check clarifications from TurnBackHoax.id, the platform understands the contextual intent and semantic meaning of news claims beyond literal keyword matching.

---

## Core Features

- AI-Powered Semantic Search (`gemini-embedding-2`)
  Contextually detects hoax claims using 768-dimensional vector embeddings powered by the Google Gemini API. It analyzes contextual meaning rather than relying solely on exact text matches.

- Self-Learning On-Demand Web Scraping
  When a user searches for a new claim not present in the local database (a cache miss), the backend automatically triggers an on-demand scraper to TurnBackHoax.id, extracts article details, generates vector embeddings, and indexes the content into the Neon database in real-time.

- Lexical Search Fallback
  Includes a built-in fail-safe system that automatically switches to literal keyword matching (SQL ILIKE queries) on PostgreSQL if AI API rate limits or network issues occur.

- Modern UI with Light and Dark Theme Toggle
  Features a clean user interface built with the Plus Jakarta Sans typography, a soft color palette designed for high contrast and legibility, responsive layouts, and an instant Light/Dark mode switcher.

- Real-Time Summary Dashboard
  Displays live statistics of verified articles in the database along with the top 5 latest fact-check clarifications.

---

## System Architecture and Workflow

```mermaid
graph TD
    A[User / Web Frontend] -->|Search Query| B[FastAPI Backend]
    B -->|1. Cosine Distance Vector Query| C[(Neon Postgres + pgvector)]
    
    C -->|Match Score > 55%| B
    
    C -.->|Match Score < 55% Cache-Miss| D[On-Demand Scraper]
    D -->|Scrape New Articles| E[TurnBackHoax.id]
    E -->|Article Content| D
    D -->|Generate Embeddings| F[Google Gemini API]
    F -->|768-dim Vectors| C
    
    B -->|JSON Response with Scores| A
```

---

## Tech Stack

### Frontend
- Framework: Next.js 16 (App Router, React 19, TypeScript)
- Styling: Tailwind CSS v4, Vanilla CSS Tokens
- UI Components: Radix UI / shadcn/ui primitives
- Typography: Plus Jakarta Sans (`next/font/google`)
- Icons: Lucide React

### Backend
- Framework: Python 3.13, FastAPI, Uvicorn
- Web Scraping: BeautifulSoup4, Requests
- Database Driver: `psycopg2-binary` (RealDictCursor)
- AI Integration: Google GenAI SDK (`google-genai`)

### Database and Infrastructure
- Database: Neon Serverless Postgres
- Vector Extension: `pgvector` (`vector(768)`)
- Embedding Model: `models/text-embedding-004` / `gemini-embedding-2`

---

## Quick Start Guide

### Prerequisites
- Node.js version 18.0.0 or higher
- Python version 3.10 or higher
- Neon DB account with `pgvector` extension enabled
- Google Gemini API Key (Google AI Studio)

---

### 1. Backend Setup (FastAPI)

1. Navigate to the `backend` directory:
   ```bash
   cd "Hoax Detection Web/backend"
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL=postgresql://user:password@ep-cool-endpoint-pooler.neon.tech/neondb?sslmode=require
   GEMINI_API_KEY=YourGeminiApiKeyHere
   ```

5. Launch the FastAPI server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend will run on `http://127.0.0.1:8000`.

---

### 2. Frontend Setup (Next.js 16)

1. Navigate to the `frontend` directory:
   ```bash
   cd "Hoax Detection Web/frontend"
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the `frontend/` directory (optional if running backend locally):
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## Project Directory Structure

```
Hoax Detection Web/
├── backend/
│   ├── main.py              # FastAPI application, API endpoints, and On-Demand scraper
│   ├── database.py          # Neon Postgres database connection
│   ├── scraper.py           # Initial TurnBackHoax.id scraping script
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx     # Main application interface (Search, Stats, Theme Toggle)
│   │   │   ├── layout.tsx   # Root Layout with Plus Jakarta Sans
│   │   │   └── globals.css  # OKLCH theme variables for Light and Dark modes
│   │   └── components/ui/   # shadcn UI components (Button, Card, Input, etc.)
│   ├── package.json         # Node.js dependencies (Next.js 16, React 19)
│   └── tsconfig.json        # TypeScript configuration
├── docs/
│   └── superpowers/         # Specifications and design plans
└── README.md
```

---

## Primary API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/search?q={query}&limit=5&min_score=0.4` | Executes semantic search (triggers On-Demand scraping if score < 55%) |
| `GET` | `/api/hoaxes/latest?limit=5` | Fetches top 5 latest fact-check clarifications |
| `GET` | `/api/stats` | Returns total count of indexed hoax articles in database |

---

## License and Data Attribution

- Project License: MIT License
- Fact-Check Data Source: [TurnBackHoax.id](https://turnbackhoax.id) by MAFINDO (Masyarakat Anti Fitnah Indonesia)
