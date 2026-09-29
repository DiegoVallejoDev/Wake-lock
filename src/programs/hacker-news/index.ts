import type { ProgramDefinition } from "@/shell/types";
import HackerNewsApp from "./HackerNewsApp";

export const hackerNews: ProgramDefinition = {
  id: "hacker-news",
  title: "Hacker News",
  icon: "/icons/news.png",
  defaultPosition: { x: 200, y: 120 },
  defaultSize: { width: 400 },
  component: HackerNewsApp,
};
