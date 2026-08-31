<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";

  // --- Tab Navigation State ---
  let activeTab = "data"; // "data", "upload", "sync"

  // --- Upload State ---
  let files = null;
  let isUploading = false;
  let uploadProgress = 0;
  let showHeaderGuide = false;

  // --- Data List State (Staging p3k_csv_imports) ---
  let records = [];
  let isLoadingData = true;
  let lastImportTime = null;
  let searchTerm = "";
  let filterUnitKerja = "";
  let filterTanggalSkCpns = "";
  let searchDebounceTimer = null;

  let pagination = {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  };

  let filterUnors = [];

  // --- Master Data State (data_p3k) ---
  let masterRecords = [];
  let isLoadingMaster = false;
  let isSyncingMaster = false;
  let masterSearchQuery = "";
  let masterPagination = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  };

  // --- Detail Modal State ---
  let selectedRecord = null;
  let showDetailModal = false;
  let showConfirmSyncModal = false;

  const RETIREMENT_AGE = 58;

  const EXPECTED_HEADERS = [
    'PNS ID', 'NIP BARU', 'NIP LAMA', 'NAMA', 'GELAR DEPAN', 'GELAR BELAKANG',
    'TEMPAT LAHIR ID', 'TEMPAT LAHIR NAMA', 'TANGGAL LAHIR', 'JENIS KELAMIN',
    'AGAMA ID', 'AGAMA NAMA', 'JENIS KAWIN ID', 'JENIS KAWIN NAMA', 'NIK',
    'NOMOR HP', 'EMAIL', 'EMAIL GOV', 'ALAMAT', 'NPWP NOMOR', 'BPJS',
    'JENIS PEGAWAI ID', 'JENIS PEGAWAI NAMA', 'KEDUDUKAN HUKUM ID', 'KEDUDUKAN HUKUM NAMA',
    'STATUS CPNS PNS', 'KARTU ASN VIRTUAL', 'NOMOR SK CPNS', 'TANGGAL SK CPNS', 'TMT CPNS',
    'NOMOR SK PNS', 'TANGGAL SK PNS', 'TMT PNS', 'GOL AWAL ID', 'GOL AWAL NAMA',
    'GOL AKHIR ID', 'GOL AKHIR NAMA', 'TMT GOLONGAN', 'MK TAHUN', 'MK BULAN',
    'JENIS JABATAN ID', 'JENIS JABATAN NAMA', 'JABATAN ID', 'JABATAN NAMA', 'TMT JABATAN',
    'TINGKAT PENDIDIKAN ID', 'TINGKAT PENDIDIKAN NAMA', 'PENDIDIKAN ID', 'PENDIDIKAN NAMA',
    'TAHUN LULUS', 'KPKN ID', 'KPKN NAMA', 'LOKASI KERJA ID', 'LOKASI KERJA NAMA',
    'UNOR ID', 'UNOR NAMA', 'INSTANSI INDUK ID', 'INSTANSI INDUK NAMA',
    'INSTANSI KERJA ID', 'INSTANSI KERJA NAMA', 'SATUAN KERJA INDUK ID', 'SATUAN KERJA INDUK NAMA',
    'SATUAN KERJA KERJA ID', 'SATUAN KERJA KERJA NAMA', 'IS VALID NIK', 'NAMA SEKOLAH',
    'FLAG IKD'
  ];

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return "-";
    let birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) {
      const parts = birthDateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
          birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          birthDate = new Date(birthDateStr);
        }
      }
    }
    if (isNaN(birthDate.getTime())) return birthDateStr;
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} thn, ${months} bln, ${days} hari`;
  };

  const calculateRetirement = (birthDateStr) => {
    if (!birthDateStr) return null;
    const parts = birthDateStr.split(/[-/]/);
    if (parts.length !== 3) return null;

    let bDay, bMonth, bYear;
    if (parts[0].length === 2 && parts[2].length === 4) {
      bDay = parseInt(parts[0], 10);
      bMonth = parseInt(parts[1], 10);
      bYear = parseInt(parts[2], 10);
    } else if (parts[0].length === 4 && parts[2].length === 2) {
      bYear = parseInt(parts[0], 10);
      bMonth = parseInt(parts[1], 10);
      bDay = parseInt(parts[2], 10);
    } else {
      return null;
    }

    let retYear = bYear + RETIREMENT_AGE;
    let retMonth = bMonth + 1;
    if (retMonth > 12) {
      retMonth = 1;
      retYear += 1;
    }

    const tmtDate = new Date(retYear, retMonth - 1, 1);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const today = new Date();
    const isRetired = today >= tmtDate;

    let diffMonths = (retYear - today.getFullYear()) * 12 + (retMonth - 1 - today.getMonth());
    let remainingText = '';
    if (isRetired) {
      remainingText = 'Sudah Memasuki Pensiun';
    } else if (diffMonths <= 0) {
      remainingText = 'Bulan Ini';
    } else if (diffMonths < 12) {
      remainingText = `${diffMonths} Bulan Lagi`;
    } else {
      const y = Math.floor(diffMonths / 12);
      const m = diffMonths % 12;
      remainingText = `${y} Thn ${m > 0 ? m + ' Bln' : ''} Lagi`;
    }

    return {
      tmtDateString: `1 ${months[retMonth - 1]} ${retYear}`,
      retYear,
      isRetired,
      remainingText,
      diffMonths
    };
  };

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Silakan login terlebih dahulu", "error");
      goto("/login");
      return;
    }

    const tabParam = $page.url.searchParams.get("tab");
    if (tabParam === "upload") {
      activeTab = "upload";
    } else if (tabParam === "sync") {
      activeTab = "sync";
    }

    await Promise.all([
      fetchData(1),
      fetchLastImportTime(),
      fetchMasterData(1)
    ]);
  });

  // --- Fetch Data Methods ---
  async function fetchData(pageNumber = 1) {
    isLoadingData = true;
    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm.trim(),
        unitKerja: filterUnitKerja,
        tanggalSkCpns: filterTanggalSkCpns,
      });

      const res = await apiRequest(`/api/v1/p3k-csv-import?${queryParams.toString()}`, "GET");
      if (res && res.success) {
        records = res.data || [];
        pagination = {
          page: res.meta?.page || 1,
          limit: res.meta?.limit || 15,
          total: res.meta?.total || 0,
          totalPages: res.meta?.totalPages || 1,
        };

        if (filterUnors.length === 0 && records.length > 0) {
          extractUniqueUnors();
        }
      } else {
        addToast(res.message || "Gagal memuat data", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memuat data", "error");
    } finally {
      isLoadingData = false;
    }
  }

  async function fetchMasterData(pageNumber = 1) {
    isLoadingMaster = true;
    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        limit: masterPagination.limit.toString(),
        search: masterSearchQuery.trim()
      });

      const res = await apiRequest(`/api/v1/data-p3k?${queryParams.toString()}`, "GET");
      if (res && res.success) {
        masterRecords = res.data || [];
        masterPagination = {
          page: res.meta?.page || res.pagination?.page || 1,
          limit: res.meta?.limit || res.pagination?.limit || 10,
          total: res.meta?.total || res.pagination?.total || 0,
          totalPages: res.meta?.totalPages || res.pagination?.totalPages || 1
        };
      }
    } catch (err) {
      console.error(err);
    } finally {
      isLoadingMaster = false;
    }
  }

  async function fetchLastImportTime() {
    try {
      const res = await apiRequest("/api/v1/p3k-csv-import/last-import-time", "GET");
      if (res && res.success && res.data) {
        lastImportTime = res.data.lastImportTime;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function extractUniqueUnors() {
    try {
      const res = await apiRequest("/api/v1/p3k-csv-import/statistics", "GET");
      if (res && res.success && res.data?.byUnitKerja) {
        filterUnors = res.data.byUnitKerja.map((u) => u.unitKerja).filter(Boolean);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchData(1);
    }, 400);
  }

  function handleMasterSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchMasterData(1);
    }, 400);
  }

  function handleFilterChange() {
    fetchData(1);
  }

  function resetFilters() {
    searchTerm = "";
    filterUnitKerja = "";
    filterTanggalSkCpns = "";
    fetchData(1);
  }

  // --- Upload Handler ---
  async function handleUpload() {
    if (!files || files.length === 0) {
      addToast("Silakan pilih file CSV terlebih dahulu", "warning");
      return;
    }

    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".csv")) {
      addToast("Format file harus berupa CSV (.csv)", "error");
      return;
    }

    isUploading = true;
    uploadProgress = 10;

    const progressTimer = setInterval(() => {
      if (uploadProgress < 90) {
        uploadProgress += Math.floor(Math.random() * 12) + 2;
        if (uploadProgress > 90) uploadProgress = 90;
      }
    }, 300);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest("/api/v1/p3k-csv-import", "POST", formData, true);
      uploadProgress = 100;

      if (res && res.success) {
        addToast(`Berhasil mengimpor ${res.data?.count || 0} data PPPK Full Waktu`, "success");
        files = null;
        await Promise.all([
          fetchData(1),
          fetchLastImportTime(),
          fetchMasterData(1)
        ]);
        activeTab = "data";
      } else {
        addToast(res.message || "Gagal mengimpor file CSV", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat mengunggah file CSV", "error");
    } finally {
      clearInterval(progressTimer);
      setTimeout(() => {
        isUploading = false;
        uploadProgress = 0;
      }, 400);
    }
  }

  // --- Sync to Master Data Handler ---
  async function handleSyncToMaster() {
    isSyncingMaster = true;
    try {
      const res = await apiRequest("/api/v1/p3k-csv-import/sync-master", "POST");
      if (res && res.success) {
        addToast(res.message || "Data berhasil disinkronkan ke Data Utama (data_p3k)", "success");
        showConfirmSyncModal = false;
        await fetchMasterData(1);
      } else {
        addToast(res.message || "Gagal menyinkronkan data ke Data Utama", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memindahkan data", "error");
    } finally {
      isSyncingMaster = false;
    }
  }

  // --- Modal Helpers ---
  function openDetail(item) {
    selectedRecord = item;
    showDetailModal = true;
  }

  function closeDetail() {
    selectedRecord = null;
    showDetailModal = false;
  }

  function copyToClipboard(text, label = "Teks") {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addToast(`${label} disalin ke clipboard`, "info");
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }
</script>

<svelte:head>
  <title>P3K Full Waktu (SIASN) — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header Card -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">P3K Full Waktu (SIASN)</h1>
          <p class="text-xs sm:text-sm text-slate-500">Kelola, impor, dan pindahkan data profil SIASN P3K Full Waktu ke tabel data utama</p>
        </div>
      </div>
    </div>

    <!-- Status Pills -->
    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
      <div class="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-slate-700">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        Data Import: <span class="font-bold text-blue-700">{pagination.total.toLocaleString()}</span>
      </div>

      <div class="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-indigo-700">
        <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
        Data Utama: <span class="font-bold text-indigo-900">{masterPagination.total.toLocaleString()}</span>
      </div>

      {#if lastImportTime}
        <div class="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Import Terakhir: <b class="font-bold">{formatDateTime(lastImportTime)}</b>
        </div>
      {/if}
    </div>
  </div>

  <!-- Navigation Tabs (Horizontal Non-Wrapping) -->
  <div class="inline-flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl max-w-full overflow-x-auto">
    <button
      type="button"
      onclick={() => (activeTab = "data")}
      class="whitespace-nowrap shrink-0 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 {activeTab === 'data' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      Data Full Waktu
      <span class="text-[10px] px-2 py-0.5 rounded-full {activeTab === 'data' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-700'}">
        {pagination.total}
      </span>
    </button>

    <button
      type="button"
      onclick={() => (activeTab = "upload")}
      class="whitespace-nowrap shrink-0 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 {activeTab === 'upload' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      Import CSV
    </button>

    <button
      type="button"
      onclick={() => { activeTab = "sync"; fetchMasterData(1); }}
      class="whitespace-nowrap shrink-0 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 {activeTab === 'sync' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      Pindahkan ke Data Utama
    </button>
  </div>

  <!-- ==================== TAB 1: DATA FULL WAKTU ==================== -->
  {#if activeTab === "data"}
    <div class="space-y-4">
      <!-- Filter Bar -->
      <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Search -->
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              bind:value={searchTerm}
              oninput={handleSearchInput}
              placeholder="Cari NIP, Nama, Jabatan..."
              class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <!-- Unit Kerja Filter -->
          <div>
            <select
              bind:value={filterUnitKerja}
              onchange={handleFilterChange}
              class="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700"
            >
              <option value="">Semua Unit Kerja ({filterUnors.length})</option>
              {#each filterUnors as u}
                <option value={u}>{u}</option>
              {/each}
            </select>
          </div>

          <!-- Tanggal SK CPNS Filter -->
          <div>
            <input
              type="text"
              bind:value={filterTanggalSkCpns}
              oninput={handleSearchInput}
              placeholder="Filter Tgl SK CPNS (contoh: 2024)"
              class="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <!-- Reset Filter -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={resetFilters}
              class="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Filter
            </button>
            <button
              type="button"
              onclick={() => fetchData(pagination.page)}
              class="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-colors"
              title="Muat Ulang"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Data Table Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {#if isLoadingData}
          <div class="py-16 text-center space-y-3">
            <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-xs text-slate-500 font-medium">Memuat data P3K Full Waktu...</p>
          </div>
        {:else if records.length === 0}
          <div class="py-16 text-center space-y-3 px-4">
            <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-slate-700">Belum Ada Data P3K Full Waktu</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Silakan unggah file CSV data SIASN Full Waktu pada tab <b>Import CSV</b> untuk mengisi tabel ini.</p>
            <div class="pt-2">
              <button
                type="button"
                onclick={() => (activeTab = "upload")}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Buka Tab Import CSV
              </button>
            </div>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th class="py-3 px-4 w-12 text-center">No</th>
                  <th class="py-3 px-4">NIP & Nama Pegawai</th>
                  <th class="py-3 px-4">Unit Kerja (Unor)</th>
                  <th class="py-3 px-4">Jabatan</th>
                  <th class="py-3 px-4">Golongan</th>
                  <th class="py-3 px-4">Pendidikan</th>
                  <th class="py-3 px-4 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each records as item, idx}
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-4 text-center text-slate-400 font-mono">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>

                    <td class="py-3 px-4 min-w-[220px]">
                      <div class="space-y-0.5">
                        <p class="font-bold text-slate-800 flex items-center gap-1">
                          {item.nama}
                          {#if item.gelarBelakang}
                            <span class="font-normal text-slate-500">, {item.gelarBelakang}</span>
                          {/if}
                        </p>
                        <div class="flex items-center gap-1 font-mono text-[11px] text-blue-700">
                          <span>{item.nipBaru}</span>
                          <button
                            type="button"
                            onclick={() => copyToClipboard(item.nipBaru, "NIP")}
                            class="text-slate-400 hover:text-blue-600 p-0.5"
                            title="Salin NIP"
                          >
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>

                    <td class="py-3 px-4 min-w-[200px]">
                      <p class="font-medium text-slate-700 break-words">{item.unorNama || "-"}</p>
                      {#if item.instansiKerjaNama}
                        <p class="text-[10px] text-slate-400">{item.instansiKerjaNama}</p>
                      {/if}
                    </td>

                    <td class="py-3 px-4 min-w-[180px]">
                      <p class="font-medium text-slate-800">{item.jabatanNama || "-"}</p>
                      <p class="text-[10px] text-slate-400">{item.jenisJabatanNama || "Jabatan Pelaksana/Fungsional"}</p>
                    </td>

                    <td class="py-3 px-4 whitespace-nowrap">
                      <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold">
                        {item.golAkhirNama || "-"}
                      </span>
                    </td>

                    <td class="py-3 px-4 min-w-[160px]">
                      <p class="font-medium text-slate-700">{item.pendidikanNama || "-"}</p>
                      {#if item.tingkatPendidikanNama}
                        <p class="text-[10px] text-slate-400">{item.tingkatPendidikanNama} • {item.tahunLulus || ""}</p>
                      {/if}
                    </td>

                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onclick={() => openDetail(item)}
                        class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200 inline-flex items-center gap-1 shadow-2xs"
                        title="Lihat Rincian Pegawai"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detail
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan <b>{(pagination.page - 1) * pagination.limit + 1}</b> - <b>{Math.min(pagination.page * pagination.limit, pagination.total)}</b> dari <b>{pagination.total.toLocaleString()}</b> data
            </div>

            <div class="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onclick={() => fetchData(pagination.page - 1)}
                class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>

              <span class="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold">
                {pagination.page} / {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onclick={() => fetchData(pagination.page + 1)}
                class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>

  <!-- ==================== TAB 2: UPLOAD CSV ==================== -->
  {:else if activeTab === "upload"}
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="p-6 sm:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <h2 class="text-base font-bold text-slate-800">Unggah File CSV SIASN Full Waktu</h2>
            <p class="text-xs text-slate-500 mt-0.5">Format file yang didukung: <code class="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono">.csv</code> dengan delimiter pipe (|), titik koma (;), atau koma (,)</p>
          </div>

          <button
            type="button"
            onclick={() => (showHeaderGuide = !showHeaderGuide)}
            class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto border border-blue-200"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showHeaderGuide ? 'Sembunyikan Panduan Header' : 'Lihat Format Header (63 Kolom)'}
          </button>
        </div>

        <!-- Header Guide Collapse -->
        {#if showHeaderGuide}
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Header Kolom CSV yang Dikenali ({EXPECTED_HEADERS.length} Kolom):</h4>
              <button
                type="button"
                onclick={() => copyToClipboard(EXPECTED_HEADERS.join('|'), 'Header pipe (|)')}
                class="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Salin Header (Format Pipe |)
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
              {#each EXPECTED_HEADERS as h}
                <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-medium border border-slate-200">
                  {h}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Drag & Drop Upload Zone -->
        <div class="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-8 sm:p-12 text-center transition-all">
          <input
            type="file"
            id="csvFullWaktuFileInput"
            accept=".csv,text/csv"
            bind:files
            disabled={isUploading}
            class="hidden"
            onchange={() => {
              if (files && files.length > 0) {
                addToast(`File terpilih: ${files[0].name}`, 'info');
              }
            }}
          />

          <label for="csvFullWaktuFileInput" class="cursor-pointer block space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <div>
              {#if files && files.length > 0}
                <p class="text-base font-bold text-blue-700">{files[0].name}</p>
                <p class="text-xs text-slate-500 mt-1 font-mono">{(files[0].size / 1024).toFixed(1)} KB — Siap diunggah</p>
              {:else}
                <p class="text-base font-bold text-slate-700">Pilih atau Drag & Drop file CSV SIASN di sini</p>
                <p class="text-xs text-slate-400 mt-1">Maksimal ukuran berkas 50 MB</p>
              {/if}
            </div>

            <div class="pt-2">
              <span class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm">
                Telusuri File CSV
              </span>
            </div>
          </label>
        </div>

        <!-- Upload Progress -->
        {#if isUploading}
          <div class="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-fadeIn">
            <div class="flex justify-between text-xs font-semibold text-slate-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin text-blue-600" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Memproses baris CSV ke database...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 transition-all duration-300" style="width: {uploadProgress}%"></div>
            </div>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-2">
          {#if files && files.length > 0}
            <button
              type="button"
              onclick={() => (files = null)}
              disabled={isUploading}
              class="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              Batalkan
            </button>
          {/if}

          <button
            type="button"
            onclick={handleUpload}
            disabled={!files || files.length === 0 || isUploading}
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {#if isUploading}
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              Sedang Mengimpor...
            {:else}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Mulai Impor CSV
            {/if}
          </button>
        </div>
      </div>
    </div>

  <!-- ==================== TAB 3: PINDAHKAN KE DATA UTAMA ==================== -->
  {:else if activeTab === "sync"}
    <div class="space-y-6">
      <!-- Sync Action Card -->
      <div class="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-2 max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-semibold">
              <svg class="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Sinkronisasi ke Tabel <code class="font-mono text-amber-900 font-bold">data_p3k</code>
            </div>
            <h2 class="text-lg font-bold text-slate-800">Pindahkan Data Hasil Import ke Data Utama</h2>
            <p class="text-xs text-slate-600 leading-relaxed">
              Fitur ini akan menyalin seluruh rekaman dari tabel hasil import CSV (<code class="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">p3k_csv_imports</code>) ke tabel data utama (<code class="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">data_p3k</code>). Data yang sudah ada tidak akan diduplikasi, dan data baru akan otomatis ditambahkan ke basis data master.
            </p>
          </div>

          <!-- Sync Trigger Button -->
          <div class="shrink-0">
            <button
              type="button"
              disabled={pagination.total === 0 || isSyncingMaster}
              onclick={() => (showConfirmSyncModal = true)}
              class="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {#if isSyncingMaster}
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Sedang Menyinkronkan...
              {:else}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Pindahkan ke Data Utama ({pagination.total} Data)
              {/if}
            </button>
          </div>
        </div>

        <!-- Summary KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Hasil Import (CSV)</span>
            <p class="text-xl font-extrabold text-blue-700">{pagination.total.toLocaleString()}</p>
            <p class="text-[10px] text-slate-500">Tabel p3k_csv_imports</p>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Utama Tersimpan</span>
            <p class="text-xl font-extrabold text-indigo-700">{masterPagination.total.toLocaleString()}</p>
            <p class="text-[10px] text-slate-500">Tabel data_p3k</p>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Sinkronisasi</span>
            {#if pagination.total > 0 && masterPagination.total >= pagination.total}
              <div class="flex items-center gap-1.5 text-emerald-700 font-bold text-sm pt-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Tersinkronisasi
              </div>
              <p class="text-[10px] text-slate-500">Data utama telah mutakhir</p>
            {:else if pagination.total > 0}
              <div class="flex items-center gap-1.5 text-amber-700 font-bold text-sm pt-1">
                <svg class="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Perlu Sinkronisasi
              </div>
              <p class="text-[10px] text-slate-500">Klik tombol pindahkan di atas</p>
            {:else}
              <p class="text-sm font-bold text-slate-400 pt-1">Belum Ada Data Import</p>
              <p class="text-[10px] text-slate-500">Impor CSV terlebih dahulu</p>
            {/if}
          </div>
        </div>
      </div>

      <!-- Master Data Table Section -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h3 class="text-sm font-bold text-slate-800">Daftar Data Utama (data_p3k)</h3>
            <p class="text-xs text-slate-500">Pratinjau data master utama P3K Full Waktu yang aktif</p>
          </div>

          <!-- Search in Master -->
          <div class="relative w-full sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              bind:value={masterSearchQuery}
              oninput={handleMasterSearchInput}
              placeholder="Cari di data utama..."
              class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <!-- Master Table -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {#if isLoadingMaster}
            <div class="py-16 text-center space-y-3">
              <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p class="text-xs text-slate-500 font-medium">Memuat data utama...</p>
            </div>
          {:else if masterRecords.length === 0}
            <div class="py-16 text-center space-y-3 px-4">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 class="text-base font-bold text-slate-700">Data Utama Masih Kosong</h3>
              <p class="text-xs text-slate-400 max-w-sm mx-auto">Klik tombol <b>Pindahkan ke Data Utama</b> di atas untuk menyinkronkan data dari hasil import CSV.</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th class="py-3 px-4 w-12 text-center">No</th>
                    <th class="py-3 px-4">NIP & Nama Pegawai</th>
                    <th class="py-3 px-4">Unit Kerja (Unor)</th>
                    <th class="py-3 px-4">Unit Kerja Induk (Mapping)</th>
                    <th class="py-3 px-4">Jabatan</th>
                    <th class="py-3 px-4">Golongan</th>
                    <th class="py-3 px-4 text-center w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each masterRecords as item, idx}
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 px-4 text-center text-slate-400 font-mono">
                        {(masterPagination.page - 1) * masterPagination.limit + idx + 1}
                      </td>

                      <td class="py-3 px-4 min-w-[200px]">
                        <p class="font-bold text-slate-800">{item.nama} {item.gelarBelakang || ''}</p>
                        <p class="text-[11px] text-blue-700 font-mono">{item.nipBaru}</p>
                      </td>

                      <td class="py-3 px-4 min-w-[180px]">
                        <p class="font-medium text-slate-700">{item.unorNama || '-'}</p>
                      </td>

                      <td class="py-3 px-4 min-w-[200px]">
                        {#if item.unorInduk?.nama}
                          <span class="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {item.unorInduk.nama}
                          </span>
                        {:else}
                          <span class="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-medium">
                            Belum Dipetakan
                          </span>
                        {/if}
                      </td>

                      <td class="py-3 px-4 min-w-[160px]">
                        <p class="font-medium text-slate-800">{item.jabatanNama || '-'}</p>
                      </td>

                      <td class="py-3 px-4 whitespace-nowrap">
                        <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-bold">
                          {item.golAkhirNama || '-'}
                        </span>
                      </td>

                      <td class="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onclick={() => openDetail(item)}
                          class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <!-- Master Pagination Footer -->
            <div class="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Menampilkan <b>{(masterPagination.page - 1) * masterPagination.limit + 1}</b> - <b>{Math.min(masterPagination.page * masterPagination.limit, masterPagination.total)}</b> dari <b>{masterPagination.total.toLocaleString()}</b> data utama
              </div>

              <div class="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={masterPagination.page <= 1}
                  onclick={() => fetchMasterData(masterPagination.page - 1)}
                  class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>

                <span class="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold">
                  {masterPagination.page} / {masterPagination.totalPages || 1}
                </span>

                <button
                  type="button"
                  disabled={masterPagination.page >= masterPagination.totalPages}
                  onclick={() => fetchMasterData(masterPagination.page + 1)}
                  class="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- ==================== DETAIL EMPLOYEE MODAL ==================== -->
{#if showDetailModal && selectedRecord}
  {@const ret = calculateRetirement(selectedRecord.tanggalLahir)}
  <div
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 transition-all"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Modal Header -->
      <div class="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[10px] font-bold uppercase tracking-wider">
              P3K Full Waktu
            </span>
          </div>
          <h3 class="text-lg font-bold text-white">{selectedRecord.nama} {selectedRecord.gelarBelakang || ''}</h3>
          <p class="text-xs text-slate-300 font-mono">NIP: {selectedRecord.nipBaru} • NIK: {selectedRecord.nik || '-'}</p>
        </div>

        <button
          type="button"
          onclick={closeDetail}
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
        <!-- Section 1: Kepegawaian & Posisi -->
        <div>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Kepegawaian & Posisi</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span class="text-[10px] text-slate-400 block">Unit Kerja (Unor Asal)</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.unorNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Unit Kerja Induk (Mapping)</span>
              <p class="font-semibold text-blue-700 mt-0.5">{selectedRecord.unorInduk?.nama || 'Belum Dipetakan'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Jabatan</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.jabatanNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Golongan Akhir</span>
              <p class="font-bold text-indigo-700 mt-0.5">{selectedRecord.golAkhirNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Masa Kerja</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.mkTahun ?? '-'} Tahun {selectedRecord.mkBulan ?? '-'} Bulan</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Status CPNS / PNS</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.statusCpnsPns || '-'}</p>
            </div>
          </div>
        </div>

        <!-- Section 2: Pensiun & Usia -->
        {#if ret}
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estimasi Usia Pensiun (BUP 58 Tahun)</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span class="text-[10px] text-slate-400 block">Usia Saat Ini</span>
                <p class="font-semibold text-slate-800 mt-0.5">{calculateAge(selectedRecord.tanggalLahir)}</p>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block">TMT BUP Pensiun</span>
                <p class="font-bold text-blue-700 mt-0.5">{ret.tmtDateString}</p>
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block">Sisa Waktu Kerja</span>
                <p class="font-bold mt-0.5 {ret.isRetired ? 'text-rose-600' : 'text-emerald-700'}">{ret.remainingText}</p>
              </div>
            </div>
          </div>
        {/if}

        <!-- Section 3: Biodata Pribadi -->
        <div>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Biodata Pribadi</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span class="text-[10px] text-slate-400 block">Tempat, Tanggal Lahir</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.tempatLahirNama || '-'}, {selectedRecord.tanggalLahir || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Jenis Kelamin</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.jenisKelamin === 'L' ? 'Laki-laki' : selectedRecord.jenisKelamin === 'P' ? 'Perempuan' : '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Agama</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.agamaNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Nomor HP</span>
              <p class="font-semibold text-slate-800 mt-0.5 font-mono">{selectedRecord.nomorHp || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Email</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.email || selectedRecord.emailGov || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">NPWP / BPJS</span>
              <p class="font-semibold text-slate-800 mt-0.5 font-mono">{selectedRecord.npwpNomor || '-'} / {selectedRecord.bpjs || '-'}</p>
            </div>
            <div class="sm:col-span-3">
              <span class="text-[10px] text-slate-400 block">Alamat</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.alamat || '-'}</p>
            </div>
          </div>
        </div>

        <!-- Section 4: Pendidikan & Surat Keputusan -->
        <div>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pendidikan & Surat Keputusan (SK)</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span class="text-[10px] text-slate-400 block">Pendidikan Terakhir</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.tingkatPendidikanNama || '-'} - {selectedRecord.pendidikanNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Tahun Lulus / Sekolah</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.tahunLulus || '-'} ({selectedRecord.namaSekolah || '-'})</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Nomor & Tgl SK Pengangkatan</span>
              <p class="font-mono text-slate-800 mt-0.5">{selectedRecord.nomorSkCpns || '-'} ({selectedRecord.tanggalSkCpns || '-'})</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">TMT CPNS / PPPK</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.tmtCpns || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
        <button
          type="button"
          onclick={closeDetail}
          class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Tutup Rincian
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ==================== CONFIRM SYNC MODAL ==================== -->
{#if showConfirmSyncModal}
  <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white max-w-md w-full p-6 rounded-2xl shadow-xl space-y-4 border border-amber-200">
      <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-800">Pindahkan Data ke Data Utama?</h3>
      <p class="text-xs text-slate-600 leading-relaxed">
        Apakah Anda yakin ingin memindahkan <b>{pagination.total.toLocaleString()} rekaman data</b> dari tabel hasil import ke tabel <b>data_p3k</b> (Data Utama Full Waktu)?
      </p>
      <div class="flex justify-end gap-2 pt-2">
        <button
          type="button"
          disabled={isSyncingMaster}
          onclick={() => (showConfirmSyncModal = false)}
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={isSyncingMaster}
          onclick={handleSyncToMaster}
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          {#if isSyncingMaster}
            Memproses...
          {:else}
            Ya, Pindahkan Sekarang
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
