<script>
  import { onMount } from 'svelte';
  import { tteApi } from '$lib/tteApi';
  import { addToast } from '$lib/toastStore';
  import { authStore } from '$lib/store';

  let listAntrian = [];
  let pagination = { page: 1, limit: 10, total: 0, totalPages: 1 };
  let loading = true;
  let errorMsg = '';
  let searchQuery = '';

  // Modal Sign/Paraf
  let showSignModal = false;
  let selectedDokumen = null;
  let passphrase = '';
  let showPassphrase = false;
  let signing = false;
  let signError = '';

  // Modal Tolak
  let showTolakModal = false;
  let catatanTolak = '';
  let rejecting = false;
  let rejectError = '';

  // Modal Preview PDF
  let showPreviewModal = false;
  let previewUrl = '';
  let previewTitle = '';

  const statusTteLabels = {
    MENUNGGU_PARAF_KABAN: { label: 'Menunggu Paraf Kepala BKPSDM', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
    MENUNGGU_PARAF_SEKDA: { label: 'Menunggu Paraf Sekda', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
    MENUNGGU_TTE_BUPATI: { label: 'Menunggu TTE Bupati (Final)', badge: 'bg-purple-100 text-purple-800 border-purple-300' }
  };

  async function loadData(page = 1) {
    loading = true;
    errorMsg = '';
    try {
      const res = await tteApi.getAntrian({
        search: searchQuery,
        page,
        limit: 10
      });
      if (res && res.data) {
        listAntrian = res.data;
        pagination = res.pagination || { page: 1, limit: 10, total: res.data.length, totalPages: 1 };
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal memuat antrian dokumen TTE';
    } finally {
      loading = false;
    }
  }

  function openSignModal(doc) {
    selectedDokumen = doc;
    passphrase = '';
    showPassphrase = false;
    signError = '';
    showSignModal = true;
  }

  function closeSignModal() {
    showSignModal = false;
    selectedDokumen = null;
    passphrase = '';
    signError = '';
  }

  function openTolakModal(doc) {
    selectedDokumen = doc;
    catatanTolak = '';
    rejectError = '';
    showTolakModal = true;
  }

  function closeTolakModal() {
    showTolakModal = false;
    selectedDokumen = null;
    catatanTolak = '';
    rejectError = '';
  }

  function openPreview(url, title) {
    previewUrl = url;
    previewTitle = title;
    showPreviewModal = true;
  }

  function closePreview() {
    showPreviewModal = false;
    previewUrl = '';
  }

  async function handleSign() {
    if (!passphrase.trim()) {
      signError = 'Passphrase BSrE wajib diisi';
      return;
    }

    signing = true;
    signError = '';

    try {
      const res = await tteApi.signDokumen(selectedDokumen.id, passphrase.trim());
      addToast(res.message || 'Penandatanganan/Paraf elektronik berhasil!', 'success');
      closeSignModal();
      await loadData(pagination.page);
    } catch (err) {
      signError = err.message || 'Gagal membubuhkan tanda tangan elektronik';
    } finally {
      signing = false;
    }
  }

  async function handleTolak() {
    if (!catatanTolak.trim()) {
      rejectError = 'Alasan / catatan penolakan wajib diisi';
      return;
    }

    rejecting = true;
    rejectError = '';

    try {
      const res = await tteApi.tolakDokumen(selectedDokumen.id, catatanTolak.trim());
      addToast(res.message || 'Dokumen berhasil ditolak', 'success');
      closeTolakModal();
      await loadData(pagination.page);
    } catch (err) {
      rejectError = err.message || 'Gagal menolak dokumen';
    } finally {
      rejecting = false;
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>Verifikasi & Penandatanganan Kontrak (TTE) - BKPSDM</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            TTE BSrE - Otoritas Pejabat Penandatangan
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Antrian TTE & Paraf Dokumen Kontrak</h1>
          <p class="text-sm text-slate-500 mt-1">
            Daftar perjanjian kerja PPPK yang menunggu pembubuhan Paraf / Tanda Tangan Elektronik sesuai kewenangan Anda.
          </p>
        </div>

        <button
          on:click={() => loadData(pagination.page)}
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Muat Ulang
        </button>
      </div>

      <!-- Search Input -->
      <div class="mt-6">
        <form on:submit|preventDefault={() => loadData(1)} class="flex gap-2">
          <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Cari berdasarkan nama pegawai, NIP, atau nomor kontrak..."
              class="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
          >
            Cari
          </button>
        </form>
      </div>
    </div>

    <!-- Data Table / List -->
    {#if loading}
      <div class="bg-white rounded-2xl p-12 border border-slate-200 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        <p class="text-slate-500 text-sm mt-3 font-medium">Memuat antrian dokumen...</p>
      </div>
    {:else if errorMsg}
      <div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 text-center">
        <p class="font-medium">{errorMsg}</p>
        <button on:click={() => loadData(1)} class="mt-3 text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700">Coba Lagi</button>
      </div>
    {:else if listAntrian.length === 0}
      <div class="bg-white rounded-2xl p-12 border border-slate-200 text-center">
        <div class="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-slate-800">Antrian Kosong</h3>
        <p class="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Tidak ada dokumen kontrak kerja yang memerlukan paraf atau tanda tangan Anda saat ini.
        </p>
      </div>
    {:else}
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th class="py-4 px-6">Pegawai</th>
                <th class="py-4 px-6">Jabatan & Unit</th>
                <th class="py-4 px-6">Informasi Kontrak</th>
                <th class="py-4 px-6">Status Tahap</th>
                <th class="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              {#each listAntrian as doc}
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-4 px-6">
                    <p class="font-bold text-slate-800">{doc.dataP3k?.nama || '-'}</p>
                    <p class="text-xs text-slate-500 mt-0.5">NIP: {doc.dataP3k?.nipBaru || '-'}</p>
                    <p class="text-xs text-slate-400">NIK: {doc.dataP3k?.nik || '-'}</p>
                  </td>
                  <td class="py-4 px-6">
                    <p class="font-medium text-slate-700">{doc.dataP3k?.jabatanNama || '-'}</p>
                    <p class="text-xs text-slate-500 mt-0.5">{doc.dataP3k?.unorNama || '-'}</p>
                  </td>
                  <td class="py-4 px-6">
                    <p class="font-semibold text-slate-800">{doc.nomorKontrak || 'Draf Kontrak'}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Kontrak Ke-{doc.kontrakKe || '1'}</p>
                    <p class="text-xs text-slate-400">Periode: {formatDate(doc.tanggalMulai)} s/d {formatDate(doc.tanggalSelesai)}</p>
                  </td>
                  <td class="py-4 px-6">
                    {#if statusTteLabels[doc.statusTte]}
                      <span class="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border {statusTteLabels[doc.statusTte].badge}">
                        {statusTteLabels[doc.statusTte].label}
                      </span>
                    {:else}
                      <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700">
                        {doc.statusTte}
                      </span>
                    {/if}
                  </td>
                  <td class="py-4 px-6 text-right space-x-2">
                    {#if doc.pdfSignedUrl || doc.pdfDraftUrl}
                      <button
                        on:click={() => openPreview(doc.pdfSignedUrl || doc.pdfDraftUrl, doc.nomorKontrak || 'Dokumen Kontrak')}
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 inline-flex items-center gap-1.5"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Lihat PDF
                      </button>
                    {/if}

                    <button
                      on:click={() => openTolakModal(doc)}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    >
                      Tolak
                    </button>

                    <button
                      on:click={() => openSignModal(doc)}
                      class="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    >
                      {#if doc.statusTte === 'MENUNGGU_TTE_BUPATI'}
                        Bubuhkan TTE Final
                      {:else}
                        Bubuhkan Paraf
                      {/if}
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        {#if pagination.totalPages > 1}
          <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Halaman {pagination.page} dari {pagination.totalPages} (Total {pagination.total} dokumen)
            </div>
            <div class="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                on:click={() => loadData(pagination.page - 1)}
                class="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                on:click={() => loadData(pagination.page + 1)}
                class="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!-- Modal Masukkan Passphrase BSrE -->
{#if showSignModal && selectedDokumen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100">
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">
              {selectedDokumen.statusTte === 'MENUNGGU_TTE_BUPATI' ? 'Tanda Tangan Elektronik Final' : 'Pembubuhan Paraf Elektronik'}
            </h3>
            <p class="text-xs text-slate-400">Verifikasi Passphrase BSrE BSSN</p>
          </div>
        </div>
        <button on:click={closeSignModal} class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="py-5 space-y-4">
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600">
          <p class="font-medium text-slate-700">Pegawai: {selectedDokumen.dataP3k?.nama} (NIP: {selectedDokumen.dataP3k?.nipBaru})</p>
          <p class="mt-0.5">Nomor Kontrak: {selectedDokumen.nomorKontrak || '-'}</p>
        </div>

        {#if signError}
          <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {signError}
          </div>
        {/if}

        <div class="space-y-1.5">
          <label for="passphrase-pejabat-input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Passphrase Sertifikat BSrE
          </label>
          <div class="relative">
            <input
              id="passphrase-pejabat-input"
              type={showPassphrase ? 'text' : 'password'}
              bind:value={passphrase}
              placeholder="Masukkan passphrase sertifikat Anda..."
              disabled={signing}
              class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
              on:keydown={(e) => e.key === 'Enter' && handleSign()}
            />
            <button
              type="button"
              on:click={() => (showPassphrase = !showPassphrase)}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {#if showPassphrase}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              {/if}
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          on:click={closeSignModal}
          disabled={signing}
          class="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
        >
          Batal
        </button>
        <button
          type="button"
          on:click={handleSign}
          disabled={signing}
          class="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
        >
          {#if signing}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Memproses...
          {:else}
            Bubuhkan Sekarang
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Tolak Dokumen -->
{#if showTolakModal && selectedDokumen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100">
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 class="text-base font-bold text-rose-700">Tolak Dokumen Kontrak</h3>
        <button on:click={closeTolakModal} class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="py-5 space-y-4">
        {#if rejectError}
          <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {rejectError}
          </div>
        {/if}

        <div>
          <label for="catatan-tolak-input" class="block text-xs font-bold text-slate-700 mb-1.5">
            Catatan / Alasan Penolakan
          </label>
          <textarea
            id="catatan-tolak-input"
            bind:value={catatanTolak}
            rows="3"
            placeholder="Tuliskan catatan mengapa dokumen ini ditolak/dikembalikan..."
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
          ></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          on:click={closeTolakModal}
          disabled={rejecting}
          class="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
        >
          Batal
        </button>
        <button
          type="button"
          on:click={handleTolak}
          disabled={rejecting}
          class="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
        >
          {#if rejecting}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Memproses...
          {:else}
            Tolak Dokumen
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Preview PDF -->
{#if showPreviewModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[85vh] flex flex-col border border-slate-200 overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 class="text-sm font-bold text-slate-800 truncate">Preview Dokumen: {previewTitle}</h3>
        <button on:click={closePreview} class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="flex-1 bg-slate-100 relative">
        <iframe src={previewUrl} title={previewTitle} class="w-full h-full border-none"></iframe>
      </div>
      <div class="px-6 py-3 border-t border-slate-100 bg-white flex justify-end">
        <button on:click={closePreview} class="px-4 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100">
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}
