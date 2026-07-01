"use client";

import { FormEvent, useMemo, useState } from "react";
import { useWebOSStore } from "@/store/webos-store";
import { ROOT_FOLDER_ID } from "@/utils/constants";
import { AppType } from "@/utils/types";
import { CODE_TEMPLATES, getCodeTemplate } from "@/utils/code-templates";

interface TerminalAppProps {
  folderId: string;
}

interface OutputLine {
  id: string;
  text: string;
}

const terminalHelp = [
  "help",
  "ls",
  "tree",
  "pwd",
  "cat <file>",
  "touch <name>",
  "template <id>",
  "mkdir <name>",
  "rm <name>",
  "open <app|file>",
  "theme <dark|light|toggle>",
  "search <query>",
  "scan",
  "clip <text>",
  "desktop list",
  "desktop new",
  "desktop switch <id>",
  "date",
  "echo <text>",
  "clear",
];

export const TerminalApp = ({ folderId }: TerminalAppProps) => {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<OutputLine[]>([{ id: "init", text: "WebOS Terminal v1.0 - type 'help'" }]);

  const nodes = useWebOSStore((store) => store.state.nodes);
  const desktops = useWebOSStore((store) => store.state.desktops);
  const activeDesktopId = useWebOSStore((store) => store.state.activeDesktopId);
  const themeMode = useWebOSStore((store) => store.state.settings.themeMode);
  const createNode = useWebOSStore((store) => store.createNode);
  const deleteNode = useWebOSStore((store) => store.deleteNode);
  const openApp = useWebOSStore((store) => store.openApp);
  const openAssociatedNode = useWebOSStore((store) => store.openAssociatedNode);
  const addClipboardItem = useWebOSStore((store) => store.addClipboardItem);
  const addDesktop = useWebOSStore((store) => store.addDesktop);
  const switchDesktop = useWebOSStore((store) => store.switchDesktop);
  const applyTheme = useWebOSStore((store) => store.applyTheme);
  const scanFiles = useWebOSStore((store) => store.scanFiles);

  const localNodes = useMemo(
    () => nodes.filter((node) => node.parentId === folderId),
    [nodes, folderId],
  );

  const localNodeMap = useMemo(
    () => new Map(localNodes.map((node) => [node.name.toLowerCase(), node])),
    [localNodes],
  );

  const print = (text: string): void => {
    setLines((current) => [...current, { id: `${Date.now()}-${current.length}`, text }]);
  };

  const printTree = (parentId: string, indent = ""): void => {
    nodes
      .filter((node) => node.parentId === parentId)
      .forEach((node) => {
        print(`${indent}${node.name}`);
        if (node.kind === "folder") {
          printTree(node.id, `${indent}  `);
        }
      });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();

    if (!value) {
      return;
    }

    print(`$ ${value}`);

    const [command, ...parts] = value.split(" ");
    const arg = parts.join(" ").trim();

    switch (command) {
      case "help":
        print(`Commands: ${terminalHelp.join(", ")}`);
        break;
      case "ls":
        print(localNodes.map((node) => node.name).join("  ") || "(empty)");
        break;
      case "tree":
        printTree(folderId);
        break;
      case "pwd":
        print(folderId === ROOT_FOLDER_ID ? "/" : `/${folderId}`);
        break;
      case "cat": {
        const file = localNodeMap.get(arg.toLowerCase());
        print(file ? file.content || "(empty file)" : "file not found");
        break;
      }
      case "touch": {
        const fileName = arg;
        if (!fileName) {
          print("usage: touch <name>");
          break;
        }

        createNode(fileName, fileName.endsWith(".json") ? "json" : fileName.endsWith(".md") ? "markdown" : "text", folderId);
        print(`created file ${fileName}`);
        break;
      }
      case "template": {
        if (!arg) {
          print(`usage: template <${CODE_TEMPLATES.map((template) => template.id).join("|")}>`);
          break;
        }

        const template = getCodeTemplate(arg.toLowerCase());
        if (!template) {
          print("template not found");
          break;
        }

        createNode(template.filename, template.filename.endsWith(".json") ? "json" : template.filename.endsWith(".md") ? "markdown" : "text", folderId, template.content);
        print(`created ${template.filename} from ${template.id} template`);
        break;
      }
      case "mkdir": {
        const folderName = parts.join(" ");
        if (!folderName) {
          print("usage: mkdir <name>");
          break;
        }

        createNode(folderName, "folder", folderId);
        print(`created folder ${folderName}`);
        break;
      }
      case "rm": {
        if (!arg) {
          print("usage: rm <name>");
          break;
        }
        const target = localNodeMap.get(arg.toLowerCase());
        if (!target) {
          print("file not found");
          break;
        }
        deleteNode(target.id);
        print(`deleted ${target.name}`);
        break;
      }
      case "open": {
        if (!arg) {
          print("usage: open <app|file>");
          break;
        }
        const appName = arg.toLowerCase() as AppType;
        if (["files", "editor", "terminal", "browser", "notes", "photos", "calendar", "calculator", "devhub", "taskmanager", "settings", "security"].includes(appName)) {
          openApp(appName);
          print(`opened ${appName}`);
          break;
        }
        const target = localNodeMap.get(arg.toLowerCase());
        if (target) {
          openAssociatedNode(target.id);
          print(`opened ${target.name}`);
          break;
        }
        print("unknown target");
        break;
      }
      case "theme": {
        if (!arg || arg === "toggle") {
          applyTheme(themeMode === "dark" ? "light" : "dark");
          print(`theme set to ${themeMode === "dark" ? "light" : "dark"}`);
          break;
        }
        if (arg === "dark" || arg === "light") {
          applyTheme(arg);
          print(`theme set to ${arg}`);
          break;
        }
        print("usage: theme <dark|light|toggle>");
        break;
      }
      case "search": {
        if (!arg) {
          print("usage: search <query>");
          break;
        }
        openApp("browser", { launchUrl: `https://duckduckgo.com/?q=${encodeURIComponent(arg)}` });
        print(`searching web for ${arg}`);
        break;
      }
      case "scan": {
        const findings = scanFiles();
        const risky = findings.filter((item) => item.status !== "safe");
        print(`scan complete: ${findings.length} checked, ${risky.length} flagged`);
        risky.forEach((item) => print(`- ${item.id}: ${item.status} (${item.reason})`));
        break;
      }
      case "desktop": {
        if (arg === "list") {
          print(desktops.map((desktop) => `${desktop.id}${desktop.id === activeDesktopId ? " *" : ""}`).join("  "));
          break;
        }
        if (arg === "new") {
          addDesktop();
          print("new desktop created");
          break;
        }
        if (arg.startsWith("switch ")) {
          const nextId = arg.replace("switch ", "").trim();
          switchDesktop(nextId);
          print(`switched to ${nextId}`);
          break;
        }
        print("usage: desktop list|new|switch <id>");
        break;
      }
      case "echo":
        print(arg || "");
        break;
      case "date":
        print(new Date().toString());
        break;
      case "clip":
        addClipboardItem(arg);
        print(arg ? `copied to clipboard history: ${arg}` : "usage: clip <text>");
        break;
      case "clear":
        setLines([]);
        break;
      default:
        print(`unknown command: ${command}`);
    }

    setInput("");
  };

  return (
    <div className="ui-glass flex h-full flex-col rounded-b-2xl border p-3 font-mono text-xs text-[var(--text-primary)]">
      <div className="flex-1 overflow-auto">
        {lines.map((line) => (
          <div key={line.id} className="mb-1 whitespace-pre-wrap">
            {line.text}
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-2 flex items-center gap-2 border-t border-[var(--panel-border)] pt-2">
        <span>$</span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="w-full bg-transparent outline-none"
        />
      </form>
    </div>
  );
};
