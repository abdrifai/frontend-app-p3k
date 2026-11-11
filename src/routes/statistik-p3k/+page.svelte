<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { addToast } from "$lib/toastStore";
  import StatistikPenuhWaktuView from "$lib/components/StatistikPenuhWaktuView.svelte";
  import StatistikParuhWaktuView from "$lib/components/StatistikParuhWaktuView.svelte";

  let activeType = "penuh-waktu";

  // Sync activeType with URL query parameter `?tipe=...`
  $: {
    const tipeParam = $page.url.searchParams.get("tipe");
    if (tipeParam === "paruh-waktu") {
      activeType = "paruh-waktu";
    } else if (tipeParam === "penuh-waktu" || !tipeParam) {
      activeType = "penuh-waktu";
    }
  }

  function setType(type) {
    if (activeType === type) return;
    activeType = type;
    const url = new URL(window.location.href);
    url.searchParams.set("tipe", type);
    goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
  }

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
    }
  });
</script>

<svelte:head>
  <title>
    {activeType === 'paruh-waktu' ? 'Statistik PPPK Paruh Waktu' : 'Statistik PPPK Penuh Waktu'} — SIPPPK
  </title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Unified Header & Segmented Switcher -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
    <div class="flex items-center gap-3">
      <div
        class="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-all duration-300 {activeType === 'paruh-waktu'
          ? 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/20'
          : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/20'}"
      >
        {#if activeType === 'paruh-waktu'}
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        {:else}
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        {/if}
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            {activeType === 'paruh-waktu' ? 'Statistik PPPK Paruh Waktu' : 'Statistik PPPK Penuh Waktu'}
          </h1>
          <span
            class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all {activeType === 'paruh-waktu'
              ? 'bg-violet-100 text-violet-700 border-violet-200'
              : 'bg-blue-100 text-blue-700 border-blue-200'}"
          >
            {activeType === 'paruh-waktu' ? 'Paruh Waktu' : 'Penuh Waktu'}
          </span>
        </div>
        <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
          {activeType === 'paruh-waktu'
            ? 'Analisis demografi, distribusi formasi, dan sebaran data pegawai PPPK Paruh Waktu.'
            : 'Ringkasan data pegawai PPPK berstatus aktif yang terdaftar di Data Utama.'}
        </p>
      </div>
    </div>

    <!-- Segmented Tab Switcher -->
    <div class="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner shrink-0 self-start sm:self-center">
      <button
        type="button"
        onclick={() => setType('penuh-waktu')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeType === 'penuh-waktu'
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}"
      >
        <span class="w-2 h-2 rounded-full {activeType === 'penuh-waktu' ? 'bg-white' : 'bg-slate-300'}"></span>
        P3K Penuh Waktu
      </button>

      <button
        type="button"
        onclick={() => setType('paruh-waktu')}
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer {activeType === 'paruh-waktu'
          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}"
      >
        <span class="w-2 h-2 rounded-full {activeType === 'paruh-waktu' ? 'bg-white' : 'bg-slate-300'}"></span>
        P3K Paruh Waktu
      </button>
    </div>
  </div>

  <!-- Dynamic View Container -->
  {#if activeType === 'paruh-waktu'}
    <StatistikParuhWaktuView />
  {:else}
    <StatistikPenuhWaktuView />
  {/if}
</div>
