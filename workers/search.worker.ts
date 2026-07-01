import { SearchItem, SearchResult } from "@/utils/types";

interface WorkerRequest {
  id: string;
  query: string;
  items: SearchItem[];
}

interface WorkerResponse {
  id: string;
  results: SearchResult[];
}

const normalize = (value: string): string => value.toLowerCase().trim();

const fuzzyScore = (query: string, target: string): number => {
  if (!query) {
    return 0;
  }

  const q = normalize(query);
  const t = normalize(target);

  if (t.includes(q)) {
    return q.length / t.length + 1;
  }

  let score = 0;
  let qIndex = 0;

  for (let i = 0; i < t.length && qIndex < q.length; i += 1) {
    if (t[i] === q[qIndex]) {
      score += 1;
      qIndex += 1;
    }
  }

  return qIndex === q.length ? score / t.length : 0;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, query, items } = event.data;

  const scored = items
    .map((item) => ({
      id: item.id,
      score: fuzzyScore(query, item.label),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const response: WorkerResponse = {
    id,
    results: scored,
  };

  self.postMessage(response);
};
