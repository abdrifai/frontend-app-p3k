<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";

  // --- Tab Navigation State ---
  let activeTab = "data"; // "data", "upload", "stats"

  // --- Upload State ---
  let files = null;
  let isUploading = false;
  let uploadProgress = 0;
  let showHeaderGuide = false;

  // --- Data List State ---
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

  // --- Stats State ---
  let stats = null;
  let statsLoading = false;
  let activeStatCategory = "unitKerja"; // "unitKerja", "pendidikan", "jabatan", "golongan"

  // --- Detail Modal State ---
  let selectedRecord = null;
  let showDetailModal = false;

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
      bDay = parseInt(parts[0]);
      bMonth = parseInt(parts[1]) - 1;
      bYear = parseInt(parts[2]);
    } else {
      bYear = parseInt(parts[0]);
      bMonth = parseInt(parts[1]) - 1;
      bDay = parseInt(parts[2]);
    }

    const retirementDate = new Date(bYear + RETIREMENT_AGE, bMonth, bDay);
    if (isNaN(retirementDate.getTime())) return null;

    const today = new Date();
    const isPast = retirementDate <= today;

    let targetDate, refDate;
    if (isPast) {
      targetDate = today;
      refDate = retirementDate;
    } else {
      targetDate = retirementDate;
      refDate = today;
    }

    let years = targetDate.getFullYear() - refDate.getFullYear();
    let months = targetDate.getMonth() - refDate.getMonth();
    let days = targetDate.getDate() - refDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const retDateStr = `${String(retirementDate.getDate()).padStart(2, "0")}-${String(retirementDate.getMonth() + 1).padStart(2, "0")}-${retirementDate.getFullYear()}`;

    return {
      date: retDateStr,
      isPast,
      remaining: `${years} thn, ${months} bln, ${days} hari`,
      retirementYear: bYear + RETIREMENT_AGE,
    };
  };

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }

    // Check URL tab param
    const tabParam = $page.url.searchParams.get("tab");
    if (tabParam === "upload" || tabParam === "stats" || tabParam === "data") {
      activeTab = tabParam;
    }

    await Promise.all([
      fetchData(1),
      fetchLastImportTime(),
      fetchStats()
    ]);
  });

  async function fetchData(page = 1) {
    isLoadingData = true;
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm.trim()) queryParams.append("search", searchTerm.trim());
      if (filterUnitKerja) queryParams.append("unitKerja", filterUnitKerja);
      if (filterTanggalSkCpns) queryParams.append("tanggalSkCpns", filterTanggalSkCpns);

      const res = await apiRequest(`/api/v1/p3k-csv-import?${queryParams.toString()}`, "GET");
      if (res && res.success) {
        records = res.data || [];
        const meta = res.meta || res.pagination || {};
        pagination = {
          page: meta.page || page,
          limit: meta.limit || pagination.limit,
          total: meta.total || 0,
          totalPages: meta.totalPages || 1,
        };

        // Extract distinct Unors for filters if empty
        if (filterUnors.length === 0 && records.length > 0) {
          extractUnorFilters();
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

  async function extractUnorFilters() {
    try {
      const statsRes = await apiRequest("/api/v1/p3k-csv-import/statistics", "GET");
      if (statsRes && statsRes.success && statsRes.data?.byUnitKerja) {
        filterUnors = statsRes.data.byUnitKerja.map(u => u.name).filter(Boolean);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchLastImportTime() {
    try {
      const res = await apiRequest("/api/v1/p3k-csv-import/last-import-time", "GET");
      if (res && res.success && res.data?.lastImportTime) {
        lastImportTime = res.data.lastImportTime;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchStats() {
    statsLoading = true;
    try {
      const res = await apiRequest("/api/v1/p3k-csv-import/statistics", "GET");
      if (res && res.success) {
        stats = res.data;
        if (stats?.byUnitKerja && filterUnors.length === 0) {
          filterUnors = stats.byUnitKerja.map(u => u.name).filter(Boolean);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      statsLoading = false;
    }
  }

  function getCurrentStatList() {
    if (!stats) return [];
    if (activeStatCategory === 'unitKerja') return stats.byUnitKerja || [];
    if (activeStatCategory === 'pendidikan') return stats.byPendidikan || [];
    if (activeStatCategory === 'jabatan') return stats.byJenisJabatan || [];
    if (activeStatCategory === 'golongan') return stats.byGolongan || [];
    return [];
  }

  function handleSearchInput() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchData(1);
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
        uploadProgress += Math.floor(Math.random() * 10) + 2;
        if (uploadProgress > 90) uploadProgress = 90;
      }
    }, 300);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiRequest("/api/v1/p3k-csv-import", "POST", formData, true);
      uploadProgress = 100;

      if (res && res.success) {
        addToast(`Berhasil mengimpor ${res.data?.importedCount || 0} data PPPK Penuh Waktu`, "success");
        files = null;
        await Promise.all([
          fetchData(1),
          fetchLastImportTime(),
          fetchStats()
        ]);
        activeTab = "data";
      } else {
        addToast(res.message || "Gagal mengimpor data", "error");
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

  function openDetail(rec) {
    selectedRecord = rec;
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
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
  <!-- Page Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">P3K Full Waktu (SIASN)</h1>
          <p class="text-xs sm:text-sm text-slate-500">Kelola dan impor data profil SIASN P3K Full Waktu melalui file CSV</p>
        </div>
      </div>
    </div>

    <!-- Actions & Stats Pill -->
    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
      {#if lastImportTime}
        <div class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600">
          Terakhir Import: <span class="font-bold text-slate-800">{formatDateTime(lastImportTime)}</span>
        </div>
      {/if}

      <div class="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-800">
        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
        Total Data: <span class="font-bold text-blue-900">{pagination.total.toLocaleString()}</span>
      </div>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="flex items-center gap-1 p-1 bg-slate-200/60 rounded-xl max-w-md">
    <button
      type="button"
      onclick={() => (activeTab = "data")}
      class="flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 {activeTab === 'data' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      Data Full Waktu
      <span class="text-[10px] px-1.5 py-0.2 rounded-full {activeTab === 'data' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-700'}">
        {pagination.total}
      </span>
    </button>

    <button
      type="button"
      onclick={() => (activeTab = "upload")}
      class="flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 {activeTab === 'upload' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      Import CSV
    </button>

    <button
      type="button"
      onclick={() => { activeTab = "stats"; fetchStats(); }}
      class="flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 {activeTab === 'stats' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      Statistik
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
              placeholder="Filter Tgl SK CPNS (contoh: 2024)..."
              class="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <!-- Actions: Reset & Reload -->
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
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Silakan unggah file CSV data SIASN pada tab <b>Import CSV</b> untuk mengisi tabel ini.</p>
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
                      <span class="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-bold">
                        {item.golAkhirNama || item.golAwalNama || "-"}
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
                        class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200 flex items-center gap-1 shadow-2xs mx-auto"
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
        <!-- Header Info -->
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
            {showHeaderGuide ? "Sembunyikan Panduan Header" : "Lihat Format Header (68 Kolom)"}
          </button>
        </div>

        <!-- Panduan Header Collapse -->
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
                addToast(`File terpilih: ${files[0].name}`, "info");
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

        <!-- Upload Progress Bar -->
        {#if isUploading}
          <div class="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-fadeIn">
            <div class="flex justify-between text-xs font-semibold text-slate-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin text-blue-600" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Memproses dan memvalidasi baris CSV ke database...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 transition-all duration-300" style="width: {uploadProgress}%"></div>
            </div>
          </div>
        {/if}

        <!-- Upload Action Button -->
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

  <!-- ==================== TAB 3: STATISTIK ==================== -->
  {:else if activeTab === "stats"}
    <div class="space-y-6">
      {#if statsLoading}
        <div class="py-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8">
          <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-xs text-slate-500 font-medium">Menghitung statistik data...</p>
        </div>
      {:else if !stats || stats.total === 0}
        <div class="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <p class="text-sm font-bold text-slate-700">Belum ada data untuk dianalisis</p>
          <p class="text-xs text-slate-400">Silakan import data terlebih dahulu melalui tab Import CSV.</p>
        </div>
      {:else}
        <!-- Top Stats KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pegawai Full Waktu</span>
            <p class="text-2xl font-extrabold text-blue-700">{stats.total.toLocaleString()}</p>
            <p class="text-[11px] text-slate-500">Tercatat di data import</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Kerja</span>
            <p class="text-2xl font-extrabold text-emerald-700">{(stats.byUnitKerja || []).length}</p>
            <p class="text-[11px] text-slate-500">Total Unit Kerja Terdata</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tingkat Pendidikan</span>
            <p class="text-2xl font-extrabold text-amber-700">{(stats.byPendidikan || []).length}</p>
            <p class="text-[11px] text-slate-500">Jenjang Pendidikan Terdata</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Golongan Terbanyak</span>
            <p class="text-2xl font-extrabold text-indigo-700">{stats.byGolongan?.[0]?.name || '-'}</p>
            <p class="text-[11px] text-slate-500">{stats.byGolongan?.[0]?.count || 0} Pegawai</p>
          </div>
        </div>

        <!-- Category Selector -->
        <div class="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {#each [
            { id: 'unitKerja', label: 'Unit Kerja' },
            { id: 'pendidikan', label: 'Pendidikan' },
            { id: 'jabatan', label: 'Jenis Jabatan' },
            { id: 'golongan', label: 'Golongan' }
          ] as cat}
            <button
              type="button"
              onclick={() => (activeStatCategory = cat.id)}
              class="px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap {activeStatCategory === cat.id ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}"
            >
              {cat.label}
            </button>
          {/each}
        </div>

        <!-- Breakdown List -->
        <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 class="text-sm font-bold text-slate-800">
            Distribusi Berdasarkan {activeStatCategory === 'unitKerja' ? 'Unit Kerja' : activeStatCategory === 'pendidikan' ? 'Pendidikan' : activeStatCategory === 'jabatan' ? 'Jenis Jabatan' : 'Golongan'}
          </h3>

          <div class="space-y-3">
            {#each getCurrentStatList() as item}
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="font-medium text-slate-700 truncate pr-3" title={item.name}>{item.name || 'Tanpa Keterangan'}</span>
                  <span class="font-bold text-slate-800 shrink-0">{item.count.toLocaleString()} ({Math.round((item.count / stats.total) * 100)}%)</span>
                </div>
                <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: {(item.count / stats.total) * 100}%"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
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
            {#if ret?.isPast}
              <span class="px-2 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-400/40 rounded text-[10px] font-bold uppercase tracking-wider">
                Mencapai Batas Usia Pensiun
              </span>
            {/if}
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
              <span class="text-[10px] text-slate-400 block">Unit Kerja (Unor)</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.unorNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Jabatan</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.jabatanNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Golongan Akhir</span>
              <p class="font-bold text-blue-700 mt-0.5">{selectedRecord.golAkhirNama || selectedRecord.golAwalNama || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Masa Kerja</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.mkTahun ?? '-'} Tahun {selectedRecord.mkBulan ?? '-'} Bulan</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Status CPNS / PNS</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.statusCpnsPns || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Kedudukan Hukum</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.kedudukanHukumNama || '-'}</p>
            </div>
          </div>
        </div>

        <!-- Section 2: Biodata Pribadi & Pensiun -->
        <div>
          <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Biodata Pribadi</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span class="text-[10px] text-slate-400 block">Tempat, Tanggal Lahir</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.tempatLahirNama || '-'}, {selectedRecord.tanggalLahir || '-'}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Usia Saat Ini</span>
              <p class="font-semibold text-slate-800 mt-0.5">{calculateAge(selectedRecord.tanggalLahir)}</p>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">Jenis Kelamin</span>
              <p class="font-semibold text-slate-800 mt-0.5">{selectedRecord.jenisKelamin === 'L' ? 'Laki-laki' : selectedRecord.jenisKelamin === 'P' ? 'Perempuan' : '-'}</p>
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

        <!-- Section 3: Pendidikan & Surat Keputusan -->
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
