# Community Galaxy

> A 3D immersive galaxy of memecoin communities. Planets pulse with live sentiment, posts, and market activity in real time.

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-WebGL-black?logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/TanStack-Start-FF4154?logo=react&logoColor=white" />
</p>

---

## What is it?

**Community Galaxy** is a real-time, interactive 3D visualization of the memecoin universe. Each community becomes a living planet in a generative galaxy—its size, glow, and pulse driven by actual on-chain data, social sentiment, and market momentum. Click any planet to dive into its live feed, market activity, and trending alerts.

- **Live sentiment** — Real-time mood extraction from community feeds
- **Market momentum** — Price deltas, volume spikes, and trending signals
- **Wallet-connected** — Plug in to track your own holdings across the galaxy
- **Generative cosmos** — Procedural starfields, orbit rings, and animated planet surfaces

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (v1) · Full-stack React 19 with SSR/SSG |
| 3D Engine | React Three Fiber + Drei (WebGL) |
| Styling | Tailwind CSS v4 with custom OKLCH design tokens |
| State | TanStack Query (server state) + React hooks (UI state) |
| UI Primitives | Radix UI (fully accessible, unstyled headless components) |
| Auth & Data  (PostgreSQL, auth, server functions) |
| Charts | Recharts |
| Icons | Lucide React |

---

## Architecture

```
App/
├── modules/
│   ├── galaxy/          # 3D scene: planets, starfield, camera rig, orbits
│   ├── hud/             # Heads-up display: preloader, panels, overlays
│   └── ui/              # shadcn/ui primitives (buttons, dialogs, toasts, etc.)
├── state/
│   ├── use-holdings.ts       # Wallet holdings tracking
│   ├── use-market-deltas.ts  # Real-time price/sentiment deltas
│   └── use-trending-alerts.ts # Alert feed pipeline
├── core/
│   ├── api/             # API wrappers and data fetchers
│   ├── coin-sdk.ts      # On-chain data SDK integration
│   ├── galaxy-types.ts  # Shared TypeScript types for the cosmos
│   └── wallet-context.tsx # Wallet provider (connection + state)
└── styles.css           # Design system: OKLCH tokens, HUD utilities, glow FX
```

---

## Quick Start

```bash
# Install dependencies
bun install

# Run the dev server
bun run dev

# Production build
bun run build

# Preview production build locally
bun run preview
```

---

## Design System

The visual language is built around a **deep cosmic dark cyber** aesthetic.

- **Palette**: Neon cyan, purple, green, pink, and gold on a near-black cosmic background
- **Surfaces**: Frosted HUD panels with backdrop blur, cyan edge glows, and subtle inner rings
- **Typography**: Clean sans-serif UI type with high-contrast readability against dark space
- **Motion**: Pulsing glow animations, smooth camera transitions, procedural planet rotation

All colors are defined in **OKLCH** inside `app/styles.css` for perceptually uniform theming.

---

## License

MIT
