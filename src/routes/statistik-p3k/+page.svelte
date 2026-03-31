<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let stats = null;
  let statsLoading = true;
  let activeStatTab = "pendidikan";
  let currentPage = 1;
  const itemsPerPage = 10;

  $: {
    if (activeStatTab) currentPage = 1;
  }

  const statTabs = [
    { id: "pendidikan", label: "Pendidikan", color: "blue" },
    { id: "unitKerja", label: "Unit Kerja", color: "emerald" },
    { id: "golongan", label: "Golongan", color: "violet" },
    { id: "pengangkatan", label: "Perangkatan (TMT)", color: "amber" },
    { id: "jenisJabatan", label: "Jenis Jabatan", color: "rose" },
  ];

  $: activeStatData = getActiveStatData(activeStatTab, stats);
  $: totalPages = Math.ceil(activeStatData.length / itemsPerPage);
  $: paginatedData = activeStatData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  function getActiveStatData(tab, s) {
    if (!s) return [];
    switch (tab) {
      case "pendidikan":
        return s.byPendidikan || [];
      case "unitKerja":
        return s.byUnor || [];
      case "golongan":
        return s.byGolongan || [];
      case "pengangkatan":
        return s.byPengangkatan || [];
      case "jenisJabatan":
        return s.byJenisJabatan || [];
      default:
        return [];
    }
  }

  function getMaxCount(data) {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d) => d.count));
  }

  function getBarColor(tab) {
    switch (tab) {
      case "pendidikan":
        return "bg-blue-500";
      case "unitKerja":
        return "bg-emerald-500";
      case "golongan":
        return "bg-violet-500";
      case "pengangkatan":
        return "bg-amber-500";
      case "jenisJabatan":
        return "bg-rose-500";
      default:
        return "bg-blue-500";
    }
  }

  function getBarBg(tab) {
    switch (tab) {
      case "pendidikan":
        return "bg-blue-50";
      case "unitKerja":
        return "bg-emerald-50";
      case "golongan":
        return "bg-violet-50";
      case "pengangkatan":
        return "bg-amber-50";
      case "jenisJabatan":
        return "bg-rose-50";
      default:
        return "bg-blue-50";
    }
  }

  function getBadgeColor(tab) {
    switch (tab) {
      case "pendidikan":
        return "text-blue-600 bg-blue-50";
      case "unitKerja":
        return "text-emerald-600 bg-emerald-50";
      case "golongan":
        return "text-violet-600 bg-violet-50";
      case "pengangkatan":
        return "text-amber-600 bg-amber-50";
      case "jenisJabatan":
        return "text-rose-600 bg-rose-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  }

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchStatistics();
  });

  const fetchStatistics = async () => {
    statsLoading = true;
    try {
      const result = await apiRequest("/api/v1/data-p3k/statistics", "GET");
      if (result.success) {
        stats = result.data;
      } else {
        addToast(result.message || "Gagal memuat statistik", "error");
      }
    } catch (error) {
      console.error("Fetch statistics error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      statsLoading = false;
    }
  };
</script>

<svelte:head>
  <title>Statistik Data P3K Utama — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">
        Statistik Data P3K Aktif
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        Ringkasan data pegawai PPPK berstatus aktif yang terdaftar di Data
        Utama.
      </p>
    </div>
    <button
      on:click={fetchStatistics}
      class="btn-secondary gap-1.5 self-start"
      aria-label="Refresh statistik"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        /></svg
      >
      Refresh
    </button>
  </div>

  <!-- Summary Cards Row -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Total -->
    <div class="card p-5 relative overflow-hidden">
      <div
        class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-blue-100/40"
      ></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              /></svg
            >
          </div>
          <p
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            Total Pegawai Aktif
          </p>
        </div>
        {#if statsLoading}
          <div class="h-9 w-20 bg-slate-200 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-slate-800">
            {stats?.total?.toLocaleString("id-ID") ?? 0}
          </p>
        {/if}
      </div>
    </div>

    <!-- Laki-laki -->
    <div class="card p-5 relative overflow-hidden">
      <div
        class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-indigo-100/40"
      ></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              /></svg
            >
          </div>
          <p
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            Laki-laki
          </p>
        </div>
        {#if statsLoading}
          <div class="h-9 w-16 bg-slate-200 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-indigo-600">
            {stats?.gender?.laki?.toLocaleString("id-ID") ?? 0}
          </p>
          {#if stats?.total}
            <p class="text-xs text-slate-400 mt-1">
              {((stats.gender.laki / stats.total) * 100).toFixed(1)}% dari total aktif
            </p>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Perempuan -->
    <div class="card p-5 relative overflow-hidden">
      <div
        class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-rose-100/40"
      ></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/20"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              /></svg
            >
          </div>
          <p
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            Perempuan
          </p>
        </div>
        {#if statsLoading}
          <div class="h-9 w-16 bg-slate-200 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-rose-500">
            {stats?.gender?.perempuan?.toLocaleString("id-ID") ?? 0}
          </p>
          {#if stats?.total}
            <p class="text-xs text-slate-400 mt-1">
              {((stats.gender.perempuan / stats.total) * 100).toFixed(1)}% dari
              total aktif
            </p>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Gender Ratio -->
    <div class="card p-5 relative overflow-hidden">
      <div
        class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-emerald-100/40"
      ></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              /><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              /></svg
            >
          </div>
          <p
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            Rasio L:P
          </p>
        </div>
        {#if statsLoading}
          <div class="h-9 w-24 bg-slate-200 rounded-lg animate-pulse"></div>
        {:else if stats?.total}
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <div class="w-full h-4 rounded-full bg-rose-200 overflow-hidden">
                <div
                  class="h-full rounded-full bg-indigo-500 transition-all duration-700"
                  style="width: {(stats.gender.laki / stats.total) * 100}%"
                ></div>
              </div>
              <div class="flex justify-between mt-1.5">
                <span class="text-xs font-bold text-indigo-600"
                  >{((stats.gender.laki / stats.total) * 100).toFixed(0)}% L</span
                >
                <span class="text-xs font-bold text-rose-500"
                  >{((stats.gender.perempuan / stats.total) * 100).toFixed(0)}%
                  P</span
                >
              </div>
            </div>
          </div>
        {:else}
          <p class="text-sm text-slate-400">Tidak ada data</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Distribution Section -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Main Chart Area -->
    <div class="lg:col-span-2 card overflow-hidden">
      <!-- Tabs -->
      <div class="border-b border-slate-100">
        <nav class="flex overflow-x-auto" aria-label="Tabs distribusi">
          {#each statTabs as tab}
            <button
              on:click={() => (activeStatTab = tab.id)}
              class="flex-1 min-w-0 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                     {activeStatTab === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'}"
            >
              {tab.label}
            </button>
          {/each}
        </nav>
      </div>

      <div class="p-5 sm:p-6">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-sm font-semibold text-slate-700">
            Distribusi berdasarkan {statTabs.find((t) => t.id === activeStatTab)
              ?.label}
          </h3>
          {#if !statsLoading && activeStatData.length > 0}
            <span
              class="text-xs font-medium px-2.5 py-1 rounded-full {getBadgeColor(
                activeStatTab,
              )}"
            >
              {activeStatData.length}
              {statTabs.find((t) => t.id === activeStatTab)?.label}
            </span>
          {/if}
        </div>

        {#if statsLoading}
          <div class="space-y-4">
            {#each [1, 2, 3, 4, 5, 6, 7, 8] as _}
              <div class="animate-pulse">
                <div class="flex justify-between mb-1.5">
                  <div class="h-3.5 w-32 bg-slate-200 rounded"></div>
                  <div class="h-3.5 w-10 bg-slate-200 rounded"></div>
                </div>
                <div class="h-6 bg-slate-100 rounded-lg"></div>
              </div>
            {/each}
          </div>
        {:else if activeStatData.length === 0}
          <div class="py-12 text-center">
            <div
              class="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3"
            >
              <svg
                class="w-7 h-7 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                /></svg
              >
            </div>
            <p class="text-sm text-slate-400">Tidak ada data distribusi.</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each paginatedData as item, idx}
              {@const absoluteIdx = (currentPage - 1) * itemsPerPage + idx}
              {@const maxCount = getMaxCount(activeStatData)}
              {@const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0}
              {@const totalPct = stats?.total
                ? ((item.count / stats.total) * 100).toFixed(1)
                : 0}
              {@const href =
                activeStatTab === "pengangkatan"
                  ? `/data-p3k?tmtCpns=${encodeURIComponent(item.filterValue || item.label)}`
                  : activeStatTab === "unitKerja"
                    ? item.label === "Kosong / Belum Diset"
                      ? `/data-p3k?unitKerjaKosong=true`
                      : `/data-p3k?unitKerja=${encodeURIComponent(item.label)}`
                    : activeStatTab === "pendidikan"
                      ? `/data-p3k?pendidikan=${encodeURIComponent(item.label)}`
                      : activeStatTab === "golongan"
                        ? `/data-p3k?golongan=${encodeURIComponent(item.label)}`
                        : activeStatTab === "jenisJabatan"
                          ? `/data-p3k?jenisJabatan=${encodeURIComponent(item.label)}`
                          : null}
              <svelte:element
                this={href ? "a" : "div"}
                {href}
                class="group block {href
                  ? 'cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors'
                  : ''}"
                title={href ? `Lihat data pegawai untuk ${item.label}` : null}
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span
                    class="text-sm text-slate-600 truncate max-w-[65%] group-hover:text-slate-800 transition-colors"
                  >
                    <span class="text-slate-400 font-mono text-xs mr-1.5"
                      >{String(absoluteIdx + 1).padStart(2, "0")}</span
                    >
                    {item.label}
                  </span>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-xs text-slate-400">{totalPct}%</span>
                    <span class="text-sm font-bold text-slate-700"
                      >{item.count.toLocaleString("id-ID")}</span
                    >
                  </div>
                </div>
                <div
                  class="w-full h-2.5 {getBarBg(
                    activeStatTab,
                  )} rounded-full overflow-hidden"
                >
                  <div
                    class="h-full rounded-full transition-all duration-700 ease-out {getBarColor(
                      activeStatTab,
                    )}"
                    style="width: {pct}%"
                  ></div>
                </div>
              </svelte:element>
            {/each}
          </div>

          <!-- Pagination Controls -->
          {#if totalPages > 1}
            <div
              class="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between"
            >
              <div class="text-xs text-slate-500">
                Menampilkan <span class="font-medium"
                  >{(currentPage - 1) * itemsPerPage + 1}</span
                >
                sampai
                <span class="font-medium"
                  >{Math.min(
                    currentPage * itemsPerPage,
                    activeStatData.length,
                  )}</span
                >
                dari <span class="font-medium">{activeStatData.length}</span> data
              </div>
              <div class="flex items-center gap-2">
                <button
                  on:click={() => (currentPage = Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  aria-label="Halaman sebelumnya"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 19l-7-7 7-7"
                    /></svg
                  >
                </button>
                <div class="text-sm font-medium text-slate-600 px-2">
                  {currentPage} / {totalPages}
                </div>
                <button
                  on:click={() =>
                    (currentPage = Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  class="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  aria-label="Halaman berikutnya"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    /></svg
                  >
                </button>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Right Panel: All categories overview -->
    <div class="space-y-5">
      {#each statTabs as tab}
        {@const tabData = getActiveStatData(tab.id, stats)}
        <div class="card p-4">
          <div class="flex items-center justify-between mb-3">
            <h4
              class="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              {tab.label}
            </h4>
            {#if !statsLoading}
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full {getBadgeColor(
                  tab.id,
                )}">{tabData.length}</span
              >
            {/if}
          </div>
          {#if statsLoading}
            <div class="space-y-2">
              {#each [1, 2, 3] as _}
                <div class="animate-pulse flex justify-between">
                  <div class="h-3 w-20 bg-slate-200 rounded"></div>
                  <div class="h-3 w-8 bg-slate-200 rounded"></div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="space-y-2">
              {#each tabData.slice(0, 5) as item}
                {@const itemHref =
                  tab.id === "pengangkatan"
                    ? `/data-p3k?tmtCpns=${encodeURIComponent(item.filterValue || item.label)}`
                    : tab.id === "unitKerja"
                      ? item.label === "Kosong / Belum Diset"
                        ? `/data-p3k?unitKerjaKosong=true`
                        : `/data-p3k?unitKerja=${encodeURIComponent(item.label)}`
                      : tab.id === "pendidikan"
                        ? `/data-p3k?pendidikan=${encodeURIComponent(item.label)}`
                        : tab.id === "golongan"
                          ? `/data-p3k?golongan=${encodeURIComponent(item.label)}`
                          : tab.id === "jenisJabatan"
                            ? `/data-p3k?jenisJabatan=${encodeURIComponent(item.label)}`
                            : null}
                <a
                  href={itemHref || "#"}
                  class="flex items-center justify-between group {itemHref
                    ? 'hover:bg-slate-50 -mx-1 px-1 rounded transition-colors'
                    : ''}"
                >
                  <span
                    class="text-xs text-slate-600 truncate max-w-[70%] {itemHref
                      ? 'group-hover:text-blue-600'
                      : ''}"
                    title={item.label}>{item.label}</span
                  >
                  <span class="text-xs font-bold text-slate-700 flex-shrink-0"
                    >{item.count.toLocaleString("id-ID")}</span
                  >
                </a>
              {/each}
              {#if tabData.length > 5}
                <button
                  on:click={() => (activeStatTab = tab.id)}
                  class="text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                >
                  Lihat semua ({tabData.length}) →
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}

      <!-- Quick Link -->
      <a
        href="/data-p3k"
        class="card p-4 block group hover:border-blue-200 hover:shadow-md transition-all"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
          >
            <svg
              class="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              /></svg
            >
          </div>
          <div>
            <p
              class="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors"
            >
              Kelola Data P3K
            </p>
            <p class="text-xs text-slate-400">Lihat & filter data pegawai</p>
          </div>
          <svg
            class="w-4 h-4 text-slate-300 ml-auto group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            /></svg
          >
        </div>
      </a>
    </div>
  </div>
</div>
