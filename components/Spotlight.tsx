"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { workerSearch } from "@/lib/search";
import { useWebOSStore } from "@/store/webos-store";
import { APP_DESCRIPTIONS, APP_GROUPS, APP_LABELS } from "@/utils/constants";
import { APP_ICON_MAP } from "@/utils/icons";
import { AppType, SearchItem, SearchResult } from "@/utils/types";

const appSections: Array<"Work" | "Media" | "Developer" | "System"> = ["Work", "Media", "Developer", "System"];

const LaunchpadPanel = ({ closeSearch }: { closeSearch: () => void }) => {
  const getSearchItems = useWebOSStore((store) => store.getSearchItems);
  const openApp = useWebOSStore((store) => store.openApp);
  const setActiveFolder = useWebOSStore((store) => store.setActiveFolder);
  const openAssociatedNode = useWebOSStore((store) => store.openAssociatedNode);
  const executeAction = useWebOSStore((store) => store.executeAction);
  const recentApps = useWebOSStore((store) => store.state.recentApps);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<SearchItem[]>(() => getSearchItems(query), [getSearchItems, query]);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const appItems = useMemo(
    () =>
      items
        .filter((item): item is SearchItem & { app: AppType } => item.kind === "app" && Boolean(item.app))
        .sort((a, b) => APP_LABELS[a.app].localeCompare(APP_LABELS[b.app])),
    [items],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSearch]);

  const onQueryChange = (value: string): void => {
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      setActiveIndex(0);
      return;
    }

    workerSearch(value, getSearchItems(value)).then((next) => {
      setResults(next);
      setActiveIndex(0);
    });
  };

  const orderedResults = results
    .map((result) => itemMap.get(result.id))
    .filter((item): item is SearchItem => Boolean(item));

  const runResult = (item: SearchItem): void => {
    if (item.kind === "action" && item.action) {
      executeAction(item.action, item.payload);
      closeSearch();
      return;
    }

    if (item.kind === "app" && item.app) {
      openApp(item.app, { folderId: item.folderId });
      closeSearch();
      return;
    }

    if (item.kind === "folder" && item.folderId) {
      setActiveFolder(item.folderId);
      openApp("files", { folderId: item.folderId });
      closeSearch();
      return;
    }

    if (item.kind === "file" && item.fileId) {
      openAssociatedNode(item.fileId);
      closeSearch();
    }
  };

  const filteredApps = (query.trim() ? orderedResults : appItems).filter(
    (item): item is SearchItem & { app: AppType } => item.kind === "app" && Boolean(item.app),
  );
  const nonAppResults = orderedResults.filter((item) => item.kind !== "app");
  const suggestedApps = recentApps.length
    ? appItems.filter((item) => item.app && recentApps.includes(item.app)).slice(0, 5)
    : appItems.slice(0, 5);
  const quickActions = items.filter((item) => item.kind === "action").slice(0, 4);

  const sections = appSections
    .map((group) => ({
      group,
      items: filteredApps.filter((item) => APP_GROUPS[item.app] === group),
    }))
    .filter((section) => section.items.length > 0);

  const keyboardItems = query.trim()
    ? [...filteredApps, ...nonAppResults]
    : [
        ...suggestedApps,
        ...sections
          .flatMap((section) => section.items)
          .filter((item) => !suggestedApps.some((suggested) => suggested.id === item.id)),
      ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
      transition={{ duration: 0.22 }}
      onClick={(event) => event.stopPropagation()}
      className="flex h-full flex-col px-8 pb-8 pt-[4.5rem]"
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-full border border-white/14 bg-white/10 px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <Search size={18} className="text-white/60" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoFocus
            placeholder="Search apps, commands, or files"
            className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/38"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) => (keyboardItems.length ? (current + 1) % keyboardItems.length : 0));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) =>
                  keyboardItems.length ? (current - 1 + keyboardItems.length) % keyboardItems.length : 0,
                );
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const item = keyboardItems[activeIndex];
                if (item) {
                  runResult(item);
                }
              }
            }}
          />
        </div>

        <div className="mt-4 text-center text-sm text-white/50">
          Big-screen app searcher for your desktop. Scroll the grid, launch apps, or search files and actions.
        </div>
      </div>

      <div className="mx-auto mt-8 flex min-h-0 w-full max-w-6xl flex-1 gap-6 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto pr-2">
          {!query.trim() && suggestedApps.length > 0 && (
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-white/55">
                <Sparkles size={14} />
                Suggested
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {suggestedApps.map((item, index) => {
                  const Icon = APP_ICON_MAP[item.app];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => runResult(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`rounded-[30px] border border-white/10 bg-white/[0.06] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
                        keyboardItems[activeIndex]?.id === item.id ? "ring-2 ring-cyan-200/50" : ""
                      }`}
                    >
                      <Icon size={72} />
                      <div className="mt-4 text-base font-semibold text-white">{APP_LABELS[item.app]}</div>
                      <div className="mt-1 text-sm text-white/55">{APP_DESCRIPTIONS[item.app]}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {sections.map((section) => (
            <section key={section.group} className="mb-8">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-white/55">
                {section.group}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {section.items.map((item) => {
                  const Icon = APP_ICON_MAP[item.app];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => runResult(item)}
                      onMouseEnter={() => {
                        const index = keyboardItems.findIndex((entry) => entry.id === item.id);
                        if (index >= 0) {
                          setActiveIndex(index);
                        }
                      }}
                      className={`rounded-[30px] border border-white/10 bg-white/[0.05] p-4 text-left ${
                        keyboardItems[activeIndex]?.id === item.id ? "ring-2 ring-cyan-200/50" : ""
                      }`}
                    >
                      <Icon size={68} />
                      <div className="mt-4 text-base font-semibold text-white">{APP_LABELS[item.app]}</div>
                      <div className="mt-1 text-sm text-white/50">{APP_DESCRIPTIONS[item.app]}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {query.trim() && filteredApps.length === 0 && nonAppResults.length === 0 && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] px-5 py-10 text-center text-white/55">
              No apps, files, or actions matched your search.
            </div>
          )}
        </div>

        <aside className="hidden w-[320px] min-h-0 overflow-auto rounded-[34px] border border-white/10 bg-white/[0.06] p-5 xl:block">
          <div className="text-sm font-semibold uppercase tracking-[0.28em] text-white/55">
            Quick Actions
          </div>
          <div className="mt-4 space-y-3">
            {quickActions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => runResult(item)}
                className="w-full rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 text-left"
              >
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/40">{item.kind}</div>
              </button>
            ))}
            {nonAppResults.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => runResult(item)}
                className={`w-full rounded-[24px] border px-4 py-4 text-left ${
                  keyboardItems[activeIndex]?.id === item.id
                    ? "border-cyan-200/50 bg-cyan-300/14"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.24em] text-white/40">{item.group}</div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </motion.div>
  );
};

export const Spotlight = () => {
  const searchOpen = useWebOSStore((store) => store.searchOpen);
  const toggleSearch = useWebOSStore((store) => store.toggleSearch);

  const closeSearch = useCallback((): void => {
    toggleSearch(false);
  }, [toggleSearch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.code === "Space") {
        event.preventDefault();
        toggleSearch(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSearch]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-[radial-gradient(circle_at_top,rgba(101,191,255,0.22),transparent_24%),radial-gradient(circle_at_bottom,rgba(49,110,255,0.18),transparent_28%),rgba(6,10,22,0.78)]"
          onClick={closeSearch}
        >
          <LaunchpadPanel closeSearch={closeSearch} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
