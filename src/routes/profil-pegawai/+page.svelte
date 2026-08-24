<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { addToast } from "$lib/toastStore";

  // --- State ---
  let searchInput = "";
  let searchLoading = false;
  let searchSuggestions = [];
  let showSuggestions = false;
  let searchDebounce;

  let selectedNip = "";
  let isLoadingProfile = false;
  let profile = null;
  let notFound = false;
  let notFoundQuery = "";

  let activeTab = "utama"; // "utama", "pendidikan", "keluarga", "kontrak", "sk_pengangkatan"
  let recentSearches = [];
  let searchContainerRef;

  function handleClickOutside(e) {
    if (searchContainerRef && !searchContainerRef.contains(e.target)) {
      showSuggestions = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      showSuggestions = false;
    }
  }

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
    }
  });

  // Handle Search Input Live Debounce
  function handleSearchInput() {
    clearTimeout(searchDebounce);
    const query = searchInput.trim();
    if (!query) {
      searchSuggestions = [];
      showSuggestions = false;
      return;
    }

    searchDebounce = setTimeout(async () => {
      await fetchSuggestions(query);
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
        showSuggestions = true;
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
    notFound = false;
    notFoundQuery = "";
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

  async function handleSearchSubmit() {
    showSuggestions = false;
    const query = searchInput.trim();
    if (!query) {
      addToast("Masukkan NIP atau Nama Pegawai untuk mencari", "warning");
      return;
    }

    // If first suggestion matches or just search directly
    if (searchSuggestions.length > 0) {
      selectEmployee(searchSuggestions[0]);
    } else {
      await fetchProfile(query);
    }
  }

  function clearSearch() {
    searchInput = "";
    selectedNip = "";
    profile = null;
    notFound = false;
    notFoundQuery = "";
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
    notFound = false;
    notFoundQuery = nip;
    try {
      const res = await apiRequest(`/api/v1/data-p3k/${encodeURIComponent(nip)}`);
      if (res && res.success && res.data) {
        profile = res.data;
        notFound = false;
      } else {
        // Fallback: search query
        const searchRes = await apiRequest(`/api/v1/data-p3k?search=${encodeURIComponent(nip)}&limit=1`);
        if (searchRes && searchRes.success && searchRes.data?.length > 0) {
          const matched = searchRes.data[0];
          const fullRes = await apiRequest(`/api/v1/data-p3k/${encodeURIComponent(matched.nipBaru)}`);
          if (fullRes && fullRes.success && fullRes.data) {
            profile = fullRes.data;
            selectedNip = matched.nipBaru;
          } else {
            profile = matched;
          }
          notFound = false;
        } else {
          profile = null;
          notFound = true;
          addToast("Data Pegawai tidak ditemukan", "warning");
        }
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memuat data profil", "error");
      profile = null;
      notFound = true;
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

    // Clean gelar depan (hilangkan strip '-' atau karakter petik)
    let gd = p.gelarDepan ? String(p.gelarDepan).replace(/^['"\s-]+|['"\s-]+$/g, "").trim() : "";
    if (gd === "-" || gd === "--" || gd === "—") gd = "";

    // Clean nama utama (hilangkan strip '-' di awal nama)
    let nama = p.nama ? String(p.nama).replace(/^['"\s-]+/, "").trim() : "";

    // Clean gelar belakang (hilangkan strip '-')
    let gb = p.gelarBelakang ? String(p.gelarBelakang).replace(/^['"\s-]+|['"\s-]+$/g, "").trim() : "";
    if (gb === "-" || gb === "--" || gb === "—") gb = "";

    const parts = [];
    if (gd) parts.push(gd);
    if (nama) parts.push(nama);
    if (gb) parts.push(gb);

    const full = parts.join(" ").trim();
    return full || nama || "-";
  }

  function getAvatarInitial(p) {
    if (!p) return "P";
    const nama = (p.nama || "").replace(/^['"\s-]+/, "").trim();
    return (nama || "P").charAt(0).toUpperCase();
  }

  function formatJenisKelamin(jk) {
    if (!jk) return "-";
    const val = String(jk).trim().toUpperCase();
    if (
      val === "M" ||
      val === "MALE" ||
      val === "L" ||
      val === "PRIA" ||
      val === "LAKI-LAKI" ||
      val === "LAKI_LAKI" ||
      val === "LAKI - LAKI" ||
      val === "1" ||
      val.startsWith("LAKI")
    ) {
      return "Laki-laki";
    }
    if (
      val === "F" ||
      val === "FEMALE" ||
      val === "P" ||
      val === "WANITA" ||
      val === "PEREMPUAN" ||
      val === "2" ||
      val.startsWith("PEREMP") ||
      val.startsWith("WANIT")
    ) {
      return "Perempuan";
    }
    return jk;
  }

  function cleanValue(val) {
    if (!val) return "-";
    const str = String(val).replace(/^['"\s]+|['"\s]+$/g, "").trim();
    return str || "-";
  }

  function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).replace(/^['"\s]+|['"\s]+$/g, "").trim();
    if (!cleanStr || cleanStr === "-") return null;

    // Check DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }

    // Standard new Date parse (YYYY-MM-DD, ISO, etc.)
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;

    return null;
  }

  function calculateMasaKerjaSampaiSaatIni(p) {
    if (!p) return "-";
    // Priority: tmtCpns -> tmtJabatan -> tmtGolongan -> first contract tanggalMulai
    let start = parseDateSafe(p.tmtCpns);
    if (!start) start = parseDateSafe(p.tmtJabatan);
    if (!start) start = parseDateSafe(p.tmtGolongan);
    if (!start && p.riwayatKontrak && p.riwayatKontrak.length > 0) {
      start = parseDateSafe(p.riwayatKontrak[0].tanggalMulai);
    }

    if (!start) {
      if (p.mkTahun !== undefined && p.mkTahun !== null && String(p.mkTahun).trim() !== "") {
        const t = parseInt(cleanValue(p.mkTahun), 10) || 0;
        const b = parseInt(cleanValue(p.mkBulan), 10) || 0;
        return `${t} Tahun ${b} Bulan`;
      }
      return "-";
    }

    const now = new Date();
    if (now < start) {
      return "0 Tahun 0 Bulan";
    }

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let days = now.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    years = Math.max(0, years);
    months = Math.max(0, months);

    return `${years} Tahun ${months} Bulan`;
  }
</script>

<svelte:head>
  <title>Profil Pegawai — SIPPPK</title>
</svelte:head>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-8 animate-fade-in w-full overflow-x-hidden">
  <!-- Page Header Title & Subtitle -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm">
    <div class="flex items-center gap-3.5">
      <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
        <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div>
        <h1 class="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Profil Pegawai PPPK</h1>
        <p class="text-[11px] sm:text-xs text-slate-500 font-medium">Pencarian biodata, riwayat pendidikan, keluarga, kontrak, dan SK pengangkatan</p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <a href="/data-p3k" class="btn-secondary w-full sm:w-auto justify-center">
        <svg class="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Tabel Data Utama
      </a>
    </div>
  </div>

  <!-- Search Card & Autocomplete -->
  <div class="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Pencarian Pegawai</h2>
        <p class="text-xs text-slate-500">Ketik NIP Baru atau Nama lengkap untuk menampilkan data profil</p>
      </div>
      {#if profile}
        <button
          type="button"
          on:click={clearSearch}
          class="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 self-start sm:self-auto"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reset Pencarian
        </button>
      {/if}
    </div>

    <div class="relative" bind:this={searchContainerRef}>
      <form on:submit|preventDefault={handleSearchSubmit} class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div class="relative flex-grow min-w-0">
          <input
            type="text"
            bind:value={searchInput}
            on:input={handleSearchInput}
            on:focus={() => { if (searchInput.trim() && searchSuggestions.length > 0) showSuggestions = true; }}
            placeholder="Cari NIP Baru atau Nama Pegawai..."
            class="w-full text-sm pl-11 pr-10 py-3 sm:py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 shadow-inner"
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
          class="w-full sm:w-auto justify-center px-6 py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 flex-shrink-0 active:scale-95"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Cari Profil
        </button>
      </form>

      <!-- Live Autocomplete Suggestions Dropdown -->
      {#if showSuggestions}
        <div class="absolute z-40 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto animate-scale-up">
          <div class="px-4 py-2 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>Hasil Pencarian Pegawai</span>
            <button
              type="button"
              on:click={() => (showSuggestions = false)}
              class="text-slate-400 hover:text-slate-600 text-xs"
            >
              Tutup ✕
            </button>
          </div>

          {#if searchLoading}
            <div class="p-6 text-center space-y-2 text-slate-400">
              <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p class="text-xs">Mencari data pegawai...</p>
            </div>
          {:else if searchSuggestions.length === 0}
            <div class="p-6 text-center space-y-2">
              <div class="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p class="text-sm font-bold text-slate-700">Data Pegawai Tidak Ditemukan</p>
              <p class="text-xs text-slate-400">Tidak ada pegawai dengan kata kunci "<strong>{searchInput}</strong>"</p>
            </div>
          {:else}
            {#each searchSuggestions as emp}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
              <div
                role="button"
                tabindex="0"
                on:click={() => selectEmployee(emp)}
                class="p-4 hover:bg-indigo-50/70 transition-all flex items-start justify-between gap-3 cursor-pointer group"
              >
                <div class="flex items-start gap-3.5 min-w-0">
                  <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform mt-0.5">
                    {getAvatarInitial(emp)}
                  </div>
                  <div class="min-w-0 space-y-1">
                    <!-- Baris 1 (Atas): Nama (NIP) -->
                    <p class="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight truncate">
                      {getNamaLengkap(emp)}
                      <span class="text-xs font-mono font-bold text-slate-500 ml-1">({emp.nipBaru})</span>
                    </p>

                    <!-- Baris 2 (Bawahnya): Jabatan -->
                    <p class="text-xs text-slate-600 font-medium flex items-center gap-1.5 truncate">
                      <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span class="truncate">{emp.jabatanNama || "Jabatan belum diset"}</span>
                    </p>

                    <!-- Baris 3 (Bawahnya lagi): Unit Kerja -->
                    <p class="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M13 16h.01M13 12h.01" />
                      </svg>
                      <span class="truncate font-medium text-slate-600">{emp.unorInduk?.nama || emp.unorNama || "Unit Kerja belum diset"}</span>
                    </p>
                  </div>
                </div>

                <div class="flex-shrink-0 pt-1">
                  <span class="text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoadingProfile}
    <div class="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center space-y-4">
      <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
      <h3 class="text-base font-bold text-slate-700">Memuat data profil pegawai...</h3>
      <p class="text-xs text-slate-400">Mengambil data utama, riwayat pendidikan, keluarga, kontrak, dan SK pengangkatan</p>
    </div>

  <!-- Not Found State -->
  {:else if notFound}
    <div class="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center space-y-4 animate-scale-up">
      <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-slate-800">Data Pegawai Tidak Ditemukan</h3>
      <p class="text-sm text-slate-500 max-w-md mx-auto">
        Tidak ditemukan data pegawai untuk pencarian "<strong>{notFoundQuery || searchInput}</strong>". Silakan periksa kembali NIP atau Nama yang Anda masukkan.
      </p>
      <button
        type="button"
        on:click={clearSearch}
        class="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset Pencarian
      </button>
    </div>

  <!-- Profile Content -->
  {:else if profile}
    <!-- PROFILE HEADER CARD -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div class="flex flex-col sm:flex-row items-start gap-3.5 sm:gap-5">
        <!-- Avatar Icon -->
        <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg sm:text-2xl font-bold shadow-md shadow-blue-500/20 flex-shrink-0">
          {getAvatarInitial(profile)}
        </div>

        <!-- Detail Utama: Nama (NIP), Jabatan, Unit Kerja -->
        <div class="min-w-0 flex-1 space-y-1.5 w-full">
          <!-- Baris 1: Nama Lengkap (NIP) + Badges -->
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h2 class="text-base sm:text-xl font-bold text-slate-900 tracking-tight break-words">
              {getNamaLengkap(profile)}
            </h2>
            <button
              type="button"
              on:click={() => copyNip(cleanValue(profile.nipBaru))}
              class="font-mono font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg border border-slate-200 text-xs transition-colors flex items-center gap-1 break-all"
              title="Klik untuk menyalin NIP"
            >
              <span>({cleanValue(profile.nipBaru)})</span>
              <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <span class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide {profile.statusPensiun === 'PENSIUN' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
              {profile.statusPensiun || "AKTIF"}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200">
              {profile.jenisPegawaiNama || "PPPK"}
            </span>
          </div>

          <!-- Baris 2: Jabatan -->
          <p class="text-xs sm:text-sm font-semibold text-blue-600 flex items-center gap-1.5 break-words">
            <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span class="break-words">{cleanValue(profile.jabatanNama)}</span>
          </p>

          <!-- Baris 3: Unit Kerja -->
          <p class="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed break-words">
            <svg class="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M13 16h.01M13 12h.01" />
            </svg>
            <span class="font-medium text-slate-700 break-words">
              {profile.unorInduk?.nama ? `${profile.unorInduk.nama} — ${profile.unorNama || ''}` : (profile.unorNama || "Unit Kerja belum diset")}
            </span>
          </p>
        </div>
      </div>

      <!-- Quick Summary Stats Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs pt-4 border-t border-slate-100">
        <div class="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
          <span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Jenis Jabatan</span>
          <p class="font-bold text-slate-800 mt-0.5 truncate" title={cleanValue(profile.jenisJabatanNama)}>
            {cleanValue(profile.jenisJabatanNama)}
          </p>
        </div>
        <div class="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
          <span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Golongan Ruang</span>
          <p class="font-bold text-blue-700 mt-0.5 truncate">
            {cleanValue(profile.golAkhirNama || profile.golAwalNama)}
            {#if profile.tmtGolongan}
              <span class="text-[10px] text-slate-400 font-normal"> (TMT: {profile.tmtGolongan})</span>
            {/if}
          </p>
        </div>
        <div class="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
          <span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Pendidikan Terakhir</span>
          <p class="font-bold text-slate-800 mt-0.5 truncate" title={cleanValue(profile.pendidikanNama || profile.tingkatPendidikanNama)}>
            {cleanValue(profile.pendidikanNama || profile.tingkatPendidikanNama)}
          </p>
        </div>
        <div class="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
          <span class="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Total Kontrak</span>
          <p class="font-bold text-emerald-700 mt-0.5 truncate">
            {(profile.riwayatKontrak || []).length} Riwayat Kontrak
          </p>
        </div>
      </div>
    </div>

    <!-- TABS NAVIGATION BAR -->
    <div class="p-1 sm:p-1.5 bg-slate-100 rounded-2xl flex overflow-x-auto gap-1 border border-slate-200 max-w-full scrollbar-thin">
      <button
        type="button"
        on:click={() => (activeTab = "utama")}
        class="flex-1 min-w-[110px] sm:min-w-[140px] py-2 sm:py-2.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap {activeTab === 'utama' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Data Utama
      </button>

      <button
        type="button"
        on:click={() => (activeTab = "pendidikan")}
        class="flex-1 min-w-[110px] sm:min-w-[140px] py-2 sm:py-2.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap {activeTab === 'pendidikan' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
        Pendidikan
      </button>

      <button
        type="button"
        on:click={() => (activeTab = "keluarga")}
        class="flex-1 min-w-[110px] sm:min-w-[140px] py-2 sm:py-2.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap {activeTab === 'keluarga' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Keluarga
      </button>

      <button
        type="button"
        on:click={() => (activeTab = "kontrak")}
        class="flex-1 min-w-[110px] sm:min-w-[140px] py-2 sm:py-2.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap {activeTab === 'kontrak' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Kontrak ({ (profile.riwayatKontrak || []).length })
      </button>

      <button
        type="button"
        on:click={() => (activeTab = "sk_pengangkatan")}
        class="flex-1 min-w-[110px] sm:min-w-[140px] py-2 sm:py-2.5 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap {activeTab === 'sk_pengangkatan' ? 'bg-white shadow-sm text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'}"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        SK Pengangkatan
      </button>
    </div>

    <!-- TAB 1: DATA UTAMA -->
    {#if activeTab === "utama"}
      <div class="space-y-4 sm:space-y-6">
        <!-- Section 1.1: Identitas Pribadi -->
        <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <h3 class="text-sm sm:text-base font-bold text-slate-800">Identitas Pribadi & Kependudukan</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Nomor Induk Kependudukan (NIK)</span>
              <p class="font-mono font-bold text-slate-800 text-sm mt-1 break-all">{cleanValue(profile.nik)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Tempat & Tanggal Lahir</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">
                {cleanValue(profile.tempatLahirNama)}{profile.tanggalLahir ? `, ${cleanValue(profile.tanggalLahir)}` : ""}
              </p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Jenis Kelamin</span>
              <p class="font-bold text-slate-800 text-sm mt-1">
                {formatJenisKelamin(profile.jenisKelamin)}
              </p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Agama</span>
              <p class="font-bold text-slate-800 text-sm mt-1">{cleanValue(profile.agamaNama)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Status Pernikahan</span>
              <p class="font-bold text-slate-800 text-sm mt-1">{cleanValue(profile.jenisKawinNama)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Nomor WhatsApp / HP</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-all">{cleanValue(profile.nomorHp)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Email Pribadi</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-all">{cleanValue(profile.email)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Email Kedinasan (Gov)</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-all">{cleanValue(profile.emailGov)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Nomor NPWP</span>
              <p class="font-mono font-bold text-slate-800 text-sm mt-1 break-all">{cleanValue(profile.npwpNomor)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Nomor BPJS</span>
              <p class="font-mono font-bold text-slate-800 text-sm mt-1 break-all">{cleanValue(profile.bpjs)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Kartu ASN Virtual</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.kartuAsnVirtual)}</p>
            </div>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Alamat Lengkap</span>
            <p class="font-semibold text-slate-800 mt-1 leading-relaxed break-words">{cleanValue(profile.alamat) !== '-' ? cleanValue(profile.alamat) : 'Alamat belum tercatat dalam sistem'}</p>
          </div>
        </div>

        <!-- Section 1.2: Status Kepegawaian & Unit Kerja -->
        <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M13 16h.01M13 12h.01" />
              </svg>
            </div>
            <h3 class="text-sm sm:text-base font-bold text-slate-800">Status Kepegawaian & Penempatan</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Kedudukan Hukum</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.kedudukanHukumNama) || "Aktif"}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Jenis Pegawai</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.jenisPegawaiNama) || "PPPK"}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Jenis Jabatan</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.jenisJabatanNama)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">TMT Jabatan</span>
              <p class="font-bold text-slate-800 text-sm mt-1">{cleanValue(profile.tmtJabatan)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Golongan Ruang</span>
              <p class="font-bold text-blue-700 text-sm mt-1 break-words">
                {cleanValue(profile.golAkhirNama || profile.golAwalNama)}
                {#if profile.tmtGolongan}
                  <span class="text-[11px] text-slate-400 font-normal"> (TMT: {cleanValue(profile.tmtGolongan)})</span>
                {/if}
              </p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">
                Masa Kerja <span class="text-rose-600 font-bold">(Sampai Saat Ini)</span>
              </span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">
                {calculateMasaKerjaSampaiSaatIni(profile)}
              </p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Kantor Bayar (KPKN / KPPN)</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.kpknNama)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Lokasi Kerja</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.lokasiKerjaNama)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Instansi Induk</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.instansiIndukNama)}</p>
            </div>

            <div class="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
              <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Instansi Kerja</span>
              <p class="font-bold text-slate-800 text-sm mt-1 break-words">{cleanValue(profile.instansiKerjaNama)}</p>
            </div>
          </div>
        </div>
      </div>

    <!-- TAB 2: PENDIDIKAN -->
    {:else if activeTab === "pendidikan"}
      <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-800">Riwayat & Data Pendidikan</h3>
              <p class="text-xs text-slate-500">Pendidikan formal yang tercatat pada kualifikasi kepegawaian</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs">
          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
            <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Tingkat Pendidikan</span>
            <p class="font-bold text-slate-800 text-sm mt-1 break-words">{profile.tingkatPendidikanNama || "-"}</p>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
            <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Program Studi / Jurusan</span>
            <p class="font-bold text-slate-800 text-sm mt-1 break-words">{profile.pendidikanNama || "-"}</p>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
            <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Nama Sekolah / Perguruan Tinggi</span>
            <p class="font-bold text-slate-800 text-sm mt-1 break-words">{profile.namaSekolah || "-"}</p>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
            <span class="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block truncate">Tahun Kelulusan</span>
            <p class="font-bold text-slate-800 text-sm mt-1">{profile.tahunLulus || "-"}</p>
          </div>
        </div>
      </div>

    <!-- TAB 3: KELUARGA -->
    {:else if activeTab === "keluarga"}
      <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-800">Status Pernikahan & Keluarga</h3>
              <p class="text-xs text-slate-500">Informasi status perkawinan dan tanggungan keluarga pegawai</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs">
          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 min-w-0">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Status Pernikahan</span>
            <p class="text-base font-bold text-slate-800 break-words">{profile.jenisKawinNama || "-"}</p>
            <p class="text-[11px] text-slate-500">Tercatat dalam data kepegawaian ASN</p>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 min-w-0">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Jumlah Tanggungan / Pasangan</span>
            <p class="text-base font-bold text-blue-700">
              {profile.jenisKawinNama?.toLowerCase().includes("kawin") ? "1 Pasangan" : "0 Pasangan"}
            </p>
            <p class="text-[11px] text-slate-500">Keluarga tertanggung BPJS / Penggajian</p>
          </div>

          <div class="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 min-w-0">
            <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Kartu ASN Virtual Terdaftar</span>
            <p class="text-base font-bold text-emerald-700 break-words">{profile.kartuAsnVirtual || "Terdaftar"}</p>
            <p class="text-[11px] text-slate-500">Layanan Satu Pintu BKN</p>
          </div>
        </div>
      </div>

    <!-- TAB 4: KONTRAK -->
    {:else if activeTab === "kontrak"}
      <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-800">Riwayat Perjanjian Kerja / Kontrak</h3>
              <p class="text-xs text-slate-500">Daftar riwayat kontrak kerja yang pernah diterbitkan untuk pegawai ini</p>
            </div>
          </div>
        </div>

        {#if !profile.riwayatKontrak || profile.riwayatKontrak.length === 0}
          <div class="py-8 sm:py-12 text-center bg-slate-50/70 rounded-xl border border-slate-200 p-4 sm:p-8 space-y-2">
            <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 class="text-sm font-bold text-slate-700">Belum ada riwayat kontrak tercatat</h4>
            <p class="text-xs text-slate-400">Riwayat kontrak akan otomatis muncul setelah usulan PK diselesaikan</p>
          </div>
        {:else}
          <div class="overflow-x-auto max-w-full rounded-xl border border-slate-200 scrollbar-thin">
            <table class="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th class="py-3 px-4 text-center w-14">Ke-</th>
                  <th class="py-3 px-4">Nomor Kontrak</th>
                  <th class="py-3 px-4">Periode Masa Berlaku</th>
                  <th class="py-3 px-4">Gaji Pokok</th>
                  <th class="py-3 px-4">Golongan & MK</th>
                  <th class="py-3 px-4 text-right">Dokumen SK</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each profile.riwayatKontrak as k}
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3.5 px-4 text-center font-bold text-blue-700 bg-blue-50/40">
                      {k.kontrakKe}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-slate-800 break-all">
                      {k.nomorKontrak || "-"}
                      {#if k.keterangan}
                        <p class="text-[10px] font-sans font-normal text-slate-400 mt-0.5 break-words">{k.keterangan}</p>
                      {/if}
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="space-y-0.5">
                        <p class="font-semibold text-slate-800 whitespace-nowrap">
                          {formatDate(k.tanggalMulai)} s/d {formatDate(k.tanggalSelesai)}
                        </p>
                        <p class="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          ({k.tanggalMulai} s/d {k.tanggalSelesai})
                        </p>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(k.gajiPokok)}
                    </td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <p class="font-semibold text-slate-800">Golongan {k.golongan || "-"}</p>
                      <p class="text-[10px] text-slate-400">
                        Masa Kerja: {k.mkTahun ?? "-"} Thn {k.mkBulan ?? "-"} Bln
                      </p>
                    </td>
                    <td class="py-3.5 px-4 text-right whitespace-nowrap">
                      {#if k.arsipKontrak?.fileUrl}
                        <a
                          href={`${API_BASE_URL}${k.arsipKontrak.fileUrl}`}
                          target="_blank"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200"
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
      <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-slate-800">SK Pengangkatan & Surat Keputusan</h3>
              <p class="text-xs text-slate-500">Data penetapan pengangkatan awal dan status surat keputusan kepegawaian</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <!-- SK CPNS / Pengangkatan PPPK Card -->
          <div class="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span class="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md text-xs border border-blue-200 self-start sm:self-auto">
                SK Pengangkatan Pertama
              </span>
              <div class="flex flex-wrap items-center gap-2">
                {#if profile.arsipSkCpns?.fileUrl}
                  <a
                    href={`${API_BASE_URL}${profile.arsipSkCpns.fileUrl}`}
                    target="_blank"
                    class="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Lihat Berkas PDF
                  </a>
                {/if}
              </div>
            </div>

            <div class="space-y-2 pt-1">
              <div>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Nomor SK Pengangkatan</span>
                <p class="font-mono text-sm font-bold text-slate-800 break-all">{profile.nomorSkCpns || "-"}</p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                <div class="min-w-0">
                  <span class="text-slate-400 text-[10px] font-semibold uppercase block truncate">Tanggal Penetapan SK</span>
                  <p class="font-semibold text-slate-800 mt-0.5 break-words">{profile.tanggalSkCpns || "-"}</p>
                </div>
                <div class="min-w-0">
                  <span class="text-slate-400 text-[10px] font-semibold uppercase block truncate">TMT CPNS / PPPK</span>
                  <p class="font-semibold text-slate-800 mt-0.5 break-words">{profile.tmtCpns || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Pertek BKN Card -->
          <div class="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span class="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded-md text-xs border border-indigo-200 self-start sm:self-auto">
                Pertek BKN
              </span>
              {#if profile.tmtPns || profile.tmtJabatan}
                <span class="text-xs font-semibold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 self-start sm:self-auto">
                  TMT: {profile.tmtPns || profile.tmtJabatan}
                </span>
              {/if}
            </div>

            <div class="space-y-2 pt-1">
              <div>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Nomor Pertek BKN</span>
                <p class="font-mono text-sm font-bold text-slate-800 break-all">{profile.nomorSkPns || "-"}</p>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                <div class="min-w-0">
                  <span class="text-slate-400 text-[10px] font-semibold uppercase block truncate">Tanggal Pertek BKN</span>
                  <p class="font-semibold text-slate-800 mt-0.5 break-words">{profile.tanggalSkPns || "-"}</p>
                </div>
                <div class="min-w-0">
                  <span class="text-slate-400 text-[10px] font-semibold uppercase block truncate">TMT Pertek BKN</span>
                  <p class="font-semibold text-slate-800 mt-0.5 break-words">{profile.tmtPns || profile.tmtJabatan || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {#if profile.arsipSkPensiun}
          <!-- SK Pensiun Card (If applicable) -->
          <div class="p-4 sm:p-5 rounded-xl bg-rose-50 border border-rose-200 space-y-2.5 min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span class="px-2.5 py-0.5 bg-rose-600 text-white font-semibold rounded-md text-xs self-start sm:self-auto">
                SK Pensiun Diterbitkan
              </span>
              {#if profile.arsipSkPensiun.fileUrl}
                <a
                  href={`${API_BASE_URL}${profile.arsipSkPensiun.fileUrl}`}
                  target="_blank"
                  class="px-3 py-1 bg-white hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 flex items-center gap-1 transition-colors self-start sm:self-auto"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Lihat Berkas SK Pensiun
                </a>
              {/if}
            </div>
            <p class="text-xs text-rose-800 break-words">
              Nomor SK: <b class="font-mono break-all">{profile.arsipSkPensiun.nomorSk}</b>
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
    <div class="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4">
      <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      <div class="space-y-1.5">
        <h3 class="text-lg font-bold text-slate-800">Cari dan Buka Profil Pegawai</h3>
        <p class="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Gunakan kolom pencarian di atas untuk memasukkan NIP Baru atau Nama Pegawai. Anda dapat melihat riwayat lengkap pegawai dari data utama hingga SK pengangkatan.
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .btn-secondary {
    @apply inline-flex items-center justify-center px-4 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm active:scale-95;
  }
</style>
