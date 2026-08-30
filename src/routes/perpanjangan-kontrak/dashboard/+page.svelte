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
  let selectedTab = "unor"; // "unor", "operator", "recent", "kinerja"

  let limitUnor = 10;
  let pageUnor = 1;

  let limitOperator = 10;
  let pageOperator = 1;

  let limitRecent = 10;
  let pageRecent = 1;

  // --- KINERJA HARIAN STATE ---
  function getTodayString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  let kinerjaDate = getTodayString();
  let kinerjaPreset = "today"; // "today", "yesterday", "custom"
  let kinerjaLoading = false;
  let kinerjaFromCache = false;
  let kinerjaIsToday = true;
  let snapshotLoading = false;

  let kinerjaData = {
    summary: {
      totalDikerjakan: 0,
      pendingCount: 0,
      approvedCount: 0,
      srikandiCount: 0,
      selesaiCount: 0,
      rejectedCount: 0,
      activeUserCount: 0
    },
    byUser: [],
    meta: { tanggal: null, isToday: true, fromCache: false }
  };

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

  async function fetchKinerjaHarian() {
    kinerjaLoading = true;
    try {
      const params = new URLSearchParams();
      if (kinerjaDate) params.set("date", kinerjaDate);

      const res = await apiRequest(`/api/v1/perpanjangan/kinerja-harian?${params.toString()}`);
      if (res && res.success) {
        kinerjaData = res.data;
        kinerjaFromCache = res.data?.meta?.fromCache ?? false;
        kinerjaIsToday = res.data?.meta?.isToday ?? true;
      } else {
        addToast(res?.message || "Gagal memuat rekap kinerja", "error");
      }
    } catch (err) {
      console.error("fetchKinerjaHarian error:", err);
      addToast("Terjadi kesalahan saat memuat rekap kinerja harian", "error");
    } finally {
      kinerjaLoading = false;
    }
  }

  async function triggerKinerjaSnapshot() {
    snapshotLoading = true;
    try {
      const res = await apiRequest(`/api/v1/perpanjangan/kinerja-snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: kinerjaDate })
      });
      if (res && res.success) {
        addToast(`Snapshot rekap kinerja untuk ${kinerjaDate} berhasil disimpan`, "success");
        await fetchKinerjaHarian();
      } else {
        addToast(res?.message || "Gagal menyimpan snapshot kinerja", "error");
      }
    } catch (err) {
      addToast("Terjadi kesalahan saat menyimpan snapshot", "error");
    } finally {
      snapshotLoading = false;
    }
  }

  function setKinerjaPreset(preset) {
    kinerjaPreset = preset;
    if (preset === "today") {
      kinerjaDate = getTodayString();
    } else if (preset === "yesterday") {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yyyy = yest.getFullYear();
      const mm = String(yest.getMonth() + 1).padStart(2, "0");
      const dd = String(yest.getDate()).padStart(2, "0");
      kinerjaDate = `${yyyy}-${mm}-${dd}`;
    }
    fetchKinerjaHarian();
  }

  function handleKinerjaDateChange(e) {
    kinerjaDate = e.target.value;
    kinerjaPreset = "custom";
    fetchKinerjaHarian();
  }

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Silakan login terlebih dahulu", "error");
      goto("/login");
      return;
    }
    await fetchDashboardStats();
    await fetchKinerjaHarian();
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
        return "Selesai (PK Terbit)";
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

  // --- Modal Rincian Usulan Berdasarkan Status & User ---
  let showDetailModal = false;
  let detailStatus = ""; // "PENDING", "APPROVED", "UPLOAD_SRIKANDI", "SELESAI", "REJECTED", or "" (Semua)
  let detailSearch = "";
  let detailPage = 1;
  let detailLimit = 10;
  let detailLoading = false;
  let detailRecords = [];
  const detailLimitOptions = [10, 25, 50, 100];

  // Grouping/Rekap State inside Modal
  let selectedUserId = null; // null = Rekap Mode (Grid user), 'ALL' = Semua daftar pegawai, or userId = Daftar pegawai user tersebut

  function openDetailModal(status = "", initialSearch = "") {
    detailStatus = status;
    detailSearch = initialSearch;
    detailPage = 1;
    selectedUserId = null;
    showDetailModal = true;
    fetchDetailUsulan(1);
  }

  function closeDetailModal() {
    showDetailModal = false;
    detailRecords = [];
    selectedUserId = null;
  }

  async function fetchDetailUsulan(page = 1) {
    detailLoading = true;
    detailPage = page;
    try {
      let queryParams = new URLSearchParams({
        isLaporan: "true",
        limit: "all"
      });
      if (detailStatus) queryParams.set("status", detailStatus);
      if (detailSearch.trim()) queryParams.set("search", detailSearch.trim());

      const res = await apiRequest(`/api/v1/perpanjangan/usulan?${queryParams.toString()}`);
      if (res && res.success) {
        detailRecords = res.data || [];
      } else {
        addToast(res?.message || "Gagal memuat rincian usulan", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memuat data rincian usulan", "error");
    } finally {
      detailLoading = false;
    }
  }

  function handleDetailSearch() {
    detailPage = 1;
    fetchDetailUsulan(1);
  }

  function handleDetailStatusChange(st) {
    detailStatus = st;
    detailPage = 1;
    selectedUserId = null;
    fetchDetailUsulan(1);
  }

  function selectUserForDetail(userId) {
    selectedUserId = userId;
    detailPage = 1;
  }

  function clearSelectedUser() {
    selectedUserId = null;
    detailPage = 1;
  }

  // Derived grouping by User / Operator
  $: userRecap = (() => {
    const map = new Map();
    for (const rec of detailRecords) {
      const userKey = rec.editedBy?.id || rec.editedBy?.username || 'unassigned';
      if (!map.has(userKey)) {
        map.set(userKey, {
          userId: userKey,
          namaLengkap: rec.editedBy?.namaLengkap || rec.editedBy?.username || 'System / Auto',
          username: rec.editedBy?.username || '',
          role: rec.editedBy?.role || '',
          count: 0,
          records: []
        });
      }
      const item = map.get(userKey);
      item.count++;
      item.records.push(rec);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  })();

  $: activeUserObj = (selectedUserId && selectedUserId !== 'ALL')
    ? userRecap.find(u => u.userId === selectedUserId)
    : null;

  $: activeUserRecords = (() => {
    if (!selectedUserId || selectedUserId === 'ALL') {
      return detailRecords;
    }
    const found = userRecap.find(u => u.userId === selectedUserId);
    return found ? found.records : [];
  })();

  $: totalPagesDetail = Math.max(1, Math.ceil(activeUserRecords.length / detailLimit));
  $: displayedDetailRecords = activeUserRecords.slice((detailPage - 1) * detailLimit, detailPage * detailLimit);

  function getStatusColorClass(status) {
    switch (status) {
      case "SELESAI":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          badge: "bg-emerald-100 text-emerald-800",
          iconBg: "bg-emerald-500 text-white",
          border: "border-emerald-500",
          activeTab: "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
        };
      case "UPLOAD_SRIKANDI":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          badge: "bg-purple-100 text-purple-800",
          iconBg: "bg-purple-500 text-white",
          border: "border-purple-500",
          activeTab: "bg-purple-600 text-white shadow-md shadow-purple-500/20"
        };
      case "APPROVED":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          badge: "bg-blue-100 text-blue-800",
          iconBg: "bg-blue-500 text-white",
          border: "border-blue-500",
          activeTab: "bg-blue-600 text-white shadow-md shadow-blue-500/20"
        };
      case "PENDING":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          badge: "bg-amber-100 text-amber-800",
          iconBg: "bg-amber-500 text-white",
          border: "border-amber-500",
          activeTab: "bg-amber-500 text-white shadow-md shadow-amber-500/20"
        };
      case "REJECTED":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          badge: "bg-rose-100 text-rose-800",
          iconBg: "bg-rose-500 text-white",
          border: "border-rose-500",
          activeTab: "bg-rose-600 text-white shadow-md shadow-rose-500/20"
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          badge: "bg-slate-100 text-slate-800",
          iconBg: "bg-blue-600 text-white",
          border: "border-blue-600",
          activeTab: "bg-blue-600 text-white shadow-md shadow-blue-500/20"
        };
    }
  }
</script>

<svelte:head>
  <title>Dashboard Progres Usulan PK — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 w-full overflow-x-hidden">
  <!-- Header Title -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
    <div class="space-y-1">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight break-words">Dashboard Progres Usulan PK</h1>
          <p class="text-xs text-slate-500 font-medium">Monitoring status usulan perpanjangan Perjanjian Kerja secara real-time</p>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
      <button on:click={fetchDashboardStats} class="btn-secondary flex-1 sm:flex-initial justify-center" disabled={isLoading}>
        {#if isLoading}
          <div class="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
        {:else}
          <svg class="w-4 h-4 mr-1.5 sm:mr-2 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {/if}
        Refresh Data
      </button>

      <a href="/perpanjangan-kontrak/usulan" class="btn-primary flex-1 sm:flex-initial justify-center">
        <svg class="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      <!-- Card 1: Total Pegawai Aktif -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group min-w-0">
        <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full space-y-3">
          <div>
            <div class="flex items-center justify-between mb-2 sm:mb-3">
              <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">Total Pegawai PPPK</span>
              <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div class="text-2xl sm:text-3xl font-extrabold text-slate-800">{stats.summary.totalPegawaiAktif}</div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Sudah Usulan:</span>
            <button
              type="button"
              on:click={() => openDetailModal('')}
              class="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              title="Lihat seluruh usulan"
            >
              {stats.summary.totalPegawaiDenganUsulan} ({stats.summary.usulanPercentage}%)
            </button>
          </div>
        </div>
      </div>

      <!-- Card 2: Usulan Selesai -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
      <div
        role="button"
        tabindex="0"
        on:click={() => openDetailModal('SELESAI')}
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-300 transition-all relative overflow-hidden group cursor-pointer min-w-0"
        title="Klik untuk melihat rincian usulan Selesai (PK Terbit)"
      >
        <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full space-y-3">
          <div>
            <div class="flex items-center justify-between mb-2 sm:mb-3">
              <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">Usulan Selesai (PK)</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="flex items-baseline justify-between">
              <div class="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats.summary.selesaiCount}</div>
              <span class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                Rincian &rarr;
              </span>
            </div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Tingkat Penyelesaian:</span>
            <span class="font-bold text-emerald-600">{stats.summary.completionPercentage}%</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Dalam Proses (Approved + Srikandi) -->
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
      <div
        role="button"
        tabindex="0"
        on:click={() => openDetailModal('APPROVED')}
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-300 transition-all relative overflow-hidden group cursor-pointer min-w-0"
        title="Klik untuk melihat rincian berkas yang sedang dipproses"
      >
        <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full space-y-3">
          <div>
            <div class="flex items-center justify-between mb-2 sm:mb-3">
              <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">Sedang Diproses</span>
              <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="flex items-baseline justify-between">
              <div class="text-2xl sm:text-3xl font-extrabold text-indigo-600">
                {stats.summary.approvedCount + stats.summary.srikandiCount}
              </div>
              <span class="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
                Rincian &rarr;
              </span>
            </div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              on:click|stopPropagation={() => openDetailModal('APPROVED')}
              class="text-slate-500 hover:text-blue-600 hover:underline"
            >
              Approved: <b class="text-blue-600">{stats.summary.approvedCount}</b>
            </button>
            <button
              type="button"
              on:click|stopPropagation={() => openDetailModal('UPLOAD_SRIKANDI')}
              class="text-slate-500 hover:text-purple-600 hover:underline"
            >
              Srikandi: <b class="text-purple-600">{stats.summary.srikandiCount}</b>
            </button>
          </div>
        </div>
      </div>

      <!-- Card 4: Belum Buat Usulan -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group min-w-0">
        <div class="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col justify-between h-full space-y-3">
          <div>
            <div class="flex items-center justify-between mb-2 sm:mb-3">
              <span class="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block truncate">Belum Ada Usulan</span>
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div class="text-2xl sm:text-3xl font-extrabold text-amber-600">{stats.summary.totalPegawaiBelumUsulan}</div>
          </div>
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 font-medium">Pending Review:</span>
            <button
              type="button"
              on:click={() => openDetailModal('PENDING')}
              class="font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
              title="Lihat usulan pending review"
            >
              {stats.summary.pendingCount} &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Workflow Progress Bar Breakdown -->
    <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 class="text-sm sm:text-base font-bold text-slate-800">Alur Pipeline Usulan Kontrak</h2>
          <p class="text-xs text-slate-500">Distribusi status berkas dari pengajuan awal hingga penandatanganan PK final</p>
        </div>
        <div class="text-left sm:text-right self-start sm:self-auto">
          <span class="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Total Usulan</span>
          <p class="text-base sm:text-lg font-black text-slate-800">{stats.summary.totalUsulan}</p>
        </div>
      </div>

      <!-- Segmented Bar (Clickable) -->
      <div class="h-3.5 sm:h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
        {#if stats.summary.totalUsulan > 0}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
          <div
            role="button"
            tabindex="0"
            on:click={() => openDetailModal('PENDING')}
            style="width: {(stats.summary.pendingCount / stats.summary.totalUsulan) * 100}%"
            class="bg-amber-400 hover:brightness-110 transition-all duration-300 cursor-pointer"
            title="Klik untuk rincian Pending: {stats.summary.pendingCount}"
          ></div>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
          <div
            role="button"
            tabindex="0"
            on:click={() => openDetailModal('APPROVED')}
            style="width: {(stats.summary.approvedCount / stats.summary.totalUsulan) * 100}%"
            class="bg-blue-500 hover:brightness-110 transition-all duration-300 cursor-pointer"
            title="Klik untuk rincian Approved: {stats.summary.approvedCount}"
          ></div>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
          <div
            role="button"
            tabindex="0"
            on:click={() => openDetailModal('UPLOAD_SRIKANDI')}
            style="width: {(stats.summary.srikandiCount / stats.summary.totalUsulan) * 100}%"
            class="bg-purple-500 hover:brightness-110 transition-all duration-300 cursor-pointer"
            title="Klik untuk rincian Srikandi: {stats.summary.srikandiCount}"
          ></div>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
          <div
            role="button"
            tabindex="0"
            on:click={() => openDetailModal('SELESAI')}
            style="width: {(stats.summary.selesaiCount / stats.summary.totalUsulan) * 100}%"
            class="bg-emerald-500 hover:brightness-110 transition-all duration-300 cursor-pointer"
            title="Klik untuk rincian Selesai: {stats.summary.selesaiCount}"
          ></div>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
          <div
            role="button"
            tabindex="0"
            on:click={() => openDetailModal('REJECTED')}
            style="width: {(stats.summary.rejectedCount / stats.summary.totalUsulan) * 100}%"
            class="bg-rose-400 hover:brightness-110 transition-all duration-300 cursor-pointer"
            title="Klik untuk rincian Ditolak: {stats.summary.rejectedCount}"
          ></div>
        {/if}
      </div>

      <!-- Legend Cards (Clickable) -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 pt-1 sm:pt-2">
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
        <div
          role="button"
          tabindex="0"
          on:click={() => openDetailModal('PENDING')}
          class="bg-amber-50/70 hover:bg-amber-100/90 border border-amber-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm min-w-0"
          title="Klik untuk melihat rincian usulan Pending Review"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
            <span class="text-xs font-semibold text-slate-700 truncate">1. Pending</span>
          </div>
          <span class="text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full shrink-0 ml-1">{stats.summary.pendingCount}</span>
        </div>

        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
        <div
          role="button"
          tabindex="0"
          on:click={() => openDetailModal('APPROVED')}
          class="bg-blue-50/70 hover:bg-blue-100/90 border border-blue-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm min-w-0"
          title="Klik untuk melihat rincian usulan Approved"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
            <span class="text-xs font-semibold text-slate-700 truncate">2. Approved</span>
          </div>
          <span class="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full shrink-0 ml-1">{stats.summary.approvedCount}</span>
        </div>

        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
        <div
          role="button"
          tabindex="0"
          on:click={() => openDetailModal('UPLOAD_SRIKANDI')}
          class="bg-purple-50/70 hover:bg-purple-100/90 border border-purple-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm min-w-0"
          title="Klik untuk melihat rincian usulan Proses Srikandi"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
            <span class="text-xs font-semibold text-slate-700 truncate">3. Srikandi</span>
          </div>
          <span class="text-xs font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full shrink-0 ml-1">{stats.summary.srikandiCount}</span>
        </div>

        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
        <div
          role="button"
          tabindex="0"
          on:click={() => openDetailModal('SELESAI')}
          class="bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm min-w-0"
          title="Klik untuk melihat rincian usulan Selesai (PK Terbit)"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span class="text-xs font-semibold text-slate-700 truncate">4. Selesai</span>
          </div>
          <span class="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0 ml-1">{stats.summary.selesaiCount}</span>
        </div>

        <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
        <div
          role="button"
          tabindex="0"
          on:click={() => openDetailModal('REJECTED')}
          class="bg-rose-50/70 hover:bg-rose-100/90 border border-rose-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm min-w-0 col-span-2 sm:col-span-1"
          title="Klik untuk melihat rincian usulan Ditolak"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0"></span>
            <span class="text-xs font-semibold text-slate-700 truncate">Ditolak</span>
          </div>
          <span class="text-xs font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full shrink-0 ml-1">{stats.summary.rejectedCount}</span>
        </div>
      </div>
    </div>

    <!-- Section Tabs -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div class="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-thin">
          <button
            on:click={() => (selectedTab = "unor")}
            class="px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 {selectedTab === 'unor' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'}"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M13 16h.01M13 12h.01" />
            </svg>
            Per Unit Kerja ({stats.byUnor?.length || 0})
          </button>

          <button
            on:click={() => (selectedTab = "operator")}
            class="px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 {selectedTab === 'operator' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'}"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Performa Operator ({stats.byOperator?.length || 0})
          </button>

          <button
            on:click={() => (selectedTab = "recent")}
            class="px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 {selectedTab === 'recent' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'}"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Aktivitas Terbaru
          </button>

          <button
            on:click={() => {
              selectedTab = "kinerja";
            }}
            class="px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 {selectedTab === 'kinerja' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-600 hover:bg-slate-100'}"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Kinerja
            {#if kinerjaData.summary?.totalDikerjakan > 0}
              <span class="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold {selectedTab === 'kinerja' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}">
                {kinerjaData.summary.totalDikerjakan}
              </span>
            {/if}
          </button>
        </div>

        <div class="flex items-center gap-2.5 w-full sm:w-auto">
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

            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-xs text-slate-500 font-semibold hidden sm:inline">Tampilkan:</span>
              <select
                bind:value={limitUnor}
                class="text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
              >
                {#each limitOptions as opt}
                  <option value={opt}>{opt} Data</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if selectedTab === "operator"}
            <div class="flex items-center gap-1.5 ml-auto shrink-0">
              <span class="text-xs text-slate-500 font-semibold hidden sm:inline">Tampilkan:</span>
              <select
                bind:value={limitOperator}
                class="text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
              >
                {#each limitOptions as opt}
                  <option value={opt}>{opt} Data</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if selectedTab === "recent"}
            <div class="flex items-center gap-1.5 ml-auto shrink-0">
              <span class="text-xs text-slate-500 font-semibold hidden sm:inline">Tampilkan:</span>
              <select
                bind:value={limitRecent}
                class="text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 shadow-sm"
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
          <div class="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80">
            <p class="text-slate-500 text-sm">Tidak ada unit kerja yang sesuai dengan pencarian.</p>
          </div>
        {:else}
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-0 min-w-0">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-slate-500">
              <span>Menampilkan <b>{displayedUnor.length}</b> dari total <b>{filteredUnor.length}</b> Unit Kerja</span>
              <span class="text-[11px] text-slate-400">Default: 10 | Max: 500</span>
            </div>
            <div class="overflow-x-auto max-w-full scrollbar-thin">
              <table class="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th class="py-3.5 px-4 min-w-[200px]">Unit Kerja Induk (Unor Induk)</th>
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
                      <td class="py-3.5 px-4 font-bold text-slate-800 break-words">
                        {item.unorNama}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-slate-700">
                        {item.totalPegawai}
                      </td>
                      <td class="py-3.5 px-4 text-center font-semibold">
                        <button
                          type="button"
                          on:click={() => openDetailModal('', item.unorNama)}
                          class="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                          title="Lihat seluruh usulan unit kerja ini"
                        >
                          {item.totalUsulan}
                        </button>
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {#if item.selesai > 0}
                          <button
                            type="button"
                            on:click={() => openDetailModal('SELESAI', item.unorNama)}
                            class="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Lihat usulan selesai unit kerja ini"
                          >
                            {item.selesai}
                          </button>
                        {:else}
                          <span class="text-slate-400">0</span>
                        {/if}
                      </td>
                      <td class="py-3.5 px-4 text-center text-purple-600 font-medium">
                        {#if item.srikandi > 0}
                          <button
                            type="button"
                            on:click={() => openDetailModal('UPLOAD_SRIKANDI', item.unorNama)}
                            class="px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                            title="Lihat usulan srikandi unit kerja ini"
                          >
                            {item.srikandi}
                          </button>
                        {:else}
                          <span class="text-slate-400">0</span>
                        {/if}
                      </td>
                      <td class="py-3.5 px-4 text-center text-blue-600 font-medium">
                        {#if item.approved > 0}
                          <button
                            type="button"
                            on:click={() => openDetailModal('APPROVED', item.unorNama)}
                            class="px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            title="Lihat usulan approved unit kerja ini"
                          >
                            {item.approved}
                          </button>
                        {:else}
                          <span class="text-slate-400">0</span>
                        {/if}
                      </td>
                      <td class="py-3.5 px-4 text-center text-amber-600 font-medium">
                        {#if item.pending > 0}
                          <button
                            type="button"
                            on:click={() => openDetailModal('PENDING', item.unorNama)}
                            class="px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                            title="Lihat usulan pending unit kerja ini"
                          >
                            {item.pending}
                          </button>
                        {:else}
                          <span class="text-slate-400">0</span>
                        {/if}
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
              <p class="text-slate-500 font-medium text-center sm:text-left">
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
          <div class="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80">
            <p class="text-slate-500 text-sm">Belum ada data performa operator.</p>
          </div>
        {:else}
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-w-0">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-slate-500">
              <span>Menampilkan <b>{displayedOperator.length}</b> dari total <b>{(stats.byOperator || []).length}</b> Operator</span>
              <span class="text-[11px] text-slate-400">Default: 10 | Max: 500</span>
            </div>
            <div class="overflow-x-auto max-w-full scrollbar-thin">
              <table class="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th class="py-3.5 px-4 min-w-[200px]">Operator / User</th>
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
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                            {(op.namaLengkap || op.username).charAt(0).toUpperCase()}
                          </div>
                          <div class="min-w-0">
                            <p class="font-bold text-slate-800 break-words">{op.namaLengkap || op.username}</p>
                            <p class="text-[10px] text-slate-400 font-mono break-all">@{op.username}</p>
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
                      <td class="py-3.5 px-4 text-center font-semibold">
                        {#if op.createdUsulan > 0}
                          <button
                            type="button"
                            on:click={() => openDetailModal('', op.namaLengkap || op.username)}
                            class="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                            title="Lihat usulan yang dibuat oleh operator ini"
                          >
                            {op.createdUsulan}
                          </button>
                        {:else}
                          <span class="text-slate-400">0</span>
                        {/if}
                      </td>
                      <td class="py-3.5 px-4 text-center font-bold">
                        {#if op.selesaiUsulan > 0}
                          <button
                            type="button"
                            on:click={() => openDetailModal('SELESAI', op.namaLengkap || op.username)}
                            class="px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                            title="Lihat usulan selesai oleh operator ini"
                          >
                            {op.selesaiUsulan}
                          </button>
                        {:else}
                          <span class="text-slate-400">0</span>
                        {/if}
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
              <p class="text-slate-500 font-medium text-center sm:text-left">
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
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-w-0">
          <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-slate-500">
            <span>Menampilkan <b>{displayedRecent.length}</b> dari total <b>{(stats.recentUsulan || []).length}</b> Aktivitas Terbaru</span>
            <span class="text-[11px] text-slate-400">Default: 10 | Max: 500</span>
          </div>
          <div class="overflow-x-auto max-w-full scrollbar-thin">
            <table class="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th class="py-3.5 px-4 min-w-[180px]">Pegawai (NIP & Nama)</th>
                  <th class="py-3.5 px-4 min-w-[180px]">Unit Kerja</th>
                  <th class="py-3.5 px-4">Nomor Kontrak</th>
                  <th class="py-3.5 px-4">Status</th>
                  <th class="py-3.5 px-4 min-w-[140px]">Operator / Pengaju</th>
                  <th class="py-3.5 px-4 text-right">Terakhir Diupdate</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                {#each displayedRecent as u}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4">
                      <p class="font-bold text-slate-800 break-words">{u.dataP3k?.nama || '-'}</p>
                      <p class="text-[10px] text-slate-400 font-mono break-all">NIP: {u.dataP3k?.nipBaru || '-'}</p>
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 font-medium break-words">
                      {u.dataP3k?.unorInduk?.nama || '-'}
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[11px] text-slate-700 break-all">
                      {u.nomorKontrak || '-'}
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border {getStatusBadgeClass(u.status)}">
                        {getStatusLabel(u.status)}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-slate-700 font-medium break-words">
                      {u.editedBy?.namaLengkap || u.editedBy?.username || '-'}
                    </td>
                    <td class="py-3.5 px-4 text-right text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDate(u.updatedAt)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p class="text-slate-500 font-medium text-center sm:text-left">
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

      <!-- TAB 4: KINERJA HARIAN (SIMPEL: FILTER TANGGAL -> TABEL REKAP) -->
      {#if selectedTab === "kinerja"}
        <div class="space-y-4">
          <!-- Filter Tanggal Bar Sederhana -->
          <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                Filter Tanggal:
              </span>
              <input
                type="date"
                value={kinerjaDate || getTodayString()}
                on:change={handleKinerjaDateChange}
                class="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 bg-white shadow-sm"
              />

              <!-- Indikator Live vs Cache -->
              {#if !kinerjaLoading && kinerjaData.byUser?.length > 0}
                {#if kinerjaIsToday}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                  </span>
                {:else if kinerjaFromCache}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200" title="Data diambil dari cache snapshot">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 10a2 2 0 002 2h8a2 2 0 002-2l1-10" /></svg>
                    Cached
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Live (belum dicache)
                  </span>
                {/if}
              {/if}
            </div>

            <!-- Quick Preset + Actions -->
            <div class="flex items-center gap-1.5">
              <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  on:click={() => setKinerjaPreset("today")}
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {kinerjaPreset === 'today' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  on:click={() => setKinerjaPreset("yesterday")}
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {kinerjaPreset === 'yesterday' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
                >
                  Kemarin
                </button>
                <button
                  type="button"
                  on:click={fetchKinerjaHarian}
                  class="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                  title="Muat Ulang Data"
                >
                  <svg class="w-4 h-4 {kinerjaLoading ? 'animate-spin text-blue-600' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              <!-- Tombol Simpan Snapshot Manual (hanya untuk tanggal bukan hari ini) -->
              {#if !kinerjaIsToday && kinerjaData.byUser?.length > 0 && !kinerjaFromCache}
                <button
                  type="button"
                  on:click={triggerKinerjaSnapshot}
                  disabled={snapshotLoading}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  title="Simpan snapshot rekap hari ini ke cache agar lebih cepat dimuat berikutnya"
                >
                  {#if snapshotLoading}
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  {:else}
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  {/if}
                  Simpan Cache
                </button>
              {/if}
            </div>
          </div>

          <!-- Progres Rekapitulasi Hari Ini / Tanggal Terpilih -->
          {#if kinerjaLoading}
            <div class="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200 shadow-sm space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                  <div>
                    <h4 class="text-xs sm:text-sm font-bold text-slate-800">Sedang Merekap Data Kinerja...</h4>
                    <p class="text-[11px] text-slate-400">Menghitung total berkas yang dikerjakan pada tanggal <b>{kinerjaDate || getTodayString()}</b></p>
                  </div>
                </div>
                <div class="text-right">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                    Memproses...
                  </span>
                </div>
              </div>
              <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div class="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full animate-pulse w-full"></div>
              </div>
            </div>
          {:else if (kinerjaData.summary?.totalDikerjakan || 0) > 0}
            {@const total = kinerjaData.summary.totalDikerjakan}
            {@const selesai = kinerjaData.summary.selesaiCount || 0}
            {@const srikandi = kinerjaData.summary.srikandiCount || 0}
            {@const approved = kinerjaData.summary.approvedCount || 0}
            {@const pending = kinerjaData.summary.pendingCount || 0}
            {@const rejected = kinerjaData.summary.rejectedCount || 0}
            {@const percentSelesai = Math.round((selesai / total) * 100)}

            <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Progres Rekap Tanggal: <b>{kinerjaDate || getTodayString()}</b></span>
                    {#if kinerjaIsToday}
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Aktif Hari Ini
                      </span>
                    {/if}
                  </div>
                  <h4 class="text-sm sm:text-base font-bold text-slate-800 mt-1">
                    {selesai} dari {total} Berkas Selesai Diterbitkan ({percentSelesai}%)
                  </h4>
                </div>
                
                <!-- Badge Total Berkas yang Direkap -->
                <div class="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-blue-200/80 px-3.5 py-2 rounded-xl shrink-0">
                  <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    <i class="ri-file-list-3-line"></i>
                  </div>
                  <div>
                    <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Berkas Direkap</span>
                    <span class="text-base font-black text-slate-800 font-mono leading-none">{total} <span class="text-xs font-semibold text-slate-500">Berkas</span></span>
                  </div>
                </div>
              </div>

              <!-- Multi-color Segmented Progress Bar dengan Label Persentase -->
              <div class="space-y-2">
                <div class="w-full bg-slate-100 rounded-xl h-5 flex overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
                  {#if selesai > 0}
                    <div
                      style="width: {(selesai / total) * 100}%"
                      class="bg-emerald-500 hover:bg-emerald-600 h-full rounded-l-lg transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1 whitespace-nowrap"
                      title="Selesai: {selesai} berkas ({percentSelesai}%)"
                    >
                      {#if (selesai / total) >= 0.08}
                        {selesai} Selesai ({percentSelesai}%)
                      {:else}
                        {selesai}
                      {/if}
                    </div>
                  {/if}
                  {#if srikandi > 0}
                    <div
                      style="width: {(srikandi / total) * 100}%"
                      class="bg-purple-500 hover:bg-purple-600 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1 whitespace-nowrap"
                      title="Upload Srikandi: {srikandi} berkas ({Math.round((srikandi / total) * 100)}%)"
                    >
                      {#if (srikandi / total) >= 0.08}
                        {srikandi} Srikandi
                      {:else}
                        {srikandi}
                      {/if}
                    </div>
                  {/if}
                  {#if approved > 0}
                    <div
                      style="width: {(approved / total) * 100}%"
                      class="bg-blue-500 hover:bg-blue-600 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1 whitespace-nowrap"
                      title="Approved: {approved} berkas ({Math.round((approved / total) * 100)}%)"
                    >
                      {#if (approved / total) >= 0.08}
                        {approved} Approved
                      {:else}
                        {approved}
                      {/if}
                    </div>
                  {/if}
                  {#if pending > 0}
                    <div
                      style="width: {(pending / total) * 100}%"
                      class="bg-amber-500 hover:bg-amber-600 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1 whitespace-nowrap"
                      title="Pending: {pending} berkas ({Math.round((pending / total) * 100)}%)"
                    >
                      {#if (pending / total) >= 0.08}
                        {pending} Pending
                      {:else}
                        {pending}
                      {/if}
                    </div>
                  {/if}
                  {#if rejected > 0}
                    <div
                      style="width: {(rejected / total) * 100}%"
                      class="bg-rose-500 hover:bg-rose-600 h-full rounded-r-lg transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1 whitespace-nowrap"
                      title="Ditolak: {rejected} berkas ({Math.round((rejected / total) * 100)}%)"
                    >
                      {#if (rejected / total) >= 0.08}
                        {rejected} Ditolak
                      {:else}
                        {rejected}
                      {/if}
                    </div>
                  {/if}
                </div>

                <!-- Legend status rincian -->
                <div class="flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-y-1.5 pt-1">
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Selesai: <b>{selesai}</b> ({percentSelesai}%)
                    </span>
                    <span class="flex items-center gap-1.5 bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                      <span class="w-2 h-2 rounded-full bg-purple-500"></span> Srikandi: <b>{srikandi}</b> ({Math.round((srikandi / total) * 100)}%)
                    </span>
                    <span class="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                      <span class="w-2 h-2 rounded-full bg-blue-500"></span> Approved: <b>{approved}</b> ({Math.round((approved / total) * 100)}%)
                    </span>
                    <span class="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                      <span class="w-2 h-2 rounded-full bg-amber-500"></span> Pending: <b>{pending}</b> ({Math.round((pending / total) * 100)}%)
                    </span>
                    {#if rejected > 0}
                      <span class="flex items-center gap-1.5 bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md border border-rose-200">
                        <span class="w-2 h-2 rounded-full bg-rose-500"></span> Ditolak: <b>{rejected}</b> ({Math.round((rejected / total) * 100)}%)
                      </span>
                    {/if}
                  </div>
                  <span class="text-slate-500 font-semibold text-xs">Total: <b class="text-slate-800 font-mono text-sm">{total}</b> Berkas ({kinerjaData.byUser?.length || 0} Operator)</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-lg shrink-0">
                  <i class="ri-inbox-line"></i>
                </div>
                <div>
                  <h4 class="text-xs sm:text-sm font-bold text-slate-700">Tidak ada berkas yang direkap pada tanggal ini</h4>
                  <p class="text-[11px] text-slate-400 mt-0.5">Tidak ditemukan aktivitas pengerjaan usulan perpanjangan kontrak pada tanggal <b>{kinerjaDate || getTodayString()}</b></p>
                </div>
              </div>
              <span class="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                0 Berkas
              </span>
            </div>
          {/if}

          <!-- Tabel Rekapitulasi Kinerja User Per Hari -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden min-w-0">
            <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span class="font-bold text-slate-700">
                Daftar Rekap per Operator ({kinerjaData.byUser?.length || 0} User) — Total <b class="text-blue-600 font-mono">{kinerjaData.summary?.totalDikerjakan || 0}</b> Berkas Direkap
              </span>
              <span class="font-semibold text-slate-600">
                Tanggal: <b>{kinerjaDate || getTodayString()}</b>
              </span>
            </div>

            <div class="overflow-x-auto max-w-full scrollbar-thin">
              <table class="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th class="py-3.5 px-4 w-12 text-center">No</th>
                    <th class="py-3.5 px-4 min-w-[180px]">User / Operator</th>
                    <th class="py-3.5 px-4 text-center text-amber-700 bg-amber-50/50">Pending</th>
                    <th class="py-3.5 px-4 text-center text-blue-700 bg-blue-50/50">Approved</th>
                    <th class="py-3.5 px-4 text-center text-purple-700 bg-purple-50/50">Upload Srikandi</th>
                    <th class="py-3.5 px-4 text-center text-emerald-700 bg-emerald-50/50">Selesai (PK)</th>
                    <th class="py-3.5 px-4 text-center text-rose-700 bg-rose-50/50">Ditolak</th>
                    <th class="py-3.5 px-4 text-center font-extrabold text-slate-800 bg-slate-100/70">Total Hari Ini</th>
                    <th class="py-3.5 px-4 min-w-[130px] text-center">Progres Selesai</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-xs">
                  {#if kinerjaLoading}
                    <tr>
                      <td colspan="9" class="py-12 text-center text-slate-400">
                        <div class="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span>Memuat rekap kinerja...</span>
                      </td>
                    </tr>
                  {:else if !kinerjaData.byUser || kinerjaData.byUser.length === 0}
                    <tr>
                      <td colspan="9" class="py-12 text-center text-slate-400">
                        <svg class="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p class="font-medium text-slate-600">Tidak ada aktivitas pengerjaan usulan pada tanggal ini</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">Silakan pilih tanggal lain pada filter di atas</p>
                      </td>
                    </tr>
                  {:else}
                    {#each kinerjaData.byUser as u, idx}
                      {@const userPercent = u.total > 0 ? Math.round((u.selesai / u.total) * 100) : 0}
                      <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {(u.namaLengkap || u.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p class="font-bold text-slate-800 leading-tight">
                                {u.namaLengkap}
                              </p>
                              <p class="text-[11px] text-slate-400 font-mono mt-0.5">
                                @{u.username} • <span class="capitalize">{u.role}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td class="py-3.5 px-4 text-center font-bold {u.pending > 0 ? 'text-amber-600 bg-amber-50/30' : 'text-slate-300'}">
                          {u.pending}
                        </td>
                        <td class="py-3.5 px-4 text-center font-bold {u.approved > 0 ? 'text-blue-600 bg-blue-50/30' : 'text-slate-300'}">
                          {u.approved}
                        </td>
                        <td class="py-3.5 px-4 text-center font-bold {u.srikandi > 0 ? 'text-purple-600 bg-purple-50/30' : 'text-slate-300'}">
                          {u.srikandi}
                        </td>
                        <td class="py-3.5 px-4 text-center font-bold {u.selesai > 0 ? 'text-emerald-600 bg-emerald-50/30' : 'text-slate-300'}">
                          {u.selesai}
                        </td>
                        <td class="py-3.5 px-4 text-center font-bold {u.rejected > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-300'}">
                          {u.rejected}
                        </td>
                        <td class="py-3.5 px-4 text-center font-black text-sm text-slate-800 bg-slate-50">
                          {u.total}
                        </td>
                        <td class="py-3.5 px-4">
                          <div class="space-y-1">
                            <div class="flex justify-between text-[10px] font-bold">
                              <span class="text-slate-500">{userPercent}%</span>
                              <span class="text-emerald-600">{u.selesai}/{u.total}</span>
                            </div>
                            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                style="width: {userPercent}%"
                                class="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  {/if}
                </tbody>
                {#if kinerjaData.byUser && kinerjaData.byUser.length > 0}
                  {@const totalAll = kinerjaData.summary?.totalDikerjakan || 0}
                  {@const selesaiAll = kinerjaData.summary?.selesaiCount || 0}
                  {@const percentAll = totalAll > 0 ? Math.round((selesaiAll / totalAll) * 100) : 0}
                  <tfoot>
                    <tr class="bg-slate-100/80 border-t-2 border-slate-300 text-xs font-black text-slate-800">
                      <td colspan="2" class="py-3.5 px-4 text-right uppercase tracking-wider">
                        Total Keseluruhan :
                      </td>
                      <td class="py-3.5 px-4 text-center text-amber-700 bg-amber-100/40">
                        {kinerjaData.summary?.pendingCount || 0}
                      </td>
                      <td class="py-3.5 px-4 text-center text-blue-700 bg-blue-100/40">
                        {kinerjaData.summary?.approvedCount || 0}
                      </td>
                      <td class="py-3.5 px-4 text-center text-purple-700 bg-purple-100/40">
                        {kinerjaData.summary?.srikandiCount || 0}
                      </td>
                      <td class="py-3.5 px-4 text-center text-emerald-700 bg-emerald-100/40">
                        {kinerjaData.summary?.selesaiCount || 0}
                      </td>
                      <td class="py-3.5 px-4 text-center text-rose-700 bg-rose-100/40">
                        {kinerjaData.summary?.rejectedCount || 0}
                      </td>
                      <td class="py-3.5 px-4 text-center text-sm font-black text-slate-900 bg-slate-200/80">
                        {totalAll}
                      </td>
                      <td class="py-3.5 px-4">
                        <div class="space-y-1">
                          <div class="flex justify-between text-[10px] font-bold">
                            <span class="text-slate-600">{percentAll}%</span>
                            <span class="text-emerald-700">{selesaiAll}/{totalAll}</span>
                          </div>
                          <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              style="width: {percentAll}%"
                              class="h-full bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full transition-all duration-500"
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                {/if}
              </table>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Modal Rincian Usulan Berdasarkan Status & Pengusul -->
  {#if showDetailModal}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div
      role="dialog"
      aria-modal="true"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-6"
      on:click|self={closeDetailModal}
    >
      <div class="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden">
        <!-- Modal Header -->
        <div class="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0 {getStatusColorClass(detailStatus).iconBg}">
              <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 class="text-sm sm:text-lg font-bold tracking-tight break-words">
                  Rincian Usulan PK {detailStatus ? `: ${getStatusLabel(detailStatus)}` : '(Semua Status)'}
                </h3>
                <span class="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-white/20 text-white backdrop-blur-sm border border-white/10 shrink-0">
                  {detailRecords.length} Data
                </span>
              </div>
              <p class="text-[10px] sm:text-xs text-slate-300 mt-0.5 truncate">
                Daftar rekapitulasi user pengusul dan rincian pegawai perpanjangan kontrak
              </p>
            </div>
          </div>

          <button
            type="button"
            on:click={closeDetailModal}
            class="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
            title="Tutup Modal"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 1. Baris Atas: Pilihan Semua Status -->
        <div class="px-4 sm:px-6 py-2.5 sm:py-3.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div class="flex items-center gap-1.5 mb-2">
            <svg class="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">Pilih Status Usulan:</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
            <!-- Semua Status -->
            <button
              type="button"
              on:click={() => handleDetailStatusChange('')}
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-between border min-w-0 {detailStatus === '' ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'}"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0 {detailStatus === '' ? 'bg-white' : 'bg-slate-400'}"></span>
                <span class="truncate">Semua</span>
              </div>
              <span class="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 {detailStatus === '' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}">
                {stats.summary.totalUsulan}
              </span>
            </button>

            <!-- 1. Pending -->
            <button
              type="button"
              on:click={() => handleDetailStatusChange('PENDING')}
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-between border min-w-0 {detailStatus === 'PENDING' ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' : 'bg-white text-amber-800 border-amber-200/80 hover:bg-amber-50 hover:border-amber-300'}"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0 {detailStatus === 'PENDING' ? 'bg-white' : 'bg-amber-500'}"></span>
                <span class="truncate">1. Pending</span>
              </div>
              <span class="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 {detailStatus === 'PENDING' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}">
                {stats.summary.pendingCount}
              </span>
            </button>

            <!-- 2. Approved -->
            <button
              type="button"
              on:click={() => handleDetailStatusChange('APPROVED')}
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-between border min-w-0 {detailStatus === 'APPROVED' ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' : 'bg-white text-blue-800 border-blue-200/80 hover:bg-blue-50 hover:border-blue-300'}"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0 {detailStatus === 'APPROVED' ? 'bg-white' : 'bg-blue-500'}"></span>
                <span class="truncate">2. Approved</span>
              </div>
              <span class="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 {detailStatus === 'APPROVED' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}">
                {stats.summary.approvedCount}
              </span>
            </button>

            <!-- 3. Srikandi -->
            <button
              type="button"
              on:click={() => handleDetailStatusChange('UPLOAD_SRIKANDI')}
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-between border min-w-0 {detailStatus === 'UPLOAD_SRIKANDI' ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20' : 'bg-white text-purple-800 border-purple-200/80 hover:bg-purple-50 hover:border-purple-300'}"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0 {detailStatus === 'UPLOAD_SRIKANDI' ? 'bg-white' : 'bg-purple-500'}"></span>
                <span class="truncate">3. Srikandi</span>
              </div>
              <span class="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 {detailStatus === 'UPLOAD_SRIKANDI' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}">
                {stats.summary.srikandiCount}
              </span>
            </button>

            <!-- 4. Selesai -->
            <button
              type="button"
              on:click={() => handleDetailStatusChange('SELESAI')}
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-between border min-w-0 {detailStatus === 'SELESAI' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20' : 'bg-white text-emerald-800 border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300'}"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0 {detailStatus === 'SELESAI' ? 'bg-white' : 'bg-emerald-500'}"></span>
                <span class="truncate">4. Selesai</span>
              </div>
              <span class="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 {detailStatus === 'SELESAI' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}">
                {stats.summary.selesaiCount}
              </span>
            </button>

            <!-- Ditolak -->
            <button
              type="button"
              on:click={() => handleDetailStatusChange('REJECTED')}
              class="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all flex items-center justify-between border min-w-0 {detailStatus === 'REJECTED' ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20' : 'bg-white text-rose-800 border-rose-200/80 hover:bg-rose-50 hover:border-rose-300'}"
            >
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0 {detailStatus === 'REJECTED' ? 'bg-white' : 'bg-rose-500'}"></span>
                <span class="truncate">Ditolak</span>
              </div>
              <span class="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 {detailStatus === 'REJECTED' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}">
                {stats.summary.rejectedCount}
              </span>
            </button>
          </div>
        </div>

        <!-- 2. Baris Bawah: Form Pencarian & Switcher Tampilan -->
        <div class="px-4 sm:px-6 py-3 sm:py-3.5 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-grow max-w-2xl">
            <div class="relative flex-grow">
              <input
                type="text"
                bind:value={detailSearch}
                on:keydown={(e) => e.key === 'Enter' && handleDetailSearch()}
                placeholder="Cari Nama Pegawai, NIP, Unit Kerja, User..."
                class="w-full text-xs pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
              />
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {#if detailSearch}
                <button
                  type="button"
                  on:click={() => { detailSearch = ''; handleDetailSearch(); }}
                  class="absolute right-3 top-2 sm:top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                  title="Hapus pencarian"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {/if}
            </div>

            <button
              type="button"
              on:click={handleDetailSearch}
              class="px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
              title="Mulai pencarian"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Cari
            </button>
          </div>

          <!-- Toggle View Mode & Page Limit -->
          <div class="flex items-center gap-2 justify-between md:justify-end flex-wrap">
            <div class="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
              <button
                type="button"
                on:click={() => { selectedUserId = null; detailPage = 1; }}
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {selectedUserId === null ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
              >
                <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Rekap User ({userRecap.length})
              </button>

              <button
                type="button"
                on:click={() => { selectedUserId = 'ALL'; detailPage = 1; }}
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 {selectedUserId === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}"
              >
                <svg class="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Semua Pegawai ({detailRecords.length})
              </button>
            </div>

            {#if selectedUserId !== null}
              <div class="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>Per Hal:</span>
                <select
                  bind:value={detailLimit}
                  on:change={() => (detailPage = 1)}
                  class="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                >
                  {#each detailLimitOptions as opt}
                    <option value={opt}>{opt} Data</option>
                  {/each}
                </select>
              </div>
            {/if}
          </div>
        </div>

        <!-- Selected User Drill-down Banner (if specific user is selected) -->
        {#if activeUserObj}
          <div class="px-4 sm:px-6 py-2.5 bg-indigo-50/90 border-b border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0 text-xs">
            <div class="flex items-center gap-2 min-w-0">
              <button
                type="button"
                on:click={clearSelectedUser}
                class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-bold flex items-center gap-1 transition-colors shadow-xs shrink-0"
              >
                <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke Rekap User
              </button>

              <div class="flex items-center gap-2 min-w-0">
                <span class="text-slate-400 font-bold">|</span>
                <span class="text-slate-600 font-medium">Menampilkan Pegawai Diusulkan oleh:</span>
                <span class="font-bold text-indigo-900 bg-white px-2 py-0.5 rounded-md border border-indigo-200 truncate">
                  {activeUserObj.namaLengkap} {activeUserObj.username ? `(@${activeUserObj.username})` : ''}
                </span>
              </div>
            </div>

            <span class="font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200 shrink-0">
              {activeUserRecords.length} Pegawai
            </span>
          </div>
        {/if}

        <!-- Modal Body Content -->
        <div class="flex-grow overflow-y-auto p-3 sm:p-6 bg-slate-50/40">
          {#if detailLoading}
            <div class="py-12 sm:py-16 text-center">
              <div class="w-8 h-8 sm:w-10 sm:h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p class="text-xs text-slate-500 font-medium">Memuat data rincian usulan...</p>
            </div>
          {:else if detailRecords.length === 0}
            <div class="py-12 sm:py-16 text-center bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
              <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 class="text-sm font-bold text-slate-700">Tidak ada usulan ditemukan</h4>
              <p class="text-xs text-slate-400 mt-1">Coba ubah status filter atau kata kunci pencarian Anda</p>
            </div>
          {:else if selectedUserId === null}
            <!-- ══ REKAP PER USER VIEW ══ -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Rekapitulasi Berdasarkan User Pengusul</h4>
                  <p class="text-[11px] text-slate-500">Klik pada nama user untuk melihat daftar pegawai yang diusulkan</p>
                </div>
                <span class="text-xs font-semibold text-slate-400">Total: {userRecap.length} User</span>
              </div>

              <!-- User Recap Cards Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {#each userRecap as userItem}
                  <div
                    role="button"
                    tabindex="0"
                    on:click={() => selectUserForDetail(userItem.userId)}
                    on:keydown={(e) => e.key === 'Enter' && selectUserForDetail(userItem.userId)}
                    class="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between space-y-3 min-w-0"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
                          {userItem.namaLengkap.charAt(0).toUpperCase()}
                        </div>
                        <div class="min-w-0">
                          <p class="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">
                            {userItem.namaLengkap}
                          </p>
                          <div class="flex items-center gap-1.5 mt-0.5">
                            {#if userItem.username}
                              <span class="text-[11px] font-mono text-slate-400 truncate">@{userItem.username}</span>
                            {/if}
                            {#if userItem.role}
                              <span class="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 {userItem.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                {userItem.role}
                              </span>
                            {/if}
                          </div>
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        <span class="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-full block">
                          {userItem.count} Usulan
                        </span>
                      </div>
                    </div>

                    <!-- Progress Bar Relative to Total in Modal -->
                    <div class="space-y-1">
                      <div class="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>Porsi Usulan:</span>
                        <span>{Math.round((userItem.count / detailRecords.length) * 100)}%</span>
                      </div>
                      <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          style="width: {(userItem.count / detailRecords.length) * 100}%"
                          class="h-full bg-indigo-500 rounded-full"
                        ></div>
                      </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                      <span>Lihat Daftar Pegawai</span>
                      <span class="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>

          {:else}
            <!-- ══ DAFTAR PEGAWAI TABLE VIEW ══ -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
              <div class="overflow-x-auto max-w-full scrollbar-thin">
                <table class="w-full min-w-[750px] text-left border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th class="py-3 px-3.5 w-12 text-center">No</th>
                      <th class="py-3 px-4 min-w-[200px]">Pegawai PPPK</th>
                      <th class="py-3 px-4 min-w-[180px]">Unit Kerja Induk</th>
                      <th class="py-3 px-4 min-w-[180px]">User yang Mengusulkan</th>
                      <th class="py-3 px-4 min-w-[180px]">Detail Kontrak & Masa Berlaku</th>
                      <th class="py-3 px-4 text-center">Status</th>
                      <th class="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    {#each displayedDetailRecords as rec, i}
                      <tr class="hover:bg-slate-50/80 transition-colors">
                        <!-- No -->
                        <td class="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                          {(detailPage - 1) * detailLimit + i + 1}
                        </td>

                        <!-- Pegawai -->
                        <td class="py-3 px-4">
                          <div class="space-y-0.5 min-w-0">
                            <p class="font-bold text-slate-900 leading-snug break-words">
                              {[rec.dataP3k?.gelarDepan, rec.dataP3k?.nama, rec.dataP3k?.gelarBelakang].filter(Boolean).join(' ') || rec.dataP3k?.nama || '-'}
                            </p>
                            <p class="text-[11px] font-mono text-slate-500 break-all">
                              NIP: {rec.dataP3k?.nipBaru || '-'}
                            </p>
                            {#if rec.dataP3k?.jabatanNama}
                              <p class="text-[10px] text-slate-500 font-medium break-words">
                                {rec.dataP3k.jabatanNama}
                              </p>
                            {/if}
                          </div>
                        </td>

                        <!-- Unit Kerja -->
                        <td class="py-3 px-4">
                          <p class="font-semibold text-slate-800 leading-tight break-words">
                            {rec.dataP3k?.unorInduk?.nama || rec.dataP3k?.unorNama || '-'}
                          </p>
                          {#if rec.dataP3k?.unorInduk && rec.dataP3k?.unorNama && rec.dataP3k.unorNama !== rec.dataP3k.unorInduk.nama}
                            <p class="text-[10px] text-slate-400 mt-0.5 break-words">
                              {rec.dataP3k.unorNama}
                            </p>
                          {/if}
                        </td>

                        <!-- User yang Mengusulkan -->
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                              {(rec.editedBy?.namaLengkap || rec.editedBy?.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div class="min-w-0">
                              <p class="font-bold text-slate-800 text-xs break-words">
                                {rec.editedBy?.namaLengkap || rec.editedBy?.username || 'System / Auto'}
                              </p>
                              <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {#if rec.editedBy?.username}
                                  <span class="text-[10px] font-mono text-slate-400 break-all">@{rec.editedBy.username}</span>
                                {/if}
                                {#if rec.editedBy?.role}
                                  <span class="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase {rec.editedBy.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
                                    {rec.editedBy.role}
                                  </span>
                                {/if}
                              </div>
                            </div>
                          </div>
                        </td>

                        <!-- Detail Kontrak -->
                        <td class="py-3 px-4">
                          <div class="space-y-0.5">
                            <p class="font-mono text-xs font-bold text-slate-800 break-all">
                              {rec.nomorKontrak || 'Nomor Belum Digenerate'}
                            </p>
                            <p class="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                              <span>📅 Periode:</span>
                              <span class="font-medium text-slate-700">{rec.tanggalMulai || '-'} s/d {rec.tanggalSelesai || '-'}</span>
                            </p>
                            <p class="text-[10px] text-slate-400 whitespace-nowrap">
                              Update: {formatDate(rec.updatedAt || rec.createdAt)}
                            </p>
                          </div>
                        </td>

                        <!-- Status -->
                        <td class="py-3 px-4 text-center whitespace-nowrap">
                          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xs {getStatusBadgeClass(rec.status)}">
                            {getStatusLabel(rec.status)}
                          </span>
                        </td>

                        <!-- Aksi -->
                        <td class="py-3 px-4 text-right whitespace-nowrap">
                          <a
                            href={`/perpanjangan-kontrak/usulan?search=${encodeURIComponent(rec.dataP3k?.nipBaru || '')}`}
                            class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                            title="Buka data usulan pegawai ini"
                          >
                            Kelola
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>

        <!-- Modal Footer & Pagination -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 text-xs">
          {#if selectedUserId !== null && activeUserRecords.length > 0}
            <p class="text-slate-500 font-medium text-center sm:text-left">
              Menampilkan <b>{(detailPage - 1) * detailLimit + 1}</b> - <b>{Math.min(detailPage * detailLimit, activeUserRecords.length)}</b> dari <b>{activeUserRecords.length}</b> Pegawai
            </p>

            <div class="flex items-center gap-2">
              <button
                type="button"
                on:click={() => (detailPage = Math.max(1, detailPage - 1))}
                disabled={detailPage <= 1 || detailLoading}
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Sebelumnya
              </button>

              <span class="text-slate-600 font-bold px-2">
                Hal. {detailPage} / {totalPagesDetail}
              </span>

              <button
                type="button"
                on:click={() => (detailPage = Math.min(totalPagesDetail, detailPage + 1))}
                disabled={detailPage >= totalPagesDetail || detailLoading}
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm transition-all"
              >
                Selanjutnya
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                on:click={closeDetailModal}
                class="ml-2 sm:ml-3 px-3.5 sm:px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          {:else}
            <p class="text-slate-500 font-medium">
              Total: <b>{detailRecords.length}</b> Usulan ({userRecap.length} User Pengusul)
            </p>
            <button
              type="button"
              on:click={closeDetailModal}
              class="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
            >
              Tutup
            </button>
          {/if}
        </div>
      </div>
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
