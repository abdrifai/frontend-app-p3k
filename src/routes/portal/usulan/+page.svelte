<script>
  import { onMount } from 'svelte';
  import { portalApi } from '$lib/portalApi';

  let usulanList = [];
  let pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
  let loading = true;
  let errorMsg = '';

  let filterStatus = '';
  let filterKategori = '';

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

  async function loadData(page = 1) {
    loading = true;
    errorMsg = '';
    try {
      const res = await portalApi.getDaftarUsulan({
        status: filterStatus,
        kategori: filterKategori,
        page,
        limit: 10
      });
      if (res && res.data) {
        usulanList = res.data;
        pagination = res.pagination || { page: 1, limit: 10, total: res.data.length, totalPages: 1 };
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal memuat daftar usulan';
    } finally {
      loading = false;
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
    loadData(1);
  });
</script>

<svelte:head>
  <title>Riwayat Usulan Perbaikan — Portal Pegawai SIPPPK</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header Bar -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Usulan Perbaikan Data</h1>
      <p class="text-sm text-slate-500 mt-1">
        Ajukan koreksi data diri, riwayat keluarga, SK pengangkatan, atau kontrak kerja.
      </p>
    </div>
    <div>
      <a
        href="/portal/usulan/baru"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-700 hover:to-teal-700 shadow-sm transition active:scale-95"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Ajukan Usulan Baru</span>
      </a>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
      <select
        bind:value={filterStatus}
        on:change={() => loadData(1)}
        class="text-sm rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 py-1.5 px-3"
      >
        <option value="">Semua Status</option>
        <option value="DIAJUKAN">Diajukan</option>
        <option value="DIPROSES">Diproses</option>
        <option value="PERLU_PERBAIKAN">Perlu Perbaikan</option>
        <option value="DISETUJUI">Disetujui</option>
        <option value="DITOLAK">Ditolak</option>
        <option value="DIBATALKAN">Dibatalkan</option>
      </select>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori:</span>
      <select
        bind:value={filterKategori}
        on:change={() => loadData(1)}
        class="text-sm rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 py-1.5 px-3"
      >
        <option value="">Semua Kategori</option>
        <option value="DATA_UTAMA">Data Utama</option>
        <option value="RIWAYAT_KELUARGA">Riwayat Keluarga</option>
        <option value="RIWAYAT_KONTRAK">Riwayat Kontrak</option>
        <option value="SK_PENGANGKATAN">SK Pengangkatan</option>
      </select>
    </div>
  </div>

  <!-- Content List -->
  {#if loading}
    <div class="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
      <div class="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-sm text-slate-500 font-medium">Memuat usulan perbaikan...</p>
    </div>
  {:else if errorMsg}
    <div class="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm">
      {errorMsg}
    </div>
  {:else if usulanList.length === 0}
    <div class="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
      <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-slate-700 mb-1">Belum Ada Usulan Perbaikan</h3>
      <p class="text-sm text-slate-500 max-w-md mx-auto mb-6">
        Anda belum pernah mengajukan usulan perbaikan data atau riwayat.
      </p>
      <a
        href="/portal/usulan/baru"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
      >
        Ajukan Sekarang
      </a>
    </div>
  {:else}
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="divide-y divide-slate-100">
        {#each usulanList as item (item.id)}
          <a
            href={`/portal/usulan/${item.id}`}
            class="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition block"
          >
            <div class="space-y-1.5 flex-1">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="font-mono text-sm font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {item.nomorUsulan}
                </span>
                <span class={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusColors[item.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                  {item.status.replace('_', ' ')}
                </span>
                <span class="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {kategoriLabels[item.kategori] || item.kategori}
                </span>
                <span class="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded font-medium">
                  {item.aksi}
                </span>
              </div>
              <p class="text-sm text-slate-600 line-clamp-1">
                <span class="font-medium text-slate-700">Alasan:</span> {item.alasan}
              </p>
              {#if item.catatanVerifikator}
                <p class="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-md px-2.5 py-1 inline-block mt-1">
                  <strong>Catatan Verifikator:</strong> {item.catatanVerifikator}
                </p>
              {/if}
            </div>

            <div class="sm:text-right text-xs text-slate-400 shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
              <span>Diajukan: {formatDate(item.createdAt)}</span>
              <span class="text-emerald-600 font-medium inline-flex items-center gap-1 mt-1">
                Detail
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </a>
        {/each}
      </div>

      <!-- Pagination Footer -->
      {#if pagination.totalPages > 1}
        <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
          <div>
            Halaman {pagination.page} dari {pagination.totalPages} (Total {pagination.total} usulan)
          </div>
          <div class="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              on:click={() => loadData(pagination.page - 1)}
              class="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-xs font-medium"
            >
              Sebelumnya
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              on:click={() => loadData(pagination.page + 1)}
              class="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-xs font-medium"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
