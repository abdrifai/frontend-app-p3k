<script>
  import { addToast } from "$lib/toastStore";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";

  let stats = null;
  let statsLoading = true;
  let activeStatTab = "pendidikan";
  let currentPage = 1;
  const itemsPerPage = 10;
  let selectedJenisJabatan = "ALL";
  let searchJabatanQuery = "";
  let expandedJenisJabatan = {};

  $: {
    if (activeStatTab) {
      currentPage = 1;
      searchJabatanQuery = "";
    }
  }

  function toggleJenisJabatan(nama) {
    expandedJenisJabatan[nama] = !isExpanded(nama);
    expandedJenisJabatan = { ...expandedJenisJabatan };
  }

  function isExpanded(nama) {
    return expandedJenisJabatan[nama] !== false; // default true
  }

  $: totalJabatanAll = (stats?.byJabatan || []).reduce(
    (sum, g) => sum + (g.jabatanList ? g.jabatanList.length : 0),
    0
  );

  $: displayedJabatanGroups = (stats?.byJabatan || [])
    .filter(
      (g) =>
        selectedJenisJabatan === "ALL" || g.jenisJabatan === selectedJenisJabatan
    )
    .map((g) => {
      const q = searchJabatanQuery.toLowerCase().trim();
      const filteredList = q
        ? (g.jabatanList || []).filter((j) =>
            (j.label || "").toLowerCase().includes(q)
          )
        : g.jabatanList || [];
      return {
        ...g,
        filteredList
      };
    })
    .filter((g) => g.filteredList.length > 0);

  const statTabs = [
    { id: "pendidikan", label: "Pendidikan", color: "blue" },
    { id: "unitKerja", label: "Unit Kerja", color: "emerald" },
    { id: "golongan", label: "Golongan", color: "violet" },
    { id: "pengangkatan", label: "Perangkatan (TMT)", color: "amber" },
    { id: "jenisJabatan", label: "Jenis Jabatan", color: "rose" },
    { id: "jabatan", label: "Jabatan", color: "teal" },
  ];

  $: activeStatData = getActiveStatData(activeStatTab, stats);
  $: totalPages = Math.ceil(activeStatData.length / itemsPerPage);
  $: paginatedData = activeStatData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  $: isGenderTab =
    activeStatTab === "pendidikan" ||
    activeStatTab === "golongan" ||
    activeStatTab === "jenisJabatan" ||
    activeStatTab === "jabatan";

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
      case "jabatan":
        return s.byJabatan || [];
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
      case "jabatan":
        return "bg-teal-500";
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
      case "jabatan":
        return "bg-teal-50";
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
      case "jabatan":
        return "text-teal-600 bg-teal-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  }

  export const fetchStatistics = async () => {
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

  onMount(() => {
    fetchStatistics();
  });
</script>

<div class="space-y-6">
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
              type="button"
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
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 class="text-sm font-semibold text-slate-700">
              Distribusi berdasarkan {statTabs.find((t) => t.id === activeStatTab)
                ?.label}
            </h3>
            {#if activeStatTab === 'jabatan'}
              <p class="text-xs text-slate-500 mt-0.5">
                Rincian jabatan yang dikelompokkan per Jenis Jabatan dan dipisahkan per jenis kelamin (Laki-laki & Perempuan).
              </p>
            {:else if isGenderTab}
              <p class="text-xs text-slate-500 mt-0.5">
                Rincian komposisi jenis kelamin (Laki-laki & Perempuan) untuk setiap kelompok.
              </p>
            {/if}
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            {#if isGenderTab}
              <div class="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 text-xs">
                <span class="inline-flex items-center gap-1 font-medium text-indigo-700">
                  <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                  Laki-laki
                </span>
                <span class="text-slate-300">|</span>
                <span class="inline-flex items-center gap-1 font-medium text-rose-600">
                  <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                  Perempuan
                </span>
              </div>
            {/if}
            {#if !statsLoading && activeStatData.length > 0}
              <span
                class="text-xs font-medium px-2.5 py-1 rounded-full {getBadgeColor(
                  activeStatTab,
                )}"
              >
                {activeStatTab === 'jabatan'
                  ? `${totalJabatanAll} Jabatan (${activeStatData.length} Jenis)`
                  : `${activeStatData.length} ${statTabs.find((t) => t.id === activeStatTab)?.label}`}
              </span>
            {/if}
          </div>
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
        {:else if activeStatTab === 'jabatan'}
          <!-- Sub-filters: Jenis Jabatan Pills & Search Input -->
          <div class="space-y-3 mb-6 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <!-- Search Input -->
            <div class="relative">
              <input
                type="text"
                bind:value={searchJabatanQuery}
                placeholder="Cari nama jabatan..."
                class="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 pl-9 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
              />
              <svg
                class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {#if searchJabatanQuery}
                <button
                  type="button"
                  on:click={() => (searchJabatanQuery = "")}
                  class="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              {/if}
            </div>

            <!-- Jenis Jabatan Filter Pills -->
            <div class="flex items-center gap-1.5 flex-wrap pt-1">
              <span class="text-[11px] font-semibold text-slate-500 mr-1">Filter Jenis:</span>
              <button
                type="button"
                on:click={() => (selectedJenisJabatan = "ALL")}
                class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all {selectedJenisJabatan === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'}"
              >
                Semua Jenis ({totalJabatanAll})
              </button>
              {#each stats?.byJabatan || [] as g}
                <button
                  type="button"
                  on:click={() => (selectedJenisJabatan = g.jenisJabatan)}
                  class="px-2.5 py-1 rounded-lg text-xs font-medium transition-all {selectedJenisJabatan === g.jenisJabatan
                    ? 'bg-teal-600 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'}"
                >
                  {g.jenisJabatan} ({g.totalJabatan || g.jabatanList?.length || 0})
                </button>
              {/each}
            </div>
          </div>

          <!-- Grouped Cards -->
          {#if displayedJabatanGroups.length === 0}
            <div class="py-12 text-center">
              <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-sm font-semibold text-slate-600">Tidak ada jabatan yang sesuai</p>
              <p class="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau ganti filter jenis jabatan.</p>
            </div>
          {:else}
            <div class="space-y-5">
              {#each displayedJabatanGroups as g, groupIdx}
                {@const maxGroupCount = Math.max(...g.filteredList.map((j) => j.count), 1)}
                {@const expanded = isExpanded(g.jenisJabatan)}

                <div class="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all">
                  <!-- Group Header -->
                  <div
                    class="p-4 bg-gradient-to-r from-slate-50/90 to-teal-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b {expanded ? 'border-slate-200/80' : 'border-transparent'}"
                  >
                    <button
                      type="button"
                      on:click={() => toggleJenisJabatan(g.jenisJabatan)}
                      class="flex items-center gap-2.5 text-left group cursor-pointer flex-1"
                    >
                      <div class="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200/60 group-hover:bg-teal-500/20 transition-all">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <h4 class="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                            {g.jenisJabatan}
                          </h4>
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100/80 text-teal-800 border border-teal-200">
                            {g.filteredList.length} Jabatan
                          </span>
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {g.totalCount.toLocaleString("id-ID")} Pegawai
                          </span>
                        </div>
                        <p class="text-[11px] text-slate-400 mt-0.5">
                          {((g.totalCount / (stats?.total || 1)) * 100).toFixed(1)}% dari total seluruh pegawai aktif
                        </p>
                      </div>
                    </button>

                    <!-- Group Gender Ratio & Toggle -->
                    <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div class="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200/70 shadow-2xs">
                        <span class="inline-flex items-center gap-1 font-semibold text-indigo-700">
                          <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                          L: {g.totalLaki.toLocaleString("id-ID")} ({g.persenLaki}%)
                        </span>
                        <span class="text-slate-300">|</span>
                        <span class="inline-flex items-center gap-1 font-semibold text-rose-600">
                          <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                          P: {g.totalPerempuan.toLocaleString("id-ID")} ({g.persenPerempuan}%)
                        </span>
                      </div>
                      <button
                        type="button"
                        on:click={() => toggleJenisJabatan(g.jenisJabatan)}
                        class="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                        aria-label="Toggle section"
                      >
                        <svg
                          class="w-5 h-5 transition-transform duration-200 {expanded ? 'rotate-180' : ''}"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Group Items List -->
                  {#if expanded}
                    <div class="p-4 sm:p-5 space-y-3 bg-slate-50/30">
                      {#each g.filteredList as item, jIdx}
                        {@const pct = maxGroupCount > 0 ? (item.count / maxGroupCount) * 100 : 0}
                        {@const groupPct = g.totalCount > 0 ? ((item.count / g.totalCount) * 100).toFixed(1) : 0}
                        {@const hrefAll = `/data-p3k?jabatanNama=${encodeURIComponent(item.label)}&jenisJabatan=${encodeURIComponent(g.jenisJabatan)}`}
                        {@const hrefLaki = `/data-p3k?jabatanNama=${encodeURIComponent(item.label)}&jenisJabatan=${encodeURIComponent(g.jenisJabatan)}&jenisKelamin=L`}
                        {@const hrefPerempuan = `/data-p3k?jabatanNama=${encodeURIComponent(item.label)}&jenisJabatan=${encodeURIComponent(g.jenisJabatan)}&jenisKelamin=P`}

                        <div class="group p-3 sm:p-3.5 rounded-xl border border-slate-200/70 bg-white hover:border-teal-300 hover:shadow-xs transition-all">
                          <div class="flex items-center justify-between mb-2 gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                              <span class="text-slate-400 font-mono text-xs flex-shrink-0">
                                {String(jIdx + 1).padStart(2, "0")}
                              </span>
                              <a
                                href={hrefAll}
                                class="text-sm font-semibold text-slate-800 hover:text-teal-600 truncate transition-colors"
                                title="Lihat semua data {item.label}"
                              >
                                {item.label}
                              </a>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                              <span class="text-xs text-slate-400 font-medium">{groupPct}% di jenis ini</span>
                              <a
                                href={hrefAll}
                                class="text-sm font-bold text-slate-800 hover:text-teal-600 transition-colors"
                                title="Lihat semua data {item.label}"
                              >
                                {item.count.toLocaleString("id-ID")} <span class="text-xs font-normal text-slate-400">pegawai</span>
                              </a>
                            </div>
                          </div>

                          <!-- Stacked Dual Bar -->
                          <div
                            class="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2"
                            title="{item.label}: Total {item.count} pegawai (Laki-laki: {item.laki} [{item.persenLaki}%], Perempuan: {item.perempuan} [{item.persenPerempuan}%])"
                          >
                            <div
                              class="h-full rounded-full overflow-hidden flex transition-all duration-700 ease-out"
                              style="width: {pct}%"
                            >
                              <div
                                class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:brightness-110 transition-all"
                                style="width: {item.persenLaki}%"
                              ></div>
                              <div
                                class="h-full bg-gradient-to-r from-rose-400 to-pink-500 hover:brightness-110 transition-all"
                                style="width: {item.persenPerempuan}%"
                              ></div>
                            </div>
                          </div>

                          <!-- Gender Badges with Interactive Filter Links -->
                          <div class="flex items-center justify-between text-xs pt-0.5">
                            <div class="flex items-center gap-2 flex-wrap">
                              <a
                                href={hrefLaki}
                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors font-medium border border-indigo-200/50"
                                title="Lihat data Laki-laki untuk {item.label}"
                              >
                                <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                <span>Laki-laki: <strong>{item.laki?.toLocaleString("id-ID") ?? 0}</strong></span>
                                <span class="text-indigo-400">({item.persenLaki ?? 0}%)</span>
                              </a>
                              <a
                                href={hrefPerempuan}
                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors font-medium border border-rose-200/50"
                                title="Lihat data Perempuan untuk {item.label}"
                              >
                                <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                <span>Perempuan: <strong>{item.perempuan?.toLocaleString("id-ID") ?? 0}</strong></span>
                                <span class="text-rose-400">({item.persenPerempuan ?? 0}%)</span>
                              </a>
                            </div>
                            <a
                              href={hrefAll}
                              class="text-[11px] text-slate-400 hover:text-teal-600 transition-colors inline-flex items-center gap-0.5"
                            >
                              Filter data →
                            </a>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
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
              {@const hrefLaki =
                activeStatTab === "pendidikan"
                  ? `/data-p3k?pendidikan=${encodeURIComponent(item.label)}&jenisKelamin=L`
                  : activeStatTab === "golongan"
                    ? `/data-p3k?golongan=${encodeURIComponent(item.label)}&jenisKelamin=L`
                    : activeStatTab === "jenisJabatan"
                      ? `/data-p3k?jenisJabatan=${encodeURIComponent(item.label)}&jenisKelamin=L`
                      : null}
              {@const hrefPerempuan =
                activeStatTab === "pendidikan"
                  ? `/data-p3k?pendidikan=${encodeURIComponent(item.label)}&jenisKelamin=P`
                  : activeStatTab === "golongan"
                    ? `/data-p3k?golongan=${encodeURIComponent(item.label)}&jenisKelamin=P`
                    : activeStatTab === "jenisJabatan"
                      ? `/data-p3k?jenisJabatan=${encodeURIComponent(item.label)}&jenisKelamin=P`
                      : null}

              {#if isGenderTab}
                <!-- Card Container with Gender Breakdown -->
                <div class="group p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-xs transition-all">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-slate-400 font-mono text-xs flex-shrink-0"
                        >{String(absoluteIdx + 1).padStart(2, "0")}</span
                      >
                      <a
                        href={href || "#"}
                        class="text-sm font-semibold text-slate-700 hover:text-blue-600 truncate transition-colors"
                        title="Lihat data {item.label}"
                      >
                        {item.label}
                      </a>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="text-xs text-slate-400">{totalPct}%</span>
                      <a
                        href={href || "#"}
                        class="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors"
                        title="Lihat semua data {item.label}"
                      >
                        {item.count.toLocaleString("id-ID")} <span class="text-xs font-normal text-slate-400">pegawai</span>
                      </a>
                    </div>
                  </div>

                  <!-- Stacked Dual Bar: Width proportional to maxCount, inner split by gender -->
                  <div
                    class="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2"
                    title="{item.label}: Total {item.count} pegawai (Laki-laki: {item.laki} [{item.persenLaki}%], Perempuan: {item.perempuan} [{item.persenPerempuan}%])"
                  >
                    <div
                      class="h-full rounded-full overflow-hidden flex transition-all duration-700 ease-out"
                      style="width: {pct}%"
                    >
                      <div
                        class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:brightness-110 transition-all"
                        style="width: {item.persenLaki}%"
                      ></div>
                      <div
                        class="h-full bg-gradient-to-r from-rose-400 to-pink-500 hover:brightness-110 transition-all"
                        style="width: {item.persenPerempuan}%"
                      ></div>
                    </div>
                  </div>

                  <!-- Gender Badges with Interactive Filter Links -->
                  <div class="flex items-center justify-between text-xs pt-0.5">
                    <div class="flex items-center gap-2 flex-wrap">
                      <a
                        href={hrefLaki || "#"}
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors font-medium border border-indigo-200/50"
                        title="Lihat data Laki-laki untuk {item.label}"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span>Laki-laki: <strong>{item.laki?.toLocaleString("id-ID") ?? 0}</strong></span>
                        <span class="text-indigo-400">({item.persenLaki ?? 0}%)</span>
                      </a>
                      <a
                        href={hrefPerempuan || "#"}
                        class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors font-medium border border-rose-200/50"
                        title="Lihat data Perempuan untuk {item.label}"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        <span>Perempuan: <strong>{item.perempuan?.toLocaleString("id-ID") ?? 0}</strong></span>
                        <span class="text-rose-400">({item.persenPerempuan ?? 0}%)</span>
                      </a>
                    </div>
                    <a
                      href={href || "#"}
                      class="text-[11px] text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-0.5"
                    >
                      Filter semua →
                    </a>
                  </div>
                </div>
              {:else}
                <!-- Standard Single Bar for other tabs -->
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
              {/if}
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
                  type="button"
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
                  type="button"
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
                )}">{tab.id === 'jabatan' ? `${totalJabatanAll} Jabatan` : tabData.length}</span
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
                {@const isTabWithGender =
                  tab.id === "pendidikan" ||
                  tab.id === "golongan" ||
                  tab.id === "jenisJabatan" ||
                  tab.id === "jabatan"}
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
                            : tab.id === "jabatan"
                              ? `/data-p3k?jenisJabatan=${encodeURIComponent(item.label)}`
                              : null}
                <div
                  class="group {itemHref
                    ? 'hover:bg-slate-50 -mx-1 p-1.5 rounded-lg transition-colors'
                    : ''}"
                >
                  <a
                    href={itemHref || "#"}
                    class="flex items-center justify-between"
                  >
                    <span
                      class="text-xs font-medium text-slate-600 truncate max-w-[70%] {itemHref
                        ? 'group-hover:text-blue-600'
                        : ''}"
                      title={item.label}>{item.label}</span
                    >
                    <span class="text-xs font-bold text-slate-700 flex-shrink-0"
                      >{item.count.toLocaleString("id-ID")}</span
                    >
                  </a>
                  {#if isTabWithGender && item.laki !== undefined}
                    <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-indigo-600 font-medium">L: {item.laki?.toLocaleString("id-ID")}</span>
                        <span class="text-slate-300">·</span>
                        <span class="text-rose-500 font-medium">P: {item.perempuan?.toLocaleString("id-ID")}</span>
                      </div>
                      <div class="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div class="h-full bg-indigo-500" style="width: {item.persenLaki}%"></div>
                        <div class="h-full bg-rose-400" style="width: {item.persenPerempuan}%"></div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
              {#if tabData.length > 5}
                <button
                  type="button"
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
