<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import { env } from "$env/dynamic/public";

  const API_BASE_URL = env.PUBLIC_API_URL || "http://localhost:5001";

  // --- State ---
  let searchInput = "";
  let searchLoading = false;
  let searchSuggestions = [];
  let showSuggestions = false;
  let searchDebounce;

  let selectedNip = "";
  let isLoadingProfile = false;
  let profile = null;

  let activeTab = "utama"; // "utama", "pendidikan", "keluarga", "kontrak", "sk_pengangkatan"
  let recentSearches = [];

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Silakan login terlebih dahulu", "error");
      goto("/login");
      return;
    }

    // Load recent searches from localStorage if available
    try {
      const stored = localStorage.getItem("recent_p3k_searches");
      if (stored) {
        recentSearches = JSON.parse(stored).slice(0, 5);
      }
    } catch (e) {
      console.error(e);
    }

    // Check query param 'nip'
    const urlNip = $page.url.searchParams.get("nip");
    if (urlNip) {
      selectedNip = urlNip.trim();
      searchInput = selectedNip;
      await fetchProfile(selectedNip);
    } else {
      // Fetch initial suggestions
      await fetchSuggestions("");
    }
  });

  // Handle Search Input Live Debounce
  function handleSearchInput() {
    clearTimeout(searchDebounce);
    if (!searchInput.trim()) {
      searchSuggestions = [];
      showSuggestions = false;
      return;
    }

    searchDebounce = setTimeout(async () => {
      await fetchSuggestions(searchInput.trim());
    }, 250);
  }

  async function fetchSuggestions(q) {
    searchLoading = true;
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "8",
      });
      if (q) params.set("search", q);

      const res = await apiRequest(`/api/v1/data-p3k?${params.toString()}`);
      if (res && res.success) {
        searchSuggestions = res.data || [];
        showSuggestions = searchSuggestions.length > 0;
      }
    } catch (err) {
      console.error(err);
    } finally {
      searchLoading = false;
    }
  }

  // Select employee from suggestions or submit
  async function selectEmployee(emp) {
    if (!emp) return;
    selectedNip = emp.nipBaru;
    searchInput = `${emp.nama} (${emp.nipBaru})`;
    showSuggestions = false;

    // Save to recent searches
    saveRecentSearch(emp);

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set("nip", emp.nipBaru);
    window.history.replaceState({}, "", url.toString());

    await fetchProfile(emp.nipBaru);
  }

  function handleSearchSubmit() {
    showSuggestions = false;
    if (!searchInput.trim()) {
      addToast("Masukkan NIP atau Nama Pegawai untuk mencari", "warning");
      return;
    }

    // If first suggestion matches or just search directly
    if (searchSuggestions.length > 0) {
      selectEmployee(searchSuggestions[0]);
    } else {
      fetchProfile(searchInput.trim());
    }
  }

  function clearSearch() {
    searchInput = "";
    selectedNip = "";
    profile = null;
    searchSuggestions = [];
    showSuggestions = false;
    const url = new URL(window.location.href);
    url.searchParams.delete("nip");
    window.history.replaceState({}, "", url.toString());
  }

  function saveRecentSearch(emp) {
    try {
      const item = {
        nipBaru: emp.nipBaru,
        nama: emp.nama,
        gelarDepan: emp.gelarDepan,
        gelarBelakang: emp.gelarBelakang,
        jabatanNama: emp.jabatanNama,
        unorNama: emp.unorInduk?.nama || emp.unorNama,
      };
      recentSearches = [item, ...recentSearches.filter((r) => r.nipBaru !== emp.nipBaru)].slice(0, 5);
      localStorage.setItem("recent_p3k_searches", JSON.stringify(recentSearches));
    } catch (e) {
      console.error(e);
    }
  }

  // Fetch full profile by NIP
  async function fetchProfile(nip) {
    if (!nip) return;
    isLoadingProfile = true;
    try {
      const res = await apiRequest(`/api/v1/data-p3k/${encodeURIComponent(nip)}`);
      if (res && res.success) {
        profile = res.data;
      } else {
        // Fallback: search query
        const searchRes = await apiRequest(`/api/v1/data-p3k?search=${encodeURIComponent(nip)}&limit=1`);
        if (searchRes && searchRes.success && searchRes.data?.length > 0) {
          const matched = searchRes.data[0];
          const fullRes = await apiRequest(`/api/v1/data-p3k/${encodeURIComponent(matched.nipBaru)}`);
          if (fullRes && fullRes.success) {
            profile = fullRes.data;
            selectedNip = matched.nipBaru;
          } else {
            profile = matched;
          }
        } else {
          profile = null;
          addToast("Data Pegawai tidak ditemukan", "error");
        }
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memuat data profil", "error");
      profile = null;
    } finally {
      isLoadingProfile = false;
    }
  }

  function copyNip(nip) {
    if (!nip) return;
    navigator.clipboard.writeText(nip);
    addToast("NIP berhasil disalin ke clipboard", "success");
  }

  function formatCurrency(amount) {
    if (!amount) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  }

  function getNamaLengkap(p) {
    if (!p) return "-";
    return [p.gelarDepan, p.nama, p.gelarBelakang].filter(Boolean).join(" ") || p.nama || "-";
  }
</script>

<svelte:head>
  <title>Profil Pegawai — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
  <!-- Page Header Title & Subtitle -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
    <div class="flex items-center gap-3.5">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-black text-slate-800 tracking-tight">Profil Pegawai PPPK</h1>
        <p class="text-xs text-slate-500 font-medium">Pencarian biodata, riwayat pendidikan, keluarga, kontrak, dan SK pengangkatan</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <a href="/data-p3k" class="btn-secondary">
        <svg class="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Tabel Data Utama
      </a>
    </div>
  </div>

  <!-- Search Card & Autocomplete -->
  <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Pencarian Pegawai</h2>
        <p class="text-xs text-slate-500">Ketik NIP Baru atau Nama lengkap untuk menampilkan data profil</p>
      </div>
      {#if profile}
        <button
          type="button"
          on:click={clearSearch}
          class="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reset Pencarian
        </button>
      {/if}
    </div>

    <div class="relative">
      <form on:submit|preventDefault={handleSearchSubmit} class="flex items-center gap-2.5">
        <div class="relative flex-grow">
          <input
            type="text"
            bind:value={searchInput}
            on:input={handleSearchInput}
            on:focus={() => { if (searchSuggestions.length > 0) showSuggestions = true; }}
            placeholder="Cari NIP Baru (contoh: 19900101...) atau Nama Pegawai..."
            class="w-full text-sm pl-11 pr-10 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 shadow-inner"
            autocomplete="off"
          />
          <div class="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
            {#if searchLoading}
              <div class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            {:else}
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            {/if}
          </div>

          {#if searchInput}
            <button
              type="button"
              on:click={clearSearch}
              class="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
              title="Hapus teks"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>

        <button
          type="submit"
          class="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 flex-shrink-0 active:scale-95"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Cari Profil
        </button>
      </form>

      <!-- Live Autocomplete Suggestions Dropdown -->
      {#if showSuggestions && searchSuggestions.length > 0}
        <div class="absolute z-40 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto animate-scale-up">
          <div class="px-4 py-2 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>Saran Hasil Pencarian</span>
            <button
              type="button"
              on:click={() => (showSuggestions = false)}
              class="text-slate-400 hover:text-slate-600"
            >
              Tutup ✕
            </button>
          </div>
          {#each searchSuggestions as emp}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
            <div
              role="button"
              tabindex="0"
              on:click={() => selectEmployee(emp)}
              class="p-3.5 hover:bg-indigo-50/70 transition-colors flex items-center justify-between cursor-pointer group"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  {(emp.nama || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                    {getNamaLengkap(emp)}
                  </p>
                  <p class="text-xs text-slate-500 font-mono mt-0.5">
                    NIP: <span class="font-bold text-slate-700">{emp.nipBaru}</span>
                    {#if emp.jabatanNama}
                      <span class="text-slate-400 mx-1">•</span>
                      <span class="text-slate-600">{emp.jabatanNama}</span>
                    {/if}
                  </p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {emp.unorInduk?.nama || emp.unorNama || "Unit Kerja -"}
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Recent Searches Chips -->
    {#if recentSearches.length > 0 && !profile}
      <div class="pt-2 flex flex-wrap items-center gap-2 text-xs">
        <span class="text-slate-400 font-medium flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Pernah Dicari:
        </span>
        {#each recentSearches as r}
          <button
            type="button"
            on:click={() => selectEmployee(r)}
            class="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/80 rounded-xl text-slate-700 font-medium transition-all flex items-center gap-1.5"
          >
            <span>{r.nama}</span>
            <span class="text-[10px] font-mono text-slate-400">({r.nipBaru})</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Loading State -->
  {#if isLoadingProfile}
    <div class="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center space-y-4">
      <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
      <h3 class="text-base font-bold text-slate-700">Memuat data profil pegawai...</h3>
      <p class="text-xs text-slate-400">Mengambil data utama, riwayat pendidikan, keluarga, kontrak, dan SK pengangkatan</p>
    </div>

  <!-- Profile Content -->
  {:else if profile}
    <!-- HERO PROFILE HEADER CARD -->
    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden relative">
      <!-- Gradient Top Cover Strip -->
      <div class="h-28 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 relative">
        <div class="absolute inset-0 bg-grid-white/[0.05] bg-[length:16px_16px]"></div>
      </div>

      <div class="px-6 pb-6 pt-0 relative">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-14 mb-6">
          <div class="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
            <!-- Avatar Foto -->
            <div class="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-blue-500 border-4 border-white shadow-xl flex items-center justify-center text-white text-3xl font-black flex-shrink-0">
              {(profile.nama || "P").charAt(0).toUpperCase()}
            </div>

            <!-- Nama & Jabatan -->
            <div class="space-y-1">
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">
                  {getNamaLengkap(profile)}
                </h2>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider {profile.statusPensiun === 'PENSIUN' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
                  {profile.statusPensiun || "AKTIF"}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  {profile.jenisPegawaiNama || "PPPK"}
                </span>
              </div>

              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-500 font-medium">
                <button
                  type="button"
                  on:click={() => copyNip(profile.nipBaru)}
                  class="font-mono font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                  title="Klik untuk menyalin NIP"
                >
                  <span>NIP: {profile.nipBaru}</span>
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                {#if profile.nipLama}
                  <span class="text-slate-400 font-mono">NIP Lama: {profile.nipLama}</span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Unit Kerja & Quick Actions -->
          <div class="text-center md:text-right space-y-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Kerja Induk</p>
            <p class="text-sm font-extrabold text-slate-800">
              {profile.unorInduk?.nama || profile.unorNama || "Belum Diset"}
            </p>
            {#if profile.unorNama && profile.unorInduk?.nama && profile.unorNama !== profile.unorInduk.nama}
              <p class="text-xs text-slate-500">{profile.unorNama}</p>
            {/if}
          </div>
        </div>

        <!-- Quick Summary Stats Bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase">Jabatan</span>
            <p class="font-bold text-slate-800 truncate" title={profile.jabatanNama || "-"}>
              {profile.jabatanNama || "-"}
            </p>
          </div>
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase">Golongan Ruang</span>
            <p class="font-bold text-indigo-700">
              {profile.golAkhirNama || profile.golAwalNama || "-"}
              {#if profile.tmtGolongan}
                <span class="text-[10px] text-slate-400 font-normal"> (TMT: {profile.tmtGolongan})</span>
              {/if}
            </p>
          </div>
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Terakhir</span>
            <p class="font-bold text-slate-800 truncate" title={profile.pendidikanNama || profile.tingkatPendidikanNama || "-"}>
              {profile.pendidikanNama || profile.tingkatPendidikanNama || "-"}
            </p>
          </div>
          <div>
            <span class="text-[10px] font-bold text-slate-400 uppercase">Riwayat Kontrak</span>
            <p class="font-bold text-emerald-700">
              {(profile.riwayatKontrak || []).length} Kontrak Tercatat
            </p>
          </div>
        </div>
      </div>

      <!-- TABS NAVIGATION HEADER -->
      <div class="px-6 border-t border-slate-200 bg-white flex overflow-x-auto gap-2 py-2">
        <button
          type="button"
          on:click={() => (activeTab = "utama")}
          class="px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap {activeTab === 'utama' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          1. Data Utama
        </button>

        <button
          type="button"
          on:click={() => (activeTab = "pendidikan")}
          class="px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap {activeTab === 'pendidikan' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          2. Pendidikan
        </button>

        <button
          type="button"
          on:click={() => (activeTab = "keluarga")}
          class="px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap {activeTab === 'keluarga' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          3. Keluarga
        </button>

        <button
          type="button"
          on:click={() => (activeTab = "kontrak")}
          class="px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap {activeTab === 'kontrak' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          4. Kontrak ({ (profile.riwayatKontrak || []).length })
        </button>

        <button
          type="button"
          on:click={() => (activeTab = "sk_pengangkatan")}
          class="px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap {activeTab === 'sk_pengangkatan' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-600 hover:bg-slate-100'}"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          5. SK Pengangkatan
        </button>
      </div>
    </div>

    <!-- TAB 1: DATA UTAMA -->
    {#if activeTab === "utama"}
      <div class="space-y-6">
        <!-- Section 1.1: Identitas Pribadi -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-slate-800">Identitas Pribadi & Kependudukan</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nomor Induk Kependudukan (NIK)</span>
              <p class="font-mono font-bold text-slate-800 text-sm mt-0.5">{profile.nik || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Tempat & Tanggal Lahir</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">
                {profile.tempatLahirNama || "-"}{profile.tanggalLahir ? `, ${profile.tanggalLahir}` : ""}
              </p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Jenis Kelamin</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">
                {profile.jenisKelamin === 'P' || profile.jenisKelamin === 'WANITA' || profile.jenisKelamin === 'Perempuan' ? 'Perempuan' : profile.jenisKelamin === 'L' || profile.jenisKelamin === 'PRIA' || profile.jenisKelamin === 'Laki-laki' ? 'Laki-laki' : (profile.jenisKelamin || "-")}
              </p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Agama</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.agamaNama || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status Pernikahan</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.jenisKawinNama || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nomor WhatsApp / HP</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.nomorHp || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Pribadi</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5 truncate">{profile.email || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Kedinasan (Gov)</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5 truncate">{profile.emailGov || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nomor NPWP</span>
              <p class="font-mono font-bold text-slate-800 text-sm mt-0.5">{profile.npwpNomor || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nomor BPJS</span>
              <p class="font-mono font-bold text-slate-800 text-sm mt-0.5">{profile.bpjs || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Kartu ASN Virtual</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.kartuAsnVirtual || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">PNS ID / BKN ID</span>
              <p class="font-mono font-bold text-slate-800 text-sm mt-0.5">{profile.pnsId || "-"}</p>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
            <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Alamat Lengkap</span>
            <p class="font-semibold text-slate-800 mt-1 leading-relaxed">{profile.alamat || "Alamat belum tercatat dalam sistem"}</p>
          </div>
        </div>

        <!-- Section 1.2: Status Kepegawaian & Unit Kerja -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M13 16h.01M13 12h.01" />
              </svg>
            </div>
            <h3 class="text-base font-bold text-slate-800">Status Kepegawaian & Penempatan</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Kedudukan Hukum</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.kedudukanHukumNama || "Aktif"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Jenis Pegawai</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.jenisPegawaiNama || "PPPK"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Jenis Jabatan</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.jenisJabatanNama || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">TMT Jabatan</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.tmtJabatan || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Masa Kerja (BKN)</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">
                {profile.mkTahun ? `${profile.mkTahun} Tahun` : "-"} {profile.mkBulan ? `${profile.mkBulan} Bulan` : ""}
              </p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Kantor Bayar (KPKN / KPPN)</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.kpknNama || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Lokasi Kerja</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.lokasiKerjaNama || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Instansi Induk</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.instansiIndukNama || "-"}</p>
            </div>

            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Instansi Kerja</span>
              <p class="font-bold text-slate-800 text-sm mt-0.5">{profile.instansiKerjaNama || "-"}</p>
            </div>
          </div>
        </div>
      </div>

    <!-- TAB 2: PENDIDIKAN -->
    {:else if activeTab === "pendidikan"}
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Riwayat & Data Pendidikan</h3>
              <p class="text-xs text-slate-500">Pendidikan formal yang tercatat pada kualifikasi kepegawaian</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Main Education Card -->
          <div class="p-6 rounded-3xl bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-100/80 space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 bg-purple-600 text-white font-bold rounded-xl text-xs shadow-sm shadow-purple-500/20">
                {profile.tingkatPendidikanNama || "Jenjang Pendidikan"}
              </span>
              {#if profile.tahunLulus}
                <span class="text-xs font-bold text-purple-700 bg-white/80 px-3 py-1 rounded-xl border border-purple-200">
                  Lulus Tahun {profile.tahunLulus}
                </span>
              {/if}
            </div>

            <div>
              <h4 class="text-lg font-black text-slate-900 leading-tight">
                {profile.pendidikanNama || "Nama Program Studi / Jurusan Belum Diset"}
              </h4>
              <p class="text-sm font-semibold text-slate-600 mt-1">
                {profile.namaSekolah || "Nama Institusi / Perguruan Tinggi"}
              </p>
            </div>
          </div>

          <!-- Detail Education Specs -->
          <div class="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
            <h4 class="font-bold text-slate-700 text-sm mb-2">Spesifikasi Referensi Pendidikan</h4>

            <div class="flex justify-between py-2 border-b border-slate-200/60">
              <span class="text-slate-500">Tingkat Pendidikan</span>
              <span class="font-bold text-slate-800">{profile.tingkatPendidikanNama || "-"}</span>
            </div>

            <div class="flex justify-between py-2 border-b border-slate-200/60">
              <span class="text-slate-500">Program Studi / Jurusan</span>
              <span class="font-bold text-slate-800">{profile.pendidikanNama || "-"}</span>
            </div>

            <div class="flex justify-between py-2 border-b border-slate-200/60">
              <span class="text-slate-500">Nama Sekolah / Kampus</span>
              <span class="font-bold text-slate-800">{profile.namaSekolah || "-"}</span>
            </div>

            <div class="flex justify-between py-2 border-b border-slate-200/60">
              <span class="text-slate-500">Tahun Kelulusan</span>
              <span class="font-bold text-slate-800">{profile.tahunLulus || "-"}</span>
            </div>

            {#if profile.pendidikanId}
              <div class="flex justify-between py-2">
                <span class="text-slate-500">Kode Referensi SIASN</span>
                <span class="font-mono font-bold text-indigo-600">{profile.pendidikanId}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

    <!-- TAB 3: KELUARGA -->
    {:else if activeTab === "keluarga"}
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Status Pernikahan & Keluarga</h3>
              <p class="text-xs text-slate-500">Informasi status perkawinan dan tanggungan keluarga pegawai</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Status Pernikahan</span>
            <p class="text-base font-extrabold text-slate-800">{profile.jenisKawinNama || "-"}</p>
            <p class="text-[11px] text-slate-500">Tercatat dalam data kepegawaian ASN</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Jumlah Tanggungan / Pasangan</span>
            <p class="text-base font-extrabold text-indigo-700">
              {profile.jenisKawinNama?.toLowerCase().includes("kawin") ? "1 Pasangan" : "0 Pasangan"}
            </p>
            <p class="text-[11px] text-slate-500">Keluarga tertanggung BPJS / Penggajian</p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Kartu ASN Virtual Terdaftar</span>
            <p class="text-base font-extrabold text-emerald-700">{profile.kartuAsnVirtual || "Terdaftar"}</p>
            <p class="text-[11px] text-slate-500">Layanan Satu Pintu BKN</p>
          </div>
        </div>
      </div>

    <!-- TAB 4: KONTRAK -->
    {:else if activeTab === "kontrak"}
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Riwayat Perjanjian Kerja / Kontrak</h3>
              <p class="text-xs text-slate-500">Daftar riwayat kontrak kerja yang pernah diterbitkan untuk pegawai ini</p>
            </div>
          </div>

          <a
            href="/perpanjangan-kontrak/usulan"
            class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors border border-emerald-200 flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Buat Usulan PK Baru
          </a>
        </div>

        {#if !profile.riwayatKontrak || profile.riwayatKontrak.length === 0}
          <div class="py-12 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80 p-8 space-y-2">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 class="text-sm font-bold text-slate-700">Belum ada riwayat kontrak tercatat</h4>
            <p class="text-xs text-slate-400">Riwayat kontrak akan otomatis muncul setelah usulan PK diselesaikan</p>
          </div>
        {:else}
          <div class="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th class="py-3.5 px-4 text-center w-14">Ke-</th>
                  <th class="py-3.5 px-4">Nomor Kontrak</th>
                  <th class="py-3.5 px-4">Periode Masa Berlaku</th>
                  <th class="py-3.5 px-4">Gaji Pokok</th>
                  <th class="py-3.5 px-4">Golongan & MK</th>
                  <th class="py-3.5 px-4 text-right">Dokumen SK</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each profile.riwayatKontrak as k}
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3.5 px-4 text-center font-black text-indigo-700 bg-indigo-50/30">
                      {k.kontrakKe}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {k.nomorKontrak || "-"}
                      {#if k.keterangan}
                        <p class="text-[10px] font-sans font-normal text-slate-400 mt-0.5">{k.keterangan}</p>
                      {/if}
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="space-y-0.5">
                        <p class="font-bold text-slate-800">
                          {formatDate(k.tanggalMulai)} s/d {formatDate(k.tanggalSelesai)}
                        </p>
                        <p class="text-[10px] text-slate-400">
                          ({k.tanggalMulai} s/d {k.tanggalSelesai})
                        </p>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 font-bold text-emerald-700">
                      {formatCurrency(k.gajiPokok)}
                    </td>
                    <td class="py-3.5 px-4">
                      <p class="font-bold text-slate-800">Golongan {k.golongan || "-"}</p>
                      <p class="text-[10px] text-slate-400">
                        Masa Kerja: {k.mkTahun ?? "-"} Thn {k.mkBulan ?? "-"} Bln
                      </p>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      {#if k.arsipKontrak?.fileUrl}
                        <a
                          href={`${API_BASE_URL}${k.arsipKontrak.fileUrl}`}
                          target="_blank"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors border border-indigo-200"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Lihat PDF
                        </a>
                      {:else}
                        <span class="text-slate-400 text-xs italic">Tanpa Berkas</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

    <!-- TAB 5: SK PENGANGKATAN -->
    {:else if activeTab === "sk_pengangkatan"}
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">SK Pengangkatan & Surat Keputusan</h3>
              <p class="text-xs text-slate-500">Data penetapan pengangkatan awal dan status surat keputusan kepegawaian</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- SK CPNS / Pengangkatan PPPK Card -->
          <div class="p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 bg-amber-500 text-white font-bold rounded-xl text-xs shadow-sm shadow-amber-500/20">
                SK Pengangkatan Pertama
              </span>
              {#if profile.tmtCpns}
                <span class="text-xs font-bold text-amber-800 bg-white/80 px-3 py-1 rounded-xl border border-amber-200">
                  TMT: {profile.tmtCpns}
                </span>
              {/if}
            </div>

            <div class="space-y-2">
              <div>
                <span class="text-[10px] font-bold text-amber-700 uppercase">Nomor SK Pengangkatan</span>
                <p class="font-mono text-base font-black text-slate-900">{profile.nomorSkCpns || "-"}</p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-amber-200/60">
                <div>
                  <span class="text-slate-500 text-[11px]">Tanggal Penetapan SK</span>
                  <p class="font-bold text-slate-800">{profile.tanggalSkCpns || "-"}</p>
                </div>
                <div>
                  <span class="text-slate-500 text-[11px]">TMT CPNS / PPPK</span>
                  <p class="font-bold text-amber-800">{profile.tmtCpns || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- SK PNS / Jabatan Info Card -->
          <div class="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 bg-slate-700 text-white font-bold rounded-xl text-xs">
                Penetapan Jabatan & Pangkat
              </span>
              {#if profile.tmtJabatan}
                <span class="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-xl border border-slate-200">
                  TMT: {profile.tmtJabatan}
                </span>
              {/if}
            </div>

            <div class="space-y-2">
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase">Nomor SK PNS / Induk</span>
                <p class="font-mono text-base font-black text-slate-800">{profile.nomorSkPns || "-"}</p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                <div>
                  <span class="text-slate-500 text-[11px]">Tanggal SK PNS / Induk</span>
                  <p class="font-bold text-slate-800">{profile.tanggalSkPns || "-"}</p>
                </div>
                <div>
                  <span class="text-slate-500 text-[11px]">TMT PNS / Induk</span>
                  <p class="font-bold text-slate-800">{profile.tmtPns || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {#if profile.arsipSkPensiun}
          <!-- SK Pensiun Card (If applicable) -->
          <div class="p-6 rounded-3xl bg-rose-50 border border-rose-200 space-y-3">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 bg-rose-600 text-white font-bold rounded-xl text-xs">
                SK Pensiun Diterbitkan
              </span>
              {#if profile.arsipSkPensiun.fileUrl}
                <a
                  href={`${API_BASE_URL}${profile.arsipSkPensiun.fileUrl}`}
                  target="_blank"
                  class="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1 transition-colors"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Lihat Berkas SK Pensiun
                </a>
              {/if}
            </div>
            <p class="text-xs text-rose-800">
              Nomor SK: <b class="font-mono">{profile.arsipSkPensiun.nomorSk}</b>
              {#if profile.arsipSkPensiun.tanggalSk}
                • Tanggal SK: <b>{profile.arsipSkPensiun.tanggalSk}</b>
              {/if}
            </p>
          </div>
        {/if}
      </div>
    {/if}

  <!-- Empty Initial State (No search yet) -->
  {:else}
    <div class="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm text-center max-w-2xl mx-auto space-y-5">
      <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-100 to-blue-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
        <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      <div class="space-y-2">
        <h3 class="text-xl font-black text-slate-800">Cari dan Buka Profil Pegawai</h3>
        <p class="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Gunakan form pencarian di atas untuk memasukkan NIP Baru atau Nama Pegawai. Anda dapat melihat riwayat lengkap pegawai dari data utama hingga SK pengangkatan.
        </p>
      </div>

      {#if searchSuggestions.length > 0}
        <div class="pt-4 border-t border-slate-100 text-left space-y-3">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
            Atau Pilih Pegawai dari Daftar Berikut:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {#each searchSuggestions.slice(0, 4) as emp}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
              <div
                role="button"
                tabindex="0"
                on:click={() => selectEmployee(emp)}
                class="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 rounded-2xl cursor-pointer transition-all flex items-center gap-3 group"
              >
                <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {(emp.nama || "P").charAt(0).toUpperCase()}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">
                    {getNamaLengkap(emp)}
                  </p>
                  <p class="text-[10px] font-mono text-slate-400 truncate">
                    {emp.nipBaru}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .btn-secondary {
    @apply inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm active:scale-95;
  }
</style>
