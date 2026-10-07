<script>
  import { onMount } from "svelte";
  import { tteApi } from "$lib/tteApi";
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";

  let loading = $state(true);
  let antrianList = $state([]);
  let pejabatInfo = $state(null);
  let pagination = $state({ total: 0, page: 1, limit: 10, totalPages: 1 });
  let searchQuery = $state("");
  let notRegisteredError = $state(false);

  // Statistik Ringkasan
  let stats = $state({
    antrianCount: 0,
    riwayatSuksesCount: 0,
    riwayatTolakCount: 0,
    totalSelesaiPemda: 0
  });

  // Modal Sign (Passphrase)
  let isSignModalOpen = $state(false);
  let selectedDokumen = $state(null);
  let passphrase = $state("");
  let showPassphrase = $state(false);
  let isSigning = $state(false);

  // Modal Tolak
  let isTolakModalOpen = $state(false);
  let tolakCatatan = $state("");
  let isRejecting = $state(false);

  // Modal Preview PDF
  let isPreviewModalOpen = $state(false);
  let previewPdfUrl = $state("");
  let previewJudul = $state("");

  const formatTanggal = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const hitungMasaKontrak = (tglMulai, tglSelesai) => {
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
  };

  const getJabatanLabel = (jabatan) => {
    switch (jabatan) {
      case "BUPATI":
        return "Bupati Tojo Una-Una";
      case "SEKDA":
        return "Sekretaris Daerah";
      case "KEPALA_BKPSDM":
        return "Kepala BKPSDM";
      default:
        return jabatan || "Pejabat Penandatangan";
    }
  };

  const loadData = async () => {
    loading = true;
    notRegisteredError = false;
    try {
      const [antrianRes, statsRes] = await Promise.all([
        tteApi.getAntrian({ search: searchQuery, page: pagination.page, limit: pagination.limit }),
        tteApi.getStatistik()
      ]);

      if (antrianRes.success) {
        antrianList = antrianRes.data || [];
        pejabatInfo = antrianRes.pejabat;
        pagination = antrianRes.pagination || pagination;
      }

      if (statsRes.success) {
        stats = statsRes.data || stats;
        if (!pejabatInfo && statsRes.pejabat) {
          pejabatInfo = statsRes.pejabat;
        }
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("tidak terdaftar sebagai pejabat penandatangan aktif")) {
        notRegisteredError = true;
      } else {
        addToast(msg || "Gagal memuat data antrian TTE", "error");
      }
    } finally {
      loading = false;
    }
  };

  const handleSearch = () => {
    pagination.page = 1;
    loadData();
  };

  // Action Sign
  const openSignModal = (doc) => {
    selectedDokumen = doc;
    passphrase = "";
    isSignModalOpen = true;
  };

  const submitSign = async () => {
    if (!passphrase.trim()) {
      addToast("Passphrase BSrE wajib diisi", "error");
      return;
    }

    isSigning = true;
    try {
      const res = await tteApi.signDokumen(selectedDokumen.id, passphrase.trim());
      if (res.success) {
        addToast(
          res.message || "Tanda tangan/paraf elektronik berhasil dibubuhkan",
          "success"
        );
        isSignModalOpen = false;
        loadData();
      } else {
        addToast(res.message || "Gagal membubuhkan tanda tangan", "error");
      }
    } catch (err) {
      addToast(err.message || "Terjadi kesalahan saat memproses TTE", "error");
    } finally {
      isSigning = false;
    }
  };

  // Action Tolak
  const openTolakModal = (doc) => {
    selectedDokumen = doc;
    tolakCatatan = "";
    isTolakModalOpen = true;
  };

  const submitTolak = async () => {
    if (!tolakCatatan.trim()) {
      addToast("Catatan alasan penolakan wajib diisi", "error");
      return;
    }

    isRejecting = true;
    try {
      const res = await tteApi.tolakDokumen(selectedDokumen.id, tolakCatatan.trim());
      if (res.success) {
        addToast("Dokumen berhasil dikembalikan dengan catatan", "info");
        isTolakModalOpen = false;
        loadData();
      } else {
        addToast(res.message || "Gagal menolak dokumen", "error");
      }
    } catch (err) {
      addToast(err.message || "Terjadi kesalahan saat memproses penolakan", "error");
    } finally {
      isRejecting = false;
    }
  };

  // Preview PDF
  const openPreview = (doc) => {
    previewPdfUrl = doc.pdfSignedUrl || doc.pdfDraftUrl || "";
    previewJudul = `Dokumen Kontrak — ${doc.dataP3k?.nama || doc.nomorKontrak}`;
    if (!previewPdfUrl) {
      addToast("Berkas PDF belum tersedia untuk dipratinjau", "warning");
      return;
    }
    if (previewPdfUrl.toLowerCase().endsWith('.docx')) {
      addToast("Berkas masih berformat Word (.docx) dan belum dikonversi ke PDF.", "warning");
      window.open(previewPdfUrl, '_blank');
      return;
    }
    isPreviewModalOpen = true;
  };

  onMount(() => {
    loadData();
  });
</script>

<div class="space-y-6">
  {#if notRegisteredError}
    <!-- Notifikasi Jika Akun Belum Ditautkan -->
    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="flex-grow">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-200/60 text-amber-900 border border-amber-300 mb-2">
            Pemberitahuan Penugasan Pejabat
          </span>
          <h3 class="text-lg font-bold text-slate-900 mb-1">
            Akun Anda Belum Ditautkan Sebagai Pejabat Aktif
          </h3>
          <p class="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Akun <strong>{$authStore.user?.namaLengkap || $authStore.user?.username}</strong> memiliki hak akses tanda tangan, namun belum dipetakan ke profil pejabat (Kepala BKPSDM, Sekretaris Daerah, atau Bupati) di pengaturan sistem.
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-3">
            <button
              onclick={loadData}
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm transition"
            >
              Coba Muat Ulang
            </button>
            <a
              href="/setting/pejabat-penandatangan"
              class="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition inline-flex items-center gap-2 shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Kelola di Pengaturan Pejabat Penandatangan
            </a>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Identitas Otoritas Pejabat Banner (Light Elegant) -->
    <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 shadow-sm">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase tracking-wider font-bold text-blue-700">Otoritas Penandatanganan Resmi</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {pejabatInfo?.jenis === 'TTE' ? 'TANDA TANGAN UTAMA (FINAL)' : 'PARAF ELEKTRONIK HIERARKI'}
            </span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {getJabatanLabel(pejabatInfo?.jabatan)}
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Pejabat Aktif: <span class="text-slate-800 font-semibold">{pejabatInfo?.nama || '-'}</span>
            {#if pejabatInfo?.nik}
              <span class="mx-2 text-slate-300">•</span> NIK BSrE: <span class="text-slate-700 font-mono font-medium">{pejabatInfo.nik}</span>
            {/if}
          </p>
        </div>
      </div>

      <div>
        <button
          onclick={loadData}
          class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm transition"
        >
          <svg class="w-4 h-4 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Segarkan Antrian
        </button>
      </div>
    </div>

    <!-- 4 Kartu Statistik (Light Clean) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Menunggu -->
      <div class="bg-white border-2 border-amber-300/80 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-700 uppercase tracking-wider">Menunggu Tindakan Anda</span>
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500 {stats.antrianCount > 0 ? 'animate-ping' : ''}"></span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.antrianCount}
        </div>
        <p class="text-xs text-slate-500 mt-1">Dokumen kontrak siap diparaf / ditandatangani</p>
      </div>

      <!-- Telah Diproses -->
      <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider">Telah Anda Proses</span>
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.riwayatSuksesCount}
        </div>
        <p class="text-xs text-slate-500 mt-1">Dokumen berhasil diparaf / ditandatangani</p>
      </div>

      <!-- Ditolak -->
      <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-rose-700 uppercase tracking-wider">Ditolak / Dikembalikan</span>
          <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.riwayatTolakCount}
        </div>
        <p class="text-xs text-slate-500 mt-1">Dokumen dikembalikan dengan catatan revisi</p>
      </div>

      <!-- Selesai Lingkup Pemkab -->
      <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-blue-700 uppercase tracking-wider">Selesai Lingkup Pemkab</span>
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.totalSelesaiPemda}
        </div>
        <p class="text-xs text-slate-500 mt-1">Total kontrak rampung final TTE Bupati</p>
      </div>
    </div>

    <!-- Section Daftar Antrian Dokumen (Light Table) -->
    <div class="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      <!-- Header & Filter Search -->
      <div class="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Antrian Dokumen Kontrak PPPK</span>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {antrianList.length} Berkas
            </span>
          </h3>
          <p class="text-xs text-slate-500 mt-1">
            Dokumen yang memerlukan perhatian dan otorisasi elektronik resmi dari Anda
          </p>
        </div>

        <!-- Pencarian -->
        <form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex items-center gap-2">
          <div class="relative">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Cari nama, NIP, no kontrak..."
              class="w-64 sm:w-80 px-3.5 py-2 pl-9 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
          >
            Cari
          </button>
        </form>
      </div>

      <!-- Table / List Content -->
      {#if loading}
        <div class="p-16 text-center text-slate-500">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
          <p class="text-sm">Memuat dokumen antrian...</p>
        </div>
      {:else if antrianList.length === 0}
        <div class="p-16 text-center">
          <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 class="text-base font-bold text-slate-800 mb-1">Tidak Ada Antrian Dokumen</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">
            Semua dokumen kontrak untuk tahap kewenangan Anda saat ini telah selesai diproses.
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-6">Identitas Pegawai PPPK</th>
                <th class="py-3.5 px-6">Jabatan & Unit Kerja</th>
                <th class="py-3.5 px-6">Detail Kontrak</th>
                <th class="py-3.5 px-6">Status Alur TTE</th>
                <th class="py-3.5 px-6 text-right">Aksi Eksekutif</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each antrianList as doc}
                <tr class="hover:bg-blue-50/30 transition">
                  <!-- Identitas Pegawai -->
                  <td class="py-4 px-6">
                    <div class="font-bold text-slate-900 text-sm">
                      {doc.dataP3k?.nama || "-"}
                    </div>
                    <div class="text-slate-500 font-mono text-[11px] mt-0.5">
                      NIP: {doc.dataP3k?.nipBaru || doc.dataP3k?.nipLama || "-"}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">
                      No. Kontrak: <span class="text-blue-700 font-medium font-mono">{doc.nomorKontrak || "-"}</span>
                    </div>
                  </td>

                  <!-- Jabatan & Unit Kerja -->
                  <td class="py-4 px-6">
                    <div class="text-slate-800 font-medium">
                      {doc.dataP3k?.jabatanNama || "-"}
                    </div>
                    <div class="text-slate-500 mt-0.5">
                      {doc.dataP3k?.unorNama || "-"}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">
                      Golongan: <span class="text-slate-700 font-bold">{doc.golongan || doc.dataP3k?.golAkhirNama || "-"}</span>
                    </div>
                  </td>

                  <!-- Detail Kontrak -->
                  <td class="py-4 px-6">
                    <div class="text-slate-700">
                      Masa Kontrak: <span class="font-bold text-slate-900">{hitungMasaKontrak(doc.tanggalMulai || doc.tmtMulai, doc.tanggalSelesai || doc.tmtSelesai)}</span>
                    </div>
                    <div class="text-slate-500 text-[11px] mt-0.5">
                      TMT: {formatTanggal(doc.tanggalMulai || doc.tmtMulai)} s/d {formatTanggal(doc.tanggalSelesai || doc.tmtSelesai)}
                    </div>
                    <div class="text-slate-500 text-[11px] mt-0.5">
                      Kontrak Ke: <span class="text-amber-700 font-bold">{doc.kontrakKe || 1}</span>
                    </div>
                  </td>

                  <!-- Status Alur TTE -->
                  <td class="py-4 px-6">
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Menunggu Tindakan Anda
                    </div>
                    <div class="text-[10px] text-slate-500 mt-1">
                      Tahap: {doc.statusTte?.replaceAll("_", " ")}
                    </div>
                  </td>

                  <!-- Aksi -->
                  <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Tombol Preview PDF -->
                      <button
                        onclick={() => openPreview(doc)}
                        class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                        title="Lihat Berkas Dokumen"
                      >
                        <svg class="w-4 h-4 inline-block -mt-0.5 mr-1 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Pratinjau
                      </button>

                      <!-- Tombol Tolak -->
                      <button
                        onclick={() => openTolakModal(doc)}
                        class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                        title="Kembalikan Dokumen"
                      >
                        Kembalikan
                      </button>

                      <!-- Tombol Sign / Paraf -->
                      <button
                        onclick={() => openSignModal(doc)}
                        class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95"
                      >
                        {pejabatInfo?.jenis === 'TTE' ? 'Tandatangani (TTE)' : 'Bubuhkan Paraf'}
                      </button>
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
              Menampilkan halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total dokumen)
            </div>
            <div class="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onclick={() => { pagination.page--; loadData(); }}
                class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Sebelumnya
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onclick={() => { pagination.page++; loadData(); }}
                class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<!-- Modal Passphrase TTE / Paraf (Light Theme) -->
{#if isSignModalOpen && selectedDokumen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900 relative">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">
              {pejabatInfo?.jenis === 'TTE' ? 'Otorisasi Tanda Tangan Elektronik' : 'Otorisasi Paraf Elektronik'}
            </h3>
            <p class="text-xs text-blue-700 font-semibold">
              Sertifikasi Balai Sertifikasi Elektronik (BSrE - BSSN)
            </p>
          </div>
        </div>
        <button
          onclick={() => (isSignModalOpen = false)}
          class="text-slate-400 hover:text-slate-700"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5 text-xs space-y-1.5">
        <div class="flex justify-between">
          <span class="text-slate-500">Pegawai PPPK:</span>
          <span class="font-bold text-slate-900">{selectedDokumen.dataP3k?.nama}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Nomor Kontrak:</span>
          <span class="font-mono text-blue-700 font-semibold">{selectedDokumen.nomorKontrak}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Unit Kerja:</span>
          <span class="text-slate-700">{selectedDokumen.dataP3k?.unorNama || "-"}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-500">Pejabat Penandatangan:</span>
          <span class="text-slate-800 font-semibold">{pejabatInfo?.nama} ({pejabatInfo?.jabatan})</span>
        </div>
      </div>

      <div class="space-y-3 mb-6">
        <label for="passphrase-input" class="block text-xs font-semibold text-slate-700">
          Masukkan Passphrase BSrE Anda:
        </label>
        <div class="relative">
          <input
            id="passphrase-input"
            type={showPassphrase ? "text" : "password"}
            bind:value={passphrase}
            placeholder="Ketik passphrase sertifikat elektronik..."
            class="w-full px-4 py-2.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
          <button
            type="button"
            onclick={() => (showPassphrase = !showPassphrase)}
            class="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
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
        <p class="text-[11px] text-slate-500 leading-relaxed">
          Peringatan Yuridis: Pembubuhan passphrase ini bernilai hukum sah setara tanda tangan basah berdasarkan UU No. 1/2023 jo UU No. 1/2026 & PP No. 71/2019.
        </p>
      </div>

      <div class="flex gap-3">
        <button
          onclick={() => (isSignModalOpen = false)}
          disabled={isSigning}
          class="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          Batal
        </button>
        <button
          onclick={submitSign}
          disabled={isSigning || !passphrase.trim()}
          class="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isSigning}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Memproses BSrE...</span>
          {:else}
            <span>Konfirmasi Tanda Tangan</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Tolak Dokumen (Light Theme) -->
{#if isTolakModalOpen && selectedDokumen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-900">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">Kembalikan / Tolak Dokumen</h3>
            <p class="text-xs text-rose-600">Dokumen akan dikembalikan ke status DITOLAK untuk revisi</p>
          </div>
        </div>
        <button
          onclick={() => (isTolakModalOpen = false)}
          class="text-slate-400 hover:text-slate-700"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p class="text-xs text-slate-600 mb-3">
        Berikan catatan perbaikan atau alasan penolakan dokumen untuk pegawai <strong class="text-slate-900">{selectedDokumen.dataP3k?.nama}</strong>:
      </p>

      <div class="mb-5">
        <textarea
          bind:value={tolakCatatan}
          rows="4"
          placeholder="Tuliskan catatan detail koreksi klausul kontrak..."
          class="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500"
        ></textarea>
      </div>

      <div class="flex gap-3">
        <button
          onclick={() => (isTolakModalOpen = false)}
          disabled={isRejecting}
          class="flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          Batal
        </button>
        <button
          onclick={submitTolak}
          disabled={isRejecting || !tolakCatatan.trim()}
          class="flex-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {#if isRejecting}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Memproses...</span>
          {:else}
            <span>Kirim Penolakan</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal Preview Dokumen PDF -->
{#if isPreviewModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md">
    <div class="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 class="text-sm font-bold text-slate-900 truncate max-w-md">{previewJudul}</h3>
        </div>
        <div class="flex items-center gap-2">
          <a
            href={previewPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
          >
            Buka di Tab Baru
          </a>
          <button
            onclick={() => (isPreviewModalOpen = false)}
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
          src={previewPdfUrl}
          title="Pratinjau Dokumen Kontrak"
          class="w-full h-full rounded-xl border border-slate-200 bg-white"
        ></iframe>
      </div>
    </div>
  </div>
{/if}
