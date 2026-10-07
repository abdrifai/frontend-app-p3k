<script>
  import { page } from "$app/stores";
  import { authStore, clearAuth } from "$lib/store";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { tteApi } from "$lib/tteApi";
  import { addToast } from "$lib/toastStore";

  let { children } = $props();

  let pejabatInfo = $state(null);
  let antrianPendingCount = $state(0);
  let isLogoutModalOpen = $state(false);

  const currentPath = $derived($page.url.pathname);

  const getJabatanLabel = (jabatan) => {
    switch (jabatan) {
      case "BUPATI":
        return "Bupati Tojo Una-Una";
      case "SEKDA":
        return "Sekretaris Daerah";
      case "KEPALA_BKPSDM":
        return "Kepala BKPSDM";
      default:
        return jabatan || "Pejabat Penandatangan";
    }
  };

  const loadPejabatInfo = async () => {
    try {
      const res = await tteApi.getStatistik();
      if (res.success && res.pejabat) {
        pejabatInfo = res.pejabat;
        antrianPendingCount = res.data?.antrianCount || 0;
      }
    } catch (e) {
      // jika belum terhubung atau ada error
    }
  };

  onMount(() => {
    loadPejabatInfo();
  });

  const handleLogout = () => {
    clearAuth();
    addToast("Berhasil keluar dari Portal Pejabat", "info");
    goto("/login");
  };
</script>

<svelte:head>
  <title>Portal Eksekutif TTE — Pemerintah Kabupaten Tojo Una-Una</title>
</svelte:head>

<div class="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
  <!-- Top Executive Header: Clean White Theme Matching Content -->
  <header class="bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <!-- Logo & Identitas Institusi -->
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50/80 border border-blue-200/70 p-2 flex items-center justify-center shadow-xs">
            <img src="/logo.svg" alt="Lambang Daerah" class="w-full h-full object-contain filter drop-shadow-xs" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs uppercase tracking-wider font-bold text-blue-700">Pemerintah Kabupaten Tojo Una-Una</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                BSrE BSSN
              </span>
            </div>
            <h1 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              Portal Eksekutif TTE
              <span class="text-xs font-normal text-slate-500 hidden sm:inline">| Penandatanganan Dokumen Kontrak PPPK</span>
            </h1>
          </div>
        </div>

        <!-- Profil Pejabat & Actions -->
        <div class="flex items-center gap-4">
          <div class="text-right hidden md:block">
            <div class="text-sm font-bold text-slate-900">
              {pejabatInfo?.nama || $authStore.user?.namaLengkap || 'Pejabat Penandatangan'}
            </div>
            <div class="text-xs text-blue-700 font-semibold">
              {getJabatanLabel(pejabatInfo?.jabatan)}
            </div>
          </div>

          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-extrabold flex items-center justify-center shadow-sm ring-2 ring-blue-100">
            {(pejabatInfo?.nama || $authStore.user?.namaLengkap || 'P').charAt(0).toUpperCase()}
          </div>

          <button
            onclick={() => (isLogoutModalOpen = true)}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all duration-200 shadow-xs"
            title="Keluar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 border-t border-slate-100 pt-2 pb-0 overflow-x-auto">
        <a
          href="/portal-pejabat"
          class={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
            currentPath === "/portal-pejabat"
              ? "border-blue-600 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Antrian Dokumen
          {#if antrianPendingCount > 0}
            <span class="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white shadow-xs">
              {antrianPendingCount}
            </span>
          {/if}
        </a>

        <a
          href="/portal-pejabat/riwayat"
          class={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
            currentPath.startsWith("/portal-pejabat/riwayat")
              ? "border-blue-600 text-blue-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Riwayat Penandatanganan
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content Area: Latar Cerah Lembut -->
  <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {@render children()}
  </main>

  <!-- Executive Footer -->
  <footer class="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
        <span class="font-medium text-slate-700">Sistem Tanda Tangan Elektronik Terhubung Balai Sertifikasi Elektronik (BSrE - BSSN)</span>
      </div>
      <div>
        &copy; {new Date().getFullYear()} Pemerintah Kabupaten Tojo Una-Una. Hak Cipta Dilindungi.
      </div>
    </div>
  </footer>
</div>

<!-- Modal Konfirmasi Logout -->
{#if isLogoutModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-800">
      <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-center text-slate-900 mb-2">Konfirmasi Keluar</h3>
      <p class="text-xs text-slate-600 text-center mb-6">
        Apakah Anda yakin ingin keluar dari Portal Eksekutif TTE? Sesi tanda tangan Anda akan ditutup.
      </p>
      <div class="flex gap-3">
        <button
          onclick={() => (isLogoutModalOpen = false)}
          class="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          Batal
        </button>
        <button
          onclick={handleLogout}
          class="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-md shadow-rose-600/20"
        >
          Ya, Keluar
        </button>
      </div>
    </div>
  </div>
{/if}
