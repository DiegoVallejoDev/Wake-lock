"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { parseMarkdown } from "./markdown";
import styles from "./NotepadApp.module.css";

const STORAGE_KEY = "notepad-content";

export default function NotepadApp() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
    });
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, textareaRef.current?.value ?? "");
  };

  const clear = () => {
    setText("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const download = () => {
    const blob = new Blob([textareaRef.current?.value ?? ""], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const togglePreview = () => {
    if (!preview) {
      const content = textareaRef.current?.value ?? "";
      if (DOMPurify.isSupported) {
        setPreviewHtml(
          DOMPurify.sanitize(parseMarkdown(content), {
            USE_PROFILES: { html: true },
            ADD_ATTR: ["target"],
          }),
        );
      } else {
        setPreviewHtml("");
      }
    }
    setPreview(!preview);
  };

  return (
    <div className={styles.body}>
      <textarea
        ref={textareaRef}
        className={styles.content}
        placeholder="Type your notes here..."
        aria-label="Notes"
        value={text}
        hidden={preview}
        onChange={(e) => setText(e.target.value)}
      />
      {preview &&
        (previewHtml ? (
          <div
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <div className={styles.preview}>
            <pre>{text}</pre>
          </div>
        ))}
      <div className={`field-row ${styles.actions}`}>
        <button aria-pressed={preview} onClick={togglePreview}>
          {preview ? "Edit" : "Preview"}
        </button>
        <button onClick={clear}>Clear</button>
        <button onClick={save}>Save</button>
        <button className="default" onClick={download}>
          Download
        </button>
      </div>
    </div>
  );
}
