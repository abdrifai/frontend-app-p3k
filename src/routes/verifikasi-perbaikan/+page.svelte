<script>
  import { onMount } from 'svelte';
  import { verifikatorApi } from '$lib/verifikatorApi';

  let inbox = [];
  let pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
  let statistik = {
    TOTAL: 0,
    DIAJUKAN: 0,
    DIPROSES: 0,
    PERLU_PERBAIKAN: 0,
    DISETUJUI: 0,
    DITOLAK: 0
  };

  let loading = true;
  let loadingStat = true;
  let errorMsg = '';

  // Filter
  let filterStatus = '';
  let filterKategori = '';
  let filterJenis = '';
  let searchQuery = '';

  // Detail Modal / Drawer
  let selectedUsulan = null;
  let loadingDetail = false;
  let actionLoading = false;
  let catatanInput = '';
  let modalError = '';

  const kategoriLabels = {
    DATA_UTAMA: 'Data Utama',
    RIWAYAT_KELUARGA: 'Riwayat Keluarga',
    RIWAYAT_KONTRAK: 'Riwayat Kontrak',
    SK_PENGANGKATAN: 'SK Pengangkatan'
  };

  const statusColors = {
    DIAJUKAN: 'bg-amber-100 text-amber-800 border-amber-300',
    DIPROSES: 'bg-blue-100 text-blue-800 border-blue-300',
    PERLU_PERBAIKAN: 'bg-orange-100 text-orange-800 border-orange-300',
    DISETUJUI: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    DITOLAK: 'bg-rose-100 text-rose-800 border-rose-300',
    DIBATALKAN: 'bg-slate-100 text-slate-800 border-slate-300'
  };

  async function loadStatistik() {
    try {
      const res = await verifikatorApi.getStatistik();
      if (res && res.data) {
        statistik = res.data;
      }
    } catch (e) {
      console.error(e);
    } finally {
      loadingStat = false;
    }
  }

  async function loadInbox(page = 1) {
    loading = true;
    errorMsg = '';
    try {
      const res = await verifikatorApi.getInbox({
        status: filterStatus,
        kategori: filterKategori,
        jenisPegawai: filterJenis,
        search: searchQuery,
        page,
        limit: 10
      });
      if (res && res.data) {
        inbox = res.data;
        pagination = res.pagination || { page: 1, limit: 10, total: res.data.length, totalPages: 1 };
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal memuat inbox verifikasi';
    } finally {
      loading = false;
    }
  }

  async function openDetail(id) {
    loadingDetail = true;
    modalError = '';
    catatanInput = '';
    try {
      const res = await verifikatorApi.getDetail(id);
      if (res && res.data) {
        selectedUsulan = res.data;
      }
    } catch (err) {
      alert(err.message || 'Gagal memuat detail usulan');
    } finally {
      loadingDetail = false;
    }
  }

  function closeDetail() {
    selectedUsulan = null;
    modalError = '';
    catatanInput = '';
  }

  async function handleAksi(tipe) {
    if (!selectedUsulan) return;
    modalError = '';

    if ((tipe === 'mintaPerbaikan' || tipe === 'tolak') && (!catatanInput || catatanInput.trim().length < 5)) {
      modalError = `Catatan wajib diisi minimal 5 karakter untuk aksi ${tipe === 'tolak' ? 'Tolak' : 'Minta Perbaikan'}`;
      return;
    }

    if (tipe === 'setujui' && !confirm('Yakin ingin menyetujui usulan ini? Perubahan akan langsung diaplikasikan ke database kepegawaian.')) {
      return;
    }

    actionLoading = true;
    try {
      if (tipe === 'proses') {
        await verifikatorApi.proses(selectedUsulan.id, catatanInput);
      } else if (tipe === 'mintaPerbaikan') {
        await verifikatorApi.mintaPerbaikan(selectedUsulan.id, catatanInput);
      } else if (tipe === 'tolak') {
        await verifikatorApi.tolak(selectedUsulan.id, catatanInput);
      } else if (tipe === 'setujui') {
        await verifikatorApi.setujui(selectedUsulan.id, catatanInput);
      }

      closeDetail();
      await Promise.all([loadInbox(pagination.page), loadStatistik()]);
    } catch (err) {
      modalError = err.message || 'Gagal melakukan aksi verifikasi';
    } finally {
      actionLoading = false;
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  }

  onMount(() => {
    Promise.all([loadStatistik(), loadInbox(1)]);
  });
</script>

<svelte:head>
  <title>Verifikasi Usulan Perbaikan Data — SIPPPK</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header Bar -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Verifikasi Usulan Perbaikan Data</h1>
      <p class="text-sm text-slate-500 mt-1">
        Daftar usulan perbaikan data mandiri yang diajukan oleh pegawai PPPK Penuh Waktu dan Paruh Waktu.
      </p>
    </div>
  </div>

  <!-- Statistik Cards -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    <button
      on:click={() => { filterStatus = ''; loadInbox(1); }}
      class={`p-4 rounded-xl border text-left transition ${filterStatus === '' ? 'bg-slate-800 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
    >
      <span class="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Semua Usulan</span>
      <span class="text-xl font-bold">{statistik.TOTAL}</span>
    </button>

    <button
      on:click={() => { filterStatus = 'DIAJUKAN'; loadInbox(1); }}
      class={`p-4 rounded-xl border text-left transition ${filterStatus === 'DIAJUKAN' ? 'bg-amber-600 text-white border-amber-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
    >
      <span class="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Diajukan</span>
      <span class="text-xl font-bold text-amber-600 {filterStatus === 'DIAJUKAN' ? '!text-white' : ''}">{statistik.DIAJUKAN}</span>
    </button>

    <button
      on:click={() => { filterStatus = 'DIPROSES'; loadInbox(1); }}
      class={`p-4 rounded-xl border text-left transition ${filterStatus === 'DIPROSES' ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
    >
      <span class="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Diproses</span>
      <span class="text-xl font-bold text-blue-600 {filterStatus === 'DIPROSES' ? '!text-white' : ''}">{statistik.DIPROSES}</span>
    </button>

    <button
      on:click={() => { filterStatus = 'PERLU_PERBAIKAN'; loadInbox(1); }}
      class={`p-4 rounded-xl border text-left transition ${filterStatus === 'PERLU_PERBAIKAN' ? 'bg-orange-600 text-white border-orange-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
    >
      <span class="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Perlu Perbaikan</span>
      <span class="text-xl font-bold text-orange-600 {filterStatus === 'PERLU_PERBAIKAN' ? '!text-white' : ''}">{statistik.PERLU_PERBAIKAN}</span>
    </button>

    <button
      on:click={() => { filterStatus = 'DISETUJUI'; loadInbox(1); }}
      class={`p-4 rounded-xl border text-left transition ${filterStatus === 'DISETUJUI' ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
    >
      <span class="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Disetujui</span>
      <span class="text-xl font-bold text-emerald-600 {filterStatus === 'DISETUJUI' ? '!text-white' : ''}">{statistik.DISETUJUI}</span>
    </button>

    <button
      on:click={() => { filterStatus = 'DITOLAK'; loadInbox(1); }}
      class={`p-4 rounded-xl border text-left transition ${filterStatus === 'DITOLAK' ? 'bg-rose-600 text-white border-rose-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
    >
      <span class="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Ditolak</span>
      <span class="text-xl font-bold text-rose-600 {filterStatus === 'DITOLAK' ? '!text-white' : ''}">{statistik.DITOLAK}</span>
    </button>
  </div>

  <!-- Filter & Search Bar -->
  <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori:</span>
        <select
          bind:value={filterKategori}
          on:change={() => loadInbox(1)}
          class="text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
        >
          <option value="">Semua Kategori</option>
          <option value="DATA_UTAMA">Data Utama</option>
          <option value="RIWAYAT_KELUARGA">Riwayat Keluarga</option>
          <option value="RIWAYAT_KONTRAK">Riwayat Kontrak</option>
          <option value="SK_PENGANGKATAN">SK Pengangkatan</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jenis:</span>
        <select
          bind:value={filterJenis}
          on:change={() => loadInbox(1)}
          class="text-xs rounded-lg border-slate-200 bg-slate-50 p-2"
        >
          <option value="">Semua Pegawai</option>
          <option value="PENUH_WAKTU">Penuh Waktu</option>
          <option value="PARUH_WAKTU">Paruh Waktu</option>
        </select>
      </div>
    </div>

    <!-- Search Box -->
    <div class="w-full sm:w-72 relative">
      <input
        type="text"
        bind:value={searchQuery}
        on:keydown={(e) => e.key === 'Enter' && loadInbox(1)}
        placeholder="Cari NIP atau Nama..."
        class="w-full text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white pl-9 pr-3 py-2"
      />
      <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  </div>

  <!-- Inbox Table -->
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    {#if loading}
      <div class="p-12 text-center">
        <div class="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-sm text-slate-500">Memuat inbox usulan...</p>
      </div>
    {:else if errorMsg}
      <div class="p-6 text-sm text-rose-600 bg-rose-50 border-b border-rose-100">
        {errorMsg}
      </div>
    {:else if inbox.length === 0}
      <div class="p-12 text-center text-slate-400 text-sm">
        Tidak ada usulan perbaikan data yang sesuai filter.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="p-4">Nomor Usulan</th>
              <th class="p-4">Pegawai</th>
              <th class="p-4">Kategori & Aksi</th>
              <th class="p-4">Status</th>
              <th class="p-4">Diajukan</th>
              <th class="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each inbox as item (item.id)}
              <tr class="hover:bg-slate-50/60 transition">
                <td class="p-4 font-mono font-semibold text-slate-900">
                  {item.nomorUsulan}
                </td>
                <td class="p-4">
                  <div class="font-medium text-slate-800">{item.pegawai?.nama || '-'}</div>
                  <div class="font-mono text-slate-400 text-[11px]">{item.pegawai?.nipBaru || '-'}</div>
                  <div class="text-[10px] text-teal-700 font-semibold mt-0.5">
                    {item.jenisPegawai === 'PENUH_WAKTU' ? 'Penuh Waktu' : 'Paruh Waktu'}
                  </div>
                </td>
                <td class="p-4">
                  <div class="font-semibold text-slate-700">{kategoriLabels[item.kategori] || item.kategori}</div>
                  <div class="text-[11px] text-teal-600 font-medium">Aksi: {item.aksi}</div>
                </td>
                <td class="p-4">
                  <span class={`px-2.5 py-0.5 rounded-full font-medium border text-[11px] ${statusColors[item.status]}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </td>
                <td class="p-4 text-slate-500 text-[11px]">
                  {formatDate(item.createdAt)}
                </td>
                <td class="p-4 text-right">
                  <button
                    on:click={() => openDetail(item.id)}
                    class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg transition"
                  >
                    Review
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if pagination.totalPages > 1}
        <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div>Halaman {pagination.page} dari {pagination.totalPages} (Total {pagination.total} usulan)</div>
          <div class="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              on:click={() => loadInbox(pagination.page - 1)}
              class="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              on:click={() => loadInbox(pagination.page + 1)}
              class="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Modal Drawer Review Detail -->
{#if selectedUsulan}
  <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div>
          <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Review Usulan {selectedUsulan.nomorUsulan}</span>
            <span class={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusColors[selectedUsulan.status]}`}>
              {selectedUsulan.status.replace('_', ' ')}
            </span>
          </h3>
          <p class="text-xs text-slate-500">
            Diajukan oleh {selectedUsulan.pegawai?.nama} ({selectedUsulan.pegawai?.nipBaru})
          </p>
        </div>
        <button on:click={closeDetail} class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto space-y-6 text-xs">
        {#if modalError}
          <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            {modalError}
          </div>
        {/if}

        <!-- Peringatan Kategori SK -->
        {#if selectedUsulan.kategori === 'SK_PENGANGKATAN'}
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <strong>Peringatan Verifikator:</strong> Menyetujui usulan ini akan memperbarui Nomor SK, Tanggal SK, atau TMT Pengangkatan yang memengaruhi masa kerja dan kalkulasi gaji perpanjangan kontrak.
          </div>
        {/if}

        <!-- Komparasi Field Diff (Data Lama vs Data Baru) -->
        <div class="border rounded-xl border-slate-200 overflow-hidden">
          <div class="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
            Perbandingan Data (Field Diff)
          </div>
          <div class="grid grid-cols-2 divide-x divide-slate-200">
            <!-- Data Lama -->
            <div class="p-4 space-y-2 bg-slate-50/50">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Nilai Saat Ini (Lama)</span>
              {#if !selectedUsulan.dataLama || Object.keys(selectedUsulan.dataLama).length === 0}
                <p class="text-slate-400 italic">Tidak ada nilai sebelumnya (Penambahan data)</p>
              {:else}
                {#each Object.entries(selectedUsulan.dataLama) as [k, val]}
                  <div class="p-2 bg-white rounded-lg border border-slate-200">
                    <span class="font-mono text-slate-400 block text-[10px]">{k}</span>
                    <span class="font-medium text-slate-800">{val !== null && val !== undefined ? String(val) : '-'}</span>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Data Baru -->
            <div class="p-4 space-y-2 bg-emerald-50/30">
              <span class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-2">Nilai Usulan Baru</span>
              {#if !selectedUsulan.dataBaru || Object.keys(selectedUsulan.dataBaru).length === 0}
                <p class="text-rose-500 italic">Data dihapus</p>
              {:else}
                {#each Object.entries(selectedUsulan.dataBaru) as [k, val]}
                  <div class="p-2 bg-white rounded-lg border border-emerald-200">
                    <span class="font-mono text-emerald-600 block text-[10px]">{k}</span>
                    <span class="font-semibold text-emerald-900">{val !== null && val !== undefined ? String(val) : '-'}</span>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>

        <!-- Alasan Pengajuan -->
        <div>
          <span class="font-bold text-slate-600 block mb-1">Alasan dari Pegawai:</span>
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
            {selectedUsulan.alasan}
          </div>
        </div>

        <!-- Dokumen Lampiran -->
        <div>
          <span class="font-bold text-slate-600 block mb-2">Dokumen Lampiran Pendukung:</span>
          {#if !selectedUsulan.lampiran || selectedUsulan.lampiran.length === 0}
            <p class="text-slate-400 italic">Tidak ada lampiran.</p>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {#each selectedUsulan.lampiran as l}
                <a
                  href={l.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="p-2.5 bg-slate-50 hover:bg-emerald-50/50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                >
                  <span class="truncate font-medium text-slate-700">{l.namaFile}</span>
                  <span class="text-emerald-700 font-bold shrink-0 ml-2">Buka</span>
                </a>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Input Catatan Verifikator -->
        {#if ['DIAJUKAN', 'DIPROSES'].includes(selectedUsulan.status)}
          <div class="pt-3 border-t border-slate-100">
            <label for="catatan-verifikator" class="font-bold text-slate-700 block mb-1">Catatan / Keterangan Verifikator:</label>
            <textarea
              id="catatan-verifikator"
              rows="3"
              bind:value={catatanInput}
              placeholder="Berikan alasan atau keterangan (wajib untuk Minta Perbaikan / Tolak)..."
              class="w-full text-xs rounded-xl border-slate-300 p-2.5"
            ></textarea>
          </div>
        {/if}
      </div>

      <!-- Modal Footer Action Buttons -->
      <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
        <button
          type="button"
          on:click={closeDetail}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/50 rounded-xl"
        >
          Tutup
        </button>

        <div class="flex items-center gap-2">
          {#if selectedUsulan.status === 'DIAJUKAN'}
            <button
              type="button"
              disabled={actionLoading}
              on:click={() => handleAksi('proses')}
              class="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 disabled:opacity-50"
            >
              Mulai Proses
            </button>
          {/if}

          {#if ['DIAJUKAN', 'DIPROSES'].includes(selectedUsulan.status)}
            <button
              type="button"
              disabled={actionLoading}
              on:click={() => handleAksi('mintaPerbaikan')}
              class="px-4 py-2 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 disabled:opacity-50"
            >
              Minta Perbaikan
            </button>

            <button
              type="button"
              disabled={actionLoading}
              on:click={() => handleAksi('tolak')}
              class="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 disabled:opacity-50"
            >
              Tolak Usulan
            </button>

            <button
              type="button"
              disabled={actionLoading}
              on:click={() => handleAksi('setujui')}
              class="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
            >
              Setujui & Terapkan Data
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
