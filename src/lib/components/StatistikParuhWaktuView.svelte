<script>
  import { onMount } from "svelte";
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import StatistikPegawaiModal from "$lib/components/StatistikPegawaiModal.svelte";

  let stats = null;
  let statsLoading = true;
  let activeTab = "pendidikan";
  let currentPage = 1;
  const itemsPerPage = 10;
  let searchTabFilter = "";

  // Modal Pegawai State
  let showEmployeeModal = false;
  let modalCategory = "";
  let modalCategoryLabel = "";
  let modalValue = "";
  let modalFilterValue = "";
  let modalGender = "";

  function openEmployeeModal(cat, catLabel, val, filterVal = "", gender = "") {
    modalCategory = cat;
    modalCategoryLabel = catLabel || statTabs.find((t) => t.id === cat)?.label || "";
    modalValue = val;
    modalFilterValue = filterVal || "";
    modalGender = gender || "";
    showEmployeeModal = true;
  }

  const statTabs = [
    { id: "pendidikan", label: "Pendidikan", color: "violet", icon: "academic" },
    { id: "jabatan", label: "Jabatan", color: "blue", icon: "briefcase" },
    { id: "unitKerja", label: "Unit Kerja", color: "emerald", icon: "office" },
    { id: "usia", label: "Kelompok Usia", color: "amber", icon: "user-group" },
    { id: "jenisJabatan", label: "Jenis Jabatan", color: "indigo", icon: "tag" },
    { id: "lokasiKerja", label: "Lokasi Kerja", color: "rose", icon: "map-pin" },
    { id: "demografi", label: "Agama & Status", color: "teal", icon: "heart" },
    { id: "pengangkatan", label: "TMT Pengangkatan", color: "cyan", icon: "calendar" }
  ];

  $: if (activeTab) {
    currentPage = 1;
    searchTabFilter = "";
  }

  $: rawTabData = getRawTabData(activeTab, stats);
  $: filteredTabData = filterTabData(rawTabData, searchTabFilter);
  $: totalPages = Math.max(1, Math.ceil(filteredTabData.length / itemsPerPage));
  $: paginatedData = filteredTabData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  $: isGenderTab = [
    "pendidikan",
    "jabatan",
    "jenisJabatan",
    "usia",
    "lokasiKerja",
    "unitKerja"
  ].includes(activeTab);

  function getRawTabData(tab, s) {
    if (!s) return [];
    switch (tab) {
      case "pendidikan":
        return s.byPendidikan || [];
      case "jabatan":
        return s.byJabatan || [];
      case "unitKerja":
        return s.byUnor || [];
      case "usia":
        return s.byAgeRange || [];
      case "jenisJabatan":
        return s.byJenisJabatan || [];
      case "lokasiKerja":
        return s.byLokasiKerja || [];
      case "demografi":
        return [
          ...(s.byAgama || []).map((a) => ({ ...a, group: "Agama" })),
          ...(s.byStatusKawin || []).map((k) => ({ ...k, group: "Status Pernikahan" }))
        ];
      case "pengangkatan":
        return s.byPengangkatan || [];
      default:
        return [];
    }
  }

  function filterTabData(data, query) {
    if (!query || !query.trim()) return data;
    const q = query.toLowerCase().trim();
    return data.filter((d) => (d.label || "").toLowerCase().includes(q));
  }

  function getMaxCount(data) {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d) => d.count || 0));
  }

  export const fetchStatistics = async () => {
    statsLoading = true;
    try {
      const result = await apiRequest("/api/v1/p3k-paruh-waktu/stats?source=master", "GET");
      if (result && result.success) {
        stats = result.data;
      } else {
        addToast(result?.message || "Gagal memuat statistik P3K Paruh Waktu", "error");
      }
    } catch (error) {
      console.error("Fetch statistics error:", error);
      addToast("Terjadi kesalahan sistem saat memuat data statistik", "error");
    } finally {
      statsLoading = false;
    }
  };

  export const exportSummaryCsv = () => {
    if (!stats) return;
    const lines = [
      ["Kategori", "Label", "Jumlah Pegawai", "Laki-laki", "Perempuan"],
      ...["pendidikan", "jabatan", "usia", "jenisJabatan", "lokasiKerja"].flatMap((t) => {
        const items = getRawTabData(t, stats);
        return items.map((it) => [
          t.toUpperCase(),
          `"${(it.label || "").replace(/"/g, '""')}"`,
          it.count || 0,
          it.laki ?? "-",
          it.perempuan ?? "-"
        ]);
      })
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," + lines.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Statistik_P3K_Paruh_Waktu_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("Laporan statistik CSV berhasil diunduh", "success");
  };

  onMount(() => {
    fetchStatistics();
  });
</script>

<div class="space-y-6">
  <!-- Actions Bar -->
  <div class="flex items-center justify-between gap-3 flex-wrap bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200/70">
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
      <p class="text-xs font-bold text-slate-700">Dataset: PPPK Paruh Waktu (Master BKN)</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={fetchStatistics}
        class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs hover:border-slate-300"
        aria-label="Refresh data statistik"
      >
        <svg class="w-3.5 h-3.5 text-slate-500 {statsLoading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>

      <button
        type="button"
        onclick={exportSummaryCsv}
        disabled={!stats}
        class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Ekspor CSV
      </button>
    </div>
  </div>

  <!-- Summary Cards Row (KPIs) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <!-- Card 1: Total Paruh Waktu -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden shadow-xs hover:border-violet-200 transition-all">
      <div class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-violet-100/50"></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 text-white">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paruh Waktu</p>
            <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              100% Aktif
            </span>
          </div>
        </div>
        {#if statsLoading}
          <div class="h-9 w-24 bg-slate-100 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-slate-800 tracking-tight">
            {(stats?.summary?.total ?? 0).toLocaleString("id-ID")}
            <span class="text-xs font-semibold text-slate-400">pegawai</span>
          </p>
          <p class="text-xs text-slate-500 mt-1">
            Terdaftar di Database Master BKN
          </p>
        {/if}
      </div>
    </div>

    <!-- Card 2: Laki-laki -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden shadow-xs hover:border-indigo-200 transition-all">
      <div class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-indigo-100/40"></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Laki-laki</p>
            <p class="text-xs font-semibold text-indigo-600">
              {stats?.summary?.persenLaki ?? 0}% dari total
            </p>
          </div>
        </div>
        {#if statsLoading}
          <div class="h-9 w-20 bg-slate-100 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-indigo-600 tracking-tight">
            {(stats?.gender?.laki ?? 0).toLocaleString("id-ID")}
            <span class="text-xs font-semibold text-slate-400">pegawai</span>
          </p>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div class="bg-indigo-500 h-full rounded-full transition-all duration-700" style="width: {stats?.summary?.persenLaki ?? 0}%"></div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Card 3: Perempuan -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden shadow-xs hover:border-rose-200 transition-all">
      <div class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-rose-100/40"></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/20 text-white">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perempuan</p>
            <p class="text-xs font-semibold text-rose-500">
              {stats?.summary?.persenPerempuan ?? 0}% dari total
            </p>
          </div>
        </div>
        {#if statsLoading}
          <div class="h-9 w-20 bg-slate-100 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-rose-500 tracking-tight">
            {(stats?.gender?.perempuan ?? 0).toLocaleString("id-ID")}
            <span class="text-xs font-semibold text-slate-400">pegawai</span>
          </p>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div class="bg-rose-500 h-full rounded-full transition-all duration-700" style="width: {stats?.summary?.persenPerempuan ?? 0}%"></div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Card 4: Demografi Usia & Unit Kerja -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-5 relative overflow-hidden shadow-xs hover:border-amber-200 transition-all">
      <div class="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full bg-amber-100/40"></div>
      <div class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 text-white">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-rata Usia</p>
            <p class="text-xs font-semibold text-amber-600">
              Rentang: {stats?.summary?.minAge ?? 0} - {stats?.summary?.maxAge ?? 0} Thn
            </p>
          </div>
        </div>
        {#if statsLoading}
          <div class="h-9 w-24 bg-slate-100 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-amber-600 tracking-tight">
            {stats?.summary?.avgAge ?? 0}
            <span class="text-xs font-semibold text-slate-400">Tahun</span>
          </p>
          <p class="text-xs text-slate-500 mt-1">
            Tersebar di <span class="font-bold text-slate-700">{stats?.summary?.totalUnitKerja ?? 0}</span> Unit Kerja
          </p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left 2 Cols: Main Chart Area -->
    <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <!-- Tabs Bar -->
      <div class="border-b border-slate-100 bg-slate-50/50 p-2 sm:p-2.5">
        <nav class="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0" aria-label="Tabs distribusi">
          {#each statTabs as tab}
            <button
              type="button"
              onclick={() => (activeTab = tab.id)}
              class="whitespace-nowrap shrink-0 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 {activeTab === tab.id
                ? 'bg-white text-violet-700 shadow-xs border border-slate-200/70'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'}"
            >
              {tab.label}
              {#if !statsLoading}
                {@const count = getRawTabData(tab.id, stats).length}
                <span class="text-[10px] px-1.5 py-0.2 rounded-full {activeTab === tab.id ? 'bg-violet-100 text-violet-800' : 'bg-slate-200 text-slate-600'}">
                  {count}
                </span>
              {/if}
            </button>
          {/each}
        </nav>
      </div>

      <!-- Tab Header & Local Search -->
      <div class="p-5 sm:p-6 space-y-4 flex-grow">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              Distribusi Berdasarkan {statTabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              {isGenderTab
                ? 'Menampilkan rincian komposisi gender (Laki-laki & Perempuan) per kategori.'
                : 'Menampilkan sebaran jumlah pegawai berdasarkan kategori.'}
            </p>
          </div>

          <!-- Gender Legend if applicable -->
          {#if isGenderTab}
            <div class="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/60 text-xs self-start sm:self-auto">
              <span class="inline-flex items-center gap-1 font-semibold text-indigo-700">
                <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                Laki-laki
              </span>
              <span class="text-slate-300">|</span>
              <span class="inline-flex items-center gap-1 font-semibold text-rose-600">
                <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                Perempuan
              </span>
            </div>
          {/if}
        </div>

        <!-- Filter Input Inside Tab -->
        {#if rawTabData.length > 5}
          <div class="relative">
            <input
              type="text"
              bind:value={searchTabFilter}
              placeholder="Cari dalam kategori {statTabs.find((t) => t.id === activeTab)?.label}..."
              class="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
            />
            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {#if searchTabFilter}
              <button
                type="button"
                onclick={() => (searchTabFilter = "")}
                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            {/if}
          </div>
        {/if}

        <!-- Data List / Progress Bars -->
        {#if statsLoading}
          <div class="space-y-4 py-4">
            {#each [1, 2, 3, 4, 5, 6] as _}
              <div class="animate-pulse space-y-2">
                <div class="flex justify-between">
                  <div class="h-3 w-36 bg-slate-100 rounded"></div>
                  <div class="h-3 w-12 bg-slate-100 rounded"></div>
                </div>
                <div class="h-3 bg-slate-100 rounded-full"></div>
              </div>
            {/each}
          </div>
        {:else if filteredTabData.length === 0}
          <div class="py-16 text-center">
            <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-600">Tidak ada data ditemukan</p>
            <p class="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian Anda.</p>
          </div>
        {:else}
          <div class="space-y-3.5 pt-1">
            {#each paginatedData as item, idx}
              {@const absoluteIdx = (currentPage - 1) * itemsPerPage + idx}
              {@const maxVal = getMaxCount(rawTabData)}
              {@const pct = maxVal > 0 ? ((item.count || 0) / maxVal) * 100 : 0}
              {@const totalPct = stats?.summary?.total ? (((item.count || 0) / stats.summary.total) * 100).toFixed(1) : 0}

              <div class="group p-3 rounded-xl border border-slate-100 bg-white hover:border-violet-200 hover:shadow-xs transition-all space-y-2">
                <!-- Label & Counts -->
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-slate-400 font-mono text-[11px] shrink-0 font-medium">
                      {String(absoluteIdx + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue)}
                      class="text-xs sm:text-sm font-bold text-slate-800 hover:text-violet-600 truncate transition-colors text-left"
                      title="Klik untuk menampilkan daftar pegawai {item.label}"
                    >
                      {item.label}
                    </button>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs text-slate-400 font-medium">{totalPct}%</span>
                    <button
                      type="button"
                      onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue)}
                      class="text-xs sm:text-sm font-extrabold text-slate-800 hover:text-violet-600 transition-colors cursor-pointer"
                      title="Klik untuk menampilkan pegawai"
                    >
                      {(item.count || 0).toLocaleString("id-ID")}
                      <span class="text-[11px] font-normal text-slate-400">orang</span>
                    </button>
                  </div>
                </div>

                <!-- Visual Stacked Bar -->
                {#if isGenderTab && item.laki !== undefined && item.perempuan !== undefined}
                  <div
                    class="w-full h-3 bg-slate-100 rounded-full overflow-hidden cursor-pointer"
                    onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue)}
                    title="{item.label}: Total {item.count} (Laki: {item.laki} [{item.persenLaki}%], Perempuan: {item.perempuan} [{item.persenPerempuan}%]) - Klik untuk melihat daftar pegawai"
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue);
                    }}
                  >
                    <div
                      class="h-full rounded-full overflow-hidden flex transition-all duration-700 ease-out"
                      style="width: {pct}%"
                    >
                      <div
                        class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all hover:brightness-110"
                        style="width: {item.persenLaki ?? 0}%"
                      ></div>
                      <div
                        class="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all hover:brightness-110"
                        style="width: {item.persenPerempuan ?? 0}%"
                      ></div>
                    </div>
                  </div>

                  <!-- Gender Detail Badges & Interactive Trigger -->
                  <div class="flex items-center justify-between text-xs pt-0.5">
                    <div class="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue, 'L')}
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200/50 transition-colors cursor-pointer"
                        title="Tampilkan khusus pegawai Laki-laki"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        L: <strong>{(item.laki || 0).toLocaleString("id-ID")}</strong> ({item.persenLaki ?? 0}%)
                      </button>
                      <button
                        type="button"
                        onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue, 'P')}
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] border border-rose-200/50 transition-colors cursor-pointer"
                        title="Tampilkan khusus pegawai Perempuan"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        P: <strong>{(item.perempuan || 0).toLocaleString("id-ID")}</strong> ({item.persenPerempuan ?? 0}%)
                      </button>
                    </div>
                    <button
                      type="button"
                      onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue)}
                      class="text-[11px] font-bold text-violet-600 hover:text-violet-700 hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Tampilkan Pegawai →
                    </button>
                  </div>
                {:else}
                  <!-- Single Gradient Bar for non-gender split tabs -->
                  <div
                    class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden cursor-pointer"
                    onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue)}
                    title="Klik untuk melihat daftar pegawai {item.label}"
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => {
                      if (e.key === 'Enter') openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue);
                    }}
                  >
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-700 ease-out hover:brightness-110"
                      style="width: {pct}%"
                    ></div>
                  </div>
                  <div class="flex items-center justify-end pt-0.5">
                    <button
                      type="button"
                      onclick={() => openEmployeeModal(activeTab, statTabs.find((t) => t.id === activeTab)?.label, item.label, item.filterValue)}
                      class="text-[11px] font-bold text-violet-600 hover:text-violet-700 hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Tampilkan Pegawai →
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Pagination Controls -->
          {#if totalPages > 1}
            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div class="text-xs text-slate-500">
                Menampilkan <span class="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> -
                <span class="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredTabData.length)}</span>
                dari <span class="font-bold text-slate-700">{filteredTabData.length}</span> kategori
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  onclick={() => (currentPage = Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  aria-label="Halaman sebelumnya"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span class="text-xs font-semibold px-2 text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  aria-label="Halaman berikutnya"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Right Col: Overview Cards -->
    <div class="space-y-4">
      <!-- Mini Overview Card 1: Top 5 Jabatan -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            Top 5 Formasi Jabatan
          </h4>
          <button
            type="button"
            onclick={() => (activeTab = "jabatan")}
            class="text-[11px] font-bold text-violet-600 hover:underline"
          >
            Semua →
          </button>
        </div>
        {#if statsLoading}
          <div class="space-y-2 py-1">
            {#each [1, 2, 3] as _}
              <div class="h-3 bg-slate-100 rounded animate-pulse"></div>
            {/each}
          </div>
        {:else}
          <div class="space-y-2">
            {#each (stats?.byJabatan || []).slice(0, 5) as item}
              <button
                type="button"
                onclick={() => openEmployeeModal("jabatan", "Jabatan", item.label, item.filterValue)}
                class="w-full flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
              >
                <span class="font-medium text-slate-600 group-hover:text-violet-600 truncate max-w-[70%]">
                  {item.label}
                </span>
                <span class="font-bold text-slate-800 bg-slate-100 group-hover:bg-violet-100 group-hover:text-violet-800 px-2 py-0.5 rounded-full text-[10px] shrink-0 transition-colors">
                  {item.count} org
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Mini Overview Card 2: Kelompok Usia -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            Sebaran Kelompok Usia
          </h4>
          <button
            type="button"
            onclick={() => (activeTab = "usia")}
            class="text-[11px] font-bold text-violet-600 hover:underline"
          >
            Detail →
          </button>
        </div>
        {#if statsLoading}
          <div class="space-y-2 py-1">
            {#each [1, 2, 3] as _}
              <div class="h-3 bg-slate-100 rounded animate-pulse"></div>
            {/each}
          </div>
        {:else}
          <div class="space-y-2.5">
            {#each stats?.byAgeRange || [] as item}
              {@const pct = stats?.summary?.total ? (((item.count || 0) / stats.summary.total) * 100).toFixed(1) : 0}
              <button
                type="button"
                onclick={() => openEmployeeModal("usia", "Kelompok Usia", item.label, item.filterValue)}
                class="w-full text-left group hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
              >
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-semibold text-slate-700 group-hover:text-violet-600">Usia {item.label}</span>
                  <span class="font-bold text-slate-800 text-[11px]">{item.count} org ({pct}%)</span>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                  <div class="bg-indigo-500 h-full" style="width: {item.persenLaki ?? 0}%" title="Laki-laki: {item.laki}"></div>
                  <div class="bg-rose-400 h-full" style="width: {item.persenPerempuan ?? 0}%" title="Perempuan: {item.perempuan}"></div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Quick Navigation to Master Data Table -->
      <a
        href="/import-p3k-paruh-waktu"
        class="bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 p-5 rounded-2xl text-white shadow-md shadow-violet-500/20 block transition-all group"
      >
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-violet-200">
              Tabel Data Master
            </span>
            <h4 class="text-sm font-bold text-white group-hover:underline">
              Kelola Data PPPK Paruh Waktu
            </h4>
            <p class="text-xs text-violet-100/80 leading-relaxed">
              Buka tabel master 361 pegawai, cari NIP, unduh format lengkap, dan perbarui data.
            </p>
          </div>
          <svg class="w-5 h-5 text-violet-200 group-hover:translate-x-1 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>
    </div>
  </div>
</div>

<!-- Modal Drill Down Pegawai -->
{#if showEmployeeModal}
  <StatistikPegawaiModal
    bind:show={showEmployeeModal}
    category={modalCategory}
    categoryLabel={modalCategoryLabel}
    value={modalValue}
    filterValue={modalFilterValue}
    genderFilter={modalGender}
  />
{/if}
