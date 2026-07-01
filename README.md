# Shani OS

Shani OS is a browser-based desktop operating system built with Next.js, React, TypeScript, Tailwind CSS, Framer Motion, and Zustand. It combines a macOS-inspired shell with a modular app system, local persistence, Spotlight-style search, and a browser that can open live sites, reader-mode pages, an About page, and your portfolio.

## Highlights

- Desktop shell with a translucent top bar, animated dock, and movable app windows
- Spotlight-style launcher with search, quick actions, recent apps, files, and folders
- Browser app with multiple tabs, direct live-site support, and featured media pages
- Settings panel for themes, wallpapers, motion reduction, file associations, and cloud checks
- Files, Notes, Text Editor, Terminal, Browser, Photos, Calculator, Calendar, Dev Hub, Task Manager, Security Center, and Settings apps
- Local IndexedDB persistence with optional Supabase sync hooks
- Service worker support and static-export-friendly Netlify deployment

## What’s Included

- Browser starter tabs for Wikipedia, George Michael / Wham!, and the PBHacks portfolio
- One-time boot intro that explains how to use the desktop
- Shell menu commands for fast access to Browser Home, Portfolio, Files, Projects, Downloads, Settings, and Security tools
- SEO metadata with Open Graph, Twitter card, icons, and robots tags

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000 after the dev server starts.

## Production Build

```bash
npm run lint
npm run build
```

The app is configured for static export, so the build output is generated in `out/`.

## Netlify Deployment

Use these build settings:

- Build command: `npm run build`
- Publish directory: `out`

If you deploy with the Netlify UI, those settings match `netlify.toml`.

## Environment Variables

Create `.env.local` for Supabase features:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Optional deployment metadata:

```bash
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
```

## Supabase Schema

The app expects a `webos_sessions` table for cloud sync:

```sql
create table if not exists webos_sessions (
  user_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
```

For signed-in uploads, create the `user-files` bucket and policies documented in the app’s Supabase integration.

## Project Structure

```text
/app
/apps
/components
/desktop
/dock
/lib
/store
/topbar
/utils
/window
/workers
```

## Useful Commands

- `Cmd + Space` opens Spotlight search
- The top bar menu includes browser home, portfolio, files, projects, downloads, settings, and security actions
- Right-click pinned apps in the dock to pin or unpin them
- Use the Browser app to switch between reader mode and live-site mode when a site supports direct embedding

## Notes

- The portfolio tab at `pbhacks.lovable.app` is shown directly instead of through reader mode.
- The browser home view is intentionally pinned to Billie Jean.
- If Supabase is not configured, the app still runs fully in local mode.