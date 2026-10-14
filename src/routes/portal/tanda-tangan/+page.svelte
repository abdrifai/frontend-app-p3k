<script>
  import { onMount } from 'svelte';
  import { portalApi } from '$lib/portalApi';
  import { addToast } from '$lib/toastStore';

  let listAntrian = [];
  let listRiwayat = [];
  let loading = true;
  let errorMsg = '';
  let activeTab = 'ANTRIAN'; // 'ANTRIAN' | 'RIWAYAT'

  // Modal Sign State
  let showSignModal = false;
  let selectedDokumen = null;
  let passphrase = '';
  let showPassphrase = false;
  let signing = false;
  let signError = '';

  // Modal Preview PDF
  let showPreviewModal = false;
  let previewUrl = '';
  let previewTitle = '';

  async function loadData() {
    loading = true;
    errorMsg = '';
    try {
      const [antrianRes, riwayatRes] = await Promise.allSettled([
        portalApi.getAntrianTte(),
        portalApi.getRiwayatTte()
      ]);

      if (antrianRes.status === 'fulfilled' && antrianRes.value?.data) {
        listAntrian = antrianRes.value.data;
      } else if (antrianRes.status === 'rejected') {
        console.error('Gagal memuat antrian TTE:', antrianRes.reason);
      }

      if (riwayatRes.status === 'fulfilled' && riwayatRes.value?.data) {
        listRiwayat = riwayatRes.value.data;
      } else if (riwayatRes.status === 'rejected') {
        console.error('Gagal memuat riwayat TTE:', riwayatRes.reason);
      }

      // Jika antrian kosong tapi ada riwayat, otomatis buka tab riwayat
      if (listAntrian.length === 0 && listRiwayat.length > 0 && activeTab === 'ANTRIAN') {
        activeTab = 'RIWAYAT';
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal memuat data dokumen TTE';
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
      const res = await portalApi.signDokumenTte(selectedDokumen.id, passphrase.trim());
      addToast(res.message || 'Tanda tangan elektronik berhasil dibubuhkan!', 'success');
      closeSignModal();
      activeTab = 'RIWAYAT'; // Arahkan ke tab riwayat agar pegawai langsung memantau proses Bupati
      await loadData();
    } catch (err) {
      signError = err.message || 'Gagal membubuhkan tanda tangan elektronik';
    } finally {
      signing = false;
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

  function formatDateTime(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB'
      );
    } catch {
      return isoStr;
    }
  }

  function hitungMasaKontrak(tglMulai, tglSelesai) {
    if (!tglMulai || !tglSelesai) return '-';
    try {
      const parse = (str) => {
        if (!str) return null;
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          const [y, m, d] = str.split('T')[0].split('-').map(Number);
          return new Date(y, m - 1, d);
        }
        if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
          const [d, m, y] = str.split('-').map(Number);
          return new Date(y, m - 1, d);
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      const start = parse(tglMulai);
      const end = parse(tglSelesai);
      if (!start || !end || end < start) return '-';

      const endInclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);

      let years = endInclusive.getFullYear() - start.getFullYear();
      let months = endInclusive.getMonth() - start.getMonth();
      let days = endInclusive.getDate() - start.getDate();

      if (days < 0) {
        months--;
      }
      if (months < 0) {
        years--;
        months += 12;
      }

      const parts = [];
      if (years > 0) parts.push(`${years} Tahun`);
      if (months > 0) parts.push(`${months} Bulan`);

      return parts.length > 0 ? parts.join(' ') : '1 Bulan';
    } catch {
      return '-';
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>Tanda Tangan Elektronik Kontrak - Portal Pegawai</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Sertifikasi BSrE - BSSN Republik Indonesia
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Tanda Tangan Elektronik Dokumen Kontrak</h1>
          <p class="text-sm text-slate-500 mt-1">
            Bubuhkan tanda tangan digital Anda dan pantau proses pengesahan final oleh Bupati Tojo Una-Una secara berkala.
          </p>
        </div>
        <button
          on:click={loadData}
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Segarkan Data
        </button>
      </div>
    </div>

    <!-- Alert / Petunjuk Alur 4 Tahap -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 text-blue-900 text-sm shadow-xs">
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="space-y-1.5 flex-1">
          <p class="font-bold text-blue-950 text-sm">Alur Resmi Penandatanganan Kontrak Perjanjian Kerja:</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div class="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-blue-100 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">1</span>
              <span><strong>Paraf BKPSDM</strong></span>
            </div>
            <div class="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-blue-100 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">2</span>
              <span><strong>Paraf Sekda</strong></span>
            </div>
            <div class="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-indigo-200 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">3</span>
              <span class="text-indigo-900 font-semibold">TTE Pegawai PPPK</span>
            </div>
            <div class="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-blue-100 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">4</span>
              <span><strong>TTE Final Bupati</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2 Tab Navigasi Interaktif -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Tab 1: Menunggu TTE Anda -->
      <button
        type="button"
        on:click={() => (activeTab = 'ANTRIAN')}
        class="text-left p-5 rounded-2xl transition-all duration-200 border-2 cursor-pointer relative overflow-hidden group shadow-sm
          {activeTab === 'ANTRIAN'
            ? 'bg-amber-50/60 border-amber-500 ring-4 ring-amber-400/20 shadow-md'
            : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md'}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider {activeTab === 'ANTRIAN' ? 'text-amber-800' : 'text-slate-600'}">
            Menunggu TTE Anda
          </span>
          {#if listAntrian.length > 0}
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          {/if}
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {listAntrian.length}
        </div>
        <p class="text-xs text-slate-500 mt-1">Dokumen kontrak yang siap Anda tandatangani dengan passphrase BSrE</p>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
          <span class={activeTab === 'ANTRIAN' ? 'text-amber-800 font-bold' : 'text-slate-400 group-hover:text-amber-700'}>
            {activeTab === 'ANTRIAN' ? '● Sedang Ditampilkan' : 'Klik untuk melihat antrian →'}
          </span>
          <span class="text-amber-600 font-mono text-xs">↗</span>
        </div>
      </button>

      <!-- Tab 2: Sudah Ditandatangani & Monitoring TTE Bupati -->
      <button
        type="button"
        on:click={() => (activeTab = 'RIWAYAT')}
        class="text-left p-5 rounded-2xl transition-all duration-200 border-2 cursor-pointer relative overflow-hidden group shadow-sm
          {activeTab === 'RIWAYAT'
            ? 'bg-emerald-50/60 border-emerald-500 ring-4 ring-emerald-400/20 shadow-md'
            : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider {activeTab === 'RIWAYAT' ? 'text-emerald-800' : 'text-slate-600'}">
            Sudah Ditandatangani & Pantau Bupati
          </span>
          <div class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {listRiwayat.length}
        </div>
        <p class="text-xs text-slate-500 mt-1">Pantau dokumen yang telah Anda tanda tangani hingga pengesahan final Bupati</p>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
          <span class={activeTab === 'RIWAYAT' ? 'text-emerald-800 font-bold' : 'text-slate-400 group-hover:text-emerald-700'}>
            {activeTab === 'RIWAYAT' ? '● Sedang Ditampilkan' : 'Klik untuk memantau status Bupati →'}
          </span>
          <span class="text-emerald-600 font-mono text-xs">↗</span>
        </div>
      </button>
    </div>

    <!-- State Loading & Error -->
    {#if loading}
      <div class="bg-white rounded-2xl p-14 border border-slate-200 text-center shadow-sm">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        <p class="text-slate-600 text-sm mt-3 font-medium">Memeriksa status dokumen kontrak Anda...</p>
      </div>
    {:else if errorMsg}
      <div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 text-center shadow-sm">
        <p class="font-medium">{errorMsg}</p>
        <button on:click={loadData} class="mt-3 text-xs bg-rose-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-rose-700 font-semibold shadow-xs">
          Coba Lagi
        </button>
      </div>
    {:else if activeTab === 'ANTRIAN'}
      <!-- TAB 1: KONTEN DOKUMEN MENUNGGU TTE PEGAWAI -->
      {#if listAntrian.length === 0}
        <div class="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
          <div class="w-16 h-16 mx-auto mb-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800">Tidak Ada Dokumen Menunggu TTE Anda</h3>
          <p class="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Semua draf kontrak perpanjangan perjanjian kerja telah Anda tanda tangani atau belum ada berkas baru dari instansi.
          </p>
          {#if listRiwayat.length > 0}
            <button
              type="button"
              on:click={() => (activeTab = 'RIWAYAT')}
              class="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition inline-flex items-center gap-1.5"
            >
              <span>Pantau Status Penandatanganan Bupati ({listRiwayat.length} Berkas)</span>
              <span>→</span>
            </button>
          {/if}
        </div>
      {:else}
        <div class="grid grid-cols-1 gap-5">
          {#each listAntrian as doc}
            <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 hover:shadow-md transition-all">
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div class="space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Kontrak Ke-{doc.kontrakKe || '1'}
                    </span>
                    <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Menunggu Tindakan TTE Anda
                    </span>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-slate-800">
                      Nomor Kontrak: <span class="font-mono text-indigo-700">{doc.nomorKontrak || 'Draf Kontrak'}</span>
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs sm:text-sm text-slate-600 mt-2">
                      <p>
                        <span class="text-slate-400">Masa Kontrak:</span>
                        <span class="font-semibold text-slate-800">{hitungMasaKontrak(doc.tanggalMulai, doc.tanggalSelesai)}</span>
                      </p>
                      <p>
                        <span class="text-slate-400">Periode:</span>
                        <span class="font-medium text-slate-700">{formatDate(doc.tanggalMulai)} s/d {formatDate(doc.tanggalSelesai)}</span>
                      </p>
                      <p>
                        <span class="text-slate-400">Jabatan:</span>
                        <span class="font-medium text-slate-700">{doc.dataP3k?.jabatanNama || '-'}</span>
                      </p>
                      <p>
                        <span class="text-slate-400">Unit Kerja:</span>
                        <span class="font-medium text-slate-700">{doc.dataP3k?.unorNama || '-'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  {#if doc.pdfSignedUrl || doc.pdfDraftUrl}
                    <button
                      type="button"
                      on:click={() => openPreview(doc.pdfSignedUrl || doc.pdfDraftUrl, doc.nomorKontrak || 'Draf Kontrak')}
                      class="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all inline-flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Lihat Draf PDF
                    </button>
                  {/if}

                  <button
                    type="button"
                    on:click={() => openSignModal(doc)}
                    class="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-sm hover:shadow transition-all inline-flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Tanda Tangani (TTE BSrE)
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <!-- TAB 2: RIWAYAT & MONITORING PROSES TTE BUPATI -->
      {#if listRiwayat.length === 0}
        <div class="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
          <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-200">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800">Belum Ada Dokumen Ditandatangani</h3>
          <p class="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Setelah Anda menandatangani draf kontrak pada tab "Menunggu TTE Anda", dokumen tersebut akan otomatis muncul di sini untuk Anda pantau hingga selesai ditandatangani oleh Bupati.
          </p>
          {#if listAntrian.length > 0}
            <button
              type="button"
              on:click={() => (activeTab = 'ANTRIAN')}
              class="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Lihat Antrian TTE Anda ({listAntrian.length} Dokumen)
            </button>
          {/if}
        </div>
      {:else}
        <div class="space-y-6">
          {#each listRiwayat as doc}
            {@const stepKaban = doc.steps?.find(s => s.key === 'PARAF_KABAN')}
            {@const stepSekda = doc.steps?.find(s => s.key === 'PARAF_SEKDA')}
            {@const stepPegawai = doc.steps?.find(s => s.key === 'TTE_PEGAWAI')}
            {@const stepBupati = doc.steps?.find(s => s.key === 'TTE_BUPATI')}
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <!-- Header Baris Dokumen -->
              <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Kontrak Ke-{doc.kontrakKe || '1'}
                    </span>

                    {#if doc.statusTte === 'TTE_SELESAI'}
                      <span class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        Selesai & Sah Final Ditandatangani Bupati
                      </span>
                    {:else if doc.statusTte === 'MENUNGGU_TTE_BUPATI'}
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                        <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        Sedang Menunggu TTE Bupati Tojo Una-Una
                      </span>
                    {:else if doc.statusTte === 'DITOLAK_PENANDATANGAN'}
                      <span class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
                        <svg class="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Dokumen Dikembalikan / Ditolak
                      </span>
                    {:else}
                      <span class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                        {doc.statusTte?.replaceAll('_', ' ') || 'Sedang Diproses'}
                      </span>
                    {/if}
                  </div>

                  <h3 class="text-lg font-bold text-slate-800">
                    Nomor Kontrak: <span class="font-mono text-indigo-700">{doc.nomorKontrak || 'Draf Kontrak'}</span>
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600">
                    <p><span class="text-slate-400">Masa Kontrak:</span> <span class="font-bold text-slate-800">{hitungMasaKontrak(doc.tanggalMulai, doc.tanggalSelesai)}</span></p>
                    <p><span class="text-slate-400">Periode:</span> <span class="font-medium text-slate-700">{formatDate(doc.tanggalMulai)} s/d {formatDate(doc.tanggalSelesai)}</span></p>
                    <p><span class="text-slate-400">Pembaruan Terakhir:</span> <span class="font-medium text-slate-700">{formatDateTime(doc.updatedAt || doc.createdAt)}</span></p>
                  </div>
                </div>

                <!-- Aksi Tombol -->
                <div class="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                  <!-- Preview PDF -->
                  {#if doc.pdfSignedUrl || doc.finalFileUrl || doc.pdfDraftUrl}
                    <button
                      type="button"
                      on:click={() => openPreview(doc.pdfSignedUrl || doc.finalFileUrl || doc.pdfDraftUrl, doc.nomorKontrak || 'Dokumen Kontrak')}
                      class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Pratinjau PDF
                    </button>
                  {/if}

                  <!-- Unduh Dokumen Final Sah jika selesai -->
                  {#if doc.statusTte === 'TTE_SELESAI' && (doc.pdfSignedUrl || doc.finalFileUrl)}
                    <a
                      href={doc.pdfSignedUrl || doc.finalFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      class="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-sm"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh Kontrak Sah (PDF)
                    </a>
                  {/if}

                  <!-- Tautan Verifikasi Publik BSrE -->
                  <a
                    href="/portal/verifikasi/{doc.id}"
                    target="_blank"
                    rel="noreferrer"
                    class="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition flex items-center gap-1 shadow-xs"
                    title="Buka halaman verifikasi digital sertifikat BSrE"
                  >
                    <span>Verifikasi BSrE</span>
                    <span class="text-xs">↗</span>
                  </a>
                </div>
              </div>

              <!-- Catatan Penolakan Jika Ada -->
              {#if doc.catatanTte}
                <div class="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  <span class="font-bold">Catatan Pengembalian / Penolakan:</span> {doc.catatanTte}
                </div>
              {/if}

              <!-- Visual Stepper / Status Tracking Proses Penandatanganan Bupati -->
              <div class="mt-5 pt-4">
                <div class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Progres Alur Penandatanganan Elektronik:</span>
                  {#if doc.statusTte === 'TTE_SELESAI'}
                    <span class="text-emerald-700 font-bold normal-case text-xs flex items-center gap-1">
                      ● Selesai 100% (Kontrak Sah & Aktif)
                    </span>
                  {:else if doc.statusTte === 'MENUNGGU_TTE_BUPATI'}
                    <span class="text-amber-700 font-bold normal-case text-xs flex items-center gap-1">
                      ● Menunggu Tahap Akhir (TTE Bupati)
                    </span>
                  {/if}
                </div>

                <!-- Stepper Grid 4 Tahap -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <!-- Tahap 1: Paraf Kaban -->
                  <div class="p-3.5 rounded-xl border transition-all
                    {stepKaban?.status === 'SELESAI'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-500'}">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold uppercase tracking-wider">1. Paraf BKPSDM</span>
                      {#if stepKaban?.status === 'SELESAI'}
                        <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                      {:else}
                        <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">⏳</span>
                      {/if}
                    </div>
                    <p class="text-xs font-semibold mt-2">{stepKaban?.pejabat || 'Kepala BKPSDM'}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">
                      {stepKaban?.status === 'SELESAI' ? (formatDateTime(stepKaban?.waktu) || 'Selesai') : 'Belum diparaf'}
                    </p>
                  </div>

                  <!-- Tahap 2: Paraf Sekda -->
                  <div class="p-3.5 rounded-xl border transition-all
                    {stepSekda?.status === 'SELESAI'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-500'}">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold uppercase tracking-wider">2. Paraf Sekda</span>
                      {#if stepSekda?.status === 'SELESAI'}
                        <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                      {:else}
                        <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">⏳</span>
                      {/if}
                    </div>
                    <p class="text-xs font-semibold mt-2">{stepSekda?.pejabat || 'Sekretaris Daerah'}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5">
                      {stepSekda?.status === 'SELESAI' ? (formatDateTime(stepSekda?.waktu) || 'Selesai') : 'Belum diparaf'}
                    </p>
                  </div>

                  <!-- Tahap 3: TTE Pegawai -->
                  <div class="p-3.5 rounded-xl border bg-emerald-50/60 border-emerald-200 text-emerald-950">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-900">3. TTE Pegawai Anda</span>
                      <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                    </div>
                    <p class="text-xs font-semibold mt-2 text-emerald-900">Telah Anda Tandatangani</p>
                    <p class="text-[11px] text-emerald-700 mt-0.5">
                      {formatDateTime(stepPegawai?.waktu) || 'Selesai Otorisasi BSrE'}
                    </p>
                  </div>

                  <!-- Tahap 4: TTE Bupati (FOKUS MONITORING) -->
                  <div class="p-3.5 rounded-xl border transition-all relative overflow-hidden
                    {doc.statusTte === 'TTE_SELESAI'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300'
                      : doc.statusTte === 'MENUNGGU_TTE_BUPATI'
                      ? 'bg-amber-50/80 border-amber-400 text-amber-950 ring-2 ring-amber-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500'}">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-extrabold uppercase tracking-wider
                        {doc.statusTte === 'TTE_SELESAI' ? 'text-emerald-900' : doc.statusTte === 'MENUNGGU_TTE_BUPATI' ? 'text-amber-900' : 'text-slate-600'}">
                        4. TTE Bupati (Final)
                      </span>
                      {#if doc.statusTte === 'TTE_SELESAI'}
                        <span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">✓</span>
                      {:else if doc.statusTte === 'MENUNGGU_TTE_BUPATI'}
                        <span class="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold animate-pulse">⏳</span>
                      {:else}
                        <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">○</span>
                      {/if}
                    </div>

                    <p class="text-xs font-bold mt-2">Bupati Tojo Una-Una</p>

                    {#if doc.statusTte === 'TTE_SELESAI'}
                      <p class="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        {formatDateTime(stepBupati?.waktu || doc.updatedAt)} (Sah BSrE)
                      </p>
                    {:else if doc.statusTte === 'MENUNGGU_TTE_BUPATI'}
                      <p class="text-[11px] text-amber-800 font-bold mt-0.5 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                        Sedang Menunggu TTE Bupati
                      </p>
                    {:else}
                      <p class="text-[11px] text-slate-400 mt-0.5">Menunggu giliran</p>
                    {/if}
                  </div>
                </div>

                <!-- Banner Informasi Status Pengesahan Bupati -->
                {#if doc.statusTte === 'MENUNGGU_TTE_BUPATI'}
                  <div class="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p class="font-bold text-amber-950">Status Saat Ini: Menunggu Pengesahan Akhir oleh Bupati</p>
                      <p class="text-amber-800 text-[11px] mt-0.5">
                        Tanda tangan elektronik Anda telah berhasil dicatat. Dokumen saat ini telah masuk ke portal penandatanganan elektronik Bupati Tojo Una-Una untuk dibubuhkan tanda tangan akhir BSrE. Anda dapat mengecek kembali halaman ini secara berkala.
                      </p>
                    </div>
                  </div>
                {:else if doc.statusTte === 'TTE_SELESAI'}
                  <div class="mt-4 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                    <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <p class="font-bold text-emerald-950">Pengesahan Kontrak Selesai & Sah Secara Hukum</p>
                      <p class="text-emerald-800 text-[11px] mt-0.5">
                        Bupati Tojo Una-Una telah menandatangani kontrak perpanjangan ini secara elektronik dengan segel digital BSrE BSSN. Dokumen resmi dapat Anda unduh atau lihat melalui tombol di atas.
                      </p>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Modal Masukkan Passphrase BSrE -->
{#if showSignModal && selectedDokumen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 transform transition-all">
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">Verifikasi Passphrase BSrE</h3>
            <p class="text-xs text-slate-400">Otorisasi Tanda Tangan Elektronik</p>
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
          <p class="font-medium text-slate-700">Nomor Kontrak: {selectedDokumen.nomorKontrak || '-'}</p>
          <p class="mt-0.5">Masa Kontrak: {selectedDokumen.tanggalMulai} s/d {selectedDokumen.tanggalSelesai}</p>
        </div>

        {#if signError}
          <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {signError}
          </div>
        {/if}

        <div class="space-y-1.5">
          <label for="passphrase-input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Passphrase Sertifikat Elektronik
          </label>
          <div class="relative">
            <input
              id="passphrase-input"
              type={showPassphrase ? 'text' : 'password'}
              bind:value={passphrase}
              placeholder="Masukkan passphrase BSrE Anda..."
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
          <p class="text-[11px] text-slate-400">
            Passphrase Anda dikirim secara aman langsung ke layanan BSrE dan tidak pernah disimpan di sistem.
          </p>
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
          class="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
        >
          {#if signing}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Memproses TTE...
          {:else}
            Bubuhkan TTE
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Preview Dokumen PDF -->
{#if showPreviewModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col border border-slate-200 overflow-hidden">
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
          Tutup Preview
        </button>
      </div>
    </div>
  </div>
{/if}
