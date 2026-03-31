<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import * as XLSX from "xlsx";

  const RETIREMENT_AGE = 58;
  const currentYear = new Date().getFullYear();

  let selectedYear = currentYear;
  let records = [];
  let byUnitKerja = [];
  let projections = [];
  let isLoading = false;
  let isExporting = false;
  let searchTerm = "";
  let meta = {
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    year: currentYear,
    birthYear: currentYear - RETIREMENT_AGE,
  };

  let showDistribution = false;
  let showProjection = false;

  // Generate year options: 5 years back to 10 years forward
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 10; y++) {
    yearOptions.push(y);
  }

  $: birthYear = selectedYear - RETIREMENT_AGE;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchReport();
  });

  const fetchReport = async (page = 1) => {
    isLoading = true;
    try {
      const queryParams = new URLSearchParams({
        year: selectedYear,
        page: page,
        limit: meta.limit,
      });
      if (searchTerm) queryParams.append("search", searchTerm);

      const result = await apiRequest(`/api/v1/data-p3k/retirement?${queryParams.toString()}`, "GET");
      if (result.success) {
        records = result.data;
        byUnitKerja = result.byUnitKerja || [];
        projections = result.projections || [];
        meta = result.meta;
      } else {
        addToast(result.message || "Gagal memuat data", "error");
      }
    } catch (error) {
      console.error("Fetch retirement error:", error);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isLoading = false;
    }
  };

  const handleYearChange = () => {
    meta.page = 1;
    searchTerm = "";
    fetchReport();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    meta.page = 1;
    fetchReport();
  };

  const resetSearch = () => {
    searchTerm = "";
    meta.page = 1;
    fetchReport();
  };

  function getMaxCount(data) {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d) => d.count));
  }

  function calculateAge(birthDateStr) {
    if (!birthDateStr) return { text: "-", years: 0 };
    const parts = birthDateStr.split("-");
    if (parts.length !== 3) return { text: "-", years: 0 };

    const bDay = parseInt(parts[0]);
    const bMonth = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const bYear = parseInt(parts[2]);
    const birthDate = new Date(bYear, bMonth, bDay);

    if (isNaN(birthDate.getTime())) return { text: "-", years: 0 };

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

    return {
      text: `${years} thn, ${months} bln, ${days} hari`,
      years,
      months,
      days,
    };
  }

  function getAgeBadgeClass(birthDateStr) {
    const age = calculateAge(birthDateStr);
    if (age.years >= RETIREMENT_AGE) {
      return "bg-red-50 text-red-600 border border-red-100";
    }
    return "bg-amber-50 text-amber-600 border border-amber-100";
  }

  function getRetirementDate(birthDateStr) {
    if (!birthDateStr) return "-";
    const parts = birthDateStr.split("-");
    if (parts.length !== 3) return "-";
    const bDay = parts[0];
    const bMonth = parts[1];
    const bYear = parseInt(parts[2]);
    return `${bDay}-${bMonth}-${bYear + RETIREMENT_AGE}`;
  }

  const exportToExcel = async () => {
    isExporting = true;
    try {
      // Fetch ALL data (no pagination limit)
      const queryParams = new URLSearchParams({
        year: selectedYear,
        page: 1,
        limit: 10000,
      });

      const result = await apiRequest(`/api/v1/data-p3k/retirement?${queryParams.toString()}`, "GET");

      if (!result.success) {
        addToast(
          result.message || "Gagal mengambil data untuk export",
          "error",
        );
        return;
      }

      const allRecords = result.data;

      if (allRecords.length === 0) {
        addToast("Tidak ada data untuk diexport", "warning");
        return;
      }

      // Map to clean data for Excel
      const excelData = allRecords.map((record, idx) => {
        const age = calculateAge(record.tanggalLahir);
        const namaLengkap = [
          record.gelarDepan && record.gelarDepan !== "-"
            ? record.gelarDepan
            : "",
          record.nama,
          record.gelarBelakang && record.gelarBelakang !== "-"
            ? record.gelarBelakang
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        return {
          No: idx + 1,
          "NIP Baru": record.nipBaru || "-",
          "Nama Lengkap": namaLengkap,
          "Jenis Kelamin":
            record.jenisKelamin === "M" ? "Laki-laki" : "Perempuan",
          "Tanggal Lahir": record.tanggalLahir || "-",
          Usia: age.text,
          "TMT Pensiun": getRetirementDate(record.tanggalLahir),
          Pendidikan: record.pendidikanNama || "-",
          Jabatan: record.jabatanNama || "-",
          Golongan: record.golAkhirNama || "-",
          "Unit Kerja": record.unorInduk?.nama || record.unorNama || record.lokasiKerjaNama || "-",
        };
      });

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-fit column widths
      const colWidths = Object.keys(excelData[0]).map((key) => {
        const maxLen = Math.max(
          key.length,
          ...excelData.map((row) => String(row[key] || "").length),
        );
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Pensiun ${selectedYear}`);

      // Download
      const fileName = `Laporan_Pensiun_${selectedYear}_Kelahiran_${birthYear}.xlsx`;
      XLSX.writeFile(wb, fileName);

      addToast(
        `Berhasil export ${allRecords.length} data ke ${fileName}`,
        "success",
      );
    } catch (error) {
      console.error("Export error:", error);
      addToast("Gagal mengexport data", "error");
    } finally {
      isExporting = false;
    }
  };
</script>

<svelte:head>
  <title>Estimasi Pensiun — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Estimasi Usia Pensiun</h1>
      <p class="mt-1 text-sm text-slate-500">
        Daftar estimasi PPPK yang memasuki batas usia pensiun ({RETIREMENT_AGE}
        tahun).
      </p>
    </div>
    <div class="flex items-center gap-2 self-start">
      <button
        on:click={exportToExcel}
        disabled={isExporting || meta.total === 0}
        class="btn-primary gap-1.5 !bg-gradient-to-r !from-emerald-600 !to-teal-600 hover:!from-emerald-700 hover:!to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isExporting}
          <div
            class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></div>
          Mengekspor...
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            /></svg
          >
          Export Excel
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
    </div>
  </div>

  <!-- Projection Toggle -->
  <div class="flex items-center justify-end gap-3 px-1">
    <span class="text-xs font-semibold {showProjection ? 'text-indigo-600' : 'text-slate-400'} uppercase tracking-wider transition-colors">
      Tampilkan Proyeksi 5 Tahun
    </span>
    <button 
      on:click={() => showProjection = !showProjection}
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 {showProjection ? 'bg-indigo-600' : 'bg-slate-200'}"
      aria-pressed={showProjection}
      aria-label="Toggle Proyeksi 5 Tahun"
    >
      <span
        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {showProjection ? 'translate-x-6' : 'translate-x-1'}"
      ></span>
    </button>
  </div>

  <!-- Year Selector & Info Cards -->
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
    <!-- Year Picker Card -->
    <div class="card p-5 lg:col-span-1">
      <label
        for="yearSelect"
        class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2"
        >Pilih Tahun Pensiun</label
      >
      <select
        id="yearSelect"
        bind:value={selectedYear}
        on:change={handleYearChange}
        class="input-field text-lg font-bold text-slate-800"
      >
        {#each yearOptions as year}
          <option value={year} selected={year === currentYear}>{year}</option>
        {/each}
      </select>
      <p class="mt-2 text-xs text-slate-400">
        Kelahiran tahun <span class="font-bold text-slate-600">{birthYear}</span
        >
      </p>
    </div>

    <!-- Total Pensiun -->
    <div class="card p-5 relative overflow-hidden">
      <div
        class="absolute top-0 right-0 w-20 h-20 transform translate-x-6 -translate-y-6 rounded-full bg-red-100/40"
      ></div>
      <div class="relative">
        <div class="flex items-center gap-2 mb-2">
          <div
            class="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm"
          >
            <svg
              class="w-4.5 h-4.5 text-white"
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
          <p
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            Pensiun {selectedYear}
          </p>
        </div>
        {#if isLoading}
          <div class="h-9 w-16 bg-slate-200 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-red-600">{meta.total}</p>
          <p class="text-xs text-slate-400 mt-0.5">pegawai</p>
        {/if}
      </div>
    </div>

    <!-- Birth Year Info -->
    <div class="card p-5 relative overflow-hidden">
      <div
        class="absolute top-0 right-0 w-20 h-20 transform translate-x-6 -translate-y-6 rounded-full bg-blue-100/40"
      ></div>
      <div class="relative">
        <div class="flex items-center gap-2 mb-2">
          <div
            class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm"
          >
            <svg
              class="w-4.5 h-4.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              /></svg
            >
          </div>
          <p
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            Tahun Lahir
          </p>
        </div>
        <p class="text-3xl font-extrabold text-blue-600">{birthYear}</p>
        <p class="text-xs text-slate-400 mt-0.5">
          usia {RETIREMENT_AGE} thn di {selectedYear}
        </p>
      </div>
    </div>

    <!-- Unit Kerja Count -->
    <div class="card p-5 relative overflow-hidden">
      <div
        class="absolute top-0 right-0 w-20 h-20 transform translate-x-6 -translate-y-6 rounded-full bg-amber-100/40"
      ></div>
      <div class="relative">
        <div class="flex items-center gap-2 mb-2">
          <div
            class="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm"
          >
            <svg
              class="w-4.5 h-4.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              /></svg
            >
          </div>
          <p
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider"
          >
            Unit Kerja
          </p>
        </div>
        {#if isLoading}
          <div class="h-9 w-12 bg-slate-200 rounded-lg animate-pulse"></div>
        {:else}
          <p class="text-3xl font-extrabold text-amber-600">
            {byUnitKerja.length}
          </p>
          <p class="text-xs text-slate-400 mt-0.5">unit terdampak</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Retirement Projection Chart (5 Years Ahead) -->
  {#if showProjection}
    <div class="card p-5 sm:p-6 transition-all duration-500">
      <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-tight">Proyeksi Pensiun 5 Tahun Ke Depan</h3>
          <p class="text-xs text-slate-400">Estimasi jumlah pegawai pensiun hingga tahun {currentYear + 4}</p>
        </div>
      </div>
    </div>

    {#if isLoading}
      <div class="flex items-end justify-between h-48 gap-4 px-2">
        {#each [1, 2, 3, 4, 5] as _}
          <div class="flex-1 bg-slate-100 rounded-t-lg animate-pulse" style="height: {Math.random() * 80 + 20}%"></div>
        {/each}
      </div>
    {:else if projections.length > 0}
      <div class="space-y-6">
        <div class="flex items-end justify-between h-48 gap-3 sm:gap-6 px-2 border-b border-slate-100">
          {#each projections as projection}
            {@const maxCount = Math.max(...projections.map(p => p.count), 1)}
            {@const heightPct = (projection.count / maxCount) * 100}
            <div class="flex-1 flex flex-col items-center group relative h-full justify-end">
              <!-- Tooltip -->
              <div class="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-800 text-white text-[10px] sm:text-xs font-bold py-1.5 px-3 rounded shadow-xl whitespace-nowrap z-10">
                {projection.count} Pegawai
                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
              </div>
              
              <div 
                class="w-full max-w-[60px] rounded-t-xl bg-gradient-to-t {projection.year === selectedYear ? 'from-red-500 to-rose-400' : 'from-indigo-500 to-blue-400'} 
                       hover:shadow-lg hover:brightness-110 transition-all duration-500 ease-out overflow-hidden relative cursor-pointer"
                style="height: {heightPct}%"
                on:click={() => {
                  selectedYear = projection.year;
                  handleYearChange();
                }}
              >
                <!-- Shine effect -->
                <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
              <div class="mt-3 text-[10px] sm:text-xs font-bold {projection.year === selectedYear ? 'text-red-600' : 'text-slate-500'} uppercase tracking-wider">{projection.year}</div>
            </div>
          {/each}
        </div>
        
        <!-- Legend & Stats -->
        <div class="flex flex-wrap items-center justify-center gap-6 pt-2">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded bg-red-500"></div>
            <span class="text-[10px] font-bold text-slate-500 uppercase">Tahun Terpilih</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded bg-indigo-500"></div>
            <span class="text-[10px] font-bold text-slate-500 uppercase">Tahun Lainnya</span>
          </div>
          <div class="ml-auto flex gap-4">
             <div class="text-center">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Total 5 Thn</div>
                <div class="text-sm font-bold text-slate-800">{projections.reduce((acc, p) => acc + p.count, 0)}</div>
             </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="py-12 text-center text-slate-400 text-sm italic">Data proyeksi tidak tersedia</div>
    {/if}
  </div>
{/if}

  <!-- Distribution by Unit Kerja (collapsible) -->
  {#if byUnitKerja.length > 0}
    <div class="card overflow-hidden">
      <button
        on:click={() => (showDistribution = !showDistribution)}
        class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-amber-500"
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
          <span class="text-sm font-semibold text-slate-700"
            >Distribusi per Unit Kerja</span
          >
          <span
            class="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600"
            >{byUnitKerja.length} unit</span
          >
        </div>
        <svg
          class="w-4 h-4 text-slate-400 transition-transform {showDistribution
            ? 'rotate-180'
            : ''}"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          /></svg
        >
      </button>

      {#if showDistribution}
        <div class="px-5 pb-5 border-t border-slate-100 pt-4">
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 max-h-[400px] overflow-y-auto pr-2"
          >
            {#each byUnitKerja as item, idx}
              {@const maxCount = getMaxCount(byUnitKerja)}
              {@const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0}
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span
                    class="text-xs text-slate-600 truncate max-w-[75%]"
                    title={item.label}
                  >
                    <span class="text-slate-400 font-mono mr-1"
                      >{String(idx + 1).padStart(2, "0")}</span
                    >
                    {item.label}
                  </span>
                  <span
                    class="text-xs font-bold text-slate-700 flex-shrink-0 ml-2"
                    >{item.count}</span
                  >
                </div>
                <div
                  class="w-full h-2 bg-amber-50 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style="width: {pct}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Search Bar -->
  <div class="card p-4">
    <form on:submit={handleSearch} class="flex gap-2">
      <div class="flex-1">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Cari berdasarkan nama, NIP, atau unit kerja..."
          class="input-field"
        />
      </div>
      <button type="submit" class="btn-primary">
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
      {#if searchTerm}
        <button
          type="button"
          on:click={resetSearch}
          class="btn-secondary !text-red-500 !border-red-200 hover:!bg-red-50"
          aria-label="Reset pencarian"
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
    </form>
  </div>

  <!-- Data Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th
              scope="col"
              class="px-4 sm:px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >No</th
            >
            <th
              scope="col"
              class="px-4 sm:px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >NIP Baru</th
            >
            <th
              scope="col"
              class="px-4 sm:px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Nama</th
            >
            <th
              scope="col"
              class="hidden md:table-cell px-4 sm:px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Tgl Lahir</th
            >
            <th
              scope="col"
              class="hidden md:table-cell px-4 sm:px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Usia</th
            >
            <th
              scope="col"
              class="hidden md:table-cell px-4 sm:px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >TMT Pensiun</th
            >
            <th
              scope="col"
              class="hidden lg:table-cell px-4 sm:px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Jabatan</th
            >
            <th
              scope="col"
              class="hidden xl:table-cell px-4 sm:px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Unit Kerja</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr>
              <td colspan="8" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-8 h-8 border-[3px] border-red-500 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span class="text-sm text-slate-400"
                    >Memuat data pensiun...</span
                  >
                </div>
              </td>
            </tr>
          {:else if records.length === 0}
            <tr>
              <td colspan="8" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-7 h-7 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      /></svg
                    >
                  </div>
                  <div>
                    <span class="text-sm font-medium text-slate-600"
                      >Tidak ada pegawai yang pensiun di tahun {selectedYear}</span
                    >
                    <p class="text-xs text-slate-400 mt-1">
                      Tidak ditemukan pegawai kelahiran {birthYear}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          {:else}
            {#each records as record, i}
              <tr class="hover:bg-red-50/30 transition-colors">
                <td
                  class="px-4 sm:px-5 py-3 whitespace-nowrap text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td
                  class="px-4 sm:px-5 py-3 whitespace-nowrap text-sm text-slate-600 font-mono"
                  >{record.nipBaru || "-"}</td
                >
                <td class="px-4 sm:px-5 py-3 whitespace-nowrap">
                  <div class="text-sm font-semibold text-slate-800">
                    {record.gelarDepan && record.gelarDepan !== "-"
                      ? record.gelarDepan + " "
                      : ""}{record.nama}{record.gelarBelakang &&
                    record.gelarBelakang !== "-"
                      ? ", " + record.gelarBelakang
                      : ""}
                  </div>
                  <div class="text-xs text-slate-400 md:hidden mt-0.5">
                    {record.tanggalLahir || "-"}
                  </div>
                </td>
                <td
                  class="hidden md:table-cell px-4 sm:px-5 py-3 whitespace-nowrap text-sm text-slate-500"
                  >{record.tanggalLahir || "-"}</td
                >
                <td
                  class="hidden md:table-cell px-4 sm:px-5 py-3 whitespace-nowrap"
                >
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold {getAgeBadgeClass(
                      record.tanggalLahir,
                    )}"
                  >
                    {calculateAge(record.tanggalLahir).text}
                  </span>
                </td>
                <td
                  class="hidden md:table-cell px-4 sm:px-5 py-3 whitespace-nowrap text-sm font-semibold text-red-600"
                  >{getRetirementDate(record.tanggalLahir)}</td
                >
                <td
                  class="hidden lg:table-cell px-4 sm:px-5 py-3 text-sm text-slate-500 max-w-[200px] truncate"
                  title={record.jabatanNama || "-"}
                  >{record.jabatanNama || "-"}</td
                >
                <td
                  class="hidden xl:table-cell px-4 sm:px-5 py-3 text-sm text-slate-500 max-w-[250px] truncate"
                  title={record.unorInduk?.nama || record.unorNama || record.lokasiKerjaNama || "-"}
                  >{record.unorInduk?.nama || record.unorNama || record.lokasiKerjaNama || "-"}</td
                >
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
          dari
          <span class="font-medium text-red-600 font-bold">{meta.total}</span> pegawai
          pensiun
        </p>
        <div class="flex items-center gap-1">
          <button
            disabled={meta.page === 1}
            on:click={() => fetchReport(meta.page - 1)}
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
            on:click={() => fetchReport(meta.page + 1)}
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
