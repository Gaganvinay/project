# Vendor-BGAC (MERN + ML) — Project skeleton

This repository contains the scaffold for **Vendor Behavior-Graph Adaptive Classifier (BGAC)**:
- Frontend: React
- Backend: Node.js + Express
- ML service: Python + FastAPI (stub)
- Database: MongoDB
- Redis: for caching / job queue
- Docker Compose for local development

> This folder currently contains the Compose file and scaffolding. Backend, frontend, and ML service code will be added in following steps.

---

## Requirements

- Docker & Docker Compose installed
- Git (optional)
- Node.js + npm (only if you want to run services locally without Docker)

---

## Quick start (using Docker Compose)

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
