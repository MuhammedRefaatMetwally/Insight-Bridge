# 🚀 Insight-Bridge Backend

> **AI-powered news aggregation at lightning speed** ⚡

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

# Transform raw news into intelligent, searchable content.

---

## ✨ Features

- 🤖 **AI Summarization** - Google Gemini 2.5 Flash
- 🔍 **Semantic Search** - 768-dimensional embeddings + vector similarity
- ⚡ ** Fast** - 3 articles in maybe 30 seconds.
- 🗄️ **Neon Postgres** - Serverless database with pgvector
- 🏗️ **Production Ready** - TypeScript, layered architecture, ESM modules
- 🌐 **Deploy Anywhere** - Vercel, Railway, Render, or any Node.js platform

---

## 🚀 Quick Start

```bash
# Install
npm install

# Setup environment
cp .env.example .env
# Add your API keys to .env

# Run database schema (see below)

# Start server
npm run dev
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your_key
GNEWS_API_KEY=your_key
PORT=3000
```

### Database Setup
```sql
CREATE EXTENSION vector;

CREATE TABLE news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content_summary TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    embedding vector(768),
    source TEXT,
    category TEXT,
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_embedding ON news_articles 
USING hnsw (embedding vector_cosine_ops);
```

---

## 📖 API Endpoints

### Ingest News
```bash
POST /api/ingestion/start
Content-Type: application/json

{
  "category": "technology",
  "max": 3
}
```

### Search & Ingest
```bash
POST /api/ingestion/search
Content-Type: application/json

{
  "query": "AI breakthroughs",
  "max": 3
}
```

### Get Articles
```bash
GET /api/articles?limit=20&offset=0
```

### Find Similar Articles
```bash
GET /api/articles/:id/similar?limit=10
```

### Health Check
```bash
GET /api/health
```

---

## 🏗️ Architecture

```
src/
├── api/
│   ├── routes/          # API route definitions
│   └── controllers/     # Request handlers
├── services/
│   ├── ai.service.ts           # Gemini AI (summarization & embeddings)
│   ├── news.service.ts         # GNews API client
│   └── ingestion.service.ts    # Main orchestrator
├── db/
│   ├── connection.ts           # Neon Postgres pool
│   └── repositories/
│       └── articles.repository.ts  # Database operations
├── middleware/
│   └── errorHandler.ts         # Global error handling
└── utils/
    └── logger.ts               # Color-coded logging
```

---

## 🎯 Tech Stack

- **Runtime:** Node.js 18+ with ESM
- **Language:** TypeScript (strict mode)
- **Framework:** Express.js
- **Database:** Neon Postgres + pgvector
- **AI:** Google Gemini 2.5 Flash
- **News API:** GNews.io

---

## 📊 Performance

- **Processing Speed:** 3 articles in ~30 seconds
- **API Calls:** 6 per ingestion (2 per article)
- **Parallel Processing:** Summary + embedding simultaneously
- **Token Optimization:** Smart text truncation

---

## 🛠️ Scripts

```bash
npm run dev          # Development with hot reload
npm run build        # Compile TypeScript
npm start            # Run production build
```

---

## 📝 Example Usage

```bash
# Start server
npm run dev

# Ingest tech news
curl -X POST http://localhost:3000/api/ingestion/start \
  -H "Content-Type: application/json" \
  -d '{"category": "technology", "max": 3}'

# Get articles
curl http://localhost:3000/api/articles

# Find similar articles
curl http://localhost:3000/api/articles/{article-id}/similar
```

---

## 🎉 What Makes It Special?
- 🎯 **Smart Limits** - Max 3 articles for instant results
- 🤖 **Dual AI Processing** - Parallel summary + embedding generation
- 🔍 **Semantic Search** - Find similar articles using ML
- 🏗️ **Clean Code** - Layered architecture, type safety



---

Built with ❤️ using TypeScript, Express, and Google Gemini AI
