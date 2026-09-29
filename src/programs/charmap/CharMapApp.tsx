"use client";

import { useState } from "react";
import { CHARMAP_GROUPS, codePointLabel } from "./charmap";
import styles from "./CharMapApp.module.css";

/** Windows charmap clone: pick a glyph, enlarge it, copy it. */
export default function CharMapApp() {
  const [group, setGroup] = useState(0);
  const [picked, setPicked] = useState("©");
  const [copied, setCopied] = useState(false);

  const copy = async (char: string) => {
    try {
      await navigator.clipboard.writeText(char);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.top}>
        <label className={styles.groupLabel}>
          Group:
          <select value={group} onChange={(e) => setGroup(Number(e.target.value))}>
            {CHARMAP_GROUPS.map((g, i) => (
              <option key={g.name} value={i}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.grid} aria-label={CHARMAP_GROUPS[group].name}>
        {CHARMAP_GROUPS[group].chars.map((c) => (
          <button
            key={c}
            className={`${styles.cell} ${c === picked ? styles.sel : ""}`}
            onClick={() => setPicked(c)}
            onDoubleClick={() => void copy(c)}
            aria-label={`Character ${c} ${codePointLabel(c)}`}
            aria-pressed={c === picked}
          >
            {c}
          </button>
        ))}
      </div>
      <div className={styles.preview}>
        <div className={styles.glyph}>{picked}</div>
        <div className={styles.code}>{codePointLabel(picked)}</div>
        <button className={styles.copyBtn} onClick={() => void copy(picked)}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className={styles.hint}>Double-click a character to copy it.</div>
    </div>
  );
}
