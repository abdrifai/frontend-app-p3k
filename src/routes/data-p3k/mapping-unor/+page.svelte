<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  // Master RefUnor State (Persis seperti /laporan/per-unit-kerja)
  let unorList = [];
  let isLoadingUnor = true;
  let selectedUnorId = "";
  let selectedUnorNama = "";
  let unorSearchText = "";
  let showUnorDropdown = false;
  let unorDropdownRef;

  // Toggle Mode Sumber Data (Data Utama vs Unor Mapping)
  let isMappingMode = false;

  // Data & Pagination State
  let records = [];
  let isLoading = false;
  let searchTerm = "";
  let statusFilter = "ALL"; // ALL, MAPPED, UNMAPPED
  let meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
  let summary = { totalPegawai: 0, totalMapped: 0, totalUnmapped: 0 };

  // Inline Editing State (Kolom Unor Baru)
  let editingRowId = null;
  let inlineSearchText = "";
  let showInlineDropdown = false;
  let isSavingRowId = null;

  // Bulk Selection State
  let selectedIds = new Set();
  let bulkUnorId = "";
  let isBulkUpdating = false;

  $: filteredUnorList = unorSearchText
    ? unorList.filter((u) => u.nama.toLowerCase().includes(unorSearchText.toLowerCase()))
    : unorList;

  $: filteredInlineUnors = inlineSearchText
    ? unorList.filter((u) => u.nama.toLowerCase().includes(inlineSearchText.toLowerCase()))
    : unorList;

  $: isAllSelected = records.length > 0 && records.every(r => selectedIds.has(r.id));

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
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
        if (!r.success || !r.data || !r.data.length) break;
        all = [...all, ...r.data];
        if (r.data.length < 100) break;
        page++;
      }
      unorList = all;
    } catch (e) {
      console.error("Gagal memuat master ref_unor:", e);
      addToast("Gagal memuat daftar unit kerja", "error");
    } finally {
      isLoadingUnor = false;
    }
  };

  const fetchData = async (page = 1) => {
    if (!selectedUnorNama) return;
    isLoading = true;
    try {
      const params = new URLSearchParams({
        page: page,
        limit: meta.limit,
        unorNama: selectedUnorNama,
        refUnorId: selectedUnorId,
        isMappingMode: isMappingMode ? "true" : "false",
        unorStatus: statusFilter
      });
      if (searchTerm) params.append("search", searchTerm);

      const result = await apiRequest(`/api/v1/data-p3k/mapping-unor?${params.toString()}`, "GET");
      if (result.success) {
        records = result.data || [];
        meta = result.meta || meta;
        summary = result.summary || summary;
      } else {
        addToast(result.message || "Gagal memuat data pegawai", "error");
      }
    } catch (e) {
      console.error("Error fetching data:", e);
      addToast("Terjadi kesalahan sistem saat memuat data", "error");
    } finally {
      isLoading = false;
    }
  };

  const toggleMappingMode = () => {
    isMappingMode = !isMappingMode;
    meta.page = 1;
    if (selectedUnorNama) {
      fetchData(1);
    }
  };

  // Selector handlers (Persis seperti /laporan/per-unit-kerja)
  const selectUnor = (u) => {
    selectedUnorId = u.id;
    selectedUnorNama = u.nama;
    unorSearchText = u.nama;
    showUnorDropdown = false;
    records = [];
    selectedIds.clear();
    selectedIds = new Set();
    meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
    searchTerm = "";
    statusFilter = "ALL";
    fetchData(1);
  };

  const clearUnor = () => {
    selectedUnorId = "";
    selectedUnorNama = "";
    unorSearchText = "";
    showUnorDropdown = false;
    records = [];
    selectedIds.clear();
    selectedIds = new Set();
    meta = { page: 1, limit: 50, total: 0, totalPages: 1 };
    searchTerm = "";
    statusFilter = "ALL";
    summary = { totalPegawai: 0, totalMapped: 0, totalUnmapped: 0 };
  };

  const onUnorInput = () => {
    showUnorDropdown = true;
    if (selectedUnorNama && unorSearchText !== selectedUnorNama) {
      selectedUnorId = "";
      selectedUnorNama = "";
      records = [];
      summary = { totalPegawai: 0, totalMapped: 0, totalUnmapped: 0 };
    }
  };

  const handleDocClick = (e) => {
    if (unorDropdownRef && !unorDropdownRef.contains(e.target)) {
      showUnorDropdown = false;
    }
    if (!e.target.closest('.inline-dropdown-container')) {
      showInlineDropdown = false;
    }
  };

  const handleStatusFilterChange = (status) => {
    statusFilter = status;
    meta.page = 1;
    fetchData(1);
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    meta.page = 1;
    fetchData(1);
  };

  // Inline editing handlers (Kolom Unor Baru)
  const startEdit = (row) => {
    editingRowId = row.id;
    inlineSearchText = "";
    showInlineDropdown = true;
  };

  const cancelEdit = () => {
    editingRowId = null;
    inlineSearchText = "";
    showInlineDropdown = false;
  };

  const saveMapping = async (row, refUnor) => {
    isSavingRowId = row.id;
    try {
      const result = await apiRequest(`/api/v1/data-p3k/${row.id}/mapping-unor`, "PATCH", {
        unorIndukId: refUnor ? refUnor.id : null
      });

      if (result.success) {
        addToast(`Berhasil memetakan "${row.nama}" ke "${refUnor ? refUnor.nama : 'Tanpa Unor'}"`, "success");
        // Update local state
        records = records.map(r => {
          if (r.id === row.id) {
            return {
              ...r,
              unorIndukId: refUnor ? refUnor.id : null,
              unorInduk: refUnor ? { id: refUnor.id, nama: refUnor.nama } : null
            };
          }
          return r;
        });
        // Update summary
        if (!row.unorIndukId && refUnor) {
          summary.totalMapped++;
          summary.totalUnmapped = Math.max(0, summary.totalUnmapped - 1);
        } else if (row.unorIndukId && !refUnor) {
          summary.totalMapped = Math.max(0, summary.totalMapped - 1);
          summary.totalUnmapped++;
        }
        cancelEdit();
      } else {
        addToast(result.message || "Gagal memperbarui mapping unor", "error");
      }
    } catch (e) {
      console.error("Save mapping error:", e);
      addToast("Terjadi kesalahan sistem saat menyimpan mapping", "error");
    } finally {
      isSavingRowId = null;
    }
  };

  // Bulk Selection & Mapping
  const toggleSelectAll = () => {
    if (isAllSelected) {
      selectedIds.clear();
      selectedIds = new Set(selectedIds);
    } else {
      records.forEach(r => selectedIds.add(r.id));
      selectedIds = new Set(selectedIds);
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedIds.has(id)) {
      selectedIds.delete(id);
    } else {
      selectedIds.add(id);
    }
    selectedIds = new Set(selectedIds);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) {
      addToast("Pilih minimal satu pegawai untuk pemetaan massal", "warning");
      return;
    }
    if (!bulkUnorId) {
      addToast("Pilih Unit Kerja Induk tujuan pemetaan massal", "warning");
      return;
    }

    const targetRef = unorList.find(r => r.id === bulkUnorId);
    const confirmMsg = `Petakan ${selectedIds.size} pegawai terpilih ke "${targetRef?.nama}"?`;
    if (!confirm(confirmMsg)) return;

    isBulkUpdating = true;
    try {
      const result = await apiRequest("/api/v1/data-p3k/bulk-mapping-unor", "POST", {
        ids: Array.from(selectedIds),
        unorIndukId: bulkUnorId
      });

      if (result.success) {
        addToast(result.message || "Pemetaan massal berhasil disimpan", "success");
        selectedIds.clear();
        selectedIds = new Set();
        bulkUnorId = "";
        fetchData(meta.page);
      } else {
        addToast(result.message || "Gagal melakukan pemetaan massal", "error");
      }
    } catch (e) {
      console.error("Bulk mapping error:", e);
      addToast("Terjadi kesalahan sistem saat pemetaan massal", "error");
    } finally {
      isBulkUpdating = false;
    }
  };

  // Quick helper: Set all selected to the currently selected Unor Induk
  const setAllToCurrentUnor = () => {
    if (selectedUnorId) {
      bulkUnorId = selectedUnorId;
    }
  };
</script>

<svelte:window onclick={handleDocClick} />

<svelte:head>
  <title>Mapping Unor Pegawai P3K — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6 w-full overflow-x-hidden">

  <!-- Header -->
  <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm no-print">
    <div class="flex items-center gap-2 mb-1">
      <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
        <svg class="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Mapping Unit Kerja (Unor Induk)</h1>
    </div>
    <p class="text-xs sm:text-sm text-slate-500">
      Pilih Unit Kerja Induk untuk menampilkan data pegawai dan memetakan unit kerjanya ke referensi <code class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">ref_unor</code>.
    </p>
  </div>

  <!-- Pencarian Tunggal: Unit Kerja Induk (Combobox Searchable Persis /laporan/per-unit-kerja) -->
  <div class="card p-4 sm:p-5 no-print" bind:this={unorDropdownRef}>
    <div class="flex flex-col gap-3">
      <!-- Header Row: Label & Toggle Button Unor Mapping -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <label for="unor-search-input" class="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Pilih / Cari Unit Kerja Induk <span class="text-rose-500">*</span>
        </label>

        <!-- Button Toggle: Unor Mapping -->
        <div class="flex items-center gap-2.5 bg-slate-50 py-1 px-3 rounded-xl border border-slate-200/80 shadow-xs shrink-0 self-start sm:self-auto">
          <span class="text-xs font-medium text-slate-600 select-none">
            Filter:
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isMappingMode}
            onclick={toggleMappingMode}
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 {isMappingMode ? 'bg-teal-600' : 'bg-slate-300'}"
            title="Klik untuk beralih antara Data Utama vs Hasil Unor Mapping"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out {isMappingMode ? 'translate-x-5' : 'translate-x-0'}"
            ></span>
          </button>
          <span class="text-xs font-bold {isMappingMode ? 'text-teal-700' : 'text-slate-500'} select-none">
            {isMappingMode ? 'Unor Mapping' : 'Data Utama'}
          </span>
        </div>
      </div>

      <div class="relative w-full">
        {#if isLoadingUnor}
          <div class="input-field flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
            <svg class="w-4 h-4 animate-spin text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Memuat daftar unit kerja dari ref_unor...
          </div>
        {:else}
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {#if selectedUnorId}
                <div class="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
              {:else}
                <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              {/if}
            </div>

            <input
              id="unor-search-input"
              type="text"
              bind:value={unorSearchText}
              oninput={onUnorInput}
              onfocus={() => (showUnorDropdown = true)}
              placeholder="Ketik untuk mencari nama unit kerja induk (ref_unor)..."
              class="input-field w-full pl-9 pr-9 text-xs sm:text-sm"
              autocomplete="off"
            />

            {#if unorSearchText}
              <button
                type="button"
                onclick={clearUnor}
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

          <!-- Dropdown Pencarian Ref Unor -->
          {#if showUnorDropdown && filteredUnorList.length > 0}
            <div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
              {#each filteredUnorList as u}
                <button
                  type="button"
                  onclick={() => selectUnor(u)}
                  class="w-full text-left px-4 py-2.5 hover:bg-teal-50 transition-colors flex items-center justify-between text-xs sm:text-sm {selectedUnorId === u.id ? 'bg-teal-50/70 font-semibold text-teal-800' : 'text-slate-700'}"
                >
                  <span class="truncate pr-2">{u.nama}</span>
                  {#if selectedUnorId === u.id}
                    <span class="text-teal-600 text-xs font-bold shrink-0">✓ Terpilih</span>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Unit Kerja Aktif Banner -->
      {#if selectedUnorNama}
        <div class="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-teal-50/80 border border-teal-100 text-teal-900 text-xs w-full">
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span class="text-teal-700 font-medium shrink-0">Unit Kerja Terpilih:</span>
              <strong class="font-bold text-teal-950 text-sm truncate">{selectedUnorNama}</strong>
            </div>

            <div class="shrink-0 flex items-center gap-1.5">
              <span class="px-2.5 py-1 rounded-md text-[11px] font-bold shadow-xs {isMappingMode ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'}">
                {isMappingMode ? '⚡ Tampil Berdasarkan Hasil Unor Mapping' : '📁 Tampil Berdasarkan Unor Induk Data Utama'}
              </span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Belum Memilih Unit Kerja State -->
  {#if !selectedUnorNama}
    <div class="card p-12 text-center text-slate-400">
      <div class="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4 text-teal-600">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-700">Silakan Pilih Unit Kerja Induk</h3>
      <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
        Ketik nama unit kerja pada kotak pencarian di atas untuk menampilkan daftar pegawai dan memetakan unit kerjanya.
      </p>
    </div>

  <!-- Mode Unit Kerja Terpilih: KPI, Filter, dan Tabel Mapping -->
  {:else}
    <!-- KPI Summary Cards (Flex 1 Baris Sejajar) -->
    <div class="flex flex-row flex-nowrap items-stretch gap-2.5 sm:gap-3.5 w-full no-print">
      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Pegawai</span>
          <span class="w-2 h-2 rounded-full bg-slate-400 shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold text-slate-800 mt-1">{summary.totalPegawai}</p>
      </div>

      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Sudah Dipetakan</span>
          <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold text-emerald-600 mt-1">{summary.totalMapped}</p>
      </div>

      <div class="card p-3 sm:p-4 flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Belum Dipetakan</span>
          <span class="w-2 h-2 rounded-full {summary.totalUnmapped > 0 ? 'bg-rose-500' : 'bg-slate-300'} shrink-0 ml-1"></span>
        </div>
        <p class="text-lg sm:text-2xl font-bold {summary.totalUnmapped > 0 ? 'text-rose-600' : 'text-slate-400'} mt-1">
          {summary.totalUnmapped}
        </p>
      </div>
    </div>

    <!-- Filter Status Tabs & Quick Search in Unit -->
    <div class="card p-4 sm:p-5 no-print space-y-3.5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <!-- Status Tabs -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onclick={() => handleStatusFilterChange('ALL')}
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
          >
            Semua ({summary.totalPegawai})
          </button>
          <button
            type="button"
            onclick={() => handleStatusFilterChange('MAPPED')}
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'MAPPED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}"
          >
            Sudah Dipetakan ({summary.totalMapped})
          </button>
          <button
            type="button"
            onclick={() => handleStatusFilterChange('UNMAPPED')}
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {statusFilter === 'UNMAPPED' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}"
          >
            Belum Dipetakan ({summary.totalUnmapped})
          </button>
        </div>

        <!-- Quick Filter by NIP/Name inside this unit -->
        <form onsubmit={handleSearch} class="flex items-center gap-2">
          <div class="relative flex-1 sm:w-64">
            <input
              type="text"
              bind:value={searchTerm}
              placeholder="Cari NIP / Nama pegawai..."
              class="input-field pl-9 text-xs"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button type="submit" class="btn-primary text-xs px-3.5">
            Cari
          </button>
          {#if searchTerm}
            <button type="button" onclick={() => { searchTerm = ""; meta.page = 1; fetchData(1); }} class="btn-secondary text-xs px-2.5">
              Reset
            </button>
          {/if}
        </form>
      </div>

      <!-- Bulk Action Bar -->
      {#if selectedIds.size > 0}
        <div class="p-3 bg-teal-50/80 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div class="flex items-center gap-2 text-xs font-semibold text-teal-900">
            <span class="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">
              {selectedIds.size}
            </span>
            <span>Pegawai dipilih untuk pemetaan massal</span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <select
              bind:value={bulkUnorId}
              class="input-field text-xs bg-white py-1.5 max-w-xs"
            >
              <option value="">-- Pilih Unor Induk Tujuan --</option>
              {#each unorList as u}
                <option value={u.id}>{u.nama}</option>
              {/each}
            </select>
            {#if selectedUnorId && bulkUnorId !== selectedUnorId}
              <button
                type="button"
                onclick={setAllToCurrentUnor}
                class="px-2.5 py-1.5 text-[11px] font-semibold text-teal-700 bg-white border border-teal-300 rounded-lg hover:bg-teal-50"
              >
                Pilih Unit Ini
              </button>
            {/if}
            <button
              type="button"
              onclick={handleBulkUpdate}
              disabled={isBulkUpdating || !bulkUnorId}
              class="btn-primary text-xs px-3.5 py-1.5 gap-1 disabled:opacity-50"
            >
              {#if isBulkUpdating}
                <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menyimpan...</span>
              {:else}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Terapkan Massal</span>
              {/if}
            </button>
            <button
              type="button"
              onclick={() => { selectedIds.clear(); selectedIds = new Set(); }}
              class="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
            >
              Batal
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Data Table -->
    <div class="card overflow-hidden">
      {#if isLoading}
        <div class="p-12 text-center text-slate-400">
          <div class="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-sm font-medium">Memuat data pegawai unit kerja...</p>
        </div>
      {:else if records.length === 0}
        <div class="p-12 text-center text-slate-400">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="text-sm font-medium text-slate-600">Tidak ada data pegawai yang sesuai</p>
          <p class="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau tab filter status pemetaan.</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th class="px-4 py-3.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onchange={toggleSelectAll}
                    class="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    title="Pilih semua baris"
                  />
                </th>
                <th class="px-3 py-3.5 font-semibold text-center w-12">No</th>
                <th class="px-4 py-3.5 font-semibold w-44">NIP</th>
                <th class="px-4 py-3.5 font-semibold">Nama Pegawai</th>
                <th class="px-4 py-3.5 font-semibold w-1/3">Unit Kerja (Tabel data_p3k.unorNama)</th>
                <th class="px-4 py-3.5 font-semibold w-1/3">Unor Baru (Mapping ke ref_unor)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each records as row, idx}
                {@const isEditing = editingRowId === row.id}
                {@const isSaving = isSavingRowId === row.id}
                {@const isSelected = selectedIds.has(row.id)}

                <tr class="hover:bg-slate-50/60 transition-colors {isSelected ? 'bg-teal-50/30' : ''}">
                  <!-- Checkbox -->
                  <td class="px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onchange={() => toggleSelectRow(row.id)}
                      class="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                  </td>

                  <!-- No -->
                  <td class="px-3 py-3.5 text-center text-xs text-slate-400 font-mono">
                    {(meta.page - 1) * meta.limit + idx + 1}
                  </td>

                  <!-- NIP -->
                  <td class="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                    {row.nipBaru}
                  </td>

                  <!-- Nama & Jabatan -->
                  <td class="px-4 py-3.5">
                    <div class="font-semibold text-slate-800">
                      {row.nama}{row.gelarBelakang ? `, ${row.gelarBelakang}` : ""}
                    </div>
                    <div class="text-xs text-slate-500 mt-0.5">
                      {row.jabatanNama || "-"}
                    </div>
                  </td>

                  <!-- Unit Kerja Asli (unorNama) -->
                  <td class="px-4 py-3.5 text-xs text-slate-700">
                    <div class="font-medium">
                      {row.unorNama || "-"}
                    </div>
                  </td>

                  <!-- Unor Baru / Mapping RefUnor (Interactive Inline Searchable Dropdown) -->
                  <td class="px-4 py-3.5">
                    {#if isEditing}
                      <!-- Inline Search / Dropdown Input Mode -->
                      <div class="relative inline-dropdown-container">
                        <div class="flex items-center gap-2">
                          <div class="relative flex-1">
                            <input
                              type="text"
                              bind:value={inlineSearchText}
                              oninput={() => (showInlineDropdown = true)}
                              onfocus={() => (showInlineDropdown = true)}
                              placeholder={row.unorInduk?.nama ? `Saat ini: ${row.unorInduk.nama}` : "Ketik untuk mencari di ref_unor..."}
                              class="input-field text-xs py-2 pl-9 pr-8 w-full rounded-xl border-teal-500 ring-2 ring-teal-100 shadow-sm bg-white focus:border-teal-600"
                              autofocus
                              onkeydown={(e) => {
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-600">
                              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            {#if inlineSearchText}
                              <button
                                type="button"
                                onclick={() => { inlineSearchText = ""; showInlineDropdown = true; }}
                                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-xs"
                              >
                                ✕
                              </button>
                            {/if}
                          </div>
                          <button
                            type="button"
                            onclick={cancelEdit}
                            class="p-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                            title="Batal"
                          >
                            ✕
                          </button>
                        </div>

                        <!-- Search Results Dropdown -->
                        {#if showInlineDropdown}
                          <div class="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 min-w-[260px]">
                            <div class="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-100">
                              <span>Pilih Unit Kerja Induk ({filteredInlineUnors.length})</span>
                              {#if row.unorIndukId}
                                <button
                                  type="button"
                                  onmousedown={(e) => { e.preventDefault(); saveMapping(row, null); }}
                                  class="text-rose-600 hover:underline font-semibold text-[11px]"
                                >
                                  Hapus Pemetaan
                                </button>
                              {/if}
                            </div>

                            {#if filteredInlineUnors.length === 0}
                              <div class="p-3 text-center text-xs text-slate-400">
                                Tidak ada unit kerja di ref_unor yang cocok
                              </div>
                            {:else}
                              {#each filteredInlineUnors as ref}
                                <button
                                  type="button"
                                  onmousedown={(e) => { e.preventDefault(); saveMapping(row, ref); }}
                                  class="w-full text-left px-3.5 py-2 hover:bg-teal-50 text-xs transition-colors flex items-center justify-between {row.unorIndukId === ref.id ? 'bg-teal-50/70 font-bold text-teal-900' : 'text-slate-700'}"
                                >
                                  <span class="truncate pr-2">{ref.nama}</span>
                                  {#if row.unorIndukId === ref.id}
                                    <span class="text-teal-600 text-xs font-bold shrink-0">✓ Aktif</span>
                                  {/if}
                                </button>
                              {/each}
                            {/if}
                          </div>
                        {/if}
                      </div>

                    {:else}
                      <!-- Display Mode (Click to Edit) -->
                      <button
                        type="button"
                        onclick={() => startEdit(row)}
                        disabled={isSaving}
                        class="w-full text-left p-2 rounded-xl border border-dashed transition-all group flex items-center justify-between gap-2 {row.unorInduk ? 'border-teal-300 bg-teal-50/40 hover:bg-teal-50/80 hover:border-teal-500' : 'border-slate-300 bg-slate-50/60 hover:bg-amber-50 hover:border-amber-400'}"
                        title="Klik untuk memilih atau mengubah Unit Kerja Induk"
                      >
                        <div class="min-w-0 flex-1">
                          {#if isSaving}
                            <div class="flex items-center gap-1.5 text-xs text-teal-700 font-medium">
                              <div class="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                              <span>Menyimpan...</span>
                            </div>
                          {:else if row.unorInduk}
                            <div class="text-xs font-bold text-teal-900 truncate">
                              {row.unorInduk.nama}
                            </div>
                            <div class="text-[10px] text-teal-600 mt-0.5 flex items-center gap-1">
                              <span class="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                              <span>Sudah Terpetakan</span>
                            </div>
                          {:else}
                            <div class="text-xs font-semibold text-rose-600 flex items-center gap-1">
                              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>Belum Dipetakan</span>
                            </div>
                            <div class="text-[10px] text-slate-400 mt-0.5">
                              Klik untuk petakan ke ref_unor
                            </div>
                          {/if}
                        </div>

                        <div class="shrink-0 text-slate-400 group-hover:text-teal-600 transition-colors">
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                      </button>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 no-print">
          <div>
            Menampilkan <strong>{(meta.page - 1) * meta.limit + 1}</strong> - <strong>{Math.min(meta.page * meta.limit, meta.total)}</strong> dari <strong>{meta.total}</strong> pegawai
          </div>
          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1.5">
              <span>Baris per halaman:</span>
              <select
                bind:value={meta.limit}
                onchange={() => { meta.page = 1; fetchData(1); }}
                class="input-field text-xs py-1 px-2 w-16"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <div class="flex items-center gap-1">
              <button
                type="button"
                onclick={() => fetchData(meta.page - 1)}
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
                onclick={() => fetchData(meta.page + 1)}
                disabled={meta.page >= meta.totalPages}
                class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

</div>
