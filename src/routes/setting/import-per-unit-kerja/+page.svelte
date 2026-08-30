<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  // Data State
  let unorSummaryList = [];
  let refUnorList = [];
  let isLoadingSummary = false;
  let isLoadingRefUnor = false;
  let summarySearch = "";

  // Selected Unit Kerja State
  let selectedUnorNama = "";
  let unorSearchText = "";
  let showUnorDropdown = false;
  let unorDropdownRef;

  // Detail State
  let detailRecords = [];
  let detailSummary = {
    totalPegawai: 0,
    totalUtama: 0,
    totalImport: 0,
    totalMatch: 0,
    totalHanyaImport: 0,
    totalHanyaUtama: 0,
    totalBedaUnor: 0
  };
  let isLoadingDetail = false;
  let statusFilter = "ALL";
  let detailSearch = "";
  let meta = { page: 1, limit: 50, total: 0, totalPages: 1 };

  $: unorSummaryMap = new Map(unorSummaryList.map((u) => [u.unorNama, u]));

  $: dropdownItems = (refUnorList.length > 0 ? refUnorList : unorSummaryList.map((u) => ({ nama: u.unorNama }))).map((u) => {
    const summary = unorSummaryMap.get(u.nama) || { totalUtama: 0, totalImport: 0, selisih: 0 };
    return {
      unorNama: u.nama,
      totalUtama: summary.totalUtama,
      totalImport: summary.totalImport,
      selisih: summary.selisih
    };
  });

  $: filteredSummaryList = summarySearch
    ? unorSummaryList.filter((u) => u.unorNama.toLowerCase().includes(summarySearch.toLowerCase()))
    : unorSummaryList;

  $: filteredUnorDropdown = unorSearchText
    ? dropdownItems.filter((u) => u.unorNama.toLowerCase().includes(unorSearchText.toLowerCase()))
    : dropdownItems;

  // Global KPI calculation
  $: totalAllUtama = unorSummaryList.reduce((acc, curr) => acc + (curr.totalUtama || 0), 0);
  $: totalAllImport = unorSummaryList.reduce((acc, curr) => acc + (curr.totalImport || 0), 0);
  $: totalAllSelisih = unorSummaryList.reduce((acc, curr) => acc + Math.abs(curr.selisih || 0), 0);
  $: totalUnorSync = unorSummaryList.filter((u) => u.status === "SINKRON").length;

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    await Promise.all([fetchSummary(), fetchAllRefUnor()]);
  });

  const fetchAllRefUnor = async () => {
    isLoadingRefUnor = true;
    try {
      let all = [];
      let page = 1;
      while (true) {
        const r = await apiRequest(`/api/v1/ref-unor?page=${page}&limit=100`, "GET");
        if (!r.success || !r.data || !r.data.length) break;
        all = [...all, ...r.data];
        if (r.data.length < 100) break;
        page++;
      }
      refUnorList = all;
    } catch (e) {
      console.error("Gagal memuat ref_unor:", e);
    } finally {
      isLoadingRefUnor = false;
    }
  };

  const fetchSummary = async () => {
    isLoadingSummary = true;
    try {
      const result = await apiRequest("/api/v1/p3k-csv-import/compare-unor", "GET");
      if (result.success) {
        unorSummaryList = result.data || [];
      } else {
        addToast(result.message || "Gagal memuat rekap per unit kerja", "error");
      }
    } catch (e) {
      console.error("Fetch summary error:", e);
      addToast("Terjadi kesalahan sistem saat memuat rekap unit kerja", "error");
    } finally {
      isLoadingSummary = false;
    }
  };

  const fetchDetail = async (page = 1) => {
    if (!selectedUnorNama) return;
    isLoadingDetail = true;
    try {
      const params = new URLSearchParams({
        unitKerja: selectedUnorNama,
        page: page,
        limit: meta.limit,
        statusFilter: statusFilter
      });
      if (detailSearch) params.append("search", detailSearch);

      const result = await apiRequest(`/api/v1/p3k-csv-import/compare-unor/detail?${params.toString()}`, "GET");
      if (result.success) {
        detailRecords = result.data || [];
        detailSummary = result.summary || detailSummary;
        meta = result.meta || meta;
      } else {
        addToast(result.message || "Gagal memuat detail komparasi unit kerja", "error");
      }
    } catch (e) {
      console.error("Fetch detail error:", e);
      addToast("Terjadi kesalahan sistem saat memuat detail komparasi", "error");
    } finally {
      isLoadingDetail = false;
    }
  };

  const selectUnor = (unorNama) => {
    selectedUnorNama = unorNama;
    unorSearchText = unorNama;
    showUnorDropdown = false;
    statusFilter = "ALL";
    detailSearch = "";
    meta.page = 1;
    fetchDetail(1);
  };

  const clearSelectedUnor = () => {
    selectedUnorNama = "";
    unorSearchText = "";
    showUnorDropdown = false;
    detailRecords = [];
    statusFilter = "ALL";
    detailSearch = "";
  };

  const handleStatusFilterChange = (newStatus) => {
    statusFilter = newStatus;
    meta.page = 1;
    fetchDetail(1);
  };

  const handleDetailSearch = (e) => {
    e.preventDefault();
    meta.page = 1;
    fetchDetail(1);
  };

  const resetDetailSearch = () => {
    detailSearch = "";
    meta.page = 1;
    fetchDetail(1);
  };

  const handleDocClick = (e) => {
    if (unorDropdownRef && !unorDropdownRef.contains(e.target)) {
      showUnorDropdown = false;
    }
  };

  const handlePrint = () => window.print();

  const getStatusBadge = (status) => {
    switch (status) {
      case "MATCH":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: "ri-checkbox-circle-line",
          label: "Cocok"
        };
      case "HANYA_IMPORT":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: "ri-download-cloud-2-line",
          label: "Hanya di SIASN (Belum di Data Utama)"
        };
      case "HANYA_UTAMA":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: "ri-database-2-line",
          label: "Hanya di Data Utama"
        };
      case "BEDA_UNOR":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: "ri-shuffle-line",
          label: "Perbedaan Unit Kerja"
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          icon: "ri-information-line",
          label: status
        };
    }
  };
</script>

<svelte:window onclick={handleDocClick} />

<svelte:head>
  <title>Komparasi Per Unit Kerja — SIPPPK</title>
</svelte:head>

<style>
  @media print {
    .no-print {
      display: none !important;
    }
    .print-only {
      display: block !important;
    }
    table {
      font-size: 10px;
    }
  }
  .print-only {
    display: none;
  }
</style>

<div class="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 w-full overflow-x-hidden">

  <!-- Header Section -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm no-print">
    <div class="min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Komparasi Data Per Unit Kerja</h1>
      </div>
      <p class="text-xs sm:text-sm text-slate-500">
        Perbandingan data pegawai antara <strong>Data Utama P3K</strong> (<code class="text-indigo-600 font-mono text-[11px]">data_p3k</code>) dan <strong>Data Import SIASN</strong> (<code class="text-cyan-600 font-mono text-[11px]">p3k_csv_imports</code>)
      </p>
    </div>

    <div class="flex items-center gap-2 shrink-0 flex-wrap">
      {#if selectedUnorNama}
        <button
          onclick={clearSelectedUnor}
          class="btn-secondary gap-1.5 text-xs sm:text-sm"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Semua Unit Kerja
        </button>
      {/if}
      <button
        onclick={handlePrint}
        class="btn-secondary gap-1.5 text-xs sm:text-sm"
      >
        <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Cetak Laporan
      </button>
      <a href="/data-p3k-import" class="btn-primary gap-1.5 text-xs sm:text-sm">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Data Import SIASN
      </a>
    </div>
  </div>

  <!-- Unit Kerja Selector Card -->
  <div class="card p-4 sm:p-5 no-print" bind:this={unorDropdownRef}>
    <div class="flex flex-col gap-2.5">
      <div class="relative w-full">
        <label for="unor-search" class="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
          Pilih / Cari Unit Kerja Induk untuk Komparasi Rinci
        </label>
        <div class="relative">
          <input
            id="unor-search"
            type="text"
            bind:value={unorSearchText}
            onfocus={() => (showUnorDropdown = true)}
            oninput={() => (showUnorDropdown = true)}
            placeholder="Ketik untuk mencari nama unit kerja..."
            class="input-field pl-9 pr-9 text-sm w-full"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {#if unorSearchText}
            <button
              type="button"
              onclick={() => { unorSearchText = ""; clearSelectedUnor(); }}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              title="Hapus pilihan"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>

        {#if showUnorDropdown && filteredUnorDropdown.length > 0}
          <div class="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
            {#each filteredUnorDropdown as u}
              <button
                type="button"
                onclick={() => selectUnor(u.unorNama)}
                class="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors flex items-center justify-between text-sm {selectedUnorNama === u.unorNama ? 'bg-teal-50/70 font-semibold text-teal-800' : 'text-slate-700'}"
              >
                <span class="truncate pr-2">{u.unorNama}</span>
                <div class="flex items-center gap-1.5 shrink-0 text-xs font-mono">
                  <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700" title="Data Utama">
                    {u.totalUtama} Utama
                  </span>
                  <span class="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700" title="Import SIASN">
                    {u.totalImport} SIASN
                  </span>
                  {#if u.selisih !== 0}
                    <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold" title="Selisih">
                      {u.selisih > 0 ? `+${u.selisih}` : u.selisih}
                    </span>
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      {#if selectedUnorNama}
        <div class="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
          <div class="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-50/80 border border-teal-100 text-teal-900 text-xs w-full">
            <svg class="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span class="text-teal-700 font-medium">Unit Kerja Aktif:</span>
            <strong class="font-bold text-teal-950 text-sm break-words">{selectedUnorNama}</strong>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Print Header Only -->
  <div class="print-only mb-6 text-center border-b pb-4">
    <h2 class="text-xl font-bold uppercase tracking-wider">Laporan Komparasi Data Pegawai P3K</h2>
    <p class="text-sm text-slate-600 mt-1">
      {selectedUnorNama ? `Unit Kerja: ${selectedUnorNama}` : "Rekapitulasi Seluruh Unit Kerja"}
    </p>
    <p class="text-xs text-slate-400 mt-0.5">
      Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
    </p>
  </div>

  <!-- VIEW MODE 1: REKAPITULASI SEMUA UNIT KERJA -->
  {#if !selectedUnorNama}
    <!-- KPI Cards Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 no-print">
      <div class="card p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium">Total Unit Kerja</p>
          <p class="text-xl sm:text-2xl font-bold text-slate-800 mt-1">{unorSummaryList.length}</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-lg shrink-0">
          <i class="ri-building-line"></i>
        </div>
      </div>

      <div class="card p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium">Data Utama P3K</p>
          <p class="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{totalAllUtama}</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0">
          <i class="ri-database-2-line"></i>
        </div>
      </div>

      <div class="card p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium">Import SIASN</p>
          <p class="text-xl sm:text-2xl font-bold text-cyan-600 mt-1">{totalAllImport}</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg shrink-0">
          <i class="ri-file-excel-2-line"></i>
        </div>
      </div>

      <div class="card p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-500 font-medium">Selisih Data</p>
          <p class="text-xl sm:text-2xl font-bold {totalAllSelisih > 0 ? 'text-amber-600' : 'text-emerald-600'} mt-1">
            {totalAllSelisih}
          </p>
        </div>
        <div class="w-10 h-10 rounded-xl {totalAllSelisih > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center text-lg shrink-0">
          <i class="{totalAllSelisih > 0 ? 'ri-error-warning-line' : 'ri-checkbox-circle-line'}"></i>
        </div>
      </div>
    </div>

    <!-- Summary Table -->
    <div class="card overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-slate-800">Daftar Rekap Komparasi Semua Unit Kerja</h2>
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {filteredSummaryList.length} Unit Kerja
          </span>
        </div>
        <div class="relative w-full sm:w-64">
          <input
            type="text"
            bind:value={summarySearch}
            placeholder="Cari unit kerja..."
            class="input-field pl-9 text-xs"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {#if isLoadingSummary}
        <div class="p-12 text-center text-slate-400">
          <div class="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-sm font-medium">Memuat rekap perbandingan per unit kerja...</p>
        </div>
      {:else if filteredSummaryList.length === 0}
        <div class="p-12 text-center text-slate-400">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm font-medium text-slate-600">Tidak ada data unit kerja ditemukan</p>
          <p class="text-xs text-slate-400 mt-1">Pastikan sudah ada data di Data Utama atau file CSV Import SIASN.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th class="px-4 py-3.5 font-semibold text-center w-12">No</th>
                <th class="px-4 py-3.5 font-semibold">Nama Unit Kerja</th>
                <th class="px-4 py-3.5 font-semibold text-center w-36">Data Utama P3K</th>
                <th class="px-4 py-3.5 font-semibold text-center w-36">Import SIASN</th>
                <th class="px-4 py-3.5 font-semibold text-center w-28">Selisih</th>
                <th class="px-4 py-3.5 font-semibold text-center w-32">Status</th>
                <th class="px-4 py-3.5 font-semibold text-center w-28 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each filteredSummaryList as row, index}
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="px-4 py-3.5 text-center text-xs text-slate-400 font-mono">{index + 1}</td>
                  <td class="px-4 py-3.5">
                    <button
                      type="button"
                      onclick={() => selectUnor(row.unorNama)}
                      class="text-left font-semibold text-slate-800 hover:text-teal-600 transition-colors"
                    >
                      {row.unorNama}
                    </button>
                  </td>
                  <td class="px-4 py-3.5 text-center font-semibold text-indigo-700 font-mono">
                    {row.totalUtama}
                  </td>
                  <td class="px-4 py-3.5 text-center font-semibold text-cyan-700 font-mono">
                    {row.totalImport}
                  </td>
                  <td class="px-4 py-3.5 text-center font-mono font-bold">
                    {#if row.selisih === 0}
                      <span class="text-slate-400">0</span>
                    {:else if row.selisih > 0}
                      <span class="text-amber-600">+{row.selisih}</span>
                    {:else}
                      <span class="text-rose-600">{row.selisih}</span>
                    {/if}
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    {#if row.status === 'SINKRON'}
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                        Sinkron
                      </span>
                    {:else if row.status === 'LEBIH_DI_SIASN'}
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                        SIASN Lebih
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                        Utama Lebih
                      </span>
                    {/if}
                  </td>
                  <td class="px-4 py-3.5 text-center no-print">
                    <button
                      type="button"
                      onclick={() => selectUnor(row.unorNama)}
                      class="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                      title="Lihat rincian komparasi"
                    >
                      Rincian
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

  <!-- VIEW MODE 2: KOMPARASI DETAIL UNIT KERJA TERPILIH -->
  {:else}
    <!-- Selected Unit Summary Cards (Flex 1 Baris Penuh) -->
    <div class="flex flex-row flex-nowrap items-stretch gap-2.5 sm:gap-3.5 no-print w-full">
      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Terdaftar</span>
          <span class="w-2 h-2 rounded-full bg-slate-400 shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold text-slate-800 mt-1">{detailSummary.totalPegawai}</p>
      </div>

      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Data Utama</span>
          <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold text-indigo-600 mt-1">{detailSummary.totalUtama}</p>
      </div>

      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Import SIASN</span>
          <span class="w-2 h-2 rounded-full bg-cyan-500 shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold text-cyan-600 mt-1">{detailSummary.totalImport}</p>
      </div>

      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Cocok</span>
          <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold text-emerald-600 mt-1">{detailSummary.totalMatch}</p>
      </div>

      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Belum di Utama</span>
          <span class="w-2 h-2 rounded-full {detailSummary.totalHanyaImport > 0 ? 'bg-amber-500' : 'bg-slate-300'} shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold {detailSummary.totalHanyaImport > 0 ? 'text-amber-600' : 'text-slate-400'} mt-1">
          {detailSummary.totalHanyaImport}
        </p>
      </div>
    </div>

    <!-- Filter Tabs & Detail Search -->
    <div class="card p-4 sm:p-5 no-print space-y-4">
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        <button
          type="button"
          onclick={() => handleStatusFilterChange('ALL')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
        >
          Semua ({detailSummary.totalPegawai})
        </button>
        <button
          type="button"
          onclick={() => handleStatusFilterChange('MATCH')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'MATCH' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}"
        >
          Cocok ({detailSummary.totalMatch})
        </button>
        <button
          type="button"
          onclick={() => handleStatusFilterChange('HANYA_IMPORT')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'HANYA_IMPORT' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}"
        >
          Hanya di SIASN ({detailSummary.totalHanyaImport})
        </button>
        <button
          type="button"
          onclick={() => handleStatusFilterChange('HANYA_UTAMA')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'HANYA_UTAMA' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}"
        >
          Hanya di Data Utama ({detailSummary.totalHanyaUtama})
        </button>
        {#if detailSummary.totalBedaUnor > 0}
          <button
            type="button"
            onclick={() => handleStatusFilterChange('BEDA_UNOR')}
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'BEDA_UNOR' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}"
          >
            Beda Unit Kerja ({detailSummary.totalBedaUnor})
          </button>
        {/if}
      </div>

      <form onsubmit={handleDetailSearch} class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            type="text"
            bind:value={detailSearch}
            placeholder="Cari NIP, Nama, atau Jabatan pegawai..."
            class="input-field pl-9 text-xs sm:text-sm"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <button type="submit" class="btn-primary text-xs sm:text-sm px-4">
          Cari
        </button>
        {#if detailSearch}
          <button type="button" onclick={resetDetailSearch} class="btn-secondary text-xs sm:text-sm px-3">
            Reset
          </button>
        {/if}
      </form>
    </div>

    <!-- Detail Table -->
    <div class="card overflow-hidden">
      {#if isLoadingDetail}
        <div class="p-12 text-center text-slate-400">
          <div class="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-sm font-medium">Memuat perbandingan pegawai unit kerja...</p>
        </div>
      {:else if detailRecords.length === 0}
        <div class="p-12 text-center text-slate-400">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="text-sm font-medium text-slate-600">Tidak ada data pegawai yang sesuai</p>
          <p class="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau tab filter status.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th class="px-4 py-3.5 font-semibold text-center w-12">No</th>
                <th class="px-4 py-3.5 font-semibold w-44">NIP</th>
                <th class="px-4 py-3.5 font-semibold">Data Utama P3K</th>
                <th class="px-4 py-3.5 font-semibold">Data Import SIASN</th>
                <th class="px-4 py-3.5 font-semibold text-center w-36">Status Komparasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each detailRecords as row, idx}
                {@const badge = getStatusBadge(row.statusSync)}
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="px-4 py-3.5 text-center text-xs text-slate-400 font-mono">
                    {(meta.page - 1) * meta.limit + idx + 1}
                  </td>
                  <td class="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                    {row.nipBaru}
                  </td>
                  <td class="px-4 py-3.5">
                    {#if row.namaUtama}
                      <div class="font-semibold text-slate-800">
                        {row.namaUtama}{row.gelarBelakangUtama ? `, ${row.gelarBelakangUtama}` : ""}
                      </div>
                      <div class="text-xs text-slate-600 mt-0.5">
                        <span class="font-medium">Jabatan:</span> {row.jabatanUtama || "-"}
                      </div>
                      <div class="text-xs text-indigo-700 mt-0.5 flex items-center gap-1 font-sans">
                        <span class="font-medium text-slate-400">Unit:</span> {row.unorUtama || "-"}
                      </div>
                    {:else}
                      <span class="text-xs italic text-slate-400">Belum ada di Data Utama</span>
                    {/if}
                  </td>
                  <td class="px-4 py-3.5">
                    {#if row.namaImport}
                      <div class="font-semibold text-slate-800">
                        {row.namaImport}{row.gelarBelakangImport ? `, ${row.gelarBelakangImport}` : ""}
                      </div>
                      <div class="text-xs text-slate-600 mt-0.5">
                        <span class="font-medium">Jabatan:</span> {row.jabatanImport || "-"}
                      </div>
                      <div class="text-xs text-cyan-700 mt-0.5 flex items-center gap-1 font-sans">
                        <span class="font-medium text-slate-400">Unit:</span> {row.unorImport || "-"}
                      </div>
                    {:else}
                      <span class="text-xs italic text-slate-400">Tidak ada di file Import SIASN</span>
                    {/if}
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <span class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold border {badge.bg}">
                      <i class="{badge.icon} mr-1"></i>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if meta.totalPages > 1}
          <div class="p-4 border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-500 no-print">
            <div>
              Menampilkan <strong>{(meta.page - 1) * meta.limit + 1}</strong> - <strong>{Math.min(meta.page * meta.limit, meta.total)}</strong> dari <strong>{meta.total}</strong> pegawai
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                onclick={() => fetchDetail(meta.page - 1)}
                disabled={meta.page <= 1}
                class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span class="px-3 py-1.5 font-semibold text-slate-700">
                Hal {meta.page} / {meta.totalPages}
              </span>
              <button
                type="button"
                onclick={() => fetchDetail(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}

</div>
