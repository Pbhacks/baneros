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

let worker: Worker | null = null;

const ensureWorker = (): Worker | null => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!worker) {
    worker = new Worker(new URL("../workers/search.worker.ts", import.meta.url));
  }

  return worker;
};

export const workerSearch = (
  query: string,
  items: SearchItem[],
): Promise<SearchResult[]> => {
  const currentWorker = ensureWorker();

  if (!currentWorker) {
    return Promise.resolve([]);
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return new Promise((resolve) => {
    const listener = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) {
        return;
      }

      currentWorker.removeEventListener("message", listener);
      resolve(event.data.results);
    };

    currentWorker.addEventListener("message", listener);

    const payload: WorkerRequest = {
      id,
      query,
      items,
    };

    currentWorker.postMessage(payload);
  });
};
