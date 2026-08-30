<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let records = [];
  let isLoading = true;
  let isSyncing = false;
  let lastImportTime = null;
  let searchTerm = "";
  let filterUnitKerja = "";
  let filterTanggalSkCpns = "";
  let showFilters = false;
  let meta = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  };

  let selectedRecord = null;
  let showModal = false;

  $: hasActiveFilters = searchTerm || filterUnitKerja || filterTanggalSkCpns;

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

  const RETIREMENT_AGE = 58;

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

    // Calculate time difference
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
      const prevMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        0,
      );
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

  const openDetailModal = (record) => {
    selectedRecord = record;
    showModal = true;
  };

  const closeModal = () => {
    showModal = false;
    selectedRecord = null;
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchData();
    fetchLastImportTime();
  });

  const formatDateTime = (isoStr) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchLastImportTime = async () => {
    try {
      const result = await apiRequest("/api/v1/p3k-csv-import/last-import-time");
      lastImportTime = result.data.lastImportTime;
    } catch (error) {
      console.error("Fetch last import time error:", error);
    }
  };

  const fetchData = async (page = 1) => {
    isLoading = true;
    try {
      const queryParams = new URLSearchParams({
        page: page,
        limit: meta.limit,
      });
      if (searchTerm) queryParams.append("search", searchTerm);
      if (filterUnitKerja) queryParams.append("unitKerja", filterUnitKerja);
      if (filterTanggalSkCpns)
        queryParams.append("tanggalSkCpns", filterTanggalSkCpns);

      const result = await apiRequest(`/api/v1/p3k-csv-import?${queryParams.toString()}`);
      records = result.data;
      meta = result.meta;
    } catch (error) {
      console.error("Fetch data error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    meta.page = 1;
    fetchData();
  };

  const resetFilters = () => {
    searchTerm = "";
    filterUnitKerja = "";
    filterTanggalSkCpns = "";
    meta.page = 1;
    fetchData();
  };

  const syncData = async () => {
    const confirmSync = confirm(
      "Apakah Anda yakin ingin memasukkan data hasil import ke Data Utama P3K? Sistem hanya akan memproses pegawai baru yang belum terdaftar.",
    );
    if (!confirmSync) return;

    isSyncing = true;
    addToast("Sedang memasukkan data ke Data Utama P3K...", "info");

    try {
      const result = await apiRequest("/api/v1/data-p3k/sync", "POST");
      
      const count = result.data?.syncedCount || 0;
      if (count > 0) {
        addToast(
          `🚀 Berhasil! ${count} data pegawai baru telah dimasukkan ke Data Utama P3K.`,
          "success",
        );
      } else {
        addToast(
          "Informasi: Semua data sudah tersimpan di Data Utama P3K.",
          "success",
        );
      }
      // Refresh local data to ensure sync indicators (if any) are updated
      fetchData(meta.page);
    } catch (error) {
      console.error("Sync error:", error);
      addToast("Terjadi kesalahan saat memproses data ke Data Utama", "error");
    } finally {
      isSyncing = false;
    }
  };
</script>

<svelte:head>
  <title>Data P3K Import — App P3K</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div
    class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
  >
    <div>
      <h1 class="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
        Data P3K Import
      </h1>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">
        Daftar data hasil import CSV dari SIASN sebelum dimasukkan ke Data Utama P3K
      </p>
      {#if lastImportTime}
        <p
          class="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-sans"
        >
          <svg
            class="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            /></svg
          >
          Terakhir diimpor:
          <span class="font-medium text-slate-500"
            >{formatDateTime(lastImportTime)}</span
          >
        </p>
      {/if}
    </div>
    <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
      <button
        on:click={syncData}
        disabled={isSyncing}
        class="btn-primary gap-1.5 !bg-gradient-to-r !from-indigo-600 !to-blue-600 hover:!from-indigo-700 hover:!to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 font-bold text-xs sm:text-sm py-2.5 px-4"
        title="Masukkan data baru hasil import ke Data Utama P3K"
      >
        {#if isSyncing}
          <div
            class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></div>
          Menyimpan ke Data Utama...
        {:else}
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            /></svg
          >
          Simpan ke Data Utama
        {/if}
      </button>

      <a href="/statistik-p3k" class="btn-secondary gap-1.5">
        <svg
          class="w-4 h-4"
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
        Statistik
      </a>
      <button
        on:click={() => (showFilters = !showFilters)}
        class="btn-secondary gap-1.5"
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
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          /></svg
        >
        Filter
        {#if hasActiveFilters}
          <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        {/if}
      </button>
      <button
        on:click={() => fetchData(meta.page)}
        class="btn-secondary gap-1.5"
        aria-label="Refresh data"
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
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          /></svg
        >
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>
  </div>

  <!-- Filter Panel -->
  {#if showFilters}
    <div class="card p-4 sm:p-5">
      <form
        on:submit={handleSearch}
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div>
          <label
            for="search"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Cari Nama / NIP</label
          >
          <input
            id="search"
            type="text"
            bind:value={searchTerm}
            placeholder="Ketik nama atau NIP..."
            class="input-field"
          />
        </div>
        <div>
          <label
            for="unitKerja"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Unit Kerja</label
          >
          <input
            id="unitKerja"
            type="text"
            bind:value={filterUnitKerja}
            placeholder="Nama unit kerja..."
            class="input-field"
          />
        </div>
        <div>
          <label
            for="tglSkCpns"
            class="block text-xs font-medium text-slate-500 mb-1.5"
            >Tanggal SK CPNS</label
          >
          <input
            id="tglSkCpns"
            type="text"
            bind:value={filterTanggalSkCpns}
            placeholder="DD-MM-YYYY"
            class="input-field"
          />
        </div>
        <div class="flex items-end gap-2">
          <button type="submit" class="btn-primary flex-1">
            <svg
              class="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              /></svg
            >
            Cari
          </button>
          {#if hasActiveFilters}
            <button
              type="button"
              on:click={resetFilters}
              class="btn-secondary !text-red-500 !border-red-200 hover:!bg-red-50 flex-shrink-0"
              title="Reset semua filter"
              aria-label="Reset filter"
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
                  d="M6 18L18 6M6 6l12 12"
                /></svg
              >
            </button>
          {/if}
        </div>
      </form>
    </div>
  {/if}

  <!-- Data Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >No</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >NIP Baru</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Nama</th
            >
            <th
              scope="col"
              class="hidden md:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Pendidikan</th
            >
            <th
              scope="col"
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Tanggal Lahir</th
            >
            <th
              scope="col"
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Unit Kerja</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Aksi</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr>
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span class="text-sm text-slate-400">Memuat data...</span>
                </div>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center"
                  >
                    <svg
                      class="w-6 h-6 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      /></svg
                    >
                  </div>
                  <span class="text-sm text-slate-400"
                    >Tidak ada data tersedia.</span
                  >
                  {#if hasActiveFilters}
                    <button
                      on:click={resetFilters}
                      class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >Hapus filter</button
                    >
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            {#each records as record, i}
              <tr class="hover:bg-blue-50/30 transition-colors">
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-600 font-mono"
                  >{record.nipBaru || "-"}</td
                >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div class="text-sm font-semibold text-slate-800">
                      {record.nama}{record.gelarBelakang
                        ? ", " + record.gelarBelakang
                        : ""}
                    </div>
                    {#if record.isSynced}
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-tight"
                        title="Data ini sudah tersimpan di Data Utama P3K"
                      >
                        <svg
                          class="w-2.5 h-2.5 mr-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        Synced
                      </span>
                    {/if}
                  </div>
                  <div class="text-xs text-slate-400 md:hidden mt-0.5">
                    {record.pendidikanNama || "-"}
                  </div>
                </td>
                <td
                  class="hidden md:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500"
                  >{record.pendidikanNama || "-"}</td
                >
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500"
                  >{record.tanggalLahir || "-"}</td
                >
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-sm text-slate-500 max-w-[200px] truncate"
                  >{record.unorNama || record.lokasiKerjaNama || "-"}</td
                >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-right">
                  <button
                    on:click={() => openDetailModal(record)}
                    class="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all duration-200"
                  >
                    <svg
                      class="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      /><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      /></svg
                    >
                    Detail
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if meta.totalPages > 1}
      <div
        class="border-t border-slate-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <p class="text-sm text-slate-500">
          Menampilkan <span class="font-medium text-slate-700"
            >{(meta.page - 1) * meta.limit + 1}</span
          >
          –
          <span class="font-medium text-slate-700"
            >{Math.min(meta.page * meta.limit, meta.total)}</span
          >
          dari <span class="font-medium text-slate-700">{meta.total}</span>
        </p>
        <div class="flex items-center gap-1">
          <button
            disabled={meta.page === 1}
            on:click={() => fetchData(meta.page - 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <span class="text-sm font-medium text-slate-600 px-3"
            >{meta.page} / {meta.totalPages}</span
          >
          <button
            disabled={meta.page === meta.totalPages}
            on:click={() => fetchData(meta.page + 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
  </div>
</div>

<!-- Detail Modal -->
{#if showModal && selectedRecord}
  <div
    class="fixed z-50 inset-0 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity w-full h-full border-none cursor-default"
        on:click={closeModal}
        aria-label="Tutup modal"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 z-10"
      >
        <div class="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20"
          >
            <svg
              class="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-800">Detail Pegawai</h3>
            <p class="text-sm text-slate-400">Informasi profil PPPK</p>
          </div>
          <button
            on:click={closeModal}
            class="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup detail"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              /></svg
            >
          </button>
        </div>

        <div class="mt-5">
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                NIP Baru
              </dt>
              <dd class="mt-1.5 text-sm text-slate-800 font-semibold font-mono">
                {selectedRecord.nipBaru || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Nama
              </dt>
              <dd class="mt-1.5 text-sm text-slate-800 font-semibold">
                {selectedRecord.nama || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Gelar Depan
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.gelarDepan || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Gelar Belakang
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.gelarBelakang || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Tanggal Lahir
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.tanggalLahir || "-"}
              </dd>
            </div>
            <div
              class="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
            >
              <dt
                class="text-xs font-medium text-blue-500 uppercase tracking-wide"
              >
                Usia
              </dt>
              <dd class="mt-1.5 text-sm text-blue-700 font-semibold">
                {calculateAge(selectedRecord.tanggalLahir)}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Pendidikan
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.pendidikanNama || "-"}
              </dd>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <dt
                class="text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                Unit Kerja
              </dt>
              <dd class="mt-1.5 text-sm text-slate-700">
                {selectedRecord.unorNama ||
                  selectedRecord.lokasiKerjaNama ||
                  "-"}
              </dd>
            </div>
            {#if calculateRetirement(selectedRecord.tanggalLahir)}
              {#if calculateRetirement(selectedRecord.tanggalLahir).isPast}
                <div
                  class="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 sm:col-span-2"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm flex-shrink-0"
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        /></svg
                      >
                    </div>
                    <div class="flex-1">
                      <dt
                        class="text-xs font-medium text-red-500 uppercase tracking-wide"
                      >
                        Status Pensiun
                      </dt>
                      <dd class="mt-1 text-sm text-red-700 font-semibold">
                        Sudah memasuki masa pensiun
                      </dd>
                      <dd class="text-xs text-red-400 mt-0.5">
                        TMT Pensiun: {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).date} — {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).remaining} yang lalu
                      </dd>
                    </div>
                  </div>
                </div>
              {:else}
                <div
                  class="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 sm:col-span-2"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0"
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        /></svg
                      >
                    </div>
                    <div class="flex-1">
                      <dt
                        class="text-xs font-medium text-emerald-500 uppercase tracking-wide"
                      >
                        Waktu Pensiun
                      </dt>
                      <dd class="mt-1 text-sm text-emerald-700 font-semibold">
                        Sisa {calculateRetirement(selectedRecord.tanggalLahir)
                          .remaining} lagi
                      </dd>
                      <dd class="text-xs text-emerald-400 mt-0.5">
                        TMT Pensiun: {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).date} (Tahun {calculateRetirement(
                          selectedRecord.tanggalLahir,
                        ).retirementYear})
                      </dd>
                    </div>
                  </div>
                </div>
              {/if}
            {/if}
          </dl>
        </div>

        <div class="mt-6 flex justify-end">
          <button type="button" on:click={closeModal} class="btn-secondary"
            >Tutup</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}
