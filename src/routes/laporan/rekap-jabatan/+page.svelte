<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let activeTab = "rekap"; // "rekap" | "detail"

  // Master Data Jabatan
  let jabatanList = [];
  let isLoadingJabatan = true;

  // Tab 1: Rekapitulasi State
  let rekapSearchText = "";

  // Tab 2: Detail State
  let selectedJabatanNama = "";
  let jabatanSearchText = "";
  let showJabatanDropdown = false;
  let jabatanDropdownRef;
  let records = [];
  let isLoading = false;
  let meta = { page: 1, limit: 50, total: 0, totalPages: 1 };

  $: filteredJabatanList = jabatanSearchText
    ? jabatanList.filter((j) =>
        (j.jabatanNama || "").toLowerCase().includes(jabatanSearchText.toLowerCase())
      )
    : jabatanList;

  $: rekapFilteredList = rekapSearchText
    ? jabatanList.filter((j) =>
        (j.jabatanNama || "").toLowerCase().includes(rekapSearchText.toLowerCase())
      )
    : jabatanList;

  $: totalPegawaiAll = jabatanList.reduce((sum, j) => sum + (j.total || 0), 0);
  $: rekapTotalPegawai = rekapFilteredList.reduce((sum, j) => sum + (j.total || 0), 0);

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login", "error");
      goto("/login");
      return;
    }
    await fetchAllJabatan();
  });

  const fetchAllJabatan = async () => {
    isLoadingJabatan = true;
    try {
      const r = await apiRequest("/api/v1/data-p3k/rekap-jabatan?statusPensiun=AKTIF", "GET");
      if (r.success) {
        jabatanList = r.data || [];
      } else {
        addToast(r.message || "Gagal memuat daftar jabatan", "error");
      }
    } catch (e) {
      addToast("Gagal memuat daftar jabatan", "error");
    } finally {
      isLoadingJabatan = false;
    }
  };

  const fetchData = async (page = 1) => {
    if (!selectedJabatanNama) return;
    isLoading = true;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(meta.limit),
        jabatanNama: selectedJabatanNama,
        statusPensiun: "AKTIF"
      });
      const result = await apiRequest(`/api/v1/data-p3k?${params.toString()}`, "GET");
      if (result.success) {
        records = result.data;
        meta = result.meta;
      } else {
        addToast(result.message || "Gagal memuat data", "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const selectJabatan = (j) => {
    selectedJabatanNama = j.jabatanNama;
    jabatanSearchText = j.jabatanNama;
    showJabatanDropdown = false;
    records = [];
    meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
    fetchData(1);
  };

  const viewDetailJabatan = (j) => {
    activeTab = "detail";
    selectJabatan(j);
  };

  const clearJabatan = () => {
    selectedJabatanNama = "";
    jabatanSearchText = "";
    showJabatanDropdown = false;
    records = [];
    meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
  };

  const onJabatanInput = () => {
    showJabatanDropdown = true;
    if (selectedJabatanNama && jabatanSearchText !== selectedJabatanNama) {
      selectedJabatanNama = "";
      records = [];
    }
  };

  const handleDocClick = (e) => {
    if (jabatanDropdownRef && !jabatanDropdownRef.contains(e.target)) {
      showJabatanDropdown = false;
    }
  };

  const handlePrint = () => window.print();

  const statusBadge = (s) =>
    s === "PENSIUN"
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";
</script>

<svelte:window onclick={handleDocClick} />

<svelte:head>
  <title>Laporan Rekap Jabatan — SIPPPK</title>
</svelte:head>

<style>
  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    table { font-size: 10px; }
  }
  .print-only { display: none; }
</style>

<div class="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 w-full overflow-x-hidden">

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 no-print">
    <div class="min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight break-words">Laporan Rekap Jabatan</h1>
      </div>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">Rekapitulasi dan rincian data pegawai P3K berdasarkan nama jabatan.</p>
    </div>

    <!-- Cetak Laporan Button (Print Contextual) -->
    {#if (activeTab === 'rekap' && jabatanList.length > 0) || (activeTab === 'detail' && records.length > 0)}
      <button onclick={handlePrint}
        class="no-print flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-sm w-full sm:w-auto shrink-0">
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
        </svg>
        Cetak Laporan
      </button>
    {/if}
  </div>

  <!-- Navigation Tabs -->
  <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit no-print border border-slate-200/70">
    <button
      type="button"
      onclick={() => (activeTab = "rekap")}
      class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all
        {activeTab === 'rekap'
          ? 'bg-white text-emerald-700 shadow-xs'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      Rekapitulasi Jabatan
      {#if jabatanList.length > 0}
        <span class="text-[11px] px-2 py-0.5 rounded-full {activeTab === 'rekap' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">
          {jabatanList.length}
        </span>
      {/if}
    </button>

    <button
      type="button"
      onclick={() => (activeTab = "detail")}
      class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all
        {activeTab === 'detail'
          ? 'bg-white text-emerald-700 shadow-xs'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
      Detail Pegawai Per Jabatan
      {#if selectedJabatanNama}
        <span class="text-[11px] px-2 py-0.5 rounded-full {activeTab === 'detail' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">
          {meta.total}
        </span>
      {/if}
    </button>
  </div>

  <!-- TAB 1: REKAPITULASI JABATAN -->
  {#if activeTab === 'rekap'}
    <!-- Summary Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 no-print">
      <div class="card p-4 sm:p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Formasi Jabatan</p>
          <p class="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{jabatanList.length} <span class="text-xs font-normal text-slate-400">jabatan</span></p>
        </div>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
      </div>

      <div class="card p-4 sm:p-5 flex items-center justify-between border-l-4 border-l-blue-500">
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Seluruh Pegawai Aktif</p>
          <p class="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{totalPegawaiAll} <span class="text-xs font-normal text-slate-400">pegawai</span></p>
        </div>
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Search in Rekap -->
    <div class="card p-4 no-print flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="relative w-full sm:max-w-md">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
          type="text"
          bind:value={rekapSearchText}
          placeholder="Cari nama jabatan..."
          class="input-field w-full pl-10 pr-4 text-xs sm:text-sm py-2 shadow-xs"
        />
      </div>

      <div class="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-center">
        <span>Menampilkan <b>{rekapFilteredList.length}</b> jabatan (<b>{rekapTotalPegawai}</b> pegawai)</span>
      </div>
    </div>

    <!-- Print Header Rekapitulasi -->
    <div class="print-only mb-4 text-center">
      <h2 class="text-lg font-bold">LAPORAN REKAPITULASI JUMLAH PEGAWAI P3K PER JABATAN</h2>
      <p class="text-xs text-slate-500">
        Total: {jabatanList.length} Formasi Jabatan &nbsp;|&nbsp;
        Total Pegawai: {totalPegawaiAll} Pegawai &nbsp;|&nbsp;
        Dicetak: {new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
      </p>
      <hr class="my-2"/>
    </div>

    <!-- Rekap Table -->
    {#if isLoadingJabatan}
      <div class="card p-8 sm:p-12 text-center min-w-0">
        <svg class="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p class="text-slate-500 text-xs sm:text-sm">Memuat rekapitulasi jabatan...</p>
      </div>
    {:else if rekapFilteredList.length === 0}
      <div class="card p-8 sm:p-10 text-center min-w-0">
        <p class="text-slate-500 font-medium text-sm sm:text-base">Tidak ada data jabatan ditemukan</p>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Coba kata kunci pencarian yang lain</p>
      </div>
    {:else}
      <div class="card overflow-hidden min-w-0">
        <div class="overflow-x-auto max-w-full scrollbar-thin">
          <table class="w-full min-w-[500px] text-xs sm:text-sm border-collapse text-left">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-12 text-center">No</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama Jabatan</th>
                <th class="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Jumlah Pegawai</th>
                <th class="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-32 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each rekapFilteredList as item, idx}
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="px-3 sm:px-4 py-3 text-slate-400 text-xs text-center">{idx + 1}</td>
                  <td class="px-3 sm:px-4 py-3">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="text-emerald-600 shrink-0 text-sm">💼</span>
                      <span class="font-medium text-slate-800 break-words">{item.jabatanNama}</span>
                    </div>
                  </td>
                  <td class="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                    <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 min-w-[50px]">
                      {item.total}
                    </span>
                  </td>
                  <td class="px-3 sm:px-4 py-3 text-center no-print whitespace-nowrap">
                    <button
                      type="button"
                      onclick={() => viewDetailJabatan(item)}
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      Lihat Pegawai
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
            <tfoot>
              <tr class="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-800">
                <td colspan="2" class="px-3 sm:px-4 py-3 text-right text-xs uppercase tracking-wide">
                  Total Keseluruhan:
                </td>
                <td class="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm text-emerald-800">
                  {rekapTotalPegawai} Pegawai
                </td>
                <td class="no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    {/if}
  {/if}

  <!-- TAB 2: DETAIL PEGAWAI PER JABATAN -->
  {#if activeTab === 'detail'}
    <!-- Filter Panel -->
    <div class="card p-4 sm:p-6 no-print min-w-0">
      <div class="space-y-2">
        <!-- Pilih Jabatan (Searchable Combobox) -->
        <div class="relative min-w-0" bind:this={jabatanDropdownRef}>
          <div class="flex items-center justify-between gap-2 mb-2">
            <label for="jabatanSearchInput" class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pilih Nama Jabatan <span class="text-rose-500">*</span>
            </label>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Status: Pegawai Aktif
            </span>
          </div>

          {#if isLoadingJabatan}
            <div class="input-field flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
              <svg class="w-4 h-4 animate-spin text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Memuat daftar jabatan...
            </div>
          {:else}
            <div class="relative">
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  {#if selectedJabatanNama}
                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  {:else}
                    <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  {/if}
                </div>

                <input
                  id="jabatanSearchInput"
                  type="text"
                  bind:value={jabatanSearchText}
                  oninput={onJabatanInput}
                  onfocus={() => (showJabatanDropdown = true)}
                  placeholder="Ketik untuk mencari dan memilih nama jabatan..."
                  class="input-field w-full pl-10 pr-10 text-xs sm:text-sm py-2.5 sm:py-3 shadow-xs"
                  autocomplete="off"
                />

                {#if jabatanSearchText}
                  <button
                    type="button"
                    onclick={clearJabatan}
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    title="Hapus pilihan"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                {:else}
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                {/if}
              </div>

              {#if showJabatanDropdown}
                <div class="absolute z-50 left-0 w-full min-w-0 max-w-full mt-1.5 bg-white rounded-2xl shadow-2xl shadow-slate-300/80 border border-slate-200 overflow-hidden animate-scale-up">
                  <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Hasil Pencarian ({filteredJabatanList.length} jabatan)</span>
                    {#if jabatanSearchText}
                      <span class="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-normal truncate max-w-[200px]">"{jabatanSearchText}"</span>
                    {/if}
                  </div>

                  {#if filteredJabatanList.length === 0}
                    <div class="px-5 py-8 text-center">
                      <p class="text-sm font-medium text-slate-600">Tidak ada jabatan yang cocok</p>
                      <p class="text-xs text-slate-400 mt-1">Coba kata kunci pencarian yang lain</p>
                    </div>
                  {:else}
                    <ul class="max-h-80 sm:max-h-96 overflow-y-auto py-1.5 divide-y divide-slate-100">
                      {#each filteredJabatanList as j}
                        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
                        <li
                          role="option"
                          aria-selected={selectedJabatanNama === j.jabatanNama}
                          onmousedown={() => selectJabatan(j)}
                          class="flex items-start justify-between gap-3 px-4 py-3 text-sm cursor-pointer transition-colors
                            {selectedJabatanNama === j.jabatanNama
                              ? 'bg-emerald-50/90 text-emerald-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}"
                        >
                          <div class="flex items-start gap-3 flex-1 min-w-0">
                            <span class="text-base mt-0.5 flex-shrink-0 text-emerald-600">💼</span>
                            <div class="min-w-0 flex-1">
                              <span class="text-sm font-medium leading-relaxed break-words block">{j.jabatanNama}</span>
                              <span class="text-[11px] text-slate-400 font-normal">{j.total} pegawai</span>
                            </div>
                          </div>
                          {#if selectedJabatanNama === j.jabatanNama}
                            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex-shrink-0 ml-2">
                              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                              Terpilih
                            </span>
                          {/if}
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Empty State -->
    {#if !selectedJabatanNama && !isLoading}
      <div class="card p-8 sm:p-12 text-center min-w-0">
        <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="text-slate-600 font-medium text-sm sm:text-base">Silakan pilih nama jabatan terlebih dahulu</p>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Daftar pegawai akan tampil setelah jabatan dipilih</p>
      </div>
    {/if}

    <!-- Loading -->
    {#if isLoading}
      <div class="card p-8 sm:p-12 text-center min-w-0">
        <svg class="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <p class="text-slate-500 text-xs sm:text-sm">Memuat data pegawai...</p>
      </div>
    {/if}

    <!-- Not Found -->
    {#if !isLoading && selectedJabatanNama && records.length === 0}
      <div class="card p-8 sm:p-10 text-center min-w-0">
        <p class="text-slate-500 font-medium text-sm sm:text-base">Tidak ada pegawai ditemukan</p>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Coba ubah filter atau pilih jabatan yang lain</p>
      </div>
    {/if}

    {#if !isLoading && records.length > 0}
      <!-- Summary bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 min-w-0">
          <div class="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg min-w-0">
            <span class="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Jabatan:</span>
            <span class="text-xs sm:text-sm font-bold text-emerald-800 ml-1 break-words">{selectedJabatanNama}</span>
          </div>
          <div class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
            <span class="text-xs text-slate-500">Total:</span>
            <span class="text-xs sm:text-sm font-bold text-slate-700 ml-1">{meta.total} pegawai</span>
          </div>
        </div>
        <p class="text-xs text-slate-400 no-print text-right sm:text-left">Hal. {meta.page} dari {meta.totalPages}</p>
      </div>

      <!-- Print Header Detail Pegawai -->
      <div class="print-only mb-4 text-center">
        <h2 class="text-lg font-bold">LAPORAN DATA PEGAWAI P3K BERDASARKAN JABATAN</h2>
        <p class="text-sm font-semibold">Jabatan: {selectedJabatanNama}</p>
        <p class="text-xs text-slate-500">
          Total: {meta.total} pegawai &nbsp;|&nbsp;
          Dicetak: {new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
        </p>
        <hr class="my-2"/>
      </div>

      <!-- Table -->
      <div class="card overflow-hidden min-w-0">
        <div class="overflow-x-auto max-w-full scrollbar-thin">
          <table class="w-full min-w-[720px] text-xs sm:text-sm border-collapse text-left">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">No</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap min-w-[180px] w-48">NIP</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[160px]">Nama</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">Unit Kerja</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[180px]">Nama Jabatan</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[130px]">Pendidikan</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[100px]">TMT CPNS</th>
                <th class="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[90px]">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each records as rec, i}
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="px-3 sm:px-4 py-3 text-slate-400 text-xs">{ (meta.page - 1) * meta.limit + i + 1 }</td>
                  <td class="px-3 sm:px-4 py-3 whitespace-nowrap">
                    <span class="font-mono text-xs font-medium text-slate-700 whitespace-nowrap select-all">{rec.nipBaru || '-'}</span>
                  </td>
                  <td class="px-3 sm:px-4 py-3">
                    <p class="font-medium text-slate-800 leading-tight break-words">{rec.nama || '-'}</p>
                    {#if rec.gelarDepan || rec.gelarBelakang}
                      <p class="text-[10px] text-slate-400 mt-0.5 break-words">
                        {[rec.gelarDepan, rec.nama, rec.gelarBelakang].filter(Boolean).join(' ')}
                      </p>
                    {/if}
                  </td>
                  <td class="px-3 sm:px-4 py-3 text-slate-600 text-xs break-words">
                    {rec.unorInduk?.nama || rec.unorNama || '-'}
                  </td>
                  <td class="px-3 sm:px-4 py-3 text-slate-600 text-xs break-words">{rec.jabatanNama || '-'}</td>
                  <td class="px-3 sm:px-4 py-3 text-slate-600 text-xs break-words">{rec.tingkatPendidikanNama || rec.pendidikanNama || '-'}</td>
                  <td class="px-3 sm:px-4 py-3 text-slate-600 text-xs font-mono whitespace-nowrap">{rec.tmtCpns || '-'}</td>
                  <td class="px-3 sm:px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold {statusBadge(rec.statusPensiun)}">
                      {rec.statusPensiun || 'AKTIF'}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      {#if meta.totalPages > 1}
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 no-print text-xs sm:text-sm">
          <p class="text-slate-500 text-center sm:text-left">
            Menampilkan {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} pegawai
          </p>
          <div class="flex items-center gap-2">
            <button onclick={() => fetchData(meta.page - 1)} disabled={meta.page <= 1}
              class="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Sebelumnya
            </button>
            <span class="text-xs sm:text-sm font-semibold text-slate-600">Hal. {meta.page} / {meta.totalPages}</span>
            <button onclick={() => fetchData(meta.page + 1)} disabled={meta.page >= meta.totalPages}
              class="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Berikutnya →
            </button>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>
