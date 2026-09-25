"use client";

import { useEffect, useState } from "react";
import styles from "./TodoApp.module.css";

const STORAGE_KEY = "todos";

interface Todo {
  text: string;
  done: boolean;
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) setTodos(JSON.parse(data));
      } catch {
        /* corrupted storage — start empty */
      }
    });
  }, []);

  const save = (next: Todo[]) => {
    setTodos(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const add = () => {
    const text = input.trim();
    if (!text) return;
    save([...todos, { text, done: false }]);
    setInput("");
  };

  const toggle = (index: number) => {
    if (index < 0 || index >= todos.length) return;
    save(todos.map((t, i) => (i === index ? { ...t, done: !t.done } : t)));
  };

  const remove = (index: number) => {
    if (index < 0 || index >= todos.length) return;
    save(todos.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="field-row" style={{ gap: 8 }}>
        <input
          type="text"
          placeholder="New task..."
          aria-label="New task"
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button onClick={add}>Add</button>
      </div>
      <ul className={styles.list} role="list">
        {todos.map((todo, index) => (
          <li
            key={index}
            role="listitem"
            className={todo.done ? styles.done : ""}
          >
            <input
              type="checkbox"
              checked={todo.done}
              aria-label={`Mark ${todo.text} as ${todo.done ? "incomplete" : "complete"}`}
              onChange={() => toggle(index)}
            />
            <span>{todo.text}</span>
            <button
              type="button"
              aria-label={`Delete ${todo.text}`}
              onClick={() => remove(index)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
