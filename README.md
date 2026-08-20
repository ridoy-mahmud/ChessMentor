# Chess Mentor

Chess Mentor is a polished chess learning platform built with TanStack Start, React, and Vite. It blends a playable chess experience with guided learning, trainer tools, puzzle modes, and performance-focused insights so players can practice, review, and improve in one place.

## What it includes

- A warm, responsive home experience with an ambient chessboard hero
- Play mode with computer opponents, pass-and-play, time controls, and learning or competitive setup
- Training tools for tactics, openings, endgames, vision, and coordinate practice
- Puzzle modes like Rush and Storm for fast pattern recognition
- Profile analytics with study plans, lesson mastery, accuracy, and ladder progress
- Theme and sound controls for a more personalized experience

## Screenshots

### Home

![Chess Mentor home screen](public/screenshot/Screenshot%20From%202026-07-19%2018-15-02.png)

### Play

![Chess Mentor play screen](public/screenshot/Screenshot%20From%202026-07-19%2018-16-03.png)

![Chess Mentor play screen in dark mode](public/screenshot/Screenshot%20From%202026-07-19%2018-16-11.png)

### Profile

![Chess Mentor profile screen](public/screenshot/Screenshot%20From%202026-07-19%2018-16-24.png)

## Tech Stack

- [TanStack Start](https://tanstack.com/start)
- React 19
- TanStack Router
- Vite
- TypeScript
- Tailwind CSS
- chess.js
- react-chessboard
- Recharts

## Getting Started

```bash
npm install
npm run dev
```

## Firebase Auth Setup

To enable email/password and Google sign-in locally and on Vercel, set these environment variables in your local `.env` file and in your Vercel project settings:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

If you prefer client-prefixed vars, `VITE_FIREBASE_*` is also supported.

Also make sure the deployed domain is listed in Firebase Authentication > Settings > Authorized domains, or Google sign-in will fail with an unauthorized-domain error.

## Available Scripts

```bash
npm run dev
npm run build
npm run build:dev
npm run preview
npm run lint
npm run format
```

## Project Structure

- `src/routes` contains the file-based TanStack Start routes
- `src/components/chess` contains the chess-specific UI and gameplay components
- `src/lib/chess` contains game logic, bots, analytics, and study-plan helpers
- `public/screenshot` contains the showcase screenshots used in this README

## Notes

This project uses file-based routing. The root layout lives in `src/routes/__root.tsx`, and `src/routeTree.gen.ts` is auto-generated.
