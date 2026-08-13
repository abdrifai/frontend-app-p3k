<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let unorList = [];
  let selectedUnorId = "";
  let selectedUnorNama = "";
  let unorSearchText = "";
  let showUnorDropdown = false;
  let unorDropdownRef;
  let records = [];
  let isLoading = false;
  let isLoadingUnor = true;
  let searchTerm = "";
  let meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
  let filterStatus = "";

  $: filteredUnorList = unorSearchText
    ? unorList.filter((u) => u.nama.toLowerCase().includes(unorSearchText.toLowerCase()))
    : unorList;

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login", "error");
      goto("/login");
      return;
    }
    await fetchAllUnor();
  });

  const fetchAllUnor = async () => {
    isLoadingUnor = true;
    try {
      let all = [];
      let page = 1;
      while (true) {
        const r = await apiRequest(`/api/v1/ref-unor?page=${page}&limit=100`, "GET");
        if (!r.success || !r.data.length) break;
        all = [...all, ...r.data];
        if (r.data.length < 100) break;
        page++;
      }
      unorList = all;
    } catch (e) {
      addToast("Gagal memuat daftar unit kerja", "error");
    } finally {
      isLoadingUnor = false;
    }
  };

  const fetchData = async (page = 1) => {
    if (!selectedUnorNama) return;
    isLoading = true;
    try {
      const params = new URLSearchParams({ page, limit: meta.limit, unitKerja: selectedUnorNama });
      if (searchTerm) params.append("search", searchTerm);
      if (filterStatus) params.append("statusPensiun", filterStatus);
      const result = await apiRequest(`/api/v1/data-p3k?${params}`, "GET");
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

  const selectUnor = (u) => {
    selectedUnorId = u.id;
    selectedUnorNama = u.nama;
    unorSearchText = u.nama;
    showUnorDropdown = false;
    records = [];
    meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
    searchTerm = "";
    filterStatus = "";
    fetchData(1);
  };

  const clearUnor = () => {
    selectedUnorId = "";
    selectedUnorNama = "";
    unorSearchText = "";
    showUnorDropdown = false;
    records = [];
    meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
    searchTerm = "";
    filterStatus = "";
  };

  const onUnorInput = () => {
    showUnorDropdown = true;
    if (selectedUnorNama && unorSearchText !== selectedUnorNama) {
      selectedUnorId = "";
      selectedUnorNama = "";
      records = [];
    }
  };

  const handleDocClick = (e) => {
    if (unorDropdownRef && !unorDropdownRef.contains(e.target)) {
      showUnorDropdown = false;
    }
  };

  const handleFilter = () => { meta.page = 1; fetchData(1); };
  const handlePrint = () => window.print();
  const statusBadge = (s) =>
    s === "PENSIUN"
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";
  const formatGol = (r) => [r.golAkhirNama, r.ruangAkhirNama].filter(Boolean).join("/") || "-";
</script>

<svelte:window onclick={handleDocClick} />

<svelte:head>
  <title>Laporan Per Unit Kerja — SIPPPK</title>
</svelte:head>

<style>
  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    table { font-size: 10px; }
  }
  .print-only { display: none; }
</style>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 no-print">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <svg class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-slate-800">Laporan Per Unit Kerja</h1>
      </div>
      <p class="text-sm text-slate-500 ml-10">Pilih unit kerja induk untuk menampilkan seluruh pegawai P3K.</p>
    </div>
    {#if records.length > 0}
      <button onclick={handlePrint}
        class="no-print flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
        </svg>
        Cetak Laporan
      </button>
    {/if}
  </div>

  <!-- Filter Panel -->
  <div class="card p-5 no-print">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Pilih Unit Kerja (Searchable Combobox) -->
      <div class="md:col-span-1 relative" bind:this={unorDropdownRef}>
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Unit Kerja Induk <span class="text-red-400">*</span>
        </label>
        {#if isLoadingUnor}
          <div class="input-field flex items-center gap-2 text-slate-400 text-sm">
            <svg class="w-4 h-4 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Memuat unit kerja...
          </div>
        {:else}
          <div class="relative">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {#if selectedUnorId}
                  <div class="w-2 h-2 rounded-full bg-teal-500"></div>
                {:else}
                  <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                {/if}
              </div>

              <input
                type="text"
                bind:value={unorSearchText}
                oninput={onUnorInput}
                onfocus={() => (showUnorDropdown = true)}
                placeholder="Ketik untuk mencari unit kerja..."
                class="input-field w-full pl-9 pr-8"
                autocomplete="off"
              />

              {#if unorSearchText}
                <button
                  type="button"
                  onclick={clearUnor}
                  class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  title="Hapus pilihan"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              {:else}
                <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              {/if}
            </div>

            {#if showUnorDropdown}
              <div class="absolute z-50 left-0 w-full min-w-[320px] sm:min-w-[480px] md:min-w-[580px] max-w-[90vw] mt-1.5 bg-white rounded-2xl shadow-2xl shadow-slate-300/80 border border-slate-200 overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Hasil Pencarian ({filteredUnorList.length} unit kerja)</span>
                  {#if unorSearchText}
                    <span class="text-[11px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md font-normal truncate max-w-[200px]">"{unorSearchText}"</span>
                  {/if}
                </div>

                {#if filteredUnorList.length === 0}
                  <div class="px-5 py-8 text-center">
                    <p class="text-sm font-medium text-slate-600">Tidak ada unit kerja yang cocok</p>
                    <p class="text-xs text-slate-400 mt-1">Coba kata kunci pencarian yang lain</p>
                  </div>
                {:else}
                  <ul class="max-h-80 sm:max-h-96 overflow-y-auto py-1.5 divide-y divide-slate-100">
                    {#each filteredUnorList as u}
                      <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
                      <li
                        role="option"
                        aria-selected={selectedUnorId === u.id}
                        onmousedown={() => selectUnor(u)}
                        class="flex items-start justify-between gap-3 px-4 py-3 text-sm cursor-pointer transition-colors
                          {selectedUnorId === u.id
                            ? 'bg-teal-50/90 text-teal-900 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}"
                      >
                        <div class="flex items-start gap-3 flex-1 min-w-0">
                          <span class="text-base mt-0.5 flex-shrink-0 text-teal-600">🏢</span>
                          <span class="text-sm font-medium leading-relaxed break-words">{u.nama}</span>
                        </div>
                        {#if selectedUnorId === u.id}
                          <span class="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2.5 py-1 rounded-full flex-shrink-0 ml-2">
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

      <!-- Search -->
      <div>
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cari Nama / NIP</label>
        <input type="text" bind:value={searchTerm} placeholder="Nama atau NIP..."
          class="input-field w-full" disabled={!selectedUnorId}
          onkeydown={(e) => e.key === 'Enter' && handleFilter()} />
      </div>

      <!-- Filter Status -->
      <div>
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status Pegawai</label>
        <select bind:value={filterStatus} class="input-field w-full"
          disabled={!selectedUnorId} onchange={handleFilter}>
          <option value="">Semua Status</option>
          <option value="AKTIF">Aktif</option>
          <option value="PENSIUN">Pensiun</option>
        </select>
      </div>
    </div>

    {#if selectedUnorId}
      <div class="flex justify-end mt-4">
        <button onclick={handleFilter} class="btn-primary flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
          </svg>
          Terapkan Filter
        </button>
      </div>
    {/if}
  </div>

  <!-- Empty State -->
  {#if !selectedUnorId && !isLoading}
    <div class="card p-12 text-center">
      <div class="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
        </svg>
      </div>
      <p class="text-slate-600 font-medium">Silakan pilih unit kerja induk terlebih dahulu</p>
      <p class="text-sm text-slate-400 mt-1">Daftar pegawai akan tampil setelah unit kerja dipilih</p>
    </div>
  {/if}

  <!-- Loading -->
  {#if isLoading}
    <div class="card p-12 text-center">
      <svg class="w-8 h-8 animate-spin text-teal-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <p class="text-slate-500 text-sm">Memuat data pegawai...</p>
    </div>
  {/if}

  <!-- Not Found -->
  {#if !isLoading && selectedUnorId && records.length === 0}
    <div class="card p-10 text-center">
      <p class="text-slate-500 font-medium">Tidak ada pegawai ditemukan</p>
      <p class="text-sm text-slate-400 mt-1">Coba ubah filter atau pilih unit kerja yang lain</p>
    </div>
  {/if}

  {#if !isLoading && records.length > 0}
    <!-- Summary bar -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
          <span class="text-xs font-semibold text-teal-700 uppercase tracking-wide">Unit Kerja:</span>
          <span class="text-sm font-bold text-teal-800 ml-1">{selectedUnorNama}</span>
        </div>
        <div class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
          <span class="text-xs text-slate-500">Total:</span>
          <span class="text-sm font-bold text-slate-700 ml-1">{meta.total} pegawai</span>
        </div>
      </div>
      <p class="text-xs text-slate-400 no-print">Hal. {meta.page} dari {meta.totalPages}</p>
    </div>

    <!-- Print Header -->
    <div class="print-only mb-4 text-center">
      <h2 class="text-lg font-bold">LAPORAN DATA PEGAWAI P3K</h2>
      <p class="text-sm font-semibold">Unit Kerja: {selectedUnorNama}</p>
      <p class="text-xs text-slate-500">
        Total: {meta.total} pegawai &nbsp;|&nbsp;
        Dicetak: {new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}
      </p>
      <hr class="my-2"/>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">No</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">NIP</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama Jabatan</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Gol/Ruang</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendidikan</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">TMT CPNS</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each records as rec, i}
              <tr class="hover:bg-slate-50/60 transition-colors">
                <td class="px-4 py-3 text-slate-400 text-xs">{(meta.page - 1) * meta.limit + i + 1}</td>
                <td class="px-4 py-3">
                  <span class="font-mono text-xs text-slate-600">{rec.nipBaru || '-'}</span>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-800 leading-tight">{rec.nama || '-'}</p>
                  {#if rec.gelarDepan || rec.gelarBelakang}
                    <p class="text-[10px] text-slate-400 mt-0.5">
                      {[rec.gelarDepan, rec.nama, rec.gelarBelakang].filter(Boolean).join(' ')}
                    </p>
                  {/if}
                </td>
                <td class="px-4 py-3 text-slate-600 text-xs">{rec.jabatanNama || '-'}</td>
                <td class="px-4 py-3 text-slate-600 text-xs">{formatGol(rec)}</td>
                <td class="px-4 py-3 text-slate-600 text-xs">{rec.tingkatPendidikanNama || '-'}</td>
                <td class="px-4 py-3 text-slate-600 text-xs font-mono">{rec.tmtCpns || '-'}</td>
                <td class="px-4 py-3">
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
      <div class="flex items-center justify-between no-print">
        <p class="text-sm text-slate-500">
          Menampilkan {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} dari {meta.total} pegawai
        </p>
        <div class="flex items-center gap-2">
          <button onclick={() => fetchData(meta.page - 1)} disabled={meta.page <= 1}
            class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ← Sebelumnya
          </button>
          <span class="text-sm text-slate-500">Hal. {meta.page} / {meta.totalPages}</span>
          <button onclick={() => fetchData(meta.page + 1)} disabled={meta.page >= meta.totalPages}
            class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Berikutnya →
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
