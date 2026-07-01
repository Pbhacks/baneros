"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-white/80">Shani OS recovered safely. You can reload this view.</p>
      <button
        type="button"
        className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900"
        onClick={reset}
      >
        Retry
      </button>
    </main>
  );
}
