"use client";

import { Braces, FolderOpen, Rocket, TerminalSquare } from "lucide-react";
import { useWebOSStore } from "@/store/webos-store";
import { getCodeTemplate } from "@/utils/code-templates";
import { PROJECTS_FOLDER_ID } from "@/utils/constants";
import { FileKind } from "@/utils/types";

const extToKind = (name: string): FileKind => {
  const lower = name.toLowerCase();
  if (lower.endsWith(".json")) {
    return "json";
  }
  if (lower.endsWith(".md")) {
    return "markdown";
  }
  return "text";
};

const tracks = [
  {
    title: "React Component",
    template: "react",
    description: "Start a UI widget with TypeScript props and clean structure.",
  },
  {
    title: "Python Starter",
    template: "python",
    description: "Kick off scripts and automation ideas quickly.",
  },
  {
    title: "C++ Console App",
    template: "cpp",
    description: "Begin a native-style console project with a small main program.",
  },
  {
    title: "Java Starter",
    template: "java",
    description: "Create a classic Java entry point with minimal boilerplate.",
  },
];

export const DevHubApp = () => {
  const createNode = useWebOSStore((store) => store.createNode);
  const openApp = useWebOSStore((store) => store.openApp);
  const setActiveFolder = useWebOSStore((store) => store.setActiveFolder);
  const notify = useWebOSStore((store) => store.notify);

  const createStarter = (templateId: string) => {
    const template = getCodeTemplate(templateId);
    if (!template) {
      notify("Starter Missing", "That code starter is not available.", "warning", "files");
      return;
    }

    createNode(template.filename, extToKind(template.filename), PROJECTS_FOLDER_ID, template.content);
    setActiveFolder(PROJECTS_FOLDER_ID);
    notify("Starter Added", `${template.filename} was added to Projects.`, "info", "files");
  };

  return (
    <div className="ui-glass h-full rounded-b-2xl border-0 p-4 text-[var(--text-primary)]">
      <div className="grid h-full min-h-0 grid-cols-[1.15fr_0.85fr] gap-4">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Code Studio</div>
          <h2 className="mt-2 text-3xl font-semibold text-white">Developer quick start</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Create starter files for popular languages, jump into Files or Terminal, and keep your coding tools close to the desktop.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {tracks.map((track) => (
              <div
                key={track.template}
                className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-sky-300 to-indigo-500 p-3 text-slate-950">
                    <Braces size={18} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">{track.title}</div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/40">{track.template}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-white/60">{track.description}</p>
                <button
                  type="button"
                  onClick={() => createStarter(track.template)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/90"
                >
                  <Rocket size={14} />
                  Create Starter
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="text-xs uppercase tracking-[0.32em] text-white/45">Workspace Shortcuts</div>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setActiveFolder(PROJECTS_FOLDER_ID);
                openApp("files", { folderId: PROJECTS_FOLDER_ID });
              }}
              className="flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-left"
            >
              <span className="rounded-2xl bg-gradient-to-br from-cyan-300 to-sky-500 p-3 text-slate-950">
                <FolderOpen size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">Open Projects</span>
                <span className="block text-xs text-white/55">Jump straight to your code workspace.</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => openApp("terminal", { folderId: PROJECTS_FOLDER_ID })}
              className="flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-left"
            >
              <span className="rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-500 p-3 text-slate-950">
                <TerminalSquare size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">Open Terminal</span>
                <span className="block text-xs text-white/55">Use `template react`, `template cpp`, or `template java`.</span>
              </span>
            </button>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/65">
            This is the dedicated coding area for the web OS. It works with the existing Editor, Terminal, Files, uploads, and the starter templates you asked for.
          </div>
        </aside>
      </div>
    </div>
  );
};
