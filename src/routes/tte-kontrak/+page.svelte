<script>
  import { onMount } from 'svelte';
  import { tteApi } from '$lib/tteApi';
  import { addToast } from '$lib/toastStore';

  let listDokumen = $state([]);
  let pagination = $state({ page: 1, limit: 10, total: 0, totalPages: 1 });
  let initialLoading = $state(true);
  let tableLoading = $state(false);
  let statsLoading = $state(false);
  let searchQuery = $state('');
  let filterStatus = $state('');

  // Statistik Ringkasan KPI
  let stats = $state({
    total: 0,
    menungguPegawai: 0,
    menungguKaban: 0,
    menungguSekda: 0,
    menungguBupati: 0,
    selesai: 0,
    ditolak: 0
  });

  // Modal Preview PDF
  let showPreviewModal = $state(false);
  let previewUrl = $state('');
  let previewTitle = $state('');

  // Modal Detail Log Audit TTE
  let showLogModal = $state(false);
  let selectedDokumen = $state(null);

  const statusConfig = {
    MENUNGGU_TTE_PEGAWAI: {
      label: 'Menunggu Pegawai',
      step: 1,
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      dot: 'bg-blue-500'
    },
    MENUNGGU_PARAF_KABAN: {
      label: 'Menunggu Paraf Kaban',
      step: 2,
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500'
    },
    MENUNGGU_PARAF_SEKDA: {
      label: 'Menunggu Paraf Sekda',
      step: 3,
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dot: 'bg-indigo-500'
    },
    MENUNGGU_TTE_BUPATI: {
      label: 'Menunggu TTE Bupati',
      step: 4,
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      dot: 'bg-purple-500'
    },
    TTE_SELESAI: {
      label: 'TTE Selesai (Final)',
      step: 5,
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500'
    },
    DITOLAK: {
      label: 'Ditolak / Dikembalikan',
      step: 0,
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500'
    }
  };

  const formatTanggal = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTanggalWaktu = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Hanya fetch statistik ringkasan KPI
  const fetchStats = async () => {
    try {
      const resStats = await tteApi.getMonitoringStats();
      if (resStats && resStats.success) {
        stats = resStats.data || stats;
      }
    } catch (err) {
      console.error('Gagal memuat statistik monitoring TTE:', err);
    }
  };

  // Hanya fetch daftar tabel dokumen (tanpa reload stats atau card)
  const fetchList = async (page = 1) => {
    tableLoading = true;
    try {
      const resList = await tteApi.getMonitoring({
        search: searchQuery,
        statusTte: filterStatus,
        page,
        limit: pagination.limit || 10
      });

      if (resList && resList.success) {
        listDokumen = resList.data || [];
        pagination = resList.pagination || pagination;
      }
    } catch (err) {
      addToast(err.message || 'Gagal memuat monitoring dokumen TTE', 'error');
    } finally {
      tableLoading = false;
      initialLoading = false;
    }
  };

  // Segarkan seluruh data (baik stats maupun tabel)
  const refreshAll = async () => {
    statsLoading = true;
    tableLoading = true;
    try {
      await Promise.all([
        fetchStats(),
        fetchList(pagination.page || 1)
      ]);
    } finally {
      statsLoading = false;
    }
  };

  const handleSearch = () => {
    fetchList(1);
  };

  const handleFilterStatus = (status) => {
    filterStatus = status;
    fetchList(1);
  };

  const openPreview = (doc) => {
    previewUrl = doc.pdfSignedUrl || doc.pdfDraftUrl || '';
    previewTitle = `Dokumen Kontrak — ${doc.dataP3k?.nama || doc.nomorKontrak}`;
    if (!previewUrl) {
      addToast('Berkas PDF belum tersedia untuk dipratinjau', 'warning');
      return;
    }
    showPreviewModal = true;
  };

  const openLogModal = (doc) => {
    selectedDokumen = doc;
    showLogModal = true;
  };

  onMount(async () => {
    initialLoading = true;
    await Promise.all([fetchStats(), fetchList(1)]);
    initialLoading = false;
  });
</script>

<svelte:head>
  <title>Monitoring TTE Dokumen Kontrak — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
    <div>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Dashboard Monitoring Staf & Admin
        </span>
      </div>
      <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
        Monitoring Status TTE Dokumen Kontrak
      </h1>
      <p class="text-xs text-slate-500 mt-0.5">
        Pantau perjalanan tanda tangan dan paraf elektronik berkas kontrak PPPK secara berkala
      </p>
    </div>

    <div>
      <button
        type="button"
        onclick={refreshAll}
        disabled={tableLoading || statsLoading}
        class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs transition disabled:opacity-50"
      >
        <svg class="w-4 h-4 {statsLoading || tableLoading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Segarkan Data
      </button>
    </div>
  </div>

  <!-- KPI Summary Cards (Bisa Diklik Untuk Filter Cepat) -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
    <!-- Semua -->
    <button
      type="button"
      onclick={() => handleFilterStatus('')}
      class="text-left p-4 rounded-xl border transition-all {filterStatus === '' ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}"
    >
      <span class="text-[11px] font-semibold text-slate-500 block truncate">Total Masuk TTE</span>
      <span class="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.total}</span>
      <span class="text-[10px] text-slate-400 mt-0.5 block">Seluruh Berkas</span>
    </button>

    <!-- Menunggu Pegawai -->
    <button
      type="button"
      onclick={() => handleFilterStatus('MENUNGGU_TTE_PEGAWAI')}
      class="text-left p-4 rounded-xl border transition-all {filterStatus === 'MENUNGGU_TTE_PEGAWAI' ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}"
    >
      <span class="text-[11px] font-semibold text-blue-700 block truncate">1. TTE Pegawai</span>
      <span class="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.menungguPegawai}</span>
      <span class="text-[10px] text-blue-600 mt-0.5 block">Di Portal Pegawai</span>
    </button>

    <!-- Menunggu Paraf Kaban -->
    <button
      type="button"
      onclick={() => handleFilterStatus('MENUNGGU_PARAF_KABAN')}
      class="text-left p-4 rounded-xl border transition-all {filterStatus === 'MENUNGGU_PARAF_KABAN' ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}"
    >
      <span class="text-[11px] font-semibold text-amber-700 block truncate">2. Paraf Kaban</span>
      <span class="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.menungguKaban}</span>
      <span class="text-[10px] text-amber-600 mt-0.5 block">Kepala BKPSDM</span>
    </button>

    <!-- Menunggu Paraf Sekda -->
    <button
      type="button"
      onclick={() => handleFilterStatus('MENUNGGU_PARAF_SEKDA')}
      class="text-left p-4 rounded-xl border transition-all {filterStatus === 'MENUNGGU_PARAF_SEKDA' ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}"
    >
      <span class="text-[11px] font-semibold text-indigo-700 block truncate">3. Paraf Sekda</span>
      <span class="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.menungguSekda}</span>
      <span class="text-[10px] text-indigo-600 mt-0.5 block">Sekretaris Daerah</span>
    </button>

    <!-- Menunggu TTE Bupati -->
    <button
      type="button"
      onclick={() => handleFilterStatus('MENUNGGU_TTE_BUPATI')}
      class="text-left p-4 rounded-xl border transition-all {filterStatus === 'MENUNGGU_TTE_BUPATI' ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}"
    >
      <span class="text-[11px] font-semibold text-purple-700 block truncate">4. TTE Bupati</span>
      <span class="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.menungguBupati}</span>
      <span class="text-[10px] text-purple-600 mt-0.5 block">Penandatangan Akhir</span>
    </button>

    <!-- Selesai Lengkap -->
    <button
      type="button"
      onclick={() => handleFilterStatus('TTE_SELESAI')}
      class="text-left p-4 rounded-xl border transition-all {filterStatus === 'TTE_SELESAI' ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}"
    >
      <span class="text-[11px] font-semibold text-emerald-700 block truncate">5. Selesai TTE</span>
      <span class="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.selesai}</span>
      <span class="text-[10px] text-emerald-600 mt-0.5 block">Kontrak Sah & Aktif</span>
    </button>
  </div>

  <!-- Content Section: Filter Bar & Table -->
  <div class="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
    <!-- Filter Bar -->
    <div class="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <!-- Status Filter Tabs -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
        <button
          onclick={() => handleFilterStatus('')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition {filterStatus === '' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
        >
          Semua ({stats.total})
        </button>
        <button
          onclick={() => handleFilterStatus('MENUNGGU_TTE_PEGAWAI')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition {filterStatus === 'MENUNGGU_TTE_PEGAWAI' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}"
        >
          Pegawai ({stats.menungguPegawai})
        </button>
        <button
          onclick={() => handleFilterStatus('MENUNGGU_PARAF_KABAN')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition {filterStatus === 'MENUNGGU_PARAF_KABAN' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}"
        >
          Kaban ({stats.menungguKaban})
        </button>
        <button
          onclick={() => handleFilterStatus('MENUNGGU_PARAF_SEKDA')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition {filterStatus === 'MENUNGGU_PARAF_SEKDA' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}"
        >
          Sekda ({stats.menungguSekda})
        </button>
        <button
          onclick={() => handleFilterStatus('MENUNGGU_TTE_BUPATI')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition {filterStatus === 'MENUNGGU_TTE_BUPATI' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}"
        >
          Bupati ({stats.menungguBupati})
        </button>
        <button
          onclick={() => handleFilterStatus('TTE_SELESAI')}
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition {filterStatus === 'TTE_SELESAI' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}"
        >
          Selesai ({stats.selesai})
        </button>
        {#if stats.ditolak > 0}
          <button
            onclick={() => handleFilterStatus('DITOLAK')}
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition {filterStatus === 'DITOLAK' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}"
          >
            Ditolak ({stats.ditolak})
          </button>
        {/if}
      </div>

      <!-- Search Input -->
      <form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex items-center gap-2">
        <div class="relative">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Cari nama, NIP, no kontrak..."
            class="w-64 sm:w-72 px-3.5 py-2 pl-9 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          class="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
        >
          Cari
        </button>
      </form>
    </div>

    <!-- Progress Loading Bar (Aktif saat filter card diklik / mencari) -->
    <div class="h-0.5 w-full bg-slate-100 overflow-hidden relative">
      {#if tableLoading}
        <div class="h-full bg-blue-600 w-1/3 animate-pulse"></div>
      {/if}
    </div>

    <!-- Table Monitoring -->
    {#if initialLoading}
      <div class="p-16 text-center text-slate-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
        <p class="text-sm">Memuat data monitoring TTE...</p>
      </div>
    {:else if listDokumen.length === 0}
      <div class="p-16 text-center">
        <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h4 class="text-base font-bold text-slate-800 mb-1">Tidak Ada Dokumen</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">
          Tidak ditemukan berkas kontrak dengan kriteria pencarian / filter yang dipilih.
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto transition-opacity duration-200 {tableLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th class="py-3.5 px-6">Pegawai PPPK</th>
              <th class="py-3.5 px-6">Detail Kontrak</th>
              <th class="py-3.5 px-6">Status & Stepper Alur TTE</th>
              <th class="py-3.5 px-6">Jejak Terakhir</th>
              <th class="py-3.5 px-6 text-right">Aksi Dokumen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each listDokumen as doc}
              {@const cfg = statusConfig[doc.statusTte] || { label: doc.statusTte, badge: 'bg-slate-100 text-slate-700 border-slate-200', step: 0 }}
              <tr class="hover:bg-blue-50/20 transition">
                <!-- Pegawai PPPK -->
                <td class="py-4 px-6">
                  <div class="font-bold text-slate-900 text-sm">
                    {doc.dataP3k?.nama || "-"}
                  </div>
                  <div class="text-slate-500 font-mono text-[11px] mt-0.5">
                    NIP: {doc.dataP3k?.nipBaru || doc.dataP3k?.nipLama || "-"}
                  </div>
                  <div class="text-[11px] text-slate-600 mt-0.5 truncate max-w-xs">
                    {doc.dataP3k?.jabatanNama || "-"}
                  </div>
                  <div class="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                    {doc.dataP3k?.unorNama || "-"}
                  </div>
                </td>

                <!-- Detail Kontrak -->
                <td class="py-4 px-6">
                  <div class="font-mono text-blue-700 font-semibold text-[11px]">
                    {doc.nomorKontrak || "-"}
                  </div>
                  <div class="text-slate-600 mt-0.5">
                    Masa: <span class="font-bold text-slate-800">{doc.durasiTahun || 5} Tahun</span>
                  </div>
                  <div class="text-slate-400 text-[10px] mt-0.5">
                    TMT: {formatTanggal(doc.tanggalMulai)} s/d {formatTanggal(doc.tanggalSelesai)}
                  </div>
                  <div class="text-[10px] text-amber-700 font-bold mt-0.5">
                    Kontrak Ke-{doc.kontrakKe || 1}
                  </div>
                </td>

                <!-- Status & Stepper Alur TTE -->
                <td class="py-4 px-6">
                  <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border {cfg.badge}">
                    <span class="w-1.5 h-1.5 rounded-full {cfg.dot || 'bg-slate-500'}"></span>
                    {cfg.label}
                  </div>

                  <!-- Visual Stepper Progress 4 Tahap -->
                  <div class="mt-2.5 flex items-center gap-1">
                    <!-- Step 1: Pegawai -->
                    <div class="flex items-center gap-1">
                      <span
                        title="TTE Pegawai"
                        class="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition {cfg.step >= 2 ? 'bg-emerald-500 text-white' : cfg.step === 1 ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}"
                      >
                        {#if cfg.step >= 2}✓{:else}1{/if}
                      </span>
                      <span class="w-3 h-0.5 {cfg.step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}"></span>
                    </div>

                    <!-- Step 2: Kaban -->
                    <div class="flex items-center gap-1">
                      <span
                        title="Paraf Kepala BKPSDM"
                        class="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition {cfg.step >= 3 ? 'bg-emerald-500 text-white' : cfg.step === 2 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}"
                      >
                        {#if cfg.step >= 3}✓{:else}2{/if}
                      </span>
                      <span class="w-3 h-0.5 {cfg.step >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}"></span>
                    </div>

                    <!-- Step 3: Sekda -->
                    <div class="flex items-center gap-1">
                      <span
                        title="Paraf Sekda"
                        class="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition {cfg.step >= 4 ? 'bg-emerald-500 text-white' : cfg.step === 3 ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}"
                      >
                        {#if cfg.step >= 4}✓{:else}3{/if}
                      </span>
                      <span class="w-3 h-0.5 {cfg.step >= 4 ? 'bg-emerald-500' : 'bg-slate-200'}"></span>
                    </div>

                    <!-- Step 4: Bupati -->
                    <div class="flex items-center">
                      <span
                        title="TTE Bupati (Final)"
                        class="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center transition {cfg.step >= 5 ? 'bg-emerald-500 text-white' : cfg.step === 4 ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}"
                      >
                        {#if cfg.step >= 5}✓{:else}4{/if}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Jejak Terakhir -->
                <td class="py-4 px-6">
                  {#if doc.logTandaTangan && doc.logTandaTangan.length > 0}
                    {@const lastLog = doc.logTandaTangan[doc.logTandaTangan.length - 1]}
                    <div class="text-[11px] font-semibold text-slate-800">
                      {lastLog.user?.namaLengkap || lastLog.nik}
                    </div>
                    <div class="text-[10px] text-slate-500">
                      {lastLog.tahap?.replaceAll('_', ' ')} • {formatTanggalWaktu(lastLog.createdAt)}
                    </div>
                    {#if lastLog.status === 'DITOLAK' && lastLog.pesan}
                      <p class="text-[10px] text-rose-600 italic mt-0.5 line-clamp-1" title={lastLog.pesan}>
                        "{lastLog.pesan}"
                      </p>
                    {/if}
                  {:else}
                    <span class="text-slate-400 text-[11px] italic">Belum ada riwayat TTE</span>
                  {/if}
                </td>

                <!-- Aksi Dokumen -->
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Tombol Pratinjau PDF -->
                    <button
                      onclick={() => openPreview(doc)}
                      class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                      title="Lihat Berkas Dokumen"
                    >
                      <svg class="w-3.5 h-3.5 inline-block -mt-0.5 mr-1 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Pratinjau
                    </button>

                    <!-- Tombol Log Audit -->
                    <button
                      onclick={() => openLogModal(doc)}
                      class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                      title="Lihat Jejak Audit Penandatanganan"
                    >
                      Log ({doc.logTandaTangan?.length || 0})
                    </button>

                    <!-- Tombol Download (Jika Signed atau Draft ada) -->
                    {#if doc.pdfSignedUrl || doc.pdfDraftUrl}
                      <a
                        href={doc.pdfSignedUrl || doc.pdfDraftUrl}
                        download
                        class="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                        title="Unduh Berkas PDF"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if pagination.totalPages > 1}
        <div class="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total berkas)
          </div>
          <div class="flex gap-2">
            <button
              disabled={pagination.page <= 1 || tableLoading}
              onclick={() => fetchList(pagination.page - 1)}
              class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Sebelumnya
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages || tableLoading}
              onclick={() => fetchList(pagination.page + 1)}
              class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Berikutnya
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Modal Pratinjau PDF -->
{#if showPreviewModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 class="text-sm font-bold text-slate-900 truncate max-w-md">{previewTitle}</h3>
        </div>
        <div class="flex items-center gap-2">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
          >
            Buka di Tab Baru
          </a>
          <button
            onclick={() => (showPreviewModal = false)}
            class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div class="flex-grow bg-slate-100 p-2">
        <iframe
          src={previewUrl}
          title="Pratinjau Dokumen Kontrak"
          class="w-full h-full rounded-xl border border-slate-200 bg-white"
        ></iframe>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Log Audit TTE -->
{#if showLogModal && selectedDokumen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-base font-bold text-slate-900">Jejak Audit TTE Dokumen</h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Kontrak: <span class="font-mono font-semibold text-blue-700">{selectedDokumen.nomorKontrak}</span> ({selectedDokumen.dataP3k?.nama})
          </p>
        </div>
        <button
          onclick={() => (showLogModal = false)}
          class="text-slate-400 hover:text-slate-700"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
        {#if !selectedDokumen.logTandaTangan || selectedDokumen.logTandaTangan.length === 0}
          <div class="p-6 text-center text-slate-400 text-xs">
            Belum ada catatan aktivitas penandatanganan pada dokumen ini.
          </div>
        {:else}
          {#each selectedDokumen.logTandaTangan as log, i}
            <div class="p-3.5 rounded-xl border {log.status === 'SUKSES' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'} text-xs space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full {log.status === 'SUKSES' ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                  {log.tahap?.replaceAll('_', ' ')}
                </span>
                <span class="text-[10px] text-slate-400">
                  {formatTanggalWaktu(log.createdAt)}
                </span>
              </div>
              <div class="text-slate-600">
                Oleh: <strong class="text-slate-800">{log.user?.namaLengkap || log.nik}</strong>
                {#if log.user?.role}
                  <span class="text-[10px] text-slate-400 font-mono">({log.user.role})</span>
                {/if}
              </div>
              {#if log.idDokumenBsre}
                <div class="text-[10px] font-mono text-slate-500">
                  ID Dokumen BSrE: {log.idDokumenBsre}
                </div>
              {/if}
              {#if log.status === 'DITOLAK' && log.pesan}
                <div class="p-2 rounded bg-white border border-rose-200 text-rose-700 text-[11px] mt-1 italic">
                  Alasan Penolakan: "{log.pesan}"
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <div class="mt-5 text-right">
        <button
          onclick={() => (showLogModal = false)}
          class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}
