Typical Architecture

```
## Framework & Runtime

| Technology | Version | Role |
|-----------|---------|------|
| **Next.js** | 14.2.35 | React framework — App Router, SSR/SSG, API routes, image optimization |
| **React** | 18.x | UI library |
| **TypeScript** | 5.x | Type safety (strict mode, bundler module resolution) |
| **Node.js** | 18.x / 20.x | Server runtime (Vercel default) |

---

## Styling & Design System

| Technology | Version | Role |
|-----------|---------|------|
| **Tailwind CSS** | 3.4.x | Utility-first CSS framework |
| **PostCSS** | 8.x | CSS processing pipeline |
| **clsx** | 2.1.1 | Conditional className utility |

### Color Palette (Dark-First)

| Role | Name | Hex |
|------|------|-----|
| Background | Heart of Darkness | `#141213` |
| Primary accent | Atomic Tangerine | `#FF5910` |
| Electric highlight | Neon Cactus | `#E1FF00` |
| Cool accent | Tidal Wave | `#73F5FF` |
| Hot accent | Sprinkles | `#ED0AD2` |
| Primary text | White | `#FFFFFF` |
| Secondary text | Shroomy | `#d1d1c6` |
| Muted text | Greige | `#6D6D69` |

Additional colors: Hot Sauce (`#BD3A00`), Fing Peachy (`#FFBDAE`), Moody Sprinkles (`#b2079e`), Jurassic Fern (`#6B920D`), Hurricane Sky (`#088BA0`), Cosmic Grape (`#7C3AED`), Neon Flamingo (`#EC4899`), Cherry Bomb (`#DC2626`), Gold Rush (`#D97706`).

### Typography

| Font | Source | CSS Variable | Usage |
|------|--------|-------------|-------|
| **Inter** | Google Fonts (next/font) | `--font-inter` | Body text (weights: 400, 500, 600, 700) |
| **Press Start 2P** | Google Fonts (next/font) | `--font-arcade` | Arcade/gaming elements ("GAME OVER", "CONTINUE?", section labels) |

### Custom CSS Utilities

| Class | Purpose |
|-------|---------|
| `.text-gradient` | Animated 4-color gradient text (Atomic Tangerine, Neon Cactus, Tidal Wave, Sprinkles) |
| `.glass` | Glassmorphism effect (backdrop-blur-12px, 3% opacity background) |
| `.crt-scanlines` | CRT scanline overlay (repeating-linear-gradient, 2px spacing) |
| `.section-wide` | Max-width 80rem container with responsive padding |

### Custom Animations (Tailwind keyframes)

| Animation | Duration | Description |
|-----------|----------|-------------|
| `float` | 6s | Gentle vertical bobbing (translateY -20px) |
| `pulse-glow` | 3s | Opacity pulse (0.4 to 0.8) |
| `gradient-shift` | 5s | Background position cycle for gradient text |
| `grain` | 8s | Film grain noise overlay |

---

## Animation & 3D

| Technology | Version | Role |
|-----------|---------|------|
| **Framer Motion** | 12.34.0 | Page transitions, scroll animations, hover effects, spring physics |
| **Three.js** | 0.182.0 | WebGL 3D graphics (particle fields, geometric shapes) |
| **@react-three/fiber** | 8.18.0 | React declarative wrapper for Three.js |
| **@react-three/drei** | 9.122.0 | Three.js utility components (Points, PointMaterial, Float, Icosahedron, Sphere) |
| **Lenis** | 1.3.17 | Smooth scroll (eased vertical scrolling, 1.2s duration) |

---

## Database

| Technology | Version | Role |
|-----------|---------|------|
| **MongoDB Atlas** | — | Cloud database (cluster hosted on Atlas) |
| **mongodb** (Node driver) | 7.1.0 | Database access (singleton pattern, lazy init) |

- **Database name:** `tsc`
- **Connection:** `MONGODB_URI` environment variable
- **Collections:**
  - `blog`, `faq`, `glossary`, `comparison`, `expert_qa`, `news`, `case_study`, `industry_brief`, `video`, `tool` — content types
  - `interactions` — CTA click tracking (indexed: timestamp, ctaId, sessionId; TTL: 180 days)
  - `leads` — contact form submissions
  - `arcade_bosses` — arcade high score email captures
- **Graceful degradation:** All DB operations fail silently in read paths; critical paths (lead capture) prioritize email over DB storage

---

## Email

| Technology | Version | Role |
|-----------|---------|------|
| **Resend** | 6.9.2 | Transactional email (lead notifications, auto-replies) |

- **From address:** `hello@thestarrconspiracy.com`
- **Recipients:** `LEAD_RECIPIENTS` env var (melissa@, bret@, jj@, dan@, racheal@ thestarrconspiracy.com)
- **Templates:** Inline HTML with brand colors (#FF5910 header, styled links)
- **Dual send pattern:** Team notification + submitter auto-reply via `Promise.all`

---

## AI / Content Generation

| Technology | Version | Role |
|-----------|---------|------|
| **OpenAI API** | — | Content generation (gpt-4o) and embeddings (text-embedding-3-small) |

- **API calls use pure `fetch`** — no SDK wrapper (hard-won lesson from AEO donor platform)
- **OpenAI npm package** (6.21.0) is installed but content gen scripts use direct fetch
- **System prompts:** Brand-aware, per-content-type prompts in `lib/pipeline/content-prompts.ts`
- **Forbidden terms:** "thought leader", "synergy", "pioneers of AEO" — enforced at generation time
- **Expert rotation:** Cycles through Bret Starr, Racheal Bates, JJ La Pata

### GTM Kernel Integration

- **Source:** `/Volumes/Queen Amara/GTM Kernel/gtm_kernel/kernels/tsc/kernel.yaml` (1,736 lines)
- **Sync script:** `scripts/sync-kernel.ts` reads YAML at build time, generates `lib/kernel/generated/tsc.json`
- **Kernel components:** 20 components across 5 domains (brand, message, product, JTBD, constraints)
- **Output:** 6 service categories, 16 services, 3 JTBD clusters, 3 leaders

---

## Content Pipeline

### 10 Content Types

| Type | Route Pattern | MongoDB Collection |
|------|--------------|-------------------|
| Blog | `/insights/blog/[slug]` | `blog` |
| FAQ | `/insights/faq/[faqId]` | `faq` |
| Glossary | `/insights/glossary/[termId]` | `glossary` |
| Comparison | `/insights/comparisons/[comparisonId]` | `comparison` |
| Expert Q&A | `/insights/expert-qa/[qaId]` | `expert_qa` |
| News | `/insights/news/[newsId]` | `news` |
| Case Study | `/insights/case-studies/[caseStudyId]` | `case_study` |
| Industry Brief | `/insights/industry-briefs/[briefId]` | `industry_brief` |
| Video | `/insights/videos/[videoId]` | `video` |
| Tool | `/insights/tools/[toolId]` | `tool` |

### Build Pipeline

```

npm run build

1. sync-kernel → Read GTM Kernel YAML → generate tsc.json  
2. next build → TypeScript compile \+ static generation (121 pages)  
3. index-content → Generate OpenAI embeddings for RAG (skips without MONGODB\_URI)

```

### Content Generation (manual)

```

npm run generate-content → Reads tsc.json \+ content-prompts.ts → Calls OpenAI gpt-4o via pure fetch → Stores in MongoDB tsc.\* collections → Multi-cluster weighted round-robin across 3 JTBD clusters → Expert attribution rotation

```

---

## Scheduling & Calendar

| Technology | Role |
|-----------|------|
| **Cal.com** | Meeting scheduling (embedded iframe, dark theme) |

- **Embed URL:** `cal.com/team/tsc/25-50?embed=true&theme=dark&layout=month_view`
- **Integration:** iframe with postMessage resize listener
- **Query param forwarding:** `?service=` and `?cta=` params passed into Cal.com notes for attribution
- **Pages:** `/contact` (dual-path card), `/book` (standalone embed)

---

## Analytics & Tracking

| Technology | Version | Role |
|-----------|---------|------|
| **@vercel/analytics** | 1.6.1 | Vercel Web Analytics |
| **@vercel/speed-insights** | 1.3.1 | Core Web Vitals monitoring |
| **Custom CTA tracking** | — | Proprietary click attribution system |

### CTA Tracking System

- **TrackingProvider:** Global click listener in `app/layout.tsx` for `data-track-*` attributes
- **Transport:** `navigator.sendBeacon` to `/api/track` with `fetch` fallback
- **Storage:** MongoDB `interactions` collection
- **Sessions:** Anonymous per-tab sessions via `crypto.randomUUID()` in `sessionStorage`
- **35+ CTAs instrumented** with `?cta=<ctaId>` and `data-track-cta/component/label/destination`
- **CTA ID pattern:** `{page}-{section}` (e.g., `homepage-hero`, `pricing-subscription`)

---

## SEO & AI Discoverability

### Structured Data (JSON-LD)

| Schema | Pages |
|--------|-------|
| **Organization** | About |
| **FAQPage** | Homepage, Services, Verticals, Insights, About, Contact, Pricing (94 answer capsules total) |
| **BreadcrumbList** | All major pages |

### Sitemaps & Indexing

| File | Role |
|------|------|
| `app/sitemap.ts` | Dynamic XML sitemap (all published content, priority 0.6–1.0) |
| `app/robots.ts` | Crawler directives — AI crawlers explicitly whitelisted |
| `app/llms.txt/route.ts` | Markdown index of all content for LLM crawlers (cache: 1 hour) |

### AI Crawler Whitelist (robots.txt)

GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended, Amazonbot, cohere-ai — all explicitly allowed.

---

## Image Handling

| Technology | Version | Role |
|-----------|---------|------|
| **next/image** | (bundled) | Optimized image component with lazy loading |
| **sharp** | 0.34.5 | Server-side image processing for Next.js optimization |

- All images served from `/public/images/` (no external domains configured)
- Arcade assets use `unoptimized` flag + `imageRendering: pixelated` for crisp pixel art
- Key images: `coin_slot.png`, `1_player.png`, `ocho-color.png`, leadership headshots

---

## Validation & Data

| Technology | Version | Role |
|-----------|---------|------|
| **Zod** | 4.3.6 | Runtime schema validation |
| **gray-matter** | 4.0.3 | YAML/frontmatter parsing |
| **js-yaml** | 4.1.1 | YAML parsing (GTM Kernel sync) |
| **react-markdown** | 10.1.0 | Markdown → React rendering (content pages) |

---

## Deployment & Hosting

| Service | Role |
|---------|------|
| **Vercel** | Hosting, serverless functions, edge network, build pipeline |
| **GitHub** | Source control (`bretstarr2024/TSC-PRIMARY-WEBSITE`) |

- **Project:** `tsc-primary-website` (org: `bretstarr2024`)
- **Auto-deploy:** Disabled — manual deploy hook trigger required after every `git push`
- **Deploy hook:** `curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_nC50CRWORPDcPorbaenM52x3kwt0/V5Pb4PA4Rr"`
- **Build output:** 121 static pages + 3 API routes + 1 dynamic text route
- **Environment variables:** 5 (MONGODB_URI, OPENAI_API_KEY, RESEND_API_KEY, RESEND_FROM, LEAD_RECIPIENTS) — set across production, preview, development

---

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/track` | POST | CTA click & interaction tracking → MongoDB `interactions` |
| `/api/lead` | POST | Contact form submission → MongoDB `leads` + Resend emails |
| `/api/arcade-boss` | POST | Arcade high score email capture → MongoDB `arcade_bosses` |
| `/llms.txt` | GET | AI crawler content index (text/plain, cached 1 hour) |

---

## Easter Eggs: 9 Arcade Games

All games are canvas-based, lazy-loaded via `next/dynamic`, zero bundle cost until played. Triggered by `ArcadeButton` component (real 3D arcade button photo).

| Game | Page | localStorage Key |
|------|------|-----------------|
| Asteroids | Homepage | `tsc-asteroids-scores` |
| Frogger | About (clients section) | `tsc-frogger-scores` |
| Breakout | Services | `tsc-breakout-scores` |
| Tron | Pricing | `tsc-tron-scores` |
| Pong | Contact | `tsc-pong-scores` |
| Serpent Arena | Insights | `tsc-snake-scores` |
| Space Invaders | Verticals | `tsc-invaders-scores` |
| Galaga | Work | `tsc-galaga-scores` |
| Pac-Man | Careers | `tsc-pacman-scores` |

- **Boss Celebration System:** #1 high score in any game triggers `ArcadeBossOverlay` with confetti + email capture → `/api/arcade-boss`
- **Ocho mascot** (`ocho-color.png`) appears inside every game

---

## Installed but Not Yet Active

These packages are installed in `package.json` but not wired into the running application:

| Package | Version | Intended Use |
|---------|---------|-------------|
| **@clerk/nextjs** | 6.37.3 | Authentication (future dashboard/admin) |
| **@sentry/nextjs** | 10.38.0 | Error tracking & monitoring |
| **cloudinary** | 2.9.0 | Image CDN & transformation |
| **@vercel/blob** | 2.2.0 | Blob storage (file uploads) |
| **recharts** | 3.7.0 | Data visualization (analytics dashboard) |

---

## Environment Variables

| Variable | Service | Required |
|----------|---------|----------|
| `MONGODB_URI` | MongoDB Atlas | Yes (content queries, tracking, leads) |
| `OPENAI_API_KEY` | OpenAI | Yes (content generation, embeddings) |
| `RESEND_API_KEY` | Resend | Yes (email notifications) |
| `RESEND_FROM` | Resend | Yes (sender address) |
| `LEAD_RECIPIENTS` | Resend | Yes (notification recipients) |

---

## Key Architectural Decisions

1. **Pure fetch for all API clients** — no SDK dependencies. Learned from googleapis SDK disaster on the AEO donor platform.
2. **GTM Kernel as source of truth** — all content, services, messaging grounded in the 20-component kernel YAML.
3. **Graceful degradation everywhere** — DB failures don't crash pages, tracking always returns 200, index-content skips without credentials.
4. **Dark-first design** — brand identity is the dark theme. Light theme reserved for future content/reading pages.
5. **"Game Over" creative concept** — site-wide narrative: traditional B2B marketing is finished, time to level up. Arcade vocabulary maps to TSC positioning.
6. **Dual CTA routing** — general CTAs → `/contact` (form + calendar), service-specific CTAs → `/book` (direct calendar with service context).
7. **Anonymous tracking** — no cookies, no login. Per-tab sessions via `sessionStorage`. 180-day TTL auto-cleanup.

---

## Build Stats

| Metric | Value |
|--------|-------|
| Total pages | 121 |
| Static pages | 118 |
| SSG pages | ~80 (dynamic content) |
| Dynamic (server) routes | 3 API + 1 text |
| First Load JS (shared) | 87.6 KB |
| Largest page JS | ~13 KB (About) |
| Answer capsules | 94 |
| node_modules | ~692 MB |
| Dependencies | 33 (production) + 6 (dev) |

```

