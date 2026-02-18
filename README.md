# CloseLoop

AI-powered voice assistant platform for local businesses — handles phone calls, books appointments, dispatches drivers, takes food orders, and manages medical intakes, all via natural conversation.

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State:** TanStack React Query + React Context (no Redux/Zustand)
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Realtime)
- **Voice AI:** ElevenLabs Conversational AI + Twilio telephony
- **Payments:** Stripe subscriptions + usage-based billing

## Setup

```sh
npm install
cp .env.example .env   # Fill in Supabase, Twilio, ElevenLabs, Stripe keys
npm run dev
```

## Project Structure

```
src/
  components/     # UI organized by domain (brain/, dashboard/, dispatch/, etc.)
  hooks/          # 95+ React Query hooks (useBookings, useAuth, useCapabilities, ...)
  pages/          # Route pages (app/, admin/, debug/)
  lib/            # Utilities and helpers
  data/           # Static data (industry catalog, templates, demos)
supabase/
  functions/      # Edge Functions (twilio-inbound, elevenlabs-webhook, handoffs, ...)
  migrations/     # Database migrations
```

## Architecture

See `CLAUDE.md` and `.claude/rules/` for detailed architecture documentation including:
- Database schema and RLS patterns
- Golden Path call flow (Twilio -> ElevenLabs -> webhook -> routing -> handoff)
- Frontend architecture and routing
