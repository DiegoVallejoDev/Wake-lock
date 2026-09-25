"use client";

import { useEffect, useRef, useState } from "react";
import { useWindowManager } from "@/shell/windowManager";
import { defaultPosition, programs } from "@/programs";
import styles from "./MsDosApp.module.css";

const ID = "ms-dos";
const BANNER = [
  "Retro Web Inc DOS 95",
  "(C)Copyright Retro Web Inc 2026.",
  "",
  "Type HELP for commands.",
  "",
];

function resolveProgram(arg: string) {
  const q = arg.toLowerCase();
  return programs.find(
    (p) => p.id === q || p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === q,
  );
}

export default function MsDosApp() {
  const wm = useWindowManager();
  const [lines, setLines] = useState<string[]>(BANNER);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const print = (out: string[]) => setLines((prev) => [...prev, ...out]);

  const run = (raw: string) => {
    const input = raw.trim();
    print([`C:\\>${input}`]);
    if (!input) return;
    setHistory((h) => [...h, input]);
    setHistIndex(-1);

    const [cmd, ...rest] = input.split(/\s+/);
    const args = rest.join(" ");
    switch (cmd.toLowerCase()) {
      case "help":
        print([
          "Commands:",
          "  DIR          List installed programs",
          "  START <name> Launch a program (e.g. start notepad)",
          "  VER          Show version",
          "  ECHO <text>  Print text",
          "  TIME / DATE  Show the time or date",
          "  CLS          Clear the screen",
          "  EXIT         Close this window",
        ]);
        break;
      case "dir": {
        const rows = programs.map((p) => `  ${p.id.toUpperCase().padEnd(14)} ${p.title}`);
        print([" Directory of C:\\PROGRAMS", "", ...rows, "", `        ${programs.length} program(s)`]);
        break;
      }
      case "ver":
        print(["Retro Web Inc DOS [Version 95.0.22222]"]);
        break;
      case "echo":
        print([args]);
        break;
      case "time":
        print([`Current time: ${new Date().toLocaleTimeString()}`]);
        break;
      case "date":
        print([`Current date: ${new Date().toLocaleDateString()}`]);
        break;
      case "cls":
        setLines([]);
        break;
      case "exit":
        wm.close(ID);
        break;
      case "start": {
        if (!args) {
          print(["Required parameter missing: START <name>"]);
          break;
        }
        const program = resolveProgram(args);
        if (!program) {
          print([`Bad command or file name: ${args}`]);
          break;
        }
        wm.open(program.id, defaultPosition(program));
        print([`Starting ${program.title}...`]);
        break;
      }
      default:
        print([`Bad command or file name: ${cmd}`]);
    }
  };

  return (
    <div
      className={styles.screen}
      role="application"
      aria-label="MS-DOS Prompt"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={screenRef} className={styles.scroll}>
        {lines.map((line, i) => (
          <div key={i} className={styles.line}>
            {line}
          </div>
        ))}
      </div>
      <form
        className={styles.prompt}
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
          setValue("");
        }}
      >
        <span className={styles.line}>C:\\&gt;</span>
        <input
          ref={inputRef}
          className={styles.input}
          aria-label="Command input"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && history.length) {
              e.preventDefault();
              const next = histIndex < 0 ? history.length - 1 : Math.max(0, histIndex - 1);
              setHistIndex(next);
              setValue(history[next]);
            } else if (e.key === "ArrowDown" && histIndex >= 0) {
              e.preventDefault();
              const next = histIndex + 1;
              if (next >= history.length) {
                setHistIndex(-1);
                setValue("");
              } else {
                setHistIndex(next);
                setValue(history[next]);
              }
            }
          }}
        />
      </form>
    </div>
  );
}
