<template>
  <section class="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-slate-950/90 p-4 text-slate-100 shadow-2xl shadow-slate-950/40">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">Debug Panel</p>
        <h2 class="mt-1 text-lg font-semibold text-white">Simulation Notes</h2>
      </div>
      <span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Placeholder</span>
    </div>

    <label class="block text-sm font-medium text-slate-300" for="debug-panel-input">
      Notes
    </label>
    <textarea
      id="debug-panel-input"
      class="mt-2 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
      placeholder="Add simulation notes here"
    ></textarea>

    <button
      class="mt-4 inline-flex items-center rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
      type="button"
    >
      Debug Action
    </button>
  </section>
</template>
