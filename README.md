# Workout Spotify Companion

A React + Vite web application that pairs Spotify playback with interval-focused workout cues.

## Stack
- React 18 + TypeScript
- Vite 7
- Tailwind CSS 3.x (ready for Tailwind UI patterns)

## Environment setup
1. Copy `.env.example` to `.env.local`.
2. Fill in `VITE_SPOTIFY_CLIENT_ID` with the value from your Spotify dashboard.
3. Confirm `VITE_SPOTIFY_REDIRECT_URI` matches the development redirect you registered (defaults to `http://127.0.0.1:5173/auth/callback`).

## Local development
```bash
npm install
npm run dev
```

## Next steps
- Configure Spotify OAuth with PKCE and wire playback control endpoints.
- Build the interval slicer and song counter workflows.
- Connect the repository to GitHub for cloud backups.
