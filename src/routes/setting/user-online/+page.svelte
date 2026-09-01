<script>
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { addToast } from "$lib/toastStore";

  // --- State ---
  let summary = {
    totalUsers: 0,
    totalOnline: 0,
    totalIdle: 0,
    totalOffline: 0
  };
  let users = [];
  let isLoading = true;
  let isRefreshing = false;
  let lastUpdatedTime = null;

  // Filter & Search
  let searchQuery = "";
  let selectedStatus = "all"; // "all", "online", "idle", "offline"
  let selectedRole = "all";
  let viewMode = "grid"; // "grid", "table"

  // Auto Refresh Settings
  let refreshIntervalSec = 15; // 10, 15, 30, 60, 0 (off)
  let refreshCountdown = 15;
  let countdownTimer = null;

  // Modal Detail
  let selectedUser = null;
  let showDetailModal = false;

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Silakan login terlebih dahulu", "error");
      goto("/login");
      return;
    }

    await loadData();
    startCountdown();
  });

  onDestroy(() => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  });

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    refreshCountdown = refreshIntervalSec;

    if (refreshIntervalSec === 0) return; // Off

    countdownTimer = setInterval(() => {
      if (refreshCountdown > 1) {
        refreshCountdown--;
      } else {
        refreshCountdown = refreshIntervalSec;
        loadData(false);
      }
    }, 1000);
  }

  function handleIntervalChange(sec) {
    refreshIntervalSec = sec;
    startCountdown();
    addToast(`Interval pembaruan diatur ke ${sec === 0 ? 'Manual (Non-Aktif)' : sec + ' detik'}`, "info");
  }

  async function loadData(showLoading = true) {
    if (showLoading) isLoading = true;
    isRefreshing = true;

    try {
      const res = await apiRequest("/api/users/monitoring-online", "GET");
      if (res && res.success && res.data) {
        summary = res.data.summary || summary;
        users = res.data.users || [];
        lastUpdatedTime = new Date();
      } else {
        if (showLoading) addToast(res?.message || "Gagal memuat data user online", "error");
      }
    } catch (err) {
      console.error(err);
      if (showLoading) addToast("Terjadi kesalahan saat memuat data monitoring user", "error");
    } finally {
      isLoading = false;
      isRefreshing = false;
    }
  }

  // --- Filtering ---
  $: filteredUsers = users.filter((u) => {
    // Status filter
    if (selectedStatus !== "all" && u.status !== selectedStatus) {
      return false;
    }

    // Role filter
    if (selectedRole !== "all") {
      const roles = String(u.role || "").toLowerCase().split(",").map(r => r.trim());
      if (!roles.includes(selectedRole.toLowerCase())) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (u.namaLengkap || "").toLowerCase().includes(q);
      const matchUser = (u.username || "").toLowerCase().includes(q);
      const matchEmail = (u.email || "").toLowerCase().includes(q);
      const matchRole = (u.role || "").toLowerCase().includes(q);
      const matchIp = (u.lastIpAddress || "").toLowerCase().includes(q);
      return matchName || matchUser || matchEmail || matchRole || matchIp;
    }

    return true;
  });

  // Extract unique roles for dropdown
  $: availableRoles = Array.from(
    new Set(
      users.flatMap((u) =>
        String(u.role || "user")
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      )
    )
  );

  // --- Helper Formats ---
  function formatTimeAgo(seconds) {
    if (seconds === null || seconds === undefined) return "Belum pernah aktif";
    if (seconds < 10) return "Aktif barusan";
    if (seconds < 60) return `${seconds} detik yang lalu`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari yang lalu`;
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
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return dateStr;
    }
  }

  function parseDevice(userAgent) {
    if (!userAgent) return { os: "Unknown OS", browser: "Browser", icon: "desktop" };
    const ua = userAgent.toLowerCase();

    // OS
    let os = "Desktop";
    let icon = "desktop";
    if (ua.includes("windows")) os = "Windows";
    else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
    else if (ua.includes("android")) { os = "Android"; icon = "mobile"; }
    else if (ua.includes("iphone") || ua.includes("ipad")) { os = "iOS"; icon = "mobile"; }
    else if (ua.includes("linux")) os = "Linux";

    // Browser
    let browser = "Browser";
    if (ua.includes("edg/")) browser = "Edge";
    else if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
    else if (ua.includes("firefox")) browser = "Firefox";

    return { os, browser, icon };
  }

  function openUserDetail(u) {
    selectedUser = u;
    showDetailModal = true;
  }

  function closeUserDetail() {
    selectedUser = null;
    showDetailModal = false;
  }
</script>

<svelte:head>
  <title>Monitoring User Online — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Header Card -->
  <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Monitoring User Online</h1>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Live Tracking
            </span>
          </div>
          <p class="text-xs sm:text-sm text-slate-500">Pantau status keaktifan user, sesi login, dan perangkat yang sedang mengakses aplikasi secara real-time</p>
        </div>
      </div>
    </div>

    <!-- Auto Refresh Controls -->
    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
      <!-- Interval Selector -->
      <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
        <span class="text-[11px] font-semibold text-slate-500 px-2">Refresh:</span>
        <button
          type="button"
          onclick={() => handleIntervalChange(10)}
          class="px-2.5 py-1 rounded-lg font-bold transition-all {refreshIntervalSec === 10 ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
        >
          10s
        </button>
        <button
          type="button"
          onclick={() => handleIntervalChange(15)}
          class="px-2.5 py-1 rounded-lg font-bold transition-all {refreshIntervalSec === 15 ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
        >
          15s
        </button>
        <button
          type="button"
          onclick={() => handleIntervalChange(30)}
          class="px-2.5 py-1 rounded-lg font-bold transition-all {refreshIntervalSec === 30 ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
        >
          30s
        </button>
        <button
          type="button"
          onclick={() => handleIntervalChange(0)}
          class="px-2.5 py-1 rounded-lg font-bold transition-all {refreshIntervalSec === 0 ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}"
        >
          Off
        </button>
      </div>

      <!-- Manual Refresh Button -->
      <button
        type="button"
        disabled={isRefreshing}
        onclick={() => { loadData(false); refreshCountdown = refreshIntervalSec; }}
        class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
      >
        <svg class="w-3.5 h-3.5 {isRefreshing ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {#if isRefreshing}
          Memperbarui...
        {:else if refreshIntervalSec > 0}
          Segarkan ({refreshCountdown}s)
        {:else}
          Segarkan
        {/if}
      </button>
    </div>
  </div>

  <!-- KPI Summary Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    <!-- Card 1: Online -->
    <button
      type="button"
      onclick={() => (selectedStatus = selectedStatus === "online" ? "all" : "online")}
      class="text-left bg-white p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs {selectedStatus === 'online' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-300'}"
    >
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Online</span>
        <div class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </div>
      </div>
      <p class="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-2">{summary.totalOnline}</p>
      <p class="text-[10px] text-slate-400 mt-1">Aktif dalam &lt; 5 menit terakhir</p>
    </button>

    <!-- Card 2: Idle -->
    <button
      type="button"
      onclick={() => (selectedStatus = selectedStatus === "idle" ? "all" : "idle")}
      class="text-left bg-white p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs {selectedStatus === 'idle' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200 hover:border-amber-300'}"
    >
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Idle / Away</span>
        <span class="w-3 h-3 rounded-full bg-amber-400"></span>
      </div>
      <p class="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">{summary.totalIdle}</p>
      <p class="text-[10px] text-slate-400 mt-1">Aktif 5 - 15 menit yang lalu</p>
    </button>

    <!-- Card 3: Offline -->
    <button
      type="button"
      onclick={() => (selectedStatus = selectedStatus === "offline" ? "all" : "offline")}
      class="text-left bg-white p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs {selectedStatus === 'offline' ? 'border-slate-400 ring-2 ring-slate-400/20 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}"
    >
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Offline</span>
        <span class="w-3 h-3 rounded-full bg-slate-300"></span>
      </div>
      <p class="text-2xl sm:text-3xl font-extrabold text-slate-600 mt-2">{summary.totalOffline}</p>
      <p class="text-[10px] text-slate-400 mt-1">Tidak aktif &gt; 15 menit</p>
    </button>

    <!-- Card 4: Total Users -->
    <button
      type="button"
      onclick={() => (selectedStatus = "all")}
      class="text-left bg-white p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden group shadow-xs {selectedStatus === 'all' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200 hover:border-blue-300'}"
    >
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Terdaftar</span>
        <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p class="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-2">{summary.totalUsers}</p>
      <p class="text-[10px] text-slate-400 mt-1">Total akun user aktif di sistem</p>
    </button>
  </div>

  <!-- Filter Bar & View Mode Toggle -->
  <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Search -->
      <div class="relative flex-1 max-w-md">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Cari Nama, Username, Email, Role, IP..."
          class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
        />
      </div>

      <!-- Filters & View Mode -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Status Filter -->
        <select
          bind:value={selectedStatus}
          class="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Semua Status ({summary.totalUsers})</option>
          <option value="online">🟢 Online ({summary.totalOnline})</option>
          <option value="idle">🟡 Idle ({summary.totalIdle})</option>
          <option value="offline">⚫ Offline ({summary.totalOffline})</option>
        </select>

        <!-- Role Filter -->
        <select
          bind:value={selectedRole}
          class="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">Semua Role</option>
          {#each availableRoles as r}
            <option value={r}>{r.toUpperCase()}</option>
          {/each}
        </select>

        <!-- View Mode Switch -->
        <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onclick={() => (viewMode = "grid")}
            class="p-1.5 rounded-lg transition-all {viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}"
            title="Tampilan Kartu (Grid)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            type="button"
            onclick={() => (viewMode = "table")}
            class="p-1.5 rounded-lg transition-all {viewMode === 'table' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}"
            title="Tampilan Tabel (List)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Content Section -->
  {#if isLoading}
    <div class="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
      <div class="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-500 font-medium">Memuat status keaktifan user...</p>
    </div>
  {:else if filteredUsers.length === 0}
    <div class="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3">
      <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-700">Tidak Ada User yang Sesuai Filter</h3>
      <p class="text-xs text-slate-400">Coba ubah kata kunci pencarian atau ganti filter status di atas.</p>
    </div>
  {:else if viewMode === "grid"}
    <!-- ==================== GRID VIEW ==================== -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredUsers as u}
        {@const device = parseDevice(u.lastUserAgent)}
        <div class="bg-white p-5 rounded-2xl border transition-all hover:shadow-md relative space-y-4 {u.status === 'online' ? 'border-emerald-200/80 hover:border-emerald-400' : u.status === 'idle' ? 'border-amber-200/80 hover:border-amber-400' : 'border-slate-200'}">
          <!-- Top Row: Avatar & Status Badge -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <!-- Avatar with online indicator -->
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm overflow-hidden shadow-inner">
                  {#if u.foto}
                    <img src="{API_BASE_URL}{u.foto}" alt={u.namaLengkap} class="w-full h-full object-cover" />
                  {:else}
                    {(u.namaLengkap || u.username || 'U').charAt(0).toUpperCase()}
                  {/if}
                </div>

                <!-- Status Dot Badge -->
                {#if u.status === 'online'}
                  <span class="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white"></span>
                  </span>
                {:else if u.status === 'idle'}
                  <span class="absolute -bottom-1 -right-1 inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 ring-2 ring-white"></span>
                {:else}
                  <span class="absolute -bottom-1 -right-1 inline-flex rounded-full h-3.5 w-3.5 bg-slate-300 ring-2 ring-white"></span>
                {/if}
              </div>

              <!-- Name & Username -->
              <div class="space-y-0.5 min-w-0">
                <h4 class="font-bold text-slate-800 text-sm truncate" title={u.namaLengkap}>
                  {u.namaLengkap || u.username}
                </h4>
                <p class="text-[11px] text-slate-500 font-mono">@{u.username}</p>
              </div>
            </div>

            <!-- Status Pill -->
            <div>
              {#if u.status === 'online'}
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Online
                </span>
              {:else if u.status === 'idle'}
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Idle
                </span>
              {:else}
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Offline
                </span>
              {/if}
            </div>
          </div>

          <!-- Middle: Roles & Email -->
          <div class="space-y-2 pt-1 border-t border-slate-100 text-xs">
            <div class="flex items-center gap-1.5 flex-wrap">
              {#each String(u.role || 'user').split(',') as r}
                <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold border border-slate-200 uppercase">
                  {r.trim()}
                </span>
              {/each}
            </div>

            <div class="flex items-center justify-between text-[11px] text-slate-500">
              <span class="text-slate-400">Keaktifan:</span>
              <span class="font-semibold {u.status === 'online' ? 'text-emerald-700 font-bold' : u.status === 'idle' ? 'text-amber-700' : 'text-slate-600'}">
                {formatTimeAgo(u.secondsAgo)}
              </span>
            </div>

            {#if u.lastIpAddress}
              <div class="flex items-center justify-between text-[11px] text-slate-500">
                <span class="text-slate-400">IP & Device:</span>
                <span class="font-mono text-slate-700 flex items-center gap-1">
                  <span class="text-[10px] text-slate-400">({device.os})</span>
                  {u.lastIpAddress}
                </span>
              </div>
            {/if}
          </div>

          <!-- Bottom: Action Detail Button -->
          <div class="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onclick={() => openUserDetail(u)}
              class="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200 flex items-center justify-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Detail Sesi & Aktivitas
            </button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- ==================== TABLE VIEW ==================== -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th class="py-3 px-4 w-12 text-center">No</th>
              <th class="py-3 px-4">User</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Role</th>
              <th class="py-3 px-4">Aktivitas Terakhir</th>
              <th class="py-3 px-4">Login Terakhir</th>
              <th class="py-3 px-4">IP & Perangkat</th>
              <th class="py-3 px-4 text-center w-20">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each filteredUsers as u, idx}
              {@const device = parseDevice(u.lastUserAgent)}
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="py-3 px-4 text-center text-slate-400 font-mono">{idx + 1}</td>

                <td class="py-3 px-4 min-w-[200px]">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs overflow-hidden shrink-0">
                      {#if u.foto}
                        <img src="{API_BASE_URL}{u.foto}" alt={u.namaLengkap} class="w-full h-full object-cover" />
                      {:else}
                        {(u.namaLengkap || u.username || 'U').charAt(0).toUpperCase()}
                      {/if}
                    </div>
                    <div>
                      <p class="font-bold text-slate-800">{u.namaLengkap || u.username}</p>
                      <p class="text-[11px] text-slate-400 font-mono">@{u.username} • {u.email || ''}</p>
                    </div>
                  </div>
                </td>

                <td class="py-3 px-4 whitespace-nowrap">
                  {#if u.status === 'online'}
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Online
                    </span>
                  {:else if u.status === 'idle'}
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Idle
                    </span>
                  {:else}
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      Offline
                    </span>
                  {/if}
                </td>

                <td class="py-3 px-4 whitespace-nowrap">
                  <div class="flex items-center gap-1 flex-wrap">
                    {#each String(u.role || 'user').split(',') as r}
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase border border-slate-200">
                        {r.trim()}
                      </span>
                    {/each}
                  </div>
                </td>

                <td class="py-3 px-4 whitespace-nowrap">
                  <p class="font-semibold {u.status === 'online' ? 'text-emerald-700 font-bold' : u.status === 'idle' ? 'text-amber-700' : 'text-slate-600'}">
                    {formatTimeAgo(u.secondsAgo)}
                  </p>
                  {#if u.lastActiveAt}
                    <p class="text-[10px] text-slate-400">{formatDateTime(u.lastActiveAt)}</p>
                  {/if}
                </td>

                <td class="py-3 px-4 whitespace-nowrap text-slate-600">
                  {formatDateTime(u.lastLoginAt)}
                </td>

                <td class="py-3 px-4 whitespace-nowrap">
                  <p class="font-mono text-slate-800">{u.lastIpAddress || '-'}</p>
                  <p class="text-[10px] text-slate-400">{device.os} • {device.browser}</p>
                </td>

                <td class="py-3 px-4 text-center whitespace-nowrap">
                  <button
                    type="button"
                    onclick={() => openUserDetail(u)}
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
    </div>
  {/if}
</div>

<!-- ==================== MODAL DETAIL AKTIVITAS USER ==================== -->
{#if showDetailModal && selectedUser}
  {@const device = parseDevice(selectedUser.lastUserAgent)}
  <div
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
      <!-- Modal Header -->
      <div class="p-5 bg-slate-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 overflow-hidden">
            {#if selectedUser.foto}
              <img src="{API_BASE_URL}{selectedUser.foto}" alt={selectedUser.namaLengkap} class="w-full h-full object-cover" />
            {:else}
              {(selectedUser.namaLengkap || selectedUser.username || 'U').charAt(0).toUpperCase()}
            {/if}
          </div>
          <div>
            <h3 class="font-bold text-base text-white">{selectedUser.namaLengkap || selectedUser.username}</h3>
            <p class="text-xs text-slate-400 font-mono">@{selectedUser.username}</p>
          </div>
        </div>

        <button
          type="button"
          onclick={closeUserDetail}
          class="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4 text-xs">
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div class="flex justify-between items-center pb-2 border-b border-slate-200">
            <span class="text-slate-500">Status Saat Ini:</span>
            {#if selectedUser.status === 'online'}
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                Online (Aktif)
              </span>
            {:else if selectedUser.status === 'idle'}
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Idle / Away
              </span>
            {:else}
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                Offline
              </span>
            {/if}
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-500">Aktivitas Terakhir:</span>
            <span class="font-bold text-slate-800">{formatTimeAgo(selectedUser.secondsAgo)}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-500">Waktu Detil Aktif:</span>
            <span class="font-mono text-slate-700">{formatDateTime(selectedUser.lastActiveAt)}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-500">Waktu Login Terakhir:</span>
            <span class="font-mono text-slate-700">{formatDateTime(selectedUser.lastLoginAt)}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-500">Alamat IP:</span>
            <span class="font-mono text-blue-700 font-bold">{selectedUser.lastIpAddress || '-'}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-500">Perangkat / OS:</span>
            <span class="font-medium text-slate-800">{device.os} ({device.browser})</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-500">Email:</span>
            <span class="font-mono text-slate-800">{selectedUser.email || '-'}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-slate-500">Daftar Role:</span>
            <div class="flex gap-1 flex-wrap justify-end">
              {#each String(selectedUser.role || 'user').split(',') as r}
                <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-200 uppercase">
                  {r.trim()}
                </span>
              {/each}
            </div>
          </div>
        </div>

        {#if selectedUser.lastUserAgent}
          <div class="space-y-1">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">User Agent Header:</span>
            <p class="p-2.5 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-600 break-all border border-slate-200">
              {selectedUser.lastUserAgent}
            </p>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
        <button
          type="button"
          onclick={closeUserDetail}
          class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}
