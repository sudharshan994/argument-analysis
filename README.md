# Argument Replay Engine

AI-powered debate analysis that turns noisy discussion threads into animated claim maps, relationship summaries, and report-ready insight panels.

![Argument Replay Engine preview](src/assets/hero.png)

## Why it matters

Online debates are usually hard to review because claims, counterclaims, questions, and repeated points are mixed together. Argument Replay Engine parses a pasted thread, extracts the logical propositions, groups duplicate claims, and replays the conversation as an interactive graph.

This project is built as a portfolio-ready full-stack app: React frontend, Express backend, AI classification, graph visualization, environment-based configuration, and GitHub Actions CI.

## Features

- Paste any `Name: Comment text` style debate thread.
- Classify comments into claims, counterclaims, agreements, questions, tangents, and insults.
- Deduplicate similar propositions into cleaner canonical claims.
- Render an animated D3 graph with support, attack, question, and restatement links.
- Surface practical insights such as most contested claim, most supported claim, relationship counts, and confidence.
- Configure report payment details through environment variables instead of hardcoding private information.

## Tech stack

- React 19 and Vite 8
- D3 for graph rendering
- Express 5 API server
- NVIDIA NIM via the OpenAI-compatible SDK
- ESLint for code quality
- GitHub Actions for CI

## Project structure

```text
.
├── src/                 # React frontend
├── src/components/      # Graph and insight UI
├── server/              # Express API and AI graph logic
├── public/              # Static icons
├── .github/workflows/   # CI workflow
└── .env.example         # Environment variable template
```

## Environment variables

Copy `.env.example` to `.env` in the project root and fill in your values:

```bash
NVIDIA_API_KEY=your_nvidia_api_key
VITE_API_URL=http://localhost:3001
VITE_PAYMENT_ADDRESS=your-payment-id
VITE_PAYMENT_NAME=Argument Replay Engine
```

The real `.env` file is ignored by git so API keys and personal payment details stay private.

## Run locally

Install and start the frontend:

```bash
npm install
npm run dev
```

Install and start the backend in a second terminal:

```bash
cd server
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173`. The API runs at `http://localhost:3001`.

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

## Quality checks

```bash
npm run lint
npm run build
```

The CI workflow runs lint, production build, server dependency install, and a server syntax check on every push or pull request to `main`.

## API

`POST /analyze`

Request:

```json
{
  "rawText": "Alice: Claim text\nBob: Response text"
}
```

Response:

```json
{
  "nodes": [],
  "links": [],
  "meta": {
    "comments": 0,
    "classified": 0,
    "relationships": 0,
    "confidence": 0
  }
}
```

`GET /health`

Returns API status and timestamp.

## Deployment notes

Build the frontend with:

```bash
npm run build
```

Deploy `dist/` to a static host and deploy `server/` to a Node-capable backend host. Set `VITE_API_URL`, `VITE_PAYMENT_ADDRESS`, and `VITE_PAYMENT_NAME` in the frontend build environment, and set `NVIDIA_API_KEY` in the backend environment.
