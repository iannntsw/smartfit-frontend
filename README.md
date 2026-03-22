# SmartFit Frontend

React + Vite frontend for the SmartFit prototype.

## What This Repo Does

- provides the landing page, auth mock flows, dashboard, and training views
- connects the Live Training page to the FastAPI backend websocket
- streams webcam frames for live push-up tracking
- displays rep count, tracker state, elbow angle, prediction label, and confidence

## Setup

```bash
cd "/Users/ian/Ian/NUS/IS4151/strength-coach-frontend"
npm install
npm run dev
```

## Backend Dependency

The live training screen expects the backend websocket at:

```text
ws://127.0.0.1:8000/ws/live/pushup
```

If needed, override it with:

```text
VITE_PUSHUP_WS_URL=ws://127.0.0.1:8000/ws/live/pushup
```

## Main Live Flow

1. Start the backend
2. Start the frontend
3. Open `/live-training`
4. Select `Push-ups`
5. Click `Start Tracking`

The page should then show:
- backend connection status
- rep count
- tracker state
- smoothed elbow angle
- latest predicted label
- confidence

## Current Scope

- live backend tracking is implemented for push-ups first
- upload flow is still placeholder
- other exercises remain UI-only for now

## Notes

- For best push-up tracking, use a side-view camera angle with the full body visible.
- If the page shows `Backend Offline`, check that the FastAPI backend is running and `/health` returns `model_loaded: true`.
  
