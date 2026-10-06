<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { portalApi } from '$lib/portalApi';

  let id = $page.params.id;
  let usulan = null;
  let loading = true;
  let errorMsg = '';
  let actionLoading = false;

  // Modal revisi
  let showRevisiModal = false;
  let revisiAlasan = '';
  let revisiDataBaru = {};
  let revisiFiles = [];
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

  async function loadDetail() {
    loading = true;
    errorMsg = '';
    try {
      const res = await portalApi.getDetailUsulan(id);
      if (res && res.data) {
        usulan = res.data;
        revisiDataBaru = { ...(usulan.dataBaru || {}) };
        revisiAlasan = usulan.alasan || '';
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal memuat detail usulan';
    } finally {
      loading = false;
    }
  }

  async function handleBatalkan() {
    if (!confirm('Apakah Anda yakin ingin membatalkan usulan perbaikan ini?')) return;
    actionLoading = true;
    try {
      await portalApi.batalkanUsulan(id);
      await loadDetail();
    } catch (err) {
      alert(err.message || 'Gagal membatalkan usulan');
    } finally {
      actionLoading = false;
    }
  }

  async function handleKirimRevisi() {
    modalError = '';
    if (!revisiAlasan || revisiAlasan.trim().length < 5) {
      modalError = 'Alasan perbaikan wajib diisi minimal 5 karakter';
      return;
    }

    actionLoading = true;
    try {
      const fd = new FormData();
      fd.append('alasan', revisiAlasan);
      fd.append('dataBaru', JSON.stringify(revisiDataBaru));
      revisiFiles.forEach(f => fd.append('lampiran', f));

      await portalApi.revisiUsulan(id, fd);
      showRevisiModal = false;
      await loadDetail();
    } catch (err) {
      modalError = err.message || 'Gagal mengirim revisi usulan';
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
    loadDetail();
  });
</script>

<svelte:head>
  <title>Detail Usulan {usulan?.nomorUsulan || ''} — Portal Pegawai</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
  <!-- Back Button & Header -->
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <a
        href="/portal/usulan"
        class="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </a>
      <div>
        <h1 class="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>Usulan {usulan?.nomorUsulan || 'Perbaikan'}</span>
          {#if usulan}
            <span class={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${statusColors[usulan.status]}`}>
              {usulan.status.replace('_', ' ')}
            </span>
          {/if}
        </h1>
        <p class="text-xs text-slate-500">Diajukan pada {formatDate(usulan?.createdAt)}</p>
      </div>
    </div>

    <!-- Actions -->
    {#if usulan}
      <div class="flex items-center gap-2">
        {#if usulan.status === 'DIAJUKAN'}
          <button
            on:click={handleBatalkan}
            disabled={actionLoading}
            class="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition disabled:opacity-50"
          >
            Batalkan Usulan
          </button>
        {/if}

        {#if usulan.status === 'PERLU_PERBAIKAN'}
          <button
            on:click={() => (showRevisiModal = true)}
            disabled={actionLoading}
            class="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            Kirim Revisi
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
      <div class="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-sm text-slate-500 font-medium">Memuat detail usulan...</p>
    </div>
  {:else if errorMsg}
    <div class="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 text-sm">
      {errorMsg}
    </div>
  {:else if usulan}
    <!-- Catatan Verifikator Alert jika ada -->
    {#if usulan.catatanVerifikator}
      <div class={`p-4 rounded-xl border flex items-start gap-3 ${usulan.status === 'PERLU_PERBAIKAN' ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
        <svg class="w-5 h-5 shrink-0 mt-0.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider">Catatan Verifikator BKPSDM:</h4>
          <p class="text-sm mt-1">{usulan.catatanVerifikator}</p>
        </div>
      </div>
    {/if}

    <!-- Metadata Ringkasan -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
      <div>
        <span class="text-slate-400 font-medium block mb-1">Kategori:</span>
        <span class="font-semibold text-slate-800">{kategoriLabels[usulan.kategori] || usulan.kategori}</span>
      </div>
      <div>
        <span class="text-slate-400 font-medium block mb-1">Aksi:</span>
        <span class="font-semibold text-slate-800">{usulan.aksi}</span>
      </div>
      <div>
        <span class="text-slate-400 font-medium block mb-1">Terakhir Diperbarui:</span>
        <span class="font-semibold text-slate-800">{formatDate(usulan.updatedAt)}</span>
      </div>
      <div>
        <span class="text-slate-400 font-medium block mb-1">Lampiran:</span>
        <span class="font-semibold text-slate-800">{usulan.lampiran?.length || 0} Berkas</span>
      </div>
      <div class="col-span-2 sm:col-span-4 border-t border-slate-100 pt-3">
        <span class="text-slate-400 font-medium block mb-1">Alasan Pengajuan:</span>
        <p class="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{usulan.alasan}</p>
      </div>
    </div>

    <!-- Perbandingan Data Lama vs Data Baru -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-800">Perbandingan Data Lama vs Data Baru</h3>
        <span class="text-xs text-slate-500">Nilai yang diusulkan oleh pegawai</span>
      </div>
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Kolom Data Lama -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span class="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <h4 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Data Lama di Sistem</h4>
          </div>
          {#if !usulan.dataLama || Object.keys(usulan.dataLama).length === 0}
            <p class="text-xs text-slate-400 italic">Tidak ada data sebelumnya (Penambahan data baru)</p>
          {:else}
            <div class="space-y-2">
              {#each Object.entries(usulan.dataLama) as [k, val]}
                <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span class="text-slate-400 block font-mono">{k}</span>
                  <span class="font-medium text-slate-700">{val !== null && val !== undefined && val !== '' ? String(val) : '-'}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Kolom Data Baru -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h4 class="text-xs font-bold text-emerald-700 uppercase tracking-wider">Data Usulan Baru</h4>
          </div>
          {#if !usulan.dataBaru || Object.keys(usulan.dataBaru).length === 0}
            <p class="text-xs text-rose-500 italic">Data dihapus dari sistem</p>
          {:else}
            <div class="space-y-2">
              {#each Object.entries(usulan.dataBaru) as [k, val]}
                <div class="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                  <span class="text-emerald-600 block font-mono font-medium">{k}</span>
                  <span class="font-semibold text-emerald-900">{val !== null && val !== undefined && val !== '' ? String(val) : '-'}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Lampiran Berkas -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <h3 class="text-sm font-bold text-slate-800">Dokumen Lampiran Pendukung</h3>
      {#if !usulan.lampiran || usulan.lampiran.length === 0}
        <p class="text-xs text-slate-400 italic">Tidak ada lampiran dokumen diunggah.</p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each usulan.lampiran as f}
            <a
              href={f.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200 hover:border-emerald-200 transition flex items-center justify-between gap-3 text-xs"
            >
              <div class="flex items-center gap-2.5 truncate">
                <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div class="truncate">
                  <p class="font-medium text-slate-800 truncate">{f.namaFile}</p>
                  <p class="text-[10px] text-slate-400">{(f.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <span class="text-emerald-700 font-semibold shrink-0">Lihat</span>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Timeline Riwayat Status -->
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
      <h3 class="text-sm font-bold text-slate-800">Riwayat Status Usulan</h3>
      <div class="relative border-l border-slate-200 ml-3 space-y-6 py-2">
        {#each usulan.riwayatStatus || [] as step}
          <div class="relative pl-6">
            <span class="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white"></span>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-800">{step.statusBaru}</span>
                <span class="text-[10px] text-slate-400">{formatDate(step.createdAt)}</span>
              </div>
              {#if step.catatan}
                <p class="text-xs text-slate-600 mt-1">{step.catatan}</p>
              {/if}
              {#if step.user}
                <p class="text-[10px] text-slate-400 mt-0.5">Oleh: {step.user.namaLengkap} ({step.user.role})</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- Modal Revisi -->
{#if showRevisiModal}
  <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
      <h3 class="text-base font-bold text-slate-800">Kirim Revisi Usulan Perbaikan</h3>
      <p class="text-xs text-slate-500">Perbarui data atau lampiran sesuai arahan catatan verifikator.</p>

      {#if modalError}
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {modalError}
        </div>
      {/if}

      <div class="space-y-3">
        {#each Object.entries(revisiDataBaru) as [k, val]}
          <div>
            <label for={`revisi-field-${k}`} class="block text-xs font-medium text-slate-700 mb-1 font-mono">{k}</label>
            <input
              id={`revisi-field-${k}`}
              type="text"
              bind:value={revisiDataBaru[k]}
              class="w-full text-xs rounded-xl border-slate-300 p-2.5"
            />
          </div>
        {/each}

        <div>
          <label for="revisi-alasan-input" class="block text-xs font-semibold text-slate-700 mb-1">Catatan Revisi dari Anda *</label>
          <textarea
            id="revisi-alasan-input"
            rows="3"
            bind:value={revisiAlasan}
            class="w-full text-xs rounded-xl border-slate-300 p-2.5"
            placeholder="Tuliskan perbaikan yang telah Anda lakukan..."
          ></textarea>
        </div>

        <div>
          <label for="revisi-lampiran-input" class="block text-xs font-semibold text-slate-700 mb-1">Unggah Dokumen Lampiran Baru (Bila Diperlukan)</label>
          <input
            id="revisi-lampiran-input"
            type="file"
            multiple
            on:change={(e) => (revisiFiles = Array.from(e.target.files || []))}
            class="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          on:click={() => (showRevisiModal = false)}
          class="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
        >
          Batal
        </button>
        <button
          type="button"
          on:click={handleKirimRevisi}
          disabled={actionLoading}
          class="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
        >
          {actionLoading ? 'Mengirim...' : 'Kirim Revisi'}
        </button>
      </div>
    </div>
  </div>
{/if}
