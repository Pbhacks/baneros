"use client";

import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { DOWNLOADS_FOLDER_ID } from "@/utils/constants";
import { useWebOSStore } from "@/store/webos-store";

type BrowserTab = {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
};

type PageContent = {
  url: string;
  html: string;
  readerUrl?: string;
  status: "idle" | "loading" | "success" | "embed" | "home" | "direct-frame" | "reader-frame" | "error";
  error?: string;
};

type BrowserPageState = Record<string, PageContent>;

const HOME_URL = "webos://shani-os";
const BILLIE_JEAN_VIDEO_ID = "Zi_XLOBDo_Y";
const BILLIE_JEAN_EMBED_URL = `https://www.youtube-nocookie.com/embed/${BILLIE_JEAN_VIDEO_ID}?autoplay=0&rel=0`;
const BILLIE_JEAN_SOURCE_URL = `https://www.youtube.com/watch?v=${BILLIE_JEAN_VIDEO_ID}`;
const GEORGE_MICHAEL_VIDEO_ID = "izGwDsrQ1eQ";
const GEORGE_MICHAEL_EMBED_URL = `https://www.youtube-nocookie.com/embed/${GEORGE_MICHAEL_VIDEO_ID}?autoplay=0&rel=0`;
const GEORGE_MICHAEL_SOURCE_URL = `https://www.youtube.com/watch?v=${GEORGE_MICHAEL_VIDEO_ID}`;
const PORTFOLIO_URL = "https://pbhacks.lovable.app";

const STARTER_TABS = [
  { title: "Shani OS", url: HOME_URL },
  { title: "Wikipedia", url: "https://wikipedia.org" },
  { title: "George Michael / Wham!", url: GEORGE_MICHAEL_SOURCE_URL },
  { title: "PBHacks Portfolio", url: PORTFOLIO_URL },
];

const FEATURED_VIDEOS = [
  {
    title: "Billie Jean",
    url: BILLIE_JEAN_SOURCE_URL,
    sourceUrl: BILLIE_JEAN_SOURCE_URL,
    embedUrl: BILLIE_JEAN_EMBED_URL,
    description: "Pinned music page for the Shani OS browser workspace.",
  },
  {
    title: "George Michael / Wham!",
    url: GEORGE_MICHAEL_SOURCE_URL,
    sourceUrl: GEORGE_MICHAEL_SOURCE_URL,
    embedUrl: GEORGE_MICHAEL_EMBED_URL,
    description: "Older George Michael video tab for the built-in browser.",
  },
] as const;

const getFeaturedVideo = (url: string) => FEATURED_VIDEOS.find((video) => video.url === url || video.sourceUrl === url);

const isShaniHomeUrl = (url: string): boolean => url === HOME_URL;

const DIRECT_FRAME_HOSTS = new Set(["pbhacks.lovable.app"]);

const isDirectFrameUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return DIRECT_FRAME_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
};

const normalizeInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return HOME_URL;
  }
  if (trimmed === HOME_URL) {
    return HOME_URL;
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  if (/\s/.test(trimmed) || !/\.[a-z]{2,}([/?#:]|$)/i.test(trimmed)) {
    return `https://s.jina.ai/${encodeURIComponent(trimmed)}`;
  }
  return `https://${trimmed}`;
};

const titleFromUrl = (url: string): string => {
  if (isShaniHomeUrl(url)) {
    return "Shani OS";
  }
  const featuredVideo = getFeaturedVideo(url);
  if (featuredVideo) {
    return featuredVideo.title;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "New Tab";
  } catch {
    return "New Tab";
  }
};

const guessFilename = (url: string): string => {
  const safe = url.split("?")[0].split("/").pop() ?? "download.txt";
  return safe.includes(".") ? safe : `${safe || "download"}.txt`;
};

const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*(['"])javascript:[\s\S]*?\2/gi, "");
};

const injectBaseHref = (html: string, url: string): string => {
  const baseTag = `<base href="${url.replace(/"/g, "&quot;")}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  }
  return `${baseTag}${html}`;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildReaderUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "r.jina.ai" || parsed.hostname === "s.jina.ai") {
      return url;
    }
  } catch {
    return url;
  }
  return `https://r.jina.ai/${url}`;
};

const renderReaderText = (text: string): string => {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(
    /https?:\/\/[^\s<]+/g,
    (match) => `<a href="${match}" class="text-cyan-300 underline break-all">${match}</a>`,
  );

  return `<div style="white-space:pre-wrap;line-height:1.75;font-family:var(--font-ibm-plex-mono),monospace;">${linked}</div>`;
};

async function fetchReaderHtml(url: string): Promise<{ html: string; finalUrl: string; readerUrl: string }> {
  const readerUrl = buildReaderUrl(url);
  const response = await fetch(readerUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Reader fetch failed (${response.status})`);
  }

  const rawText = await response.text();
  if (!rawText.trim()) {
    throw new Error("No page content returned");
  }

  return {
    html: sanitizeHtml(injectBaseHref(renderReaderText(rawText), readerUrl)),
    finalUrl: url,
    readerUrl,
  };
}

const HomeIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size }}>
    <span className="launchpad-triangle-halo absolute inset-[-34%] rounded-full" />
    <span className="launchpad-triangle-wave absolute inset-[6%]" />
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
      <defs>
        <linearGradient id="shani-os-home-icon-stroke" x1="15%" y1="10%" x2="86%" y2="88%">
          <stop offset="0%" stopColor="#59ff8d" />
          <stop offset="36%" stopColor="#f8ff73" />
          <stop offset="68%" stopColor="#ff8a2a" />
          <stop offset="100%" stopColor="#ff2ed1" />
        </linearGradient>
        <radialGradient id="shani-os-home-icon-fill" cx="50%" cy="28%" r="72%">
          <stop offset="0%" stopColor="rgba(90,255,140,0.32)" />
          <stop offset="48%" stopColor="rgba(255,158,48,0.14)" />
          <stop offset="100%" stopColor="rgba(255,40,196,0.04)" />
        </radialGradient>
      </defs>
      <path d="M50 10 L85 76 Q88 87 76 87 H24 Q12 87 15 76 Z" fill="url(#shani-os-home-icon-fill)" />
      <path d="M50 10 L85 76 Q88 87 76 87 H24 Q12 87 15 76 Z" fill="none" stroke="url(#shani-os-home-icon-stroke)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 10 L85 76 Q88 87 76 87 H24 Q12 87 15 76 Z" fill="none" stroke="url(#shani-os-home-icon-stroke)" strokeWidth="5.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 10 L85 76 Q88 87 76 87 H24 Q12 87 15 76 Z" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

interface BrowserAppProps {
  launchUrl?: string;
}

export const BrowserApp = ({ launchUrl }: BrowserAppProps) => {
  const initialUrl = normalizeInput(launchUrl ?? HOME_URL);

  const initialTabs = useMemo(() => {
    const urls = [initialUrl, ...STARTER_TABS.map((tab) => tab.url)];
    const uniqueUrls = urls.filter((url, index) => urls.indexOf(url) === index);
    return uniqueUrls.map((url, index) => ({
      id: `tab-${index + 1}`,
      title: STARTER_TABS.find((tab) => tab.url === url)?.title ?? titleFromUrl(url),
      url,
      history: [url],
      historyIndex: 0,
    }));
  }, [initialUrl]);

  const [tabs, setTabs] = useState<BrowserTab[]>(() => initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialTabs[0]?.id ?? "tab-1");
  const [input, setInput] = useState(initialTabs[0]?.url ?? initialUrl);
  const [progress, setProgress] = useState(0);
  const [pageStates, setPageStates] = useState<BrowserPageState>(() =>
    Object.fromEntries(
      initialTabs.map((tab) => [
        tab.id,
        {
          url: tab.url,
          html: "",
          status: getFeaturedVideo(tab.url) ? ("embed" as const) : ("idle" as const),
        },
      ]),
    ),
  );

  const createNode = useWebOSStore((store) => store.createNode);
  const notify = useWebOSStore((store) => store.notify);
  const markAttention = useWebOSStore((store) => store.markAttention);
  const bumpBrowserSearch = useWebOSStore((store) => store.bumpBrowserSearch);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs],
  );

  const activePage = pageStates[activeTab.id] ?? {
    url: activeTab.url,
    html: "",
    status: "idle" as const,
  };

  const loadPage = useCallback(async (tabId: string, url: string) => {
    const featuredVideo = getFeaturedVideo(url);
    if (featuredVideo) {
      setPageStates((current) => ({
        ...current,
        [tabId]: { url, html: "", status: "embed" },
      }));
      return;
    }

    if (isShaniHomeUrl(url)) {
      setPageStates((current) => ({
        ...current,
        [tabId]: { url, html: "", status: "home" },
      }));
      return;
    }

    if (isDirectFrameUrl(url)) {
      setPageStates((current) => ({
        ...current,
        [tabId]: { url, html: "", status: "direct-frame" },
      }));
      return;
    }

    const readerUrl = buildReaderUrl(url);
    setPageStates((current) => ({
      ...current,
      [tabId]: { url, html: "", readerUrl, status: "loading" },
    }));

    try {
      const { html, finalUrl } = await fetchReaderHtml(url);
      setPageStates((current) => ({
        ...current,
        [tabId]: { url: finalUrl, html, readerUrl, status: "success" },
      }));
      setTabs((current) =>
        current.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                url: finalUrl,
                title: titleFromUrl(finalUrl),
                history: tab.history.map((entry, index) =>
                  index === tab.historyIndex ? finalUrl : entry,
                ),
              }
            : tab,
        ),
      );
      setInput((current) => (tabId === activeTabId ? finalUrl : current));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load page";
      setPageStates((current) => ({
        ...current,
        [tabId]: {
          url,
          html: "",
          readerUrl,
          status: "reader-frame",
          error: message,
        },
      }));
    }
  }, [activeTabId]);

  useEffect(() => {
    const page = pageStates[activeTab.id];
    if (page && page.url === activeTab.url && page.status !== "idle") {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadPage(activeTab.id, activeTab.url);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab.id, activeTab.url, loadPage, pageStates]);

  const setTabUrl = (tabId: string, nextUrl: string): void => {
    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== tabId) {
          return tab;
        }
        const nextHistory = tab.history.slice(0, tab.historyIndex + 1);
        nextHistory.push(nextUrl);
        return {
          ...tab,
          url: nextUrl,
          title: titleFromUrl(nextUrl),
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
        };
      }),
    );
  };

  const navigate = (value: string): void => {
    const nextUrl = normalizeInput(value);
    setInput(nextUrl);
    setTabUrl(activeTab.id, nextUrl);
    bumpBrowserSearch();
    void loadPage(activeTab.id, nextUrl);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate(input);
  };

  const goBack = (): void => {
    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== activeTab.id || tab.historyIndex <= 0) {
          return tab;
        }
        const nextIndex = tab.historyIndex - 1;
        const prevUrl = tab.history[nextIndex];
        void loadPage(tab.id, prevUrl);
        return {
          ...tab,
          historyIndex: nextIndex,
          url: prevUrl,
          title: titleFromUrl(prevUrl),
        };
      }),
    );
  };

  const goForward = (): void => {
    setTabs((current) =>
      current.map((tab) => {
        if (tab.id !== activeTab.id || tab.historyIndex >= tab.history.length - 1) {
          return tab;
        }
        const nextIndex = tab.historyIndex + 1;
        const nextUrl = tab.history[nextIndex];
        void loadPage(tab.id, nextUrl);
        return {
          ...tab,
          historyIndex: nextIndex,
          url: nextUrl,
          title: titleFromUrl(nextUrl),
        };
      }),
    );
  };

  const reload = (): void => {
    void loadPage(activeTab.id, activeTab.url);
  };

  const openNewTab = (url = HOME_URL): void => {
    const nextUrl = normalizeInput(url);
    const id = `tab-${Date.now()}`;
    setTabs((current) => [
      ...current,
      {
        id,
        title: titleFromUrl(nextUrl),
        url: nextUrl,
        history: [nextUrl],
        historyIndex: 0,
      },
    ]);
    setPageStates((current) => ({
      ...current,
      [id]: {
        url: nextUrl,
        html: "",
        status: "idle",
      },
    }));
    setActiveTabId(id);
    setInput(nextUrl);
  };

  const canDownload = useMemo(() => /\.(txt|json|md)$/i.test(activeTab.url), [activeTab.url]);

  const startDownload = (): void => {
    const filename = guessFilename(activeTab.url);
    setProgress(1);
    notify("Download Started", filename, "info", "files");
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 16);
        if (next >= 100) {
          window.clearInterval(timer);
          createNode(
            filename,
            filename.endsWith(".json") ? "json" : filename.endsWith(".md") ? "markdown" : "text",
            DOWNLOADS_FOLDER_ID,
            `Downloaded from ${activeTab.url}`,
          );
          notify("Download Complete", filename, "info", "files");
          markAttention("dock", "files", "info");
        }
        return next;
      });
    }, 120);
  };

  const openExternally = (): void => {
    const featuredVideo = getFeaturedVideo(activeTab.url);
    window.open(featuredVideo ? featuredVideo.sourceUrl : activeTab.url, "_blank", "noopener,noreferrer");
  };

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor && anchor.href) {
      event.preventDefault();
      navigate(anchor.href);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden text-[var(--text-primary)]">
      <div className="ui-glass-strong flex items-center gap-2 border-b border-[var(--panel-border)] px-2 py-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-full border border-[var(--panel-border)] px-2 py-1 disabled:opacity-40"
            onClick={goBack}
            disabled={activeTab.historyIndex <= 0}
          >
            <ArrowLeft size={12} />
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--panel-border)] px-2 py-1 disabled:opacity-40"
            onClick={goForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
          >
            <ArrowRight size={12} />
          </button>
          <button
            type="button"
            className="rounded-full border border-[var(--panel-border)] px-2 py-1"
            onClick={reload}
          >
            <RotateCcw size={12} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 ui-muted" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="w-full rounded-full border border-[var(--panel-border)] bg-[var(--panel)] px-9 py-2 text-sm outline-none"
              placeholder="Search or enter website URL"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Go
          </button>
        </form>

        <button
          type="button"
          className="rounded-full border border-[var(--panel-border)] px-3 py-2 disabled:opacity-40"
          onClick={startDownload}
          disabled={!canDownload}
        >
          <Download size={12} />
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--panel-border)] px-3 py-2"
          onClick={openExternally}
          title="Open in real browser"
        >
          <ExternalLink size={12} />
        </button>
      </div>

      <div className="ui-glass flex items-center gap-2 border-b border-[var(--panel-border)] px-2 py-2 text-[11px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTabId(tab.id);
              setInput(tab.url);
            }}
            className={`rounded-full border px-3 py-1 ${
              tab.id === activeTabId
                ? "border-cyan-300/60 bg-cyan-400/20"
                : "border-[var(--panel-border)] bg-white/10"
            }`}
          >
            {tab.title}
          </button>
        ))}
        <button
          type="button"
          onClick={() => openNewTab()}
          className="rounded-full border border-[var(--panel-border)] px-2 py-1"
        >
          <Plus size={12} />
        </button>
        <div className="ml-auto ui-muted truncate px-2">{activeTab.url}</div>
      </div>

      {progress > 0 && progress < 100 && (
        <div className="px-2 py-1 text-xs ui-muted">
          Downloading... {progress}%
          <div className="mt-1 h-1.5 rounded bg-white/20">
            <div className="h-full rounded bg-cyan-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {activePage.status === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Globe size={48} className="ui-muted opacity-30" />
            <div>
              <p className="text-sm font-medium">Enter a URL to browse</p>
              <p className="mt-1 text-xs ui-muted">
                Sites open in reader-friendly mode so the Web OS browser can still work
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {["https://news.ycombinator.com", ...STARTER_TABS.map((tab) => tab.url)].map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => navigate(url)}
                  className="rounded-full border border-[var(--panel-border)] px-3 py-1 hover:bg-white/10"
                >
                  {titleFromUrl(url)}
                </button>
              ))}
            </div>
          </div>
        )}

        {activePage.status === "home" && (
          <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(255,130,70,0.18),transparent_24%),linear-gradient(180deg,rgba(11,16,28,0.98),rgba(6,10,18,0.98))]">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <HomeIcon size={30} />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Shani OS</p>
                  <p className="text-[11px] ui-muted">About Shani Dev and the developer behind this build</p>
                </div>
              </div>
            </div>
            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Beginning</p>
                <h1 className="mt-3 text-3xl font-semibold text-white">About Shani Dev</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
                  Shani Dev represents focus, discipline, and steady progress, which is the tone behind this system.
                  Shani OS is built as a polished browser desktop that keeps your workspace, portfolio, and tools in one place.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => navigate(PORTFOLIO_URL)}
                    className="rounded-full border border-cyan-200/35 bg-cyan-300/18 px-4 py-2 font-medium text-cyan-50 hover:bg-cyan-300/28"
                  >
                    Open my website
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("https://wikipedia.org")}
                    className="rounded-full border border-white/14 bg-white/8 px-4 py-2 font-medium text-white/88 hover:bg-white/14"
                  >
                    Browse the web
                  </button>
                </div>
              </section>

              <aside className="rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">Developer</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Priyant Banerjee</h2>
                <p className="mt-4 text-sm leading-7 text-white/76">
                  I build interface-driven web apps and desktop-style experiences with a focus on elegance, clarity,
                  and useful interactions. This site links my browser workspace to the portfolio so visitors can move
                  between the system and my work quickly.
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/16 p-4 text-xs text-white/72">
                  <p className="font-medium text-white/90">Linked website</p>
                  <p className="mt-2 break-all text-cyan-200">{PORTFOLIO_URL}</p>
                </div>
              </aside>
            </div>
          </div>
        )}

        {activePage.status === "embed" && (
          <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,rgba(0,255,200,0.12),transparent_40%),linear-gradient(180deg,rgba(18,20,24,0.96),rgba(5,7,10,0.98))]">
            <div className="border-b border-[var(--panel-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{titleFromUrl(activeTab.url)}</p>
              <p className="mt-1 text-[11px] ui-muted">{getFeaturedVideo(activeTab.url)?.description ?? "Pinned music page for the Shani OS browser home screen."}</p>
            </div>
            <div className="flex-1 p-4">
              <div className="mx-auto flex h-full max-w-5xl flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
                  <div className="aspect-video w-full">
                    <iframe
                      src={getFeaturedVideo(activeTab.url)?.embedUrl ?? BILLIE_JEAN_EMBED_URL}
                      title={titleFromUrl(activeTab.url)}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs ui-muted">
                  Use the address bar any time to open another site, or switch tabs to jump between the starter sites and your about page.
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage.status === "direct-frame" && (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2 text-[11px] ui-muted">
              <ExternalLink size={12} className="text-cyan-300" />
              <span>Showing the live site directly instead of reader mode.</span>
            </div>
            <iframe
              key={activePage.url}
              src={activePage.url}
              title={activeTab.title}
              className="h-full w-full border-0 bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="eager"
            />
          </div>
        )}

        {activePage.status === "loading" && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-cyan-400" />
            <p className="text-sm ui-muted">Loading reader view for {titleFromUrl(activeTab.url)}...</p>
          </div>
        )}

        {activePage.status === "reader-frame" && activePage.readerUrl && (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2 text-[11px] ui-muted">
              <AlertTriangle size={12} className="text-amber-400" />
              <span>Inline reader fetch was blocked, so this page is loading in hosted reader view.</span>
            </div>
            <iframe
              key={activePage.readerUrl}
              src={activePage.readerUrl}
              title={activeTab.title}
              className="h-full w-full border-0 bg-white"
            />
          </div>
        )}

        {activePage.status === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <AlertTriangle size={40} className="text-amber-400" />
            <div>
              <p className="text-sm font-medium">Could not load page</p>
              <p className="mt-1 text-xs ui-muted">{activePage.error}</p>
            </div>
            <button
              type="button"
              onClick={openExternally}
              className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] px-4 py-2 text-xs hover:bg-white/10"
            >
              <ExternalLink size={12} />
              Open in browser instead
            </button>
          </div>
        )}

        {activePage.status === "success" && (
          <div
            className="max-w-none p-4 text-sm"
            style={{
              color: "var(--text-primary)",
              lineHeight: 1.7,
            }}
            dangerouslySetInnerHTML={{ __html: activePage.html }}
            onClick={handleContentClick}
          />
        )}
      </div>

      <div className="ui-glass flex items-center gap-2 border-t border-[var(--panel-border)] px-3 py-1 text-[10px] ui-muted">
        <BookOpen size={10} />
        <span>Reader web view</span>
        <span className="mx-1">.</span>
        <span>Links navigate in-app</span>
        <button
          type="button"
          onClick={openExternally}
          className="ml-auto flex items-center gap-1 hover:text-cyan-300"
        >
          <ExternalLink size={10} />
          Open source page
        </button>
      </div>
    </div>
  );
};
