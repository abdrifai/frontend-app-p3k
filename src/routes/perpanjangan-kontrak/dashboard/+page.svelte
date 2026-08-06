<script>
  import { onMount } from "svelte";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import { goto } from "$app/navigation";

  let isLoading = true;
  let stats = {
    summary: {
      totalPegawaiAktif: 0,
      totalUsulan: 0,
      totalPegawaiDenganUsulan: 0,
      totalPegawaiBelumUsulan: 0,
      pendingCount: 0,
      approvedCount: 0,
      srikandiCount: 0,
      selesaiCount: 0,
      rejectedCount: 0,
      completionPercentage: 0,
      usulanPercentage: 0
    },
    byUnor: [],
    byOperator: [],
    recentUsulan: []
  };

  let searchUnor = "";
  let selectedTab = "unor"; // "unor", "operator", "recent"

  let limitUnor = 10;
  let pageUnor = 1;

  let limitOperator = 10;
  let pageOperator = 1;

  let limitRecent = 10;
  let pageRecent = 1;

  const limitOptions = [10, 25, 50, 100, 250, 500];

  // Auto reset page to 1 when filter or limit changes
  $: if (searchUnor || limitUnor) {
    pageUnor = 1;
  }
  $: if (limitOperator) {
    pageOperator = 1;
  }
  $: if (limitRecent) {
    pageRecent = 1;
  }

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Silakan login terlebih dahulu", "error");
      goto("/login");
      return;
    }
    await fetchDashboardStats();
  });

  async function fetchDashboardStats() {
    isLoading = true;
    try {
      const res = await apiRequest("/api/v1/perpanjangan/dashboard-stats");
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

  $: filteredUnor = (stats.byUnor || []).filter((item) =>
    (item.unorNama || "").toLowerCase().includes(searchUnor.toLowerCase())
  );

  $: totalPagesUnor = Math.max(1, Math.ceil(filteredUnor.length / limitUnor));
  $: displayedUnor = filteredUnor.slice((pageUnor - 1) * limitUnor, pageUnor * limitUnor);

  $: totalPagesOperator = Math.max(1, Math.ceil((stats.byOperator || []).length / limitOperator));
  $: displayedOperator = (stats.byOperator || []).slice((pageOperator - 1) * limitOperator, pageOperator * limitOperator);

  $: totalPagesRecent = Math.max(1, Math.ceil((stats.recentUsulan || []).length / limitRecent));
  $: displayedRecent = (stats.recentUsulan || []).slice((pageRecent - 1) * limitRecent, pageRecent * limitRecent);

  function getStatusBadgeClass(status) {
    switch (status) {
      case "SELESAI":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "UPLOAD_SRIKANDI":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "APPROVED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "REJECTED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case "SELESAI":
        return "Selesai (SK Terbit)";
      case "UPLOAD_SRIKANDI":
        return "Proses Srikandi";
      case "APPROVED":
        return "Approved (Draft Word)";
      case "PENDING":
        return "Pending Review";
      case "REJECTED":
        return "Ditolak";
      default:
        return status;
    }
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
  <title>Dashboard Progres Usulan PK — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
  <!-- Header Title -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Progres Usulan PK</h1>
          <p class="text-xs text-slate-500 font-medium">Monitoring status usulan perpanjangan Perjanjian Kerja secara real-time</p>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button on:click={fetchDashboardStats} class="btn-secondary" disabled={isLoading}>
        {#if isLoading}
          <div class="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
        {:else}
          <svg class="w-4 h-4 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {/if}
        Refresh Data
      </button>

      <a href="/perpanjangan-kontrak/usulan" class="btn-primary">
        <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Kelola Usulan
      </a>
    </div>
  </div>

  {#if isLoading}
    <!-- Skeleton Loaders -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {#each Array(4) as _}
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
          <div class="h-4 bg-slate-200 rounded w-1/2"></div>
          <div class="h-8 bg-slate-300 rounded w-3/4"></div>
          <div class="h-3 bg-slate-100 rounded w-full"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Summary KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Card 1: Total Pegawai Aktif -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pegawai PPPK</span>
              <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-slate-800">{stats.summary.totalPegawaiAktif}</div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Sudah Usulan:</span>
            <span class="font-bold text-blue-600">{stats.summary.totalPegawaiDenganUsulan} ({stats.summary.usulanPercentage}%)</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Usulan Selesai -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Usulan Selesai (SK)</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-emerald-600">{stats.summary.selesaiCount}</div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Tingkat Penyelesaian:</span>
            <span class="font-bold text-emerald-600">{stats.summary.completionPercentage}%</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Dalam Proses (Approved + Srikandi) -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sedang Diproses</span>
              <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-indigo-600">
              {stats.summary.approvedCount + stats.summary.srikandiCount}
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-400">Approved: <b>{stats.summary.approvedCount}</b></span>
            <span class="text-purple-600 font-medium">Srikandi: <b>{stats.summary.srikandiCount}</b></span>
          </div>
        </div>
      </div>

      <!-- Card 4: Belum Buat Usulan -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Belum Ada Usulan</span>
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div class="text-3xl font-extrabold text-amber-600">{stats.summary.totalPegawaiBelumUsulan}</div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Pending Review:</span>
            <span class="font-bold text-amber-600">{stats.summary.pendingCount}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Workflow Progress Bar Breakdown -->
    <div class="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-800">Alur Pipeline Usulan Kontrak</h2>
          <p class="text-xs text-slate-500">Distribusi status berkas dari pengajuan awal hingga penandatanganan SK final</p>
        </div>
        <div class="text-right">
          <span class="text-xs font-semibold text-slate-400 uppercase">Total Usulan</span>
          <p class="text-lg font-black text-slate-800">{stats.summary.totalUsulan}</p>
        </div>
      </div>

      <!-- Segmented Bar -->
      <div class="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
        {#if stats.summary.totalUsulan > 0}
          <div
            style="width: {(stats.summary.pendingCount / stats.summary.totalUsulan) * 100}%"
            class="bg-amber-400 transition-all duration-500"
            title="Pending: {stats.summary.pendingCount}"
          ></div>
          <div
            style="width: {(stats.summary.approvedCount / stats.summary.totalUsulan) * 100}%"
            class="bg-blue-500 transition-all duration-500"
            title="Approved: {stats.summary.approvedCount}"
          ></div>
          <div
            style="width: {(stats.summary.srikandiCount / stats.summary.totalUsulan) * 100}%"
            class="bg-purple-500 transition-all duration-500"
            title="Srikandi: {stats.summary.srikandiCount}"
          ></div>
          <div
            style="width: {(stats.summary.selesaiCount / stats.summary.totalUsulan) * 100}%"
            class="bg-emerald-500 transition-all duration-500"
            title="Selesai: {stats.summary.selesaiCount}"
          ></div>
          <div
            style="width: {(stats.summary.rejectedCount / stats.summary.totalUsulan) * 100}%"
            class="bg-rose-400 transition-all duration-500"
            title="Ditolak: {stats.summary.rejectedCount}"
          ></div>
        {/if}
      </div>

      <!-- Legend Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
        <div class="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-amber-400"></span>
            <span class="text-xs font-semibold text-slate-700">1. Pending</span>
          </div>
          <span class="text-xs font-bold text-amber-700">{stats.summary.pendingCount}</span>
        </div>

        <div class="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
            <span class="text-xs font-semibold text-slate-700">2. Approved</span>
          </div>
          <span class="text-xs font-bold text-blue-700">{stats.summary.approvedCount}</span>
        </div>

        <div class="bg-purple-50/70 border border-purple-100 rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-purple-500"></span>
            <span class="text-xs font-semibold text-slate-700">3. Srikandi</span>
          </div>
          <span class="text-xs font-bold text-purple-700">{stats.summary.srikandiCount}</span>
        </div>

        <div class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span class="text-xs font-semibold text-slate-700">4. Selesai</span>
          </div>
          <span class="text-xs font-bold text-emerald-700">{stats.summary.selesaiCount}</span>
        </div>

        <div class="bg-rose-50/70 border border-rose-100 rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-rose-400"></span>
            <span class="text-xs font-semibold text-slate-700">Ditolak</span>
          </div>
          <span class="text-xs font-bold text-rose-700">{stats.summary.rejectedCount}</span>
        </div>
      </div>
    </div>

    <!-- Section Tabs -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div class="flex items-center gap-2">
          <button
            on:click={() => (selectedTab = "unor")}
            class="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 {selectedTab === 'unor' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'}"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M13 16h.01M13 12h.01" />
            </svg>
            Progres Per Unit Kerja ({stats.byUnor?.length || 0})
          </button>

          <button
            on:click={() => (selectedTab = "operator")}
            class="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 {selectedTab === 'operator' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'}"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Performa Operator ({stats.byOperator?.length || 0})
          </button>

          <button
            on:click={() => (selectedTab = "recent")}
            class="px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 {selectedTab === 'recent' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'}"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Aktivitas Terbaru
          </button>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          {#if selectedTab === "unor"}
            <div class="relative flex-grow sm:w-64">
              <input
                type="text"
                bind:value={searchUnor}
                placeholder="Cari unit kerja..."
                class="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 font-semibold hidden sm:inline">Tampilkan:</span>
              <select
                bind:value={limitUnor}
                class="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
              >
                {#each limitOptions as opt}
                  <option value={opt}>{opt} Data</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if selectedTab === "operator"}
            <div class="flex items-center gap-2 ml-auto">
              <span class="text-xs text-slate-500 font-semibold hidden sm:inline">Tampilkan:</span>
              <select
                bind:value={limitOperator}
                class="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
              >
                {#each limitOptions as opt}
                  <option value={opt}>{opt} Data</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if selectedTab === "recent"}
            <div class="flex items-center gap-2 ml-auto">
              <span class="text-xs text-slate-500 font-semibold hidden sm:inline">Tampilkan:</span>
              <select
                bind:value={limitRecent}
                class="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
              >
                {#each limitOptions as opt}
                  <option value={opt}>{opt} Data</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>
      </div>

      <!-- Tab Content: Unit Kerja Breakdown -->
      {#if selectedTab === "unor"}
        {#if filteredUnor.length === 0}
          <div class="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
            <p class="text-slate-500 text-sm">Tidak ada unit kerja yang sesuai dengan pencarian.</p>
          </div>
        {:else}
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan <b>{displayedUnor.length}</b> dari total <b>{filteredUnor.length}</b> Unit Kerja</span>
              <span class="text-[11px] text-slate-400">Default: 10 | Max: 500</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th class="py-3.5 px-4">Unit Kerja Induk (Unor Induk)</th>
                    <th class="py-3.5 px-4 text-center">Pegawai</th>
                    <th class="py-3.5 px-4 text-center">Usulan</th>
                    <th class="py-3.5 px-4 text-center">Selesai</th>
                    <th class="py-3.5 px-4 text-center">Srikandi</th>
                    <th class="py-3.5 px-4 text-center">Approved</th>
                    <th class="py-3.5 px-4 text-center">Pending</th>
                    <th class="py-3.5 px-4 text-center">Belum Usul</th>
                    <th class="py-3.5 px-4 min-w-[140px]">Progres Penyelesaian</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  {#each displayedUnor as item}
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-3.5 px-4 font-bold text-slate-800">
                        {item.unorNama}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-slate-700">
                        {item.totalPegawai}
                      </td>
                      <td class="py-3.5 px-4 text-center font-semibold text-blue-600">
                        {item.totalUsulan}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {item.selesai}
                      </td>
                      <td class="py-3.5 px-4 text-center text-purple-600 font-medium">
                        {item.srikandi}
                      </td>
                      <td class="py-3.5 px-4 text-center text-blue-600 font-medium">
                        {item.approved}
                      </td>
                      <td class="py-3.5 px-4 text-center text-amber-600 font-medium">
                        {item.pending}
                      </td>
                      <td class="py-3.5 px-4 text-center text-slate-400">
                        {item.belumUsulan}
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="space-y-1">
                          <div class="flex justify-between text-[10px] font-bold">
                            <span class="text-slate-500">{item.progressPercentage}%</span>
                            <span class="text-emerald-600">{item.selesai}/{item.totalPegawai}</span>
                          </div>
                          <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              style="width: {item.progressPercentage}%"
                              class="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <!-- Pagination Bar -->
            <div class="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p class="text-slate-500 font-medium">
                Menampilkan <b>{filteredUnor.length > 0 ? (pageUnor - 1) * limitUnor + 1 : 0}</b> - <b>{Math.min(pageUnor * limitUnor, filteredUnor.length)}</b> dari <b>{filteredUnor.length}</b> Unit Kerja
              </p>
              <div class="flex items-center gap-2">
                <button
                  on:click={() => (pageUnor = Math.max(1, pageUnor - 1))}
                  disabled={pageUnor <= 1}
                  class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Sebelumnya
                </button>
                
                <span class="text-slate-600 font-bold px-2">
                  {pageUnor} / {totalPagesUnor}
                </span>

                <button
                  on:click={() => (pageUnor = Math.min(totalPagesUnor, pageUnor + 1))}
                  disabled={pageUnor >= totalPagesUnor}
                  class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
                >
                  Selanjutnya
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Tab Content: Operator Performance -->
      {#if selectedTab === "operator"}
        {#if (stats.byOperator || []).length === 0}
          <div class="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
            <p class="text-slate-500 text-sm">Belum ada data performa operator.</p>
          </div>
        {:else}
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Menampilkan <b>{displayedOperator.length}</b> dari total <b>{(stats.byOperator || []).length}</b> Operator</span>
              <span class="text-[11px] text-slate-400">Default: 10 | Max: 500</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th class="py-3.5 px-4">Operator / User</th>
                    <th class="py-3.5 px-4 text-center">Role</th>
                    <th class="py-3.5 px-4 text-center">Tugas Diberikan</th>
                    <th class="py-3.5 px-4 text-center">Tugas Selesai</th>
                    <th class="py-3.5 px-4 text-center">Usulan Dibuat</th>
                    <th class="py-3.5 px-4 text-center">PK Selesai</th>
                    <th class="py-3.5 px-4 min-w-[140px]">Progres Penugasan</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  {#each displayedOperator as op}
                    <tr class="hover:bg-slate-50/70 transition-colors">
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {(op.namaLengkap || op.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p class="font-bold text-slate-800">{op.namaLengkap || op.username}</p>
                            <p class="text-[10px] text-slate-400 font-mono">@{op.username}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {op.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                          {op.role}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-slate-700">
                        {op.assignedTasks}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {op.completedTasks}
                      </td>
                      <td class="py-3.5 px-4 text-center font-semibold text-blue-600">
                        {op.createdUsulan}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-purple-600">
                        {op.selesaiUsulan}
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="space-y-1">
                          <div class="flex justify-between text-[10px] font-bold">
                            <span class="text-slate-500">{op.completionRate}%</span>
                            <span class="text-indigo-600">{op.completedTasks}/{op.assignedTasks}</span>
                          </div>
                          <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              style="width: {op.completionRate}%"
                              class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>

            <!-- Pagination Bar -->
            <div class="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p class="text-slate-500 font-medium">
                Menampilkan <b>{(stats.byOperator || []).length > 0 ? (pageOperator - 1) * limitOperator + 1 : 0}</b> - <b>{Math.min(pageOperator * limitOperator, (stats.byOperator || []).length)}</b> dari <b>{(stats.byOperator || []).length}</b> Operator
              </p>
              <div class="flex items-center gap-2">
                <button
                  on:click={() => (pageOperator = Math.max(1, pageOperator - 1))}
                  disabled={pageOperator <= 1}
                  class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Sebelumnya
                </button>
                
                <span class="text-slate-600 font-bold px-2">
                  {pageOperator} / {totalPagesOperator}
                </span>

                <button
                  on:click={() => (pageOperator = Math.min(totalPagesOperator, pageOperator + 1))}
                  disabled={pageOperator >= totalPagesOperator}
                  class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
                >
                  Selanjutnya
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Tab Content: Recent Submissions -->
      {#if selectedTab === "recent"}
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan <b>{displayedRecent.length}</b> dari total <b>{(stats.recentUsulan || []).length}</b> Aktivitas Terbaru</span>
            <span class="text-[11px] text-slate-400">Default: 10 | Max: 500</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th class="py-3.5 px-4">Pegawai (NIP & Nama)</th>
                  <th class="py-3.5 px-4">Unit Kerja</th>
                  <th class="py-3.5 px-4">Nomor Kontrak</th>
                  <th class="py-3.5 px-4">Status</th>
                  <th class="py-3.5 px-4">Operator / Pengaju</th>
                  <th class="py-3.5 px-4 text-right">Terakhir Diupdate</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                {#each displayedRecent as u}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4">
                      <p class="font-bold text-slate-800">{u.dataP3k?.nama || '-'}</p>
                      <p class="text-[10px] text-slate-400 font-mono">NIP: {u.dataP3k?.nipBaru || '-'}</p>
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 font-medium">
                      {u.dataP3k?.unorInduk?.nama || '-'}
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                      {u.nomorKontrak || '-'}
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border {getStatusBadgeClass(u.status)}">
                        {getStatusLabel(u.status)}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-slate-700 font-medium">
                      {u.editedBy?.namaLengkap || u.editedBy?.username || '-'}
                    </td>
                    <td class="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                      {formatDate(u.updatedAt)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p class="text-slate-500 font-medium">
              Menampilkan <b>{(stats.recentUsulan || []).length > 0 ? (pageRecent - 1) * limitRecent + 1 : 0}</b> - <b>{Math.min(pageRecent * limitRecent, (stats.recentUsulan || []).length)}</b> dari <b>{(stats.recentUsulan || []).length}</b> Aktivitas
            </p>
            <div class="flex items-center gap-2">
              <button
                on:click={() => (pageRecent = Math.max(1, pageRecent - 1))}
                disabled={pageRecent <= 1}
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Sebelumnya
              </button>
              
              <span class="text-slate-600 font-bold px-2">
                {pageRecent} / {totalPagesRecent}
              </span>

              <button
                on:click={() => (pageRecent = Math.min(totalPagesRecent, pageRecent + 1))}
                disabled={pageRecent >= totalPagesRecent}
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
              >
                Selanjutnya
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .btn-primary {
    @apply inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 active:scale-95;
  }
  .btn-secondary {
    @apply inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
  }
</style>
