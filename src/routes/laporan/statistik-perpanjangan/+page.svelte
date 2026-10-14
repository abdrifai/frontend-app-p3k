<script>
  import { addToast } from "$lib/toastStore";
  import { authStore, isUserAdmin } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  // Tab State: "rekap" | "detail"
  let activeTab = "rekap";

  // Pemisahan Kategori: "PENUH_WAKTU" (default) | "PARUH_WAKTU" | "ALL"
  let activeKategori = "PENUH_WAKTU";

  // Loading States
  let isLoadingStats = true;
  let isLoadingDetail = false;

  // Stats Data
  let statsData = {
    summary: {
      totalPegawai: 0,
      totalAktif: 0,
      totalTidakDiperpanjang: 0,
      totalAngkatan: 0,
      persentaseAktif: 0,
      persentaseTidakDiperpanjang: 0,
      penuhWaktu: { totalPegawai: 0, totalAktif: 0, totalTidakDiperpanjang: 0, persentaseAktif: 0, persentaseTidakDiperpanjang: 0, totalAngkatan: 0 },
      paruhWaktu: { totalPegawai: 0, totalAktif: 0, totalTidakDiperpanjang: 0, persentaseAktif: 0, persentaseTidakDiperpanjang: 0, totalAngkatan: 0 },
      gabungan: { totalPegawai: 0, totalAktif: 0, totalTidakDiperpanjang: 0, persentaseAktif: 0, persentaseTidakDiperpanjang: 0, totalAngkatan: 0 }
    },
    penuhWaktu: { summary: {}, byAngkatan: [], byJenisPemberhentian: [] },
    paruhWaktu: { summary: {}, byAngkatan: [], byJenisPemberhentian: [] },
    byAngkatan: [],
    byJenisPemberhentian: []
  };

  // Detail Tab Filters & State
  let filterTmt = "";
  let filterStatus = "ALL";
  let searchTerm = "";
  let searchDebounceTimer = null;
  let detailRecords = [];
  let meta = { page: 1, limit: 25, total: 0, totalPages: 1 };
  const limitOptions = [10, 25, 50, 100];

  $: isAdmin = isUserAdmin($authStore.user);

  // Active dataset according to activeKategori
  $: currentSummary = activeKategori === "PENUH_WAKTU"
    ? (statsData.penuhWaktu?.summary || statsData.summary)
    : activeKategori === "PARUH_WAKTU"
    ? (statsData.paruhWaktu?.summary || statsData.summary)
    : statsData.summary;

  $: currentAngkatanList = activeKategori === "PENUH_WAKTU"
    ? (statsData.penuhWaktu?.byAngkatan || [])
    : activeKategori === "PARUH_WAKTU"
    ? (statsData.paruhWaktu?.byAngkatan || [])
    : (statsData.byAngkatan || []);

  $: currentJenisPensiunList = activeKategori === "PENUH_WAKTU"
    ? (statsData.penuhWaktu?.byJenisPemberhentian || [])
    : activeKategori === "PARUH_WAKTU"
    ? (statsData.paruhWaktu?.byJenisPemberhentian || [])
    : (statsData.byJenisPemberhentian || []);

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login terlebih dahulu", "error");
      goto("/login");
      return;
    }
    await loadStatistics();
  });

  const loadStatistics = async () => {
    isLoadingStats = true;
    try {
      const res = await apiRequest(`/api/v1/perpanjangan/statistik-pk?kategori=${activeKategori}`, "GET");
      if (res.success && res.data) {
        statsData = res.data;
      } else {
        addToast(res.message || "Gagal memuat statistik", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memuat statistik perpanjangan PK", "error");
    } finally {
      isLoadingStats = false;
    }
  };

  const loadDetail = async (page = 1) => {
    isLoadingDetail = true;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(meta.limit),
        kategori: activeKategori
      });

      if (filterTmt) params.set("tmtCpns", filterTmt);
      if (filterStatus && filterStatus !== "ALL") params.set("status", filterStatus);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await apiRequest(`/api/v1/perpanjangan/statistik-pk/detail?${params.toString()}`, "GET");
      if (res.success && res.data) {
        detailRecords = res.data;
        meta = res.meta || { page, limit: meta.limit, total: res.data.length, totalPages: 1 };
      } else {
        addToast(res.message || "Gagal memuat detail pegawai", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memuat data pegawai", "error");
    } finally {
      isLoadingDetail = false;
    }
  };

  const handleKategoriChange = async (kat) => {
    if (activeKategori === kat) return;
    activeKategori = kat;
    filterTmt = ""; // reset TMT filter since cohorts differ between full/part time
    await loadStatistics();
    if (activeTab === "detail") {
      meta.page = 1;
      await loadDetail(1);
    }
  };

  const switchTab = (tab) => {
    activeTab = tab;
    if (tab === "detail" && detailRecords.length === 0) {
      loadDetail(1);
    }
  };

  const filterByAngkatanFromRekap = (angkatanKey, kat = activeKategori) => {
    activeKategori = kat === "ALL" ? activeKategori : kat;
    filterTmt = angkatanKey === "NO_TMT" ? "NO_TMT" : angkatanKey;
    filterStatus = "ALL";
    activeTab = "detail";
    meta.page = 1;
    loadDetail(1);
  };

  const filterByPensiunFromRekap = (kat = activeKategori) => {
    activeKategori = kat;
    filterTmt = "";
    filterStatus = "PENSIUN";
    activeTab = "detail";
    meta.page = 1;
    loadDetail(1);
  };

  const handleSearchInput = () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      meta.page = 1;
      loadDetail(1);
    }, 400);
  };

  const handleFilterChange = () => {
    meta.page = 1;
    loadDetail(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      meta.page = newPage;
      loadDetail(newPage);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportRekapCsv = () => {
    const dataList = currentAngkatanList;
    if (!dataList || dataList.length === 0) {
      addToast("Tidak ada data rekapitulasi untuk diexport", "warning");
      return;
    }

    const headers = [
      "No",
      "Kategori",
      "Angkatan (TMT)",
      "Total Pegawai",
      "Diperpanjang (Aktif)",
      "Tidak Diperpanjang (Pensiun/Pemberhentian)",
      "Persentase Aktif (%)",
      "Persentase Tidak Diperpanjang (%)"
    ];

    const kategoriLabel = activeKategori === "PENUH_WAKTU" ? "PPPK Penuh Waktu" : activeKategori === "PARUH_WAKTU" ? "PPPK Paruh Waktu" : "Semua PPPK";

    const rows = dataList.map((item, idx) => [
      idx + 1,
      `"${kategoriLabel}"`,
      `"${item.label}"`,
      item.total,
      item.aktif,
      item.tidakDiperpanjang,
      `${item.persentaseAktif}%`,
      `${item.persentaseTidakDiperpanjang}%`
    ]);

    rows.push([
      "Total",
      `"${kategoriLabel}"`,
      "Semua Angkatan",
      currentSummary.totalPegawai,
      currentSummary.totalAktif,
      currentSummary.totalTidakDiperpanjang,
      `${currentSummary.persentaseAktif}%`,
      `${currentSummary.persentaseTidakDiperpanjang}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Statistik_PK_${activeKategori}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("File CSV rekapitulasi berhasil diunduh", "success");
  };

  const exportDetailCsv = async () => {
    try {
      addToast("Menyiapkan data export...", "info");
      const params = new URLSearchParams({
        page: "1",
        limit: "2000",
        kategori: activeKategori
      });
      if (filterTmt) params.set("tmtCpns", filterTmt);
      if (filterStatus && filterStatus !== "ALL") params.set("status", filterStatus);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const res = await apiRequest(`/api/v1/perpanjangan/statistik-pk/detail?${params.toString()}`, "GET");
      if (!res.success || !res.data || res.data.length === 0) {
        addToast("Tidak ada data untuk diexport", "warning");
        return;
      }

      const headers = [
        "No",
        "NIP Baru",
        "Nama Lengkap",
        "Jenis PPPK",
        "Jabatan",
        "Unit Kerja",
        "TMT CPNS",
        "Status Perpanjangan",
        "Jenis Pemberhentian/Pensiun",
        "Nomor SK",
        "Tanggal SK",
        "Status Usulan PK Terakhir"
      ];

      const rows = res.data.map((p, idx) => {
        const statusPerpanjangan = p.isTidakDiperpanjang ? "Tidak Diperpanjang" : "Diperpanjang (Aktif)";
        const jenisPemberhentian = p.jenisPensiun ? p.jenisPensiun.nama : (p.isTidakDiperpanjang ? "Pensiun / Diberhentikan" : "-");
        const noSk = p.arsipSkPensiun?.nomorSk || "-";
        const tglSk = p.arsipSkPensiun?.tanggalSk || "-";
        const statusUsulan = p.usulanPerpanjanganTerakhir ? p.usulanPerpanjanganTerakhir.status : "-";
        const jenisP3k = p.kategoriPegawai === "PARUH_WAKTU" ? "PPPK Paruh Waktu" : "PPPK Penuh Waktu";

        return [
          idx + 1,
          `'${p.nipBaru}`,
          `"${p.namaLengkap || p.nama}"`,
          `"${jenisP3k}"`,
          `"${p.jabatanNama || '-'}"`,
          `"${p.unorNama || '-'}"`,
          `"${p.tmtCpns || '-'}"`,
          statusPerpanjangan,
          `"${jenisPemberhentian}"`,
          `"${noSk}"`,
          `"${tglSk}"`,
          statusUsulan
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Detail_Pegawai_PK_${activeKategori}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("File CSV detail berhasil diunduh", "success");
    } catch (err) {
      console.error(err);
      addToast("Gagal mengunduh file export", "error");
    }
  };

  const getStatusBadge = (rec) => {
    if (rec.isTidakDiperpanjang) {
      return {
        text: "Tidak Diperpanjang",
        subtext: "Pemberhentian / Pensiun",
        class: "bg-rose-50 text-rose-700 border-rose-200"
      };
    }
    return {
      text: "Diperpanjang",
      subtext: "Aktif",
      class: "bg-emerald-50 text-emerald-700 border-emerald-200"
    };
  };

  const getUsulanBadge = (u) => {
    if (!u) return { text: "Belum Ada Usulan", class: "bg-slate-50 text-slate-500 border-slate-200" };
    if (u.status === "SELESAI") return { text: "Selesai (TTE)", class: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (u.status === "APPROVED") return { text: "Disetujui", class: "bg-blue-50 text-blue-700 border-blue-200" };
    if (u.status === "UPLOAD_SRIKANDI" || u.status === "SRIKANDI") return { text: "Proses Srikandi", class: "bg-purple-50 text-purple-700 border-purple-200" };
    if (u.status === "PENDING") return { text: "Menunggu", class: "bg-amber-50 text-amber-700 border-amber-200" };
    if (u.status === "REJECTED") return { text: "Ditolak", class: "bg-red-50 text-red-700 border-red-200" };
    return { text: u.status, class: "bg-slate-50 text-slate-600 border-slate-200" };
  };
</script>

<svelte:head>
  <title>Laporan Statistik Perpanjangan PK — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Header Section -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 no-print">
    <div>
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
        <span>Laporan & Rekapitulasi</span>
        <span>/</span>
        <span class="text-slate-500">Perpanjangan PK</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Statistik Perpanjangan PK</h1>
      <p class="text-sm text-slate-500 mt-1 max-w-2xl">
        Rekapitulasi data pegawai perangkatan (berdasarkan TMT) dan data pegawai yang tidak diperpanjang (pemberhentian / pensiun) terpisah antara PPPK Penuh Waktu dan PPPK Paruh Waktu.
      </p>
    </div>

    <!-- Export & Print Action Buttons -->
    <div class="flex items-center gap-2 shrink-0">
      {#if activeTab === "rekap"}
        <button
          type="button"
          onclick={exportRekapCsv}
          class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
          title="Unduh Rekapitulasi CSV"
        >
          <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </button>
      {:else}
        <button
          type="button"
          onclick={exportDetailCsv}
          class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
          title="Unduh Detail Pegawai CSV"
        >
          <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </button>
      {/if}

      <button
        type="button"
        onclick={handlePrint}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
        title="Cetak Laporan Resmi"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        <span>Cetak Laporan</span>
      </button>
    </div>
  </div>

  <!-- PEMISAHAN KATEGORI UTAMA: PENUH WAKTU vs PARUH WAKTU (Segmented Navigation) -->
  <div class="bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-sm no-print">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">Pilih Kelompok:</span>
      </div>

      <!-- Segmented Buttons -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
        <!-- 1. PPPK Penuh Waktu -->
        <button
          type="button"
          onclick={() => handleKategoriChange("PENUH_WAKTU")}
          class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all {activeKategori === 'PENUH_WAKTU' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}"
        >
          <svg class="w-4 h-4 {activeKategori === 'PENUH_WAKTU' ? 'text-white' : 'text-blue-600'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>PPPK Penuh Waktu</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full {activeKategori === 'PENUH_WAKTU' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
            {statsData.summary?.penuhWaktu?.totalPegawai ? statsData.summary.penuhWaktu.totalPegawai.toLocaleString("id-ID") : "4.813"}
          </span>
        </button>

        <!-- 2. PPPK Paruh Waktu -->
        <button
          type="button"
          onclick={() => handleKategoriChange("PARUH_WAKTU")}
          class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all {activeKategori === 'PARUH_WAKTU' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 ring-2 ring-purple-600' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}"
        >
          <svg class="w-4 h-4 {activeKategori === 'PARUH_WAKTU' ? 'text-white' : 'text-purple-600'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>PPPK Paruh Waktu</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full {activeKategori === 'PARUH_WAKTU' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
            {statsData.summary?.paruhWaktu?.totalPegawai ? statsData.summary.paruhWaktu.totalPegawai.toLocaleString("id-ID") : "362"}
          </span>
        </button>

        <!-- 3. Semua / Gabungan -->
        <button
          type="button"
          onclick={() => handleKategoriChange("ALL")}
          class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all {activeKategori === 'ALL' ? 'bg-slate-800 text-white shadow-md ring-2 ring-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}"
        >
          <svg class="w-4 h-4 {activeKategori === 'ALL' ? 'text-white' : 'text-slate-500'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>Semua (Komparasi)</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full {activeKategori === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}">
            {statsData.summary?.gabungan?.totalPegawai ? statsData.summary.gabungan.totalPegawai.toLocaleString("id-ID") : "5.175"}
          </span>
        </button>
      </div>
    </div>
  </div>

  <!-- Print Header Only (Visible when printing) -->
  <div class="print-only text-center border-b-2 border-slate-800 pb-4 mb-6">
    <h2 class="text-xl font-bold tracking-wider uppercase">PEMERINTAH KABUPATEN TOJO UNA UNA</h2>
    <h3 class="text-lg font-semibold tracking-wide uppercase">BADAN KEPEGAWAIAN DAN PENGEMBANGAN SDM DAERAH</h3>
    <p class="text-sm font-bold text-slate-800 mt-2">
      LAPORAN STATISTIK PERPANJANGAN PERJANJIAN KERJA (PK)
    </p>
    <p class="text-xs font-semibold text-slate-600 mt-0.5">
      Kategori: {activeKategori === "PENUH_WAKTU" ? "PPPK PENUH WAKTU" : activeKategori === "PARUH_WAKTU" ? "PPPK PARUH WAKTU" : "SELURUH PPPK (PENUH WAKTU & PARUH WAKTU)"}
    </p>
    <p class="text-[11px] text-slate-500 italic mt-0.5">
      Dicetak pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
    </p>
  </div>

  <!-- Summary Cards Row (Reflects current active category) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
    <!-- Card 1: Total Pegawai -->
    <div class="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {activeKategori === "PENUH_WAKTU" ? "Total P3K Penuh Waktu" : activeKategori === "PARUH_WAKTU" ? "Total P3K Paruh Waktu" : "Total Seluruh Pegawai"}
        </span>
        <div class="w-9 h-9 rounded-lg {activeKategori === 'PARUH_WAKTU' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <p class="text-2xl sm:text-3xl font-extrabold text-slate-800">
          {isLoadingStats ? "..." : (currentSummary.totalPegawai || 0).toLocaleString("id-ID")}
        </p>
        <p class="text-xs text-slate-400 mt-1">
          {activeKategori === "PENUH_WAKTU" ? "Bekerja penuh waktu di instansi" : activeKategori === "PARUH_WAKTU" ? "Bekerja paruh waktu di instansi" : "Penuh Waktu: 4.813 | Paruh: 362"}
        </p>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 {activeKategori === 'PARUH_WAKTU' ? 'bg-purple-500' : 'bg-blue-500'}"></div>
    </div>

    <!-- Card 2: Diperpanjang (Aktif) -->
    <div class="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diperpanjang (Aktif)</span>
        <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <div class="flex items-baseline gap-2">
          <p class="text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {isLoadingStats ? "..." : (currentSummary.totalAktif || 0).toLocaleString("id-ID")}
          </p>
          {#if !isLoadingStats}
            <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {currentSummary.persentaseAktif}%
            </span>
          {/if}
        </div>
        <p class="text-xs text-slate-400 mt-1">Kontrak aktif & terus berjalan</p>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
    </div>

    <!-- Card 3: Tidak Diperpanjang (Pemberhentian/Pensiun) -->
    <div
      class="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all cursor-pointer"
      onclick={() => filterByPensiunFromRekap(activeKategori)}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && filterByPensiunFromRekap(activeKategori)}
      title="Klik untuk membuka rincian pegawai yang tidak diperpanjang"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tidak Diperpanjang</span>
        <div class="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <div class="flex items-baseline gap-2">
          <p class="text-2xl sm:text-3xl font-extrabold text-rose-600">
            {isLoadingStats ? "..." : (currentSummary.totalTidakDiperpanjang || 0).toLocaleString("id-ID")}
          </p>
          {#if !isLoadingStats}
            <span class="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              {currentSummary.persentaseTidakDiperpanjang}%
            </span>
          {/if}
        </div>
        <p class="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
          <span>Pemberhentian & Pensiun</span>
          <span class="text-[10px] text-slate-400">&rarr;</span>
        </p>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-rose-500"></div>
    </div>

    <!-- Card 4: Total Angkatan -->
    <div class="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Angkatan</span>
        <div class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div class="mt-3">
        <p class="text-2xl sm:text-3xl font-extrabold text-slate-800">
          {isLoadingStats ? "..." : (currentSummary.totalAngkatan || 0)}
        </p>
        <p class="text-xs text-slate-400 mt-1">Kohort pengangkatan TMT</p>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
    </div>
  </div>

  <!-- Navigation Tabs (Rekapitulasi vs Detail Pegawai) -->
  <div class="flex items-center gap-2 border-b border-slate-200 no-print">
    <button
      type="button"
      class="pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 {activeTab === 'rekap' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}"
      onclick={() => switchTab('rekap')}
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span>Rekapitulasi Angkatan & Pemberhentian</span>
      {#if !isLoadingStats}
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
          {currentAngkatanList.length} Angkatan
        </span>
      {/if}
    </button>

    <button
      type="button"
      class="pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 {activeTab === 'detail' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}"
      onclick={() => switchTab('detail')}
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
      <span>Daftar Detail Pegawai</span>
      {#if meta.total > 0}
        <span class="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-normal">
          {meta.total.toLocaleString("id-ID")}
        </span>
      {/if}
    </button>
  </div>

  <!-- TAB 1: REKAPITULASI ANGKATAN & PEMBERHENTIAN -->
  {#if activeTab === "rekap"}
    <div class="space-y-6">

      <!-- JIKA AKTIF KATEGORI: PENUH WAKTU -->
      {#if activeKategori === "PENUH_WAKTU"}
        <!-- Tabel Rekapitulasi Angkatan PPPK Penuh Waktu -->
        <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/30">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full bg-blue-600"></span>
              <div>
                <h2 class="text-base font-bold text-slate-800">Tabel Rekapitulasi Angkatan — PPPK Penuh Waktu</h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  Jumlah pegawai diperpanjang dan tidak diperpanjang per angkatan TMT untuk PPPK Penuh Waktu.
                </p>
              </div>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              Total {statsData.penuhWaktu?.summary?.totalPegawai ? statsData.penuhWaktu.summary.totalPegawai.toLocaleString("id-ID") : "4.813"} Pegawai
            </span>
          </div>

          {#if isLoadingStats}
            <div class="p-12 text-center text-slate-400">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2"></div>
              <p class="text-sm">Memuat data rekapitulasi Penuh Waktu...</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/70">
                  <tr>
                    <th class="px-4 py-3.5 text-center w-12">No</th>
                    <th class="px-4 py-3.5">Angkatan (TMT CPNS)</th>
                    <th class="px-4 py-3.5 text-center">Total Pegawai</th>
                    <th class="px-4 py-3.5 text-center text-emerald-700">Diperpanjang (Aktif)</th>
                    <th class="px-4 py-3.5 text-center text-rose-700">Tidak Diperpanjang</th>
                    <th class="px-4 py-3.5 text-center w-48">Rasio Perpanjangan</th>
                    <th class="px-4 py-3.5 text-center w-28 no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  {#each statsData.penuhWaktu?.byAngkatan || [] as angkatan, idx}
                    <tr class="hover:bg-blue-50/40 transition-colors">
                      <td class="px-4 py-3 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td class="px-4 py-3 font-medium text-slate-800">
                        <div class="flex items-center gap-2">
                          <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                          <span class="font-semibold">{angkatan.label}</span>
                          {#if angkatan.key !== "NO_TMT"}
                            <span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{angkatan.key}</span>
                          {/if}
                        </div>
                      </td>
                      <td class="px-4 py-3 text-center font-bold text-slate-800">{angkatan.total.toLocaleString("id-ID")}</td>
                      <td class="px-4 py-3 text-center font-semibold text-emerald-600 bg-emerald-50/20">
                        {angkatan.aktif.toLocaleString("id-ID")}
                        <span class="text-[11px] text-emerald-700 font-normal">({angkatan.persentaseAktif}%)</span>
                      </td>
                      <td class="px-4 py-3 text-center font-semibold {angkatan.tidakDiperpanjang > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400'}">
                        {angkatan.tidakDiperpanjang.toLocaleString("id-ID")}
                        {#if angkatan.tidakDiperpanjang > 0}
                          <span class="text-[11px] text-rose-700 font-normal">({angkatan.persentaseTidakDiperpanjang}%)</span>
                        {/if}
                      </td>
                      <td class="px-4 py-3">
                        <div class="space-y-1">
                          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div class="bg-emerald-500 h-2" style="width: {angkatan.persentaseAktif}%"></div>
                            <div class="bg-rose-500 h-2" style="width: {angkatan.persentaseTidakDiperpanjang}%"></div>
                          </div>
                          <div class="flex justify-between text-[10px] text-slate-400">
                            <span class="text-emerald-600">{angkatan.persentaseAktif}% Aktif</span>
                            <span class="text-rose-600">{angkatan.persentaseTidakDiperpanjang}% Tidak Diperpanjang</span>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-center no-print whitespace-nowrap">
                        <button
                          type="button"
                          class="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-md transition-colors border border-blue-200"
                          onclick={() => filterByAngkatanFromRekap(angkatan.key, 'PENUH_WAKTU')}
                        >
                          Lihat Data &rarr;
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
                <tfoot class="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
                  <tr>
                    <td class="px-4 py-3.5 text-center text-xs uppercase" colspan="2">Total PPPK Penuh Waktu</td>
                    <td class="px-4 py-3.5 text-center text-base">{statsData.penuhWaktu?.summary?.totalPegawai ? statsData.penuhWaktu.summary.totalPegawai.toLocaleString("id-ID") : "4.813"}</td>
                    <td class="px-4 py-3.5 text-center text-emerald-700 text-base">
                      {statsData.penuhWaktu?.summary?.totalAktif ? statsData.penuhWaktu.summary.totalAktif.toLocaleString("id-ID") : "4.747"}
                      <span class="text-xs font-normal">({statsData.penuhWaktu?.summary?.persentaseAktif}%)</span>
                    </td>
                    <td class="px-4 py-3.5 text-center text-rose-700 text-base">
                      {statsData.penuhWaktu?.summary?.totalTidakDiperpanjang ? statsData.penuhWaktu.summary.totalTidakDiperpanjang.toLocaleString("id-ID") : "66"}
                      <span class="text-xs font-normal">({statsData.penuhWaktu?.summary?.persentaseTidakDiperpanjang}%)</span>
                    </td>
                    <td class="px-4 py-3.5 text-center text-xs text-slate-500">
                      {statsData.penuhWaktu?.byAngkatan?.length || 0} Angkatan
                    </td>
                    <td class="px-4 py-3.5 text-center no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          {/if}
        </div>

        <!-- Rincian Alasan Tidak Diperpanjang PPPK Penuh Waktu -->
        <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-rose-500"></span>
                <span>Rincian Alasan Tidak Diperpanjang — PPPK Penuh Waktu</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Distribusi penyebab pemberhentian / pensiun bagi PPPK Penuh Waktu ({statsData.penuhWaktu?.summary?.totalTidakDiperpanjang || 66} pegawai).
              </p>
            </div>
            <button
              type="button"
              onclick={() => filterByPensiunFromRekap('PENUH_WAKTU')}
              class="text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors w-fit no-print"
            >
              Daftar Pegawai Pensiun Penuh Waktu &rarr;
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {#each statsData.penuhWaktu?.byJenisPemberhentian || [] as jp}
              <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-semibold text-slate-800">{jp.nama}</span>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-rose-600 font-mono">{jp.count} Pegawai</span>
                    <span class="text-xs font-semibold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">{jp.percentage}%</span>
                  </div>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-rose-500 h-2 rounded-full" style="width: {jp.percentage}%"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- JIKA AKTIF KATEGORI: PARUH WAKTU -->
      {#if activeKategori === "PARUH_WAKTU"}
        <!-- Tabel Rekapitulasi Angkatan PPPK Paruh Waktu -->
        <div class="bg-white rounded-xl border border-purple-200/80 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/40">
            <div class="flex items-center gap-2.5">
              <span class="w-3 h-3 rounded-full bg-purple-600"></span>
              <div>
                <h2 class="text-base font-bold text-slate-800">Tabel Rekapitulasi Angkatan — PPPK Paruh Waktu</h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  Jumlah pegawai diperpanjang dan tidak diperpanjang per angkatan TMT untuk PPPK Paruh Waktu.
                </p>
              </div>
            </div>
            <span class="text-xs px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200">
              Total {statsData.paruhWaktu?.summary?.totalPegawai ? statsData.paruhWaktu.summary.totalPegawai.toLocaleString("id-ID") : "362"} Pegawai
            </span>
          </div>

          {#if isLoadingStats}
            <div class="p-12 text-center text-slate-400">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mb-2"></div>
              <p class="text-sm">Memuat data rekapitulasi Paruh Waktu...</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-purple-50/50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-purple-100">
                  <tr>
                    <th class="px-4 py-3.5 text-center w-12">No</th>
                    <th class="px-4 py-3.5">Angkatan (TMT CPNS)</th>
                    <th class="px-4 py-3.5 text-center">Total Pegawai</th>
                    <th class="px-4 py-3.5 text-center text-emerald-700">Diperpanjang (Aktif)</th>
                    <th class="px-4 py-3.5 text-center text-rose-700">Tidak Diperpanjang</th>
                    <th class="px-4 py-3.5 text-center w-48">Rasio Perpanjangan</th>
                    <th class="px-4 py-3.5 text-center w-28 no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  {#each statsData.paruhWaktu?.byAngkatan || [] as angkatan, idx}
                    <tr class="hover:bg-purple-50/30 transition-colors">
                      <td class="px-4 py-3 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td class="px-4 py-3 font-medium text-slate-800">
                        <div class="flex items-center gap-2">
                          <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                          <span class="font-semibold">{angkatan.label}</span>
                          {#if angkatan.key !== "NO_TMT"}
                            <span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">{angkatan.key}</span>
                          {/if}
                        </div>
                      </td>
                      <td class="px-4 py-3 text-center font-bold text-slate-800">{angkatan.total.toLocaleString("id-ID")}</td>
                      <td class="px-4 py-3 text-center font-semibold text-emerald-600 bg-emerald-50/20">
                        {angkatan.aktif.toLocaleString("id-ID")}
                        <span class="text-[11px] text-emerald-700 font-normal">({angkatan.persentaseAktif}%)</span>
                      </td>
                      <td class="px-4 py-3 text-center font-semibold {angkatan.tidakDiperpanjang > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-400'}">
                        {angkatan.tidakDiperpanjang.toLocaleString("id-ID")}
                        {#if angkatan.tidakDiperpanjang > 0}
                          <span class="text-[11px] text-rose-700 font-normal">({angkatan.persentaseTidakDiperpanjang}%)</span>
                        {/if}
                      </td>
                      <td class="px-4 py-3">
                        <div class="space-y-1">
                          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div class="bg-emerald-500 h-2" style="width: {angkatan.persentaseAktif}%"></div>
                            <div class="bg-rose-500 h-2" style="width: {angkatan.persentaseTidakDiperpanjang}%"></div>
                          </div>
                          <div class="flex justify-between text-[10px] text-slate-400">
                            <span class="text-emerald-600">{angkatan.persentaseAktif}% Aktif</span>
                            <span class="text-rose-600">{angkatan.persentaseTidakDiperpanjang}% Tidak Diperpanjang</span>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-center no-print whitespace-nowrap">
                        <button
                          type="button"
                          class="text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2.5 py-1.5 rounded-md transition-colors border border-purple-200"
                          onclick={() => filterByAngkatanFromRekap(angkatan.key, 'PARUH_WAKTU')}
                        >
                          Lihat Data &rarr;
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
                <tfoot class="bg-purple-50/70 font-bold text-slate-800 border-t-2 border-purple-200">
                  <tr>
                    <td class="px-4 py-3.5 text-center text-xs uppercase" colspan="2">Total PPPK Paruh Waktu</td>
                    <td class="px-4 py-3.5 text-center text-base">{statsData.paruhWaktu?.summary?.totalPegawai ? statsData.paruhWaktu.summary.totalPegawai.toLocaleString("id-ID") : "362"}</td>
                    <td class="px-4 py-3.5 text-center text-emerald-700 text-base">
                      {statsData.paruhWaktu?.summary?.totalAktif ? statsData.paruhWaktu.summary.totalAktif.toLocaleString("id-ID") : "362"}
                      <span class="text-xs font-normal">({statsData.paruhWaktu?.summary?.persentaseAktif}%)</span>
                    </td>
                    <td class="px-4 py-3.5 text-center text-rose-700 text-base">
                      {statsData.paruhWaktu?.summary?.totalTidakDiperpanjang || 0}
                      <span class="text-xs font-normal">({statsData.paruhWaktu?.summary?.persentaseTidakDiperpanjang || 0}%)</span>
                    </td>
                    <td class="px-4 py-3.5 text-center text-xs text-slate-500">
                      {statsData.paruhWaktu?.byAngkatan?.length || 0} Angkatan
                    </td>
                    <td class="px-4 py-3.5 text-center no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          {/if}
        </div>

        <!-- Rincian Alasan Tidak Diperpanjang PPPK Paruh Waktu -->
        <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-purple-500"></span>
                <span>Rincian Alasan Tidak Diperpanjang — PPPK Paruh Waktu</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Distribusi penyebab pemberhentian / pensiun bagi PPPK Paruh Waktu.
              </p>
            </div>
          </div>

          {#if !statsData.paruhWaktu?.byJenisPemberhentian || statsData.paruhWaktu.byJenisPemberhentian.length === 0}
            <div class="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
              <svg class="w-8 h-8 mx-auto text-emerald-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="font-medium text-slate-700">Seluruh pegawai PPPK Paruh Waktu saat ini berstatus AKTIF (100%).</p>
              <p class="text-xs text-slate-400 mt-0.5">Belum ada pegawai yang masuk data pensiun atau pemberhentian.</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {#each statsData.paruhWaktu.byJenisPemberhentian as jp}
                <div class="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-semibold text-slate-800">{jp.nama}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-bold text-rose-600 font-mono">{jp.count} Pegawai</span>
                      <span class="text-xs font-semibold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">{jp.percentage}%</span>
                    </div>
                  </div>
                  <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div class="bg-purple-500 h-2 rounded-full" style="width: {jp.percentage}%"></div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- JIKA AKTIF KATEGORI: ALL (KOMPARASI KEDUANYA BERDAMPINGAN) -->
      {#if activeKategori === "ALL"}
        <!-- 1. Bagian PPPK Penuh Waktu -->
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-1 border-b border-blue-200">
            <h3 class="text-base sm:text-lg font-bold text-blue-900 flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold uppercase">Bagian I</span>
              <span>Rekapitulasi Angkatan PPPK Penuh Waktu</span>
            </h3>
            <span class="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {statsData.penuhWaktu?.summary?.totalPegawai?.toLocaleString("id-ID") || 0} Pegawai
            </span>
          </div>

          <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/70">
                  <tr>
                    <th class="px-4 py-3 text-center w-12">No</th>
                    <th class="px-4 py-3">Angkatan (TMT)</th>
                    <th class="px-4 py-3 text-center">Total Pegawai</th>
                    <th class="px-4 py-3 text-center text-emerald-700">Diperpanjang (Aktif)</th>
                    <th class="px-4 py-3 text-center text-rose-700">Tidak Diperpanjang</th>
                    <th class="px-4 py-3 text-center w-40">Rasio Perpanjangan</th>
                    <th class="px-4 py-3 text-center w-24 no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-slate-700">
                  {#each statsData.penuhWaktu?.byAngkatan || [] as angkatan, idx}
                    <tr class="hover:bg-blue-50/30 transition-colors">
                      <td class="px-4 py-2.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td class="px-4 py-2.5 font-semibold text-slate-800">{angkatan.label}</td>
                      <td class="px-4 py-2.5 text-center font-bold">{angkatan.total.toLocaleString("id-ID")}</td>
                      <td class="px-4 py-2.5 text-center font-semibold text-emerald-600">{angkatan.aktif.toLocaleString("id-ID")} ({angkatan.persentaseAktif}%)</td>
                      <td class="px-4 py-2.5 text-center font-semibold {angkatan.tidakDiperpanjang > 0 ? 'text-rose-600' : 'text-slate-400'}">
                        {angkatan.tidakDiperpanjang.toLocaleString("id-ID")}
                        {#if angkatan.tidakDiperpanjang > 0}
                          <span class="text-[11px] text-rose-700 font-normal">({angkatan.persentaseTidakDiperpanjang}%)</span>
                        {/if}
                      </td>
                      <td class="px-4 py-2.5">
                        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                          <div class="bg-emerald-500 h-2" style="width: {angkatan.persentaseAktif}%"></div>
                          <div class="bg-rose-500 h-2" style="width: {angkatan.persentaseTidakDiperpanjang}%"></div>
                        </div>
                      </td>
                      <td class="px-4 py-2.5 text-center no-print">
                        <button
                          type="button"
                          class="text-xs text-blue-600 hover:underline font-medium"
                          onclick={() => filterByAngkatanFromRekap(angkatan.key, 'PENUH_WAKTU')}
                        >
                          Lihat Data &rarr;
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 2. Bagian PPPK Paruh Waktu -->
        <div class="space-y-4 pt-4">
          <div class="flex items-center justify-between pb-1 border-b border-purple-200">
            <h3 class="text-base sm:text-lg font-bold text-purple-900 flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-md bg-purple-600 text-white text-xs font-bold uppercase">Bagian II</span>
              <span>Rekapitulasi Angkatan PPPK Paruh Waktu</span>
            </h3>
            <span class="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              {statsData.paruhWaktu?.summary?.totalPegawai?.toLocaleString("id-ID") || 0} Pegawai
            </span>
          </div>

          <div class="bg-white rounded-xl border border-purple-200/80 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-purple-50/50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-purple-100">
                  <tr>
                    <th class="px-4 py-3 text-center w-12">No</th>
                    <th class="px-4 py-3">Angkatan (TMT)</th>
                    <th class="px-4 py-3 text-center">Total Pegawai</th>
                    <th class="px-4 py-3 text-center text-emerald-700">Diperpanjang (Aktif)</th>
                    <th class="px-4 py-3 text-center text-rose-700">Tidak Diperpanjang</th>
                    <th class="px-4 py-3 text-center w-40">Rasio Perpanjangan</th>
                    <th class="px-4 py-3 text-center w-24 no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-purple-100/60 text-slate-700">
                  {#each statsData.paruhWaktu?.byAngkatan || [] as angkatan, idx}
                    <tr class="hover:bg-purple-50/30 transition-colors">
                      <td class="px-4 py-2.5 text-center text-xs text-slate-400 font-mono">{idx + 1}</td>
                      <td class="px-4 py-2.5 font-semibold text-slate-800">{angkatan.label}</td>
                      <td class="px-4 py-2.5 text-center font-bold">{angkatan.total.toLocaleString("id-ID")}</td>
                      <td class="px-4 py-2.5 text-center font-semibold text-emerald-600">{angkatan.aktif.toLocaleString("id-ID")} ({angkatan.persentaseAktif}%)</td>
                      <td class="px-4 py-2.5 text-center font-semibold {angkatan.tidakDiperpanjang > 0 ? 'text-rose-600' : 'text-slate-400'}">
                        {angkatan.tidakDiperpanjang.toLocaleString("id-ID")}
                        {#if angkatan.tidakDiperpanjang > 0}
                          <span class="text-[11px] text-rose-700 font-normal">({angkatan.persentaseTidakDiperpanjang}%)</span>
                        {/if}
                      </td>
                      <td class="px-4 py-2.5">
                        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                          <div class="bg-emerald-500 h-2" style="width: {angkatan.persentaseAktif}%"></div>
                          <div class="bg-rose-500 h-2" style="width: {angkatan.persentaseTidakDiperpanjang}%"></div>
                        </div>
                      </td>
                      <td class="px-4 py-2.5 text-center no-print">
                        <button
                          type="button"
                          class="text-xs text-purple-600 hover:underline font-medium"
                          onclick={() => filterByAngkatanFromRekap(angkatan.key, 'PARUH_WAKTU')}
                        >
                          Lihat Data &rarr;
                        </button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      {/if}

    </div>
  {/if}

  <!-- TAB 2: DAFTAR DETAIL PEGAWAI -->
  {#if activeTab === "detail"}
    <div class="space-y-4">
      <!-- Filter Bar -->
      <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3 no-print">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Filter Kategori Pegawai (Penuh Waktu vs Paruh Waktu) -->
          <div>
            <label for="filter-kategori-detail" class="block text-xs font-semibold text-slate-600 mb-1">Kelompok Pegawai</label>
            <select
              id="filter-kategori-detail"
              bind:value={activeKategori}
              onchange={async () => { filterTmt = ""; await loadStatistics(); await loadDetail(1); }}
              class="w-full text-xs sm:text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2 font-medium"
            >
              <option value="PENUH_WAKTU">PPPK Penuh Waktu</option>
              <option value="PARUH_WAKTU">PPPK Paruh Waktu</option>
              <option value="ALL">Semua (Penuh & Paruh)</option>
            </select>
          </div>

          <!-- Filter Angkatan / TMT -->
          <div>
            <label for="filter-tmt" class="block text-xs font-semibold text-slate-600 mb-1">Filter Angkatan (TMT)</label>
            <select
              id="filter-tmt"
              bind:value={filterTmt}
              onchange={handleFilterChange}
              class="w-full text-xs sm:text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2"
            >
              <option value="">Semua Angkatan ({activeKategori === 'PENUH_WAKTU' ? 'Penuh Waktu' : activeKategori === 'PARUH_WAKTU' ? 'Paruh Waktu' : 'Semua'})</option>
              {#each currentAngkatanList as a}
                <option value={a.key}>
                  {a.label} ({a.total} Pegawai)
                </option>
              {/each}
            </select>
          </div>

          <!-- Filter Status Perpanjangan -->
          <div>
            <label for="filter-status" class="block text-xs font-semibold text-slate-600 mb-1">Status Perpanjangan</label>
            <select
              id="filter-status"
              bind:value={filterStatus}
              onchange={handleFilterChange}
              class="w-full text-xs sm:text-sm rounded-lg border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">Diperpanjang (Aktif)</option>
              <option value="PENSIUN">Tidak Diperpanjang (Pensiun / Pemberhentian)</option>
            </select>
          </div>

          <!-- Pencarian Cepat -->
          <div>
            <label for="filter-search" class="block text-xs font-semibold text-slate-600 mb-1">Pencarian Pegawai</label>
            <div class="relative">
              <input
                id="filter-search"
                type="text"
                placeholder="NIP, Nama, Jabatan..."
                bind:value={searchTerm}
                oninput={handleSearchInput}
                class="w-full text-xs sm:text-sm rounded-lg border-slate-200 pl-9 pr-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Badges / Active Indicators -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">Ditemukan:</span>
            <span class="font-bold text-slate-700">{meta.total.toLocaleString("id-ID")} pegawai</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold {activeKategori === 'PARUH_WAKTU' ? 'bg-purple-100 text-purple-700' : activeKategori === 'PENUH_WAKTU' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}">
              {activeKategori === 'PENUH_WAKTU' ? 'PPPK Penuh Waktu' : activeKategori === 'PARUH_WAKTU' ? 'PPPK Paruh Waktu' : 'Semua PPPK'}
            </span>
            {#if filterTmt}
              <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                TMT: {filterTmt}
                <button
                  type="button"
                  class="hover:text-blue-900 font-bold"
                  onclick={() => { filterTmt = ""; handleFilterChange(); }}
                >&times;</button>
              </span>
            {/if}
            {#if filterStatus !== "ALL"}
              <span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                Status: {filterStatus === "AKTIF" ? "Diperpanjang" : "Tidak Diperpanjang"}
                <button
                  type="button"
                  class="hover:text-amber-900 font-bold"
                  onclick={() => { filterStatus = "ALL"; handleFilterChange(); }}
                >&times;</button>
              </span>
            {/if}
          </div>

          <!-- Limit Selector -->
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400">Tampilkan:</span>
            <select
              bind:value={meta.limit}
              onchange={() => handlePageChange(1)}
              class="text-xs rounded-md border-slate-200 py-1 px-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {#each limitOptions as opt}
                <option value={opt}>{opt} data</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <!-- Detail Table -->
      <div class="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {#if isLoadingDetail}
          <div class="p-12 text-center text-slate-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-2"></div>
            <p class="text-sm">Memuat daftar pegawai...</p>
          </div>
        {:else if detailRecords.length === 0}
          <div class="p-12 text-center text-slate-400">
            <svg class="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-slate-600">Tidak ada pegawai yang sesuai kriteria filter.</p>
            <p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau ubah pilihan filter.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/70">
                <tr>
                  <th class="px-4 py-3.5 text-center w-12">No</th>
                  <th class="px-4 py-3.5">Pegawai (NIP & Nama)</th>
                  <th class="px-4 py-3.5 text-center">Kelompok</th>
                  <th class="px-4 py-3.5">Jabatan & Unit Kerja</th>
                  <th class="px-4 py-3.5 text-center">Angkatan (TMT)</th>
                  <th class="px-4 py-3.5 text-center">Status PK</th>
                  <th class="px-4 py-3.5">Keterangan / SK</th>
                  <th class="px-4 py-3.5 text-center">Usulan PK</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                {#each detailRecords as pegawai, idx}
                  {@const statusBadge = getStatusBadge(pegawai)}
                  {@const usulanBadge = getUsulanBadge(pegawai.usulanPerpanjanganTerakhir)}
                  <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="px-4 py-3.5 text-center text-xs text-slate-400 font-mono">
                      {(meta.page - 1) * meta.limit + idx + 1}
                    </td>
                    <td class="px-4 py-3.5">
                      <div class="space-y-0.5">
                        <p class="font-semibold text-slate-900 leading-snug">
                          {pegawai.namaLengkap || pegawai.nama}
                        </p>
                        <div class="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <span>{pegawai.nipBaru}</span>
                          {#if pegawai.jenisKelamin}
                            <span class="text-[10px] px-1.5 py-0.2 rounded font-sans font-bold {pegawai.jenisKelamin === 'L' || pegawai.jenisKelamin === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}">
                              {pegawai.jenisKelamin === 'L' || pegawai.jenisKelamin === 'M' ? 'L' : 'P'}
                            </span>
                          {/if}
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      {#if pegawai.kategoriPegawai === "PARUH_WAKTU"}
                        <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Paruh Waktu
                        </span>
                      {:else}
                        <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Penuh Waktu
                        </span>
                      {/if}
                    </td>
                    <td class="px-4 py-3.5 max-w-xs">
                      <div class="space-y-0.5">
                        <p class="text-xs font-medium text-slate-800 leading-snug">
                          {pegawai.jabatanNama || "-"}
                        </p>
                        <p class="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                          {pegawai.unorNama || "-"}
                        </p>
                      </div>
                    </td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      {#if pegawai.tmtCpns}
                        <span class="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {pegawai.tmtCpns}
                        </span>
                      {:else}
                        <span class="text-xs text-slate-400 italic">Tanpa TMT</span>
                      {/if}
                    </td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      <span class="inline-flex flex-col items-center px-2.5 py-1 rounded-md text-xs font-bold border {statusBadge.class}">
                        <span>{statusBadge.text}</span>
                        <span class="text-[10px] font-normal opacity-80">{statusBadge.subtext}</span>
                      </span>
                    </td>
                    <td class="px-4 py-3.5 max-w-xs">
                      {#if pegawai.isTidakDiperpanjang}
                        <div class="space-y-1">
                          <p class="text-xs font-semibold text-rose-700">
                            {pegawai.jenisPensiun?.nama || "Pemberhentian / Pensiun"}
                          </p>
                          {#if pegawai.arsipSkPensiun}
                            <div class="text-[11px] text-slate-600 leading-tight">
                              <span class="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">SK: {pegawai.arsipSkPensiun.nomorSk || "-"}</span>
                              {#if pegawai.arsipSkPensiun.tanggalSk}
                                <span class="text-slate-400 block mt-0.5">Tgl: {pegawai.arsipSkPensiun.tanggalSk}</span>
                              {/if}
                            </div>
                          {/if}
                        </div>
                      {:else}
                        <span class="text-xs text-slate-400">Aktif Berkontrak</span>
                      {/if}
                    </td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      <span class="inline-block px-2 py-0.5 rounded text-[11px] font-medium border {usulanBadge.class}">
                        {usulanBadge.text}
                      </span>
                      {#if pegawai.usulanPerpanjanganTerakhir?.nomorKontrak}
                        <p class="text-[10px] text-slate-400 font-mono mt-0.5">
                          {pegawai.usulanPerpanjanganTerakhir.nomorKontrak}
                        </p>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
            <div class="text-xs text-slate-500 text-center sm:text-left">
              Menampilkan data <span class="font-semibold text-slate-700">{(meta.page - 1) * meta.limit + 1}</span> sampai <span class="font-semibold text-slate-700">{Math.min(meta.page * meta.limit, meta.total)}</span> dari <span class="font-semibold text-slate-700">{meta.total}</span> data
            </div>

            <div class="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={meta.page <= 1}
                onclick={() => handlePageChange(meta.page - 1)}
                class="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                &larr; Sebelumnya
              </button>

              <span class="px-3 py-1 text-xs text-slate-600 font-medium">
                Halaman {meta.page} dari {meta.totalPages}
              </span>

              <button
                type="button"
                disabled={meta.page >= meta.totalPages}
                onclick={() => handlePageChange(meta.page + 1)}
                class="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Print Signature Footer (Print Only) -->
  <div class="print-only mt-12 pt-6 border-t border-slate-300">
    <div class="flex justify-between text-xs">
      <div>
        <p class="text-slate-500">Catatan:</p>
        <p class="text-slate-500 italic text-[10px]">Data dihasilkan secara otomatis melalui Sistem Informasi PPPK (SIPPPK)</p>
      </div>
      <div class="text-center w-64">
        <p>Ampana, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p class="font-semibold mt-1">Kepala BKPSDMD Kab. Tojo Una Una</p>
        <div class="h-16"></div>
        <p class="font-bold underline">SAFRUDIN, S.Sos</p>
        <p class="text-[10px] text-slate-600">NIP. 19740510 200701 1 012</p>
      </div>
    </div>
  </div>
</div>

<style>
  @media print {
    :global(nav),
    :global(header),
    :global(aside),
    :global(footer),
    .no-print {
      display: none !important;
    }

    .print-only {
      display: block !important;
    }

    :global(body) {
      background: white !important;
      color: black !important;
    }
  }

  .print-only {
    display: none;
  }
</style>
