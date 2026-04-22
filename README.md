# AUSTIN.EXE

A chaotic-good birthday desktop for Austin. Static site on Firebase Hosting.

## What's inside

- **Terminal** — chat with AUSTIN.AI, a surf-punk beach-town AI (Gemini Flash).
- **Wordsalad.txt** — a new darkly funny fragment / phrase / half-thought every open.
- **Media Player** — rotating lo-fi/beach-rock mixes.
- **Calc.exe** — ominous numerology generator (no clichés).
- **DO NOT OPEN.exe** — 🎂

## Stack

- Plain HTML/CSS/JS. No build step.
- [98.css](https://jdan.github.io/98.css/) for the Windows 98 aesthetic.
- Gemini 2.0 Flash, called client-side with a **referrer-restricted API key** locked to `*.austin-exe-26769.web.app`.
- Firebase Hosting.
- Auto-deploy on push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

## Local dev

```
firebase emulators:start --only hosting
```

## Deploy

Push to `main`. GitHub Actions will build and deploy to `https://austin-exe-26769.web.app`.

Manual deploy (uses the `fb` wrapper and `.firebase-account`):

```
fb deploy --only hosting
```

## Voice asset

`public/assets/audio/birthday.wav` — placeholder path. Generate a cloned-voice WAV via VoxCPM2 on the 3090 machine and commit it here. The cake will play it silently if missing.
