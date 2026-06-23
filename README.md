# 🌍 AI Travel Planner – Multi-Agent Trip Planning System

> An AI-powered travel planning platform that transforms natural language travel requests into personalized, structured itineraries using a multi-agent architecture.

## 🔗 Live Demo

**Frontend:** https://ai-travel-planner-multi-agents-back-rouge.vercel.app/

**Backend API:** https://ai-travel-planner-multi-agents-1.onrender.com

**Health Check:** https://ai-travel-planner-multi-agents-1.onrender.com/health

---

## Problem Statement

Planning a trip typically requires users to research destinations, compare budgets, coordinate logistics, and stitch together information from multiple sources. This process is fragmented, time-consuming, and often overwhelming.

This project explores how AI agents can collaborate to generate personalized travel plans from a single natural-language prompt.

---

## Product Vision

Enable users to create customized travel itineraries in seconds through conversational AI.

Example:

> "Plan a 5-day trip to Japan. Tokyo + Kyoto. Budget $3,000. Love food and temples, hate crowds."

The system generates:

- Personalized destination recommendations
- Day-by-day itineraries
- Budget allocation
- Logistics and transportation suggestions
- Structured trip plans that can be revisited later

---

## Key Features

- ✅ Natural language trip planning
- ✅ Multi-agent orchestration
- ✅ Personalized itinerary generation
- ✅ Budget-aware recommendations
- ✅ Plan history and retrieval
- ✅ Offline mock mode for demos and testing
- ✅ Shared contract-driven architecture

---

## Multi-Agent Architecture

### Destination Agent
Identifies destinations and activities aligned with user preferences.

### Logistics Agent
Optimizes transportation and travel sequencing.

### Budget Agent
Allocates expenses and validates budget constraints.

### Review Agent
Evaluates itinerary quality and consistency.

### Orchestrator
Coordinates all agents and merges outputs into a final travel plan.

---

## Architecture & Deployment

```text
Frontend (React + Vite + TypeScript)
        ↓
      Vercel
        ↓
REST API
        ↓
Backend (Fastify + TypeScript)
        ↓
      Render
        ↓
Multi-Agent Orchestrator
 ├── Destination Agent
 ├── Logistics Agent
 ├── Budget Agent
 └── Review Agent
```

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Node.js
- Fastify
- TypeScript

### AI & System Design
- Multi-Agent Systems
- LLM Integration
- Prompt Engineering
- Zod Validation

### Deployment
- Vercel
- Render

---

## Repository Structure

```text
apps/
├── backend/
├── web/

packages/
└── shared/

slides/
└── product and architecture documentation
```

---

## Local Setup

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
npm run dev
npm run dev:web
```

---

## API Endpoints

```bash
GET  /health
POST /api/plan
GET  /api/plans
GET  /api/plan/:trace_id
```

---

## Future Enhancements

- Real-time flight and hotel integrations
- Collaborative trip planning
- Interactive itinerary editing
- Cost optimization engine
- User accounts and saved preferences
- Recommendation feedback loop

---

## Why This Project Matters

This project demonstrates:

- Product thinking and problem framing
- AI product design
- Multi-agent system architecture
- End-to-end product development
- System design and API thinking
- Ability to ship and deploy production-ready applications

---

## Author

**Manjari Vishwakarma**  
Product Manager | Data & AI Enthusiast
