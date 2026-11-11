<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  onMount(() => {
    goto("/statistik-p3k?tipe=paruh-waktu", { replaceState: true });
  });
</script>

<svelte:head>
  <title>Mengarahkan ke Statistik P3K...</title>
</svelte:head>

<div class="max-w-md mx-auto my-20 p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs space-y-3">
  <div class="w-10 h-10 mx-auto rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center animate-spin">
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  </div>
  <p class="text-sm font-semibold text-slate-700">Mengarahkan ke Halaman Statistik P3K...</p>
  <p class="text-xs text-slate-400">Statistik Penuh Waktu dan Paruh Waktu kini telah digabung dalam satu menu terpadu.</p>
</div>
