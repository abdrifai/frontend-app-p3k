<script>
  import { onMount } from "svelte";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import { goto } from "$app/navigation";

  let isLoading = $state(true);
  let selectedKegiatan = $state("");
  let stats = $state({
    summary: {
      totalPegawaiAktif: 0,
      totalAssigned: 0,
      totalCompleted: 0,
      totalPending: 0,
      totalUnassigned: 0,
      totalSkCpnsUploaded: 0,
      completionPercentage: 0,
      assignmentPercentage: 0
    },
    byOperator: [],
    byUnor: [],
    recentCompleted: [],
    kegiatanList: []
  });

  let selectedTab = $state("operator"); // "operator", "unor", "recent", "records"
  let searchOperator = $state("");
  let searchUnor = $state("");
  let searchRecent = $state("");

  // Pagination for UNOR tab
  let pageUnor = $state(1);
  let limitUnor = $state(10);

  // Pagination for Operator tab
  let pageOperator = $state(1);
  let limitOperator = $state(10);

  // Pagination for Recent tab
  let pageRecent = $state(1);
  let limitRecent = $state(10);

  const limitOptions = [10, 25, 50, 100];

  // Records Tab (Server-side paginated & filtered)
  let records = $state([]);
  let recordsLoading = $state(false);
  let recordStatus = $state(""); // "", "completed", "pending", "unassigned"
  let recordSearch = $state("");
  let recordPage = $state(1);
  let recordLimit = $state(10);
  let recordMeta = $state({ total: 0, page: 1, limit: 10, totalPages: 1 });
  let recordSearchTimeout = null;

  // Modal Drilldown Detail
  let showDetailModal = $state(false);
  let detailTitle = $state("");
  let detailStatus = $state("");
  let detailUserId = $state("");
  let detailUnorNama = $state("");
  let detailSearch = $state("");
  let detailPage = $state(1);
  let detailLimit = $state(10);
  let detailLoading = $state(false);
  let detailRecords = $state([]);
  let detailMeta = $state({ total: 0, page: 1, limit: 10, totalPages: 1 });
  let detailSearchTimeout = null;

  // Reactive role check
  let userRoles = $derived(
    Array.isArray($authStore.user?.roles) && $authStore.user.roles.length > 0
      ? $authStore.user.roles.map(r => String(r).toLowerCase().trim())
      : String($authStore.user?.role || '').toLowerCase().split(',').map(r => r.trim()).filter(Boolean)
  );
  let isAdmin = $derived(userRoles.some(r => ['admin', 'admin_utama', 'superadmin'].includes(r)));

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Silakan login terlebih dahulu untuk mengakses menu ini", "error");
      goto("/login");
      return;
    }
    await fetchDashboardStats();
  });

  async function fetchDashboardStats() {
    isLoading = true;
    try {
      const url = selectedKegiatan 
        ? `/api/tasks/dashboard-stats?kegiatan=${encodeURIComponent(selectedKegiatan)}`
        : "/api/tasks/dashboard-stats";
      const res = await apiRequest(url);
      if (res && res.success) {
        stats = res.data;
      } else {
        addToast(res?.message || "Gagal memuat statistik dashboard", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memuat data dashboard", "error");
    } finally {
      isLoading = false;
    }
  }

  async function handleKegiatanChange() {
    pageOperator = 1;
    pageUnor = 1;
    pageRecent = 1;
    recordPage = 1;
    await fetchDashboardStats();
    if (selectedTab === 'records') {
      await fetchRecords(1);
    }
  }

  // --- Filtering & Pagination for In-Memory Tabs using $derived ---
  let filteredOperators = $derived((stats.byOperator || []).filter(o => 
    (o.namaLengkap || "").toLowerCase().includes(searchOperator.toLowerCase()) ||
    (o.username || "").toLowerCase().includes(searchOperator.toLowerCase())
  ));
  let totalPagesOperator = $derived(Math.max(1, Math.ceil(filteredOperators.length / limitOperator)));
  let displayedOperators = $derived(filteredOperators.slice((pageOperator - 1) * limitOperator, pageOperator * limitOperator));

  let filteredUnor = $derived((stats.byUnor || []).filter(u => 
    (u.unorNama || "").toLowerCase().includes(searchUnor.toLowerCase())
  ));
  let totalPagesUnor = $derived(Math.max(1, Math.ceil(filteredUnor.length / limitUnor)));
  let displayedUnor = $derived(filteredUnor.slice((pageUnor - 1) * limitUnor, pageUnor * limitUnor));

  let filteredRecent = $derived((stats.recentCompleted || []).filter(r => 
    (r.dataP3k?.nama || "").toLowerCase().includes(searchRecent.toLowerCase()) ||
    (r.dataP3k?.nipBaru || "").toLowerCase().includes(searchRecent.toLowerCase()) ||
    (r.dataP3k?.unorNama || "").toLowerCase().includes(searchRecent.toLowerCase()) ||
    (r.operator?.namaLengkap || "").toLowerCase().includes(searchRecent.toLowerCase()) ||
    (r.operator?.username || "").toLowerCase().includes(searchRecent.toLowerCase())
  ));
  let totalPagesRecent = $derived(Math.max(1, Math.ceil(filteredRecent.length / limitRecent)));
  let displayedRecent = $derived(filteredRecent.slice((pageRecent - 1) * limitRecent, pageRecent * limitRecent));

  // --- Records Tab Fetching ---
  async function fetchRecords(page = 1) {
    recordsLoading = true;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(recordLimit),
        status: recordStatus,
        search: recordSearch,
        ...(selectedKegiatan ? { kegiatan: selectedKegiatan } : {})
      });
      const res = await apiRequest(`/api/tasks/dashboard-detail?${params.toString()}`);
      if (res && res.success) {
        records = res.data || [];
        recordMeta = res.meta || { total: 0, page: 1, limit: recordLimit, totalPages: 1 };
      }
    } catch (err) {
      console.error(err);
      addToast("Gagal memuat rincian data pegawai", "error");
    } finally {
      recordsLoading = false;
    }
  }

  function handleRecordSearch(e) {
    recordSearch = e.target.value;
    if (recordSearchTimeout) clearTimeout(recordSearchTimeout);
    recordSearchTimeout = setTimeout(() => {
      recordPage = 1;
      fetchRecords(1);
    }, 350);
  }

  function handleRecordStatusChange(status) {
    recordStatus = status;
    recordPage = 1;
    fetchRecords(1);
  }

  // --- Modal Drilldown Fetching ---
  async function openDrilldownModal({ title, status = "", userId = "", unorNama = "" }) {
    detailTitle = title;
    detailStatus = status;
    detailUserId = userId;
    detailUnorNama = unorNama;
    detailSearch = "";
    detailPage = 1;
    showDetailModal = true;
    await fetchDetailRecords(1);
  }

  async function fetchDetailRecords(page = 1) {
    detailLoading = true;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(detailLimit),
        status: detailStatus,
        userId: detailUserId,
        unorNama: detailUnorNama,
        search: detailSearch,
        ...(selectedKegiatan ? { kegiatan: selectedKegiatan } : {})
      });
      const res = await apiRequest(`/api/tasks/dashboard-detail?${params.toString()}`);
      if (res && res.success) {
        detailRecords = res.data || [];
        detailMeta = res.meta || { total: 0, page: 1, limit: detailLimit, totalPages: 1 };
      }
    } catch (err) {
      console.error(err);
    } finally {
      detailLoading = false;
    }
  }

  function handleDetailSearch(e) {
    detailSearch = e.target.value;
    if (detailSearchTimeout) clearTimeout(detailSearchTimeout);
    detailSearchTimeout = setTimeout(() => {
      detailPage = 1;
      fetchDetailRecords(1);
    }, 350);
  }

  function closeDetailModal() {
    showDetailModal = false;
    detailRecords = [];
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateStr;
    }
  }
</script>

<svelte:head>
  <title>Dashboard Task Peremajaan Data — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
  <!-- Page Header & Actions -->
  <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
          <i class="ri-dashboard-3-line text-xl"></i>
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Dashboard Task Peremajaan Data P3K
          </h1>
          <p class="text-xs sm:text-sm text-slate-500">
            Monitoring progres pengerjaan data peremajaan P3K, kinerja operator, dan verifikasi dokumen SK.
          </p>
        </div>
      </div>
    </div>

    <!-- Filter & Action Buttons -->
    <div class="flex flex-wrap items-center gap-2.5">
      <!-- Kegiatan Filter Dropdown -->
      <div class="relative min-w-[200px]">
        <label for="kegiatanFilter" class="sr-only">Filter Kegiatan</label>
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <i class="ri-calendar-event-line text-sm"></i>
        </div>
        <select
          id="kegiatanFilter"
          bind:value={selectedKegiatan}
          onchange={handleKegiatanChange}
          class="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
        >
          <option value="">Semua Kegiatan (Seluruh Data)</option>
          {#each stats.kegiatanList || [] as keg}
            <option value={keg}>{keg}</option>
          {/each}
        </select>
      </div>

      <!-- Quick Action: Refresh -->
      <button
        onclick={fetchDashboardStats}
        disabled={isLoading}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
        title="Muat Ulang Data"
      >
        <i class="ri-refresh-line text-sm {isLoading ? 'animate-spin' : ''}"></i>
        <span class="hidden sm:inline">Refresh</span>
      </button>

      <!-- Quick Action: Task Page -->
      <a
        href="/task-user-peremajaan"
        class="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
      >
        <i class="ri-edit-circle-line text-sm"></i>
        <span>Kerjakan Tugas Saya</span>
      </a>

      <!-- Quick Action: Setting Task (Admin Only) -->
      {#if isAdmin}
        <a
          href="/setting/pembagian-task-peremajaan"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition-colors"
          title="Atur Pembagian Tugas Operator"
        >
          <i class="ri-user-shared-line text-sm"></i>
          <span class="hidden md:inline">Pembagian Tugas</span>
        </a>
      {/if}
    </div>
  </div>

  <!-- Summary KPI Cards (6 Grid) -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
    <!-- 1. Total Pegawai Aktif -->
    <div
      role="button"
      tabindex="0"
      onclick={() => openDrilldownModal({ title: "Daftar Seluruh Pegawai P3K Aktif", status: "" })}
      onkeydown={(e) => e.key === 'Enter' && openDrilldownModal({ title: "Daftar Seluruh Pegawai P3K Aktif", status: "" })}
      class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pegawai</span>
        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="ri-team-line text-base"></i>
        </div>
      </div>
      <div>
        <p class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
          {stats.summary.totalPegawaiAktif.toLocaleString('id-ID')}
        </p>
        <p class="text-[11px] text-slate-400 mt-0.5">Pegawai P3K Aktif</p>
      </div>
    </div>

    <!-- 2. Total Tugas Dibagikan -->
    <div
      role="button"
      tabindex="0"
      onclick={() => openDrilldownModal({ title: "Daftar Tugas yang Sudah Dibagikan ke Operator", status: "" })}
      onkeydown={(e) => e.key === 'Enter' && openDrilldownModal({ title: "Daftar Tugas yang Sudah Dibagikan ke Operator", status: "" })}
      class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Dibagikan</span>
        <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="ri-user-shared-line text-base"></i>
        </div>
      </div>
      <div>
        <p class="text-2xl sm:text-3xl font-extrabold text-indigo-700 tracking-tight">
          {stats.summary.totalAssigned.toLocaleString('id-ID')}
        </p>
        <p class="text-[11px] text-slate-400 mt-0.5">
          {stats.summary.assignmentPercentage}% dari total
        </p>
      </div>
    </div>

    <!-- 3. Selesai Diremajakan -->
    <div
      role="button"
      tabindex="0"
      onclick={() => openDrilldownModal({ title: "Daftar Tugas Selesai Diremajakan", status: "completed" })}
      onkeydown={(e) => e.key === 'Enter' && openDrilldownModal({ title: "Daftar Tugas Selesai Diremajakan", status: "completed" })}
      class="bg-white p-4 rounded-2xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/30 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Selesai</span>
        <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="ri-checkbox-circle-line text-base"></i>
        </div>
      </div>
      <div>
        <p class="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
          {stats.summary.totalCompleted.toLocaleString('id-ID')}
        </p>
        <div class="flex items-center gap-1 mt-1">
          <div class="flex-1 bg-emerald-100 rounded-full h-1.5 overflow-hidden">
            <div class="bg-emerald-500 h-full rounded-full" style="width: {stats.summary.completionPercentage}%"></div>
          </div>
          <span class="text-[10px] font-bold text-emerald-700">{stats.summary.completionPercentage}%</span>
        </div>
      </div>
    </div>

    <!-- 4. Belum Selesai (Pending) -->
    <div
      role="button"
      tabindex="0"
      onclick={() => openDrilldownModal({ title: "Daftar Tugas Belum Selesai (Pending)", status: "pending" })}
      onkeydown={(e) => e.key === 'Enter' && openDrilldownModal({ title: "Daftar Tugas Belum Selesai (Pending)", status: "pending" })}
      class="bg-white p-4 rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/20 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending</span>
        <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="ri-time-line text-base"></i>
        </div>
      </div>
      <div>
        <p class="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
          {stats.summary.totalPending.toLocaleString('id-ID')}
        </p>
        <p class="text-[11px] text-amber-600/80 mt-0.5">Dalam proses pengerjaan</p>
      </div>
    </div>

    <!-- 5. Belum Dibagikan (Unassigned) -->
    <div
      role="button"
      tabindex="0"
      onclick={() => openDrilldownModal({ title: "Daftar Data Pegawai Belum Dibagikan ke Operator", status: "unassigned" })}
      onkeydown={(e) => e.key === 'Enter' && openDrilldownModal({ title: "Daftar Data Pegawai Belum Dibagikan ke Operator", status: "unassigned" })}
      class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Belum Dibagi</span>
        <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="ri-inbox-unarchive-line text-base"></i>
        </div>
      </div>
      <div>
        <p class="text-2xl sm:text-3xl font-extrabold text-slate-600 tracking-tight">
          {stats.summary.totalUnassigned.toLocaleString('id-ID')}
        </p>
        <p class="text-[11px] text-slate-400 mt-0.5">Antrean pembagian</p>
      </div>
    </div>

    <!-- 6. Berkas SK CPNS Terunggah -->
    <div
      role="button"
      tabindex="0"
      onclick={() => { selectedTab = "records"; recordStatus = "completed"; fetchRecords(1); }}
      onkeydown={(e) => { if (e.key === 'Enter') { selectedTab = "records"; recordStatus = "completed"; fetchRecords(1); } }}
      class="bg-white p-4 rounded-2xl border border-purple-100 bg-gradient-to-b from-white to-purple-50/20 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold text-purple-600 uppercase tracking-wider">SK Terunggah</span>
        <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="ri-file-pdf-2-line text-base"></i>
        </div>
      </div>
      <div>
        <p class="text-2xl sm:text-3xl font-extrabold text-purple-700 tracking-tight">
          {stats.summary.totalSkCpnsUploaded.toLocaleString('id-ID')}
        </p>
        <p class="text-[11px] text-purple-600/80 mt-0.5">Arsip dokumen digital</p>
      </div>
    </div>
  </div>

  <!-- Navigation Tabs & Content -->
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <!-- Tabs Header -->
    <div class="flex flex-wrap items-center justify-between border-b border-slate-100 px-4 sm:px-6 pt-3 gap-2 bg-slate-50/50">
      <div class="flex items-center gap-1 sm:gap-2 overflow-x-auto">
        <button
          onclick={() => (selectedTab = "operator")}
          class="flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap {selectedTab === 'operator'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'}"
        >
          <i class="ri-user-star-line text-base"></i>
          <span>Progres Per Operator</span>
          <span class="px-2 py-0.5 text-[10px] rounded-full {selectedTab === 'operator' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}">
            {stats.byOperator?.length || 0}
          </span>
        </button>

        <button
          onclick={() => (selectedTab = "unor")}
          class="flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap {selectedTab === 'unor'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'}"
        >
          <i class="ri-building-line text-base"></i>
          <span>Progres Per Unit Kerja (UNOR)</span>
          <span class="px-2 py-0.5 text-[10px] rounded-full {selectedTab === 'unor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}">
            {stats.byUnor?.length || 0}
          </span>
        </button>

        <button
          onclick={() => (selectedTab = "recent")}
          class="flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap {selectedTab === 'recent'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'}"
        >
          <i class="ri-history-line text-base"></i>
          <span>Aktivitas Terkini</span>
          <span class="px-2 py-0.5 text-[10px] rounded-full {selectedTab === 'recent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}">
            {stats.recentCompleted?.length || 0}
          </span>
        </button>

        <button
          onclick={() => { selectedTab = "records"; if (records.length === 0) fetchRecords(1); }}
          class="flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap {selectedTab === 'records'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'}"
        >
          <i class="ri-list-check text-base"></i>
          <span>Rincian Seluruh Data Pegawai</span>
        </button>
      </div>
    </div>

    <!-- TAB 1: PROGRES PER OPERATOR -->
    {#if selectedTab === "operator"}
      <div class="p-4 sm:p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <i class="ri-search-line text-sm"></i>
            </div>
            <input
              type="text"
              bind:value={searchOperator}
              placeholder="Cari nama operator atau username..."
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Tampilkan:</span>
            <select bind:value={limitOperator} class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              {#each limitOptions as opt}
                <option value={opt}>{opt} per halaman</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-100">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4 w-12 text-center">No</th>
                <th class="py-3 px-4">Operator / User</th>
                <th class="py-3 px-4 text-center">Total Tugas</th>
                <th class="py-3 px-4 text-center">Selesai</th>
                <th class="py-3 px-4 text-center">Pending</th>
                <th class="py-3 px-4 min-w-[180px]">Progres Penyelesaian</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
              {#if displayedOperators.length === 0}
                <tr>
                  <td colspan="7" class="py-8 text-center text-slate-400">
                    <i class="ri-inbox-line text-3xl block mb-1"></i>
                    Belum ada data operator yang ditemukan
                  </td>
                </tr>
              {:else}
                {#each displayedOperators as op, idx}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                      {(pageOperator - 1) * limitOperator + idx + 1}
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                          {(op.namaLengkap || op.username || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p class="font-bold text-slate-800 leading-tight">{op.namaLengkap || op.username}</p>
                          <p class="text-[11px] text-slate-400 font-mono">@{op.username}</p>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {op.totalAssigned.toLocaleString('id-ID')}
                    </td>
                    <td class="py-3.5 px-4 text-center font-bold text-emerald-600">
                      {op.totalCompleted.toLocaleString('id-ID')}
                    </td>
                    <td class="py-3.5 px-4 text-center font-semibold text-amber-600">
                      {op.totalPending.toLocaleString('id-ID')}
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="space-y-1">
                        <div class="flex items-center justify-between text-xs">
                          <span class="font-semibold text-slate-700">{op.completionPercentage}%</span>
                          <span class="text-[10px] text-slate-400">{op.totalCompleted}/{op.totalAssigned}</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-500 {op.completionPercentage >= 100 ? 'bg-emerald-500' : op.completionPercentage >= 50 ? 'bg-blue-600' : 'bg-amber-500'}"
                            style="width: {op.completionPercentage}%"
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <button
                        onclick={() => openDrilldownModal({
                          title: `Rincian Tugas Operator: ${op.namaLengkap || op.username}`,
                          userId: op.userId
                        })}
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <i class="ri-eye-line"></i>
                        <span>Lihat Rincian</span>
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <!-- Operator Pagination -->
        {#if totalPagesOperator > 1}
          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-slate-500">
              Menampilkan {(pageOperator - 1) * limitOperator + 1} - {Math.min(pageOperator * limitOperator, filteredOperators.length)} dari {filteredOperators.length} operator
            </p>
            <div class="flex items-center gap-1">
              <button
                onclick={() => pageOperator = Math.max(1, pageOperator - 1)}
                disabled={pageOperator === 1}
                class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span class="text-xs px-2 font-semibold text-slate-600">Hal {pageOperator} / {totalPagesOperator}</span>
              <button
                onclick={() => pageOperator = Math.min(totalPagesOperator, pageOperator + 1)}
                disabled={pageOperator === totalPagesOperator}
                class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- TAB 2: PROGRES PER UNIT KERJA (UNOR) -->
    {#if selectedTab === "unor"}
      <div class="p-4 sm:p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <i class="ri-search-line text-sm"></i>
            </div>
            <input
              type="text"
              bind:value={searchUnor}
              placeholder="Cari nama unit kerja (UNOR)..."
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Tampilkan:</span>
            <select bind:value={limitUnor} class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
              {#each limitOptions as opt}
                <option value={opt}>{opt} per halaman</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-100">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4 w-12 text-center">No</th>
                <th class="py-3 px-4">Nama Unit Kerja (UNOR)</th>
                <th class="py-3 px-4 text-center">Total Pegawai</th>
                <th class="py-3 px-4 text-center">Selesai Diremajakan</th>
                <th class="py-3 px-4 text-center">Belum Selesai</th>
                <th class="py-3 px-4 min-w-[180px]">Progres (%)</th>
                <th class="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
              {#if displayedUnor.length === 0}
                <tr>
                  <td colspan="7" class="py-8 text-center text-slate-400">
                    <i class="ri-inbox-line text-3xl block mb-1"></i>
                    Belum ada data unit kerja yang ditemukan
                  </td>
                </tr>
              {:else}
                {#each displayedUnor as u, idx}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                      {(pageUnor - 1) * limitUnor + idx + 1}
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2.5">
                        <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                          <i class="ri-building-line text-sm"></i>
                        </div>
                        <p class="font-semibold text-slate-800 leading-tight">{u.unorNama}</p>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-center font-bold text-slate-800">
                      {u.totalPegawai.toLocaleString('id-ID')}
                    </td>
                    <td class="py-3.5 px-4 text-center font-bold text-emerald-600">
                      {u.totalCompleted.toLocaleString('id-ID')}
                    </td>
                    <td class="py-3.5 px-4 text-center font-semibold text-slate-500">
                      {u.totalPending.toLocaleString('id-ID')}
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="space-y-1">
                        <div class="flex items-center justify-between text-xs">
                          <span class="font-semibold text-slate-700">{u.completionPercentage}%</span>
                          <span class="text-[10px] text-slate-400">{u.totalCompleted}/{u.totalPegawai}</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-500 {u.completionPercentage >= 100 ? 'bg-emerald-500' : u.completionPercentage >= 50 ? 'bg-blue-600' : 'bg-amber-500'}"
                            style="width: {u.completionPercentage}%"
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <button
                        onclick={() => openDrilldownModal({
                          title: `Rincian Pegawai UNOR: ${u.unorNama}`,
                          unorNama: u.unorNama
                        })}
                        class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <i class="ri-eye-line"></i>
                        <span>Lihat Pegawai</span>
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <!-- UNOR Pagination -->
        {#if totalPagesUnor > 1}
          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-slate-500">
              Menampilkan {(pageUnor - 1) * limitUnor + 1} - {Math.min(pageUnor * limitUnor, filteredUnor.length)} dari {filteredUnor.length} unit kerja
            </p>
            <div class="flex items-center gap-1">
              <button
                onclick={() => pageUnor = Math.max(1, pageUnor - 1)}
                disabled={pageUnor === 1}
                class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span class="text-xs px-2 font-semibold text-slate-600">Hal {pageUnor} / {totalPagesUnor}</span>
              <button
                onclick={() => pageUnor = Math.min(totalPagesUnor, pageUnor + 1)}
                disabled={pageUnor === totalPagesUnor}
                class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- TAB 3: AKTIVITAS TERKINI (RECENT COMPLETED) -->
    {#if selectedTab === "recent"}
      <div class="p-4 sm:p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <i class="ri-search-line text-sm"></i>
            </div>
            <input
              type="text"
              bind:value={searchRecent}
              placeholder="Cari NIP, nama pegawai, UNOR, atau operator..."
              class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <p class="text-xs text-slate-400">
            Menampilkan aktivitas peremajaan data yang baru saja diselesaikan oleh operator.
          </p>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-100">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4">Pegawai P3K</th>
                <th class="py-3 px-4">Jabatan & Unit Kerja</th>
                <th class="py-3 px-4">Kegiatan</th>
                <th class="py-3 px-4">Dikerjakan Oleh</th>
                <th class="py-3 px-4">Waktu Selesai</th>
                <th class="py-3 px-4 text-center">SK CPNS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
              {#if displayedRecent.length === 0}
                <tr>
                  <td colspan="6" class="py-8 text-center text-slate-400">
                    <i class="ri-history-line text-3xl block mb-1"></i>
                    Belum ada riwayat peremajaan yang selesai
                  </td>
                </tr>
              {:else}
                {#each displayedRecent as item}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4">
                      <div>
                        <p class="font-bold text-slate-800 leading-tight">{item.dataP3k?.nama || "-"}</p>
                        <p class="text-[11px] text-slate-400 font-mono mt-0.5">NIP: {item.dataP3k?.nipBaru || "-"}</p>
                      </div>
                    </td>
                    <td class="py-3.5 px-4">
                      <p class="font-medium text-slate-700 leading-tight">{item.dataP3k?.jabatanNama || "-"}</p>
                      <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{item.dataP3k?.unorNama || "-"}</p>
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {item.kegiatan || "Umum"}
                      </span>
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                          {(item.operator?.namaLengkap || item.operator?.username || "O").charAt(0).toUpperCase()}
                        </div>
                        <span class="font-semibold text-slate-700">{item.operator?.namaLengkap || item.operator?.username || "-"}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(item.completedAt)}
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      {#if item.dataP3k?.arsipSkCpns?.fileUrl}
                        <a
                          href={item.dataP3k.arsipSkCpns.fileUrl}
                          target="_blank"
                          class="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md text-xs font-semibold transition-colors"
                        >
                          <i class="ri-file-pdf-line"></i>
                          <span>Lihat PDF</span>
                        </a>
                      {:else}
                        <span class="text-slate-300 text-xs">-</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    <!-- TAB 4: RINCIAN SELURUH DATA PEGAWAI (SERVER PAGINATED) -->
    {#if selectedTab === "records"}
      <div class="p-4 sm:p-6 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <!-- Filter Status Pill Buttons -->
          <div class="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onclick={() => handleRecordStatusChange("")}
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {recordStatus === '' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
            >
              Semua Data ({stats.summary.totalPegawaiAktif})
            </button>
            <button
              onclick={() => handleRecordStatusChange("completed")}
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {recordStatus === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
            >
              Selesai ({stats.summary.totalCompleted})
            </button>
            <button
              onclick={() => handleRecordStatusChange("pending")}
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {recordStatus === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
            >
              Pending ({stats.summary.totalPending})
            </button>
            <button
              onclick={() => handleRecordStatusChange("unassigned")}
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {recordStatus === 'unassigned' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
            >
              Belum Dibagi ({stats.summary.totalUnassigned})
            </button>
          </div>

          <!-- Search & Limit -->
          <div class="flex items-center gap-3">
            <div class="relative flex-1 sm:w-72">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <i class="ri-search-line text-sm"></i>
              </div>
              <input
                type="text"
                value={recordSearch}
                oninput={handleRecordSearch}
                placeholder="Cari NIP, nama, jabatan..."
                class="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <select
              bind:value={recordLimit}
              onchange={() => { recordPage = 1; fetchRecords(1); }}
              class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
            >
              {#each limitOptions as opt}
                <option value={opt}>{opt} data</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-100">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4 w-12 text-center">No</th>
                <th class="py-3 px-4">Pegawai P3K</th>
                <th class="py-3 px-4">Jabatan & Unit Kerja</th>
                <th class="py-3 px-4">Operator Bertugas</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-center">Berkas SK</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs sm:text-sm">
              {#if recordsLoading}
                <tr>
                  <td colspan="6" class="py-12 text-center text-slate-400">
                    <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Memuat data rincian...
                  </td>
                </tr>
              {:else if records.length === 0}
                <tr>
                  <td colspan="6" class="py-8 text-center text-slate-400">
                    <i class="ri-inbox-line text-3xl block mb-1"></i>
                    Tidak ada data pegawai yang sesuai dengan filter
                  </td>
                </tr>
              {:else}
                {#each records as r, idx}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                      {(recordPage - 1) * recordLimit + idx + 1}
                    </td>
                    <td class="py-3.5 px-4">
                      <div>
                        <p class="font-bold text-slate-800 leading-tight">{r.dataP3k?.nama || "-"}</p>
                        <p class="text-[11px] text-slate-400 font-mono mt-0.5">NIP: {r.dataP3k?.nipBaru || "-"}</p>
                      </div>
                    </td>
                    <td class="py-3.5 px-4">
                      <p class="font-medium text-slate-700 leading-tight">{r.dataP3k?.jabatanNama || "-"}</p>
                      <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{r.dataP3k?.unorNama || "-"}</p>
                    </td>
                    <td class="py-3.5 px-4">
                      {#if r.operator}
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {(r.operator?.namaLengkap || r.operator?.username || "O").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p class="font-semibold text-slate-700 leading-tight">{r.operator?.namaLengkap || r.operator?.username}</p>
                            <p class="text-[10px] text-slate-400">Kegiatan: {r.kegiatan || "-"}</p>
                          </div>
                        </div>
                      {:else}
                        <span class="text-xs text-slate-400 italic">Belum dibagikan</span>
                      {/if}
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      {#if r.isCompleted}
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <i class="ri-checkbox-circle-fill text-xs text-emerald-600"></i> Selesai
                        </span>
                      {:else if r.operator}
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <i class="ri-time-fill text-xs text-amber-600"></i> Pending
                        </span>
                      {:else}
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <i class="ri-subtract-line text-xs"></i> Belum Dibagi
                        </span>
                      {/if}
                    </td>
                    <td class="py-3.5 px-4 text-center">
                      {#if r.dataP3k?.arsipSkCpns?.fileUrl}
                        <a
                          href={r.dataP3k.arsipSkCpns.fileUrl}
                          target="_blank"
                          class="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md text-xs font-semibold transition-colors"
                        >
                          <i class="ri-file-pdf-line"></i>
                          <span>PDF</span>
                        </a>
                      {:else}
                        <span class="text-slate-300 text-xs">-</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <!-- Records Pagination -->
        {#if recordMeta.totalPages > 1}
          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-slate-500">
              Menampilkan {(recordPage - 1) * recordLimit + 1} - {Math.min(recordPage * recordLimit, recordMeta.total)} dari {recordMeta.total} data pegawai
            </p>
            <div class="flex items-center gap-1">
              <button
                onclick={() => { recordPage = Math.max(1, recordPage - 1); fetchRecords(recordPage); }}
                disabled={recordPage === 1 || recordsLoading}
                class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span class="text-xs px-2 font-semibold text-slate-600">Hal {recordPage} / {recordMeta.totalPages}</span>
              <button
                onclick={() => { recordPage = Math.min(recordMeta.totalPages, recordPage + 1); fetchRecords(recordPage); }}
                disabled={recordPage === recordMeta.totalPages || recordsLoading}
                class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- MODAL DRILLDOWN DETAIL -->
{#if showDetailModal}
  <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-800">{detailTitle}</h2>
          <p class="text-xs text-slate-500">Total ditemukan: {detailMeta.total} pegawai</p>
        </div>
        <button
          onclick={closeDetailModal}
          class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
        >
          <i class="ri-close-line text-lg"></i>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1">
        <!-- Search -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <i class="ri-search-line text-sm"></i>
          </div>
          <input
            type="text"
            value={detailSearch}
            oninput={handleDetailSearch}
            placeholder="Cari NIP, nama, jabatan..."
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-100">
          <table class="min-w-full divide-y divide-slate-100 text-left">
            <thead class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="py-2.5 px-3.5 w-10 text-center">No</th>
                <th class="py-2.5 px-3.5">Pegawai P3K</th>
                <th class="py-2.5 px-3.5">Jabatan & Unit Kerja</th>
                <th class="py-2.5 px-3.5 text-center">Status</th>
                <th class="py-2.5 px-3.5 text-center">SK CPNS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              {#if detailLoading}
                <tr>
                  <td colspan="5" class="py-8 text-center text-slate-400">
                    <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Memuat data...
                  </td>
                </tr>
              {:else if detailRecords.length === 0}
                <tr>
                  <td colspan="5" class="py-6 text-center text-slate-400">
                    Tidak ada data yang cocok
                  </td>
                </tr>
              {:else}
                {#each detailRecords as d, idx}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-2.5 px-3.5 text-center text-slate-400 font-mono">
                      {(detailPage - 1) * detailLimit + idx + 1}
                    </td>
                    <td class="py-2.5 px-3.5">
                      <p class="font-bold text-slate-800">{d.dataP3k?.nama || "-"}</p>
                      <p class="text-[10px] text-slate-400 font-mono">NIP: {d.dataP3k?.nipBaru || "-"}</p>
                    </td>
                    <td class="py-2.5 px-3.5">
                      <p class="font-medium text-slate-700">{d.dataP3k?.jabatanNama || "-"}</p>
                      <p class="text-[10px] text-slate-400">{d.dataP3k?.unorNama || "-"}</p>
                    </td>
                    <td class="py-2.5 px-3.5 text-center">
                      {#if d.isCompleted}
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Selesai
                        </span>
                      {:else if d.operator}
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      {:else}
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Belum Dibagi
                        </span>
                      {/if}
                    </td>
                    <td class="py-2.5 px-3.5 text-center">
                      {#if d.dataP3k?.arsipSkCpns?.fileUrl}
                        <a
                          href={d.dataP3k.arsipSkCpns.fileUrl}
                          target="_blank"
                          class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[11px] font-semibold"
                        >
                          <i class="ri-file-pdf-line"></i>
                          PDF
                        </a>
                      {:else}
                        <span class="text-slate-300">-</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>

        <!-- Detail Pagination -->
        {#if detailMeta.totalPages > 1}
          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-slate-500">
              Hal {detailPage} dari {detailMeta.totalPages} ({detailMeta.total} data)
            </p>
            <div class="flex items-center gap-1">
              <button
                onclick={() => { detailPage = Math.max(1, detailPage - 1); fetchDetailRecords(detailPage); }}
                disabled={detailPage === 1 || detailLoading}
                class="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                onclick={() => { detailPage = Math.min(detailMeta.totalPages, detailPage + 1); fetchDetailRecords(detailPage); }}
                disabled={detailPage === detailMeta.totalPages || detailLoading}
                class="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          onclick={closeDetailModal}
          class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}
