<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let unorList = [];
  let selectedUnorId = "";
  let selectedUnorNama = "";
  let records = [];
  let isLoading = false;
  let isLoadingUnor = true;
  let searchTerm = "";
  let meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
  let filterStatus = "";

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

  const handleUnorChange = () => {
    const found = unorList.find((u) => u.id === selectedUnorId);
    selectedUnorNama = found ? found.nama : "";
    records = [];
    meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
    searchTerm = "";
    filterStatus = "";
    if (selectedUnorId) fetchData(1);
  };

  const handleFilter = () => { meta.page = 1; fetchData(1); };
  const handlePrint = () => window.print();
  const statusBadge = (s) =>
    s === "PENSIUN"
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-emerald-50 text-emerald-700 border border-emerald-200";
  const formatGol = (r) => [r.golAkhirNama, r.ruangAkhirNama].filter(Boolean).join("/") || "-";
</script>

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
      <!-- Pilih Unit Kerja -->
      <div class="md:col-span-1">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Unit Kerja Induk <span class="text-red-400">*</span>
        </label>
        {#if isLoadingUnor}
          <div class="input-field flex items-center gap-2 text-slate-400 text-sm">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Memuat...
          </div>
        {:else}
          <select bind:value={selectedUnorId} onchange={handleUnorChange} class="input-field w-full">
            <option value="">-- Pilih Unit Kerja --</option>
            {#each unorList as u}
              <option value={u.id}>{u.nama}</option>
            {/each}
          </select>
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
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Jenis Jabatan</th>
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
                <td class="px-4 py-3 text-slate-600 text-xs">{rec.jenisJabatanNama || '-'}</td>
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
