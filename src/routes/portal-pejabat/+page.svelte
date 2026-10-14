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

  // Tab Aktif: ANTRIAN | SUKSES | DITOLAK | SELESAI
  let activeTab = $state("ANTRIAN");

  const formatTanggalWaktu = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }) + " WIB"
      );
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

  // Normalisasi data baris tabel untuk antrian maupun riwayat
  const getDocItem = (item) => {
    if (activeTab === "ANTRIAN") {
      return {
        id: item.id,
        usulanId: item.id,
        nama: item.dataP3k?.nama || "-",
        nip: item.dataP3k?.nipBaru || item.dataP3k?.nipLama || "-",
        nomorKontrak: item.nomorKontrak || "-",
        jabatan: item.dataP3k?.jabatanNama || "-",
        unor: item.dataP3k?.unorNama || "-",
        golongan: item.golongan || item.dataP3k?.golAkhirNama || "-",
        tglMulai: item.tanggalMulai || item.tmtMulai,
        tglSelesai: item.tanggalSelesai || item.tmtSelesai,
        kontrakKe: item.kontrakKe || 1,
        statusTte: item.statusTte,
        tahap: item.statusTte?.replaceAll("_", " "),
        waktu: item.updatedAt || item.createdAt,
        catatan: item.catatanTte || null,
        pdfUrl: item.pdfSignedUrl || item.pdfDraftUrl || item.generatedFileUrl,
        raw: item
      };
    }
    const u = item.usulan || {};
    return {
      id: item.id,
      usulanId: u.id || item.id,
      nama: u.dataP3k?.nama || item.dataP3k?.nama || "-",
      nip: u.dataP3k?.nipBaru || item.dataP3k?.nipBaru || "-",
      nomorKontrak: u.nomorKontrak || item.nomorKontrak || "-",
      jabatan: u.dataP3k?.jabatanNama || item.dataP3k?.jabatanNama || "-",
      unor: u.dataP3k?.unorNama || item.dataP3k?.unorNama || "-",
      golongan: u.golongan || u.dataP3k?.golAkhirNama || "-",
      tglMulai: u.tanggalMulai,
      tglSelesai: u.tanggalSelesai,
      kontrakKe: u.kontrakKe || 1,
      statusTte: u.statusTte || item.statusTte,
      tahap: item.tahap?.replaceAll("_", " ") || (u.statusTte?.replaceAll("_", " ") || "-"),
      waktu: item.createdAt || u.updatedAt,
      catatan: item.catatan || item.pesan || null,
      status: item.status,
      idDokumenBsre: item.idDokumenBsre,
      pdfUrl: item.signedFileUrl || u.pdfSignedUrl || u.pdfDraftUrl || "",
      raw: item
    };
  };

  const loadData = async () => {
    loading = true;
    notRegisteredError = false;
    try {
      const statsPromise = tteApi.getStatistik();

      let listPromise;
      if (activeTab === "ANTRIAN") {
        listPromise = tteApi.getAntrian({
          search: searchQuery,
          page: pagination.page,
          limit: pagination.limit
        });
      } else {
        listPromise = tteApi.getRiwayat({
          status: activeTab,
          search: searchQuery,
          page: pagination.page,
          limit: pagination.limit
        });
      }

      const [listRes, statsRes] = await Promise.all([listPromise, statsPromise]);

      if (listRes.success) {
        antrianList = listRes.data || [];
        pejabatInfo = listRes.pejabat || pejabatInfo;
        pagination = listRes.pagination || pagination;
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
        addToast(msg || "Gagal memuat data dokumen", "error");
      }
    } finally {
      loading = false;
    }
  };

  const setTab = (tab) => {
    if (activeTab === tab) return;
    activeTab = tab;
    searchQuery = "";
    pagination.page = 1;
    loadData();
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
  const openPreview = (doc, customNama) => {
    const raw = doc?.raw || doc;
    const u = raw.usulan || raw;
    previewPdfUrl = raw.signedFileUrl || raw.pdfSignedUrl || raw.pdfDraftUrl || u.pdfSignedUrl || u.pdfDraftUrl || doc.pdfUrl || "";
    const label = customNama || doc?.nama || raw.dataP3k?.nama || u.dataP3k?.nama || raw.nomorKontrak || u.nomorKontrak || "Kontrak";
    previewJudul = `Dokumen Kontrak — ${label}`;
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

    <!-- 4 Kartu Statistik & Filter Interaktif -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Card 1: Menunggu Tindakan Anda -->
      <button
        type="button"
        onclick={() => setTab("ANTRIAN")}
        class="text-left w-full rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer relative overflow-hidden group
          {activeTab === 'ANTRIAN'
            ? 'bg-amber-50/50 border-2 border-amber-500 ring-4 ring-amber-400/20 shadow-md scale-[1.01]'
            : 'bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-md hover:scale-[1.01]'}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-700 uppercase tracking-wider">Menunggu Tindakan Anda</span>
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500 {stats.antrianCount > 0 ? 'animate-ping' : ''}"></span>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.antrianCount}
        </div>
        <p class="text-xs text-slate-500 mt-1">Dokumen kontrak siap diparaf / ditandatangani</p>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
          <span class={activeTab === 'ANTRIAN' ? 'text-amber-800 font-bold' : 'text-slate-400 group-hover:text-amber-700'}>
            {activeTab === 'ANTRIAN' ? '● Sedang Ditampilkan' : 'Klik untuk melihat antrian →'}
          </span>
          <span class="text-amber-600 font-mono text-xs">↗</span>
        </div>
      </button>

      <!-- Card 2: Telah Anda Proses -->
      <button
        type="button"
        onclick={() => setTab("SUKSES")}
        class="text-left w-full rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer relative overflow-hidden group
          {activeTab === 'SUKSES'
            ? 'bg-emerald-50/50 border-2 border-emerald-500 ring-4 ring-emerald-400/20 shadow-md scale-[1.01]'
            : 'bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-md hover:scale-[1.01]'}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider">Telah Anda Proses</span>
          <div class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.riwayatSuksesCount}
        </div>
        <p class="text-xs text-slate-500 mt-1">Dokumen berhasil diparaf / ditandatangani</p>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
          <span class={activeTab === 'SUKSES' ? 'text-emerald-800 font-bold' : 'text-slate-400 group-hover:text-emerald-700'}>
            {activeTab === 'SUKSES' ? '● Sedang Ditampilkan' : 'Klik untuk melihat daftar →'}
          </span>
          <span class="text-emerald-600 font-mono text-xs">↗</span>
        </div>
      </button>

      <!-- Card 3: Ditolak / Dikembalikan -->
      <button
        type="button"
        onclick={() => setTab("DITOLAK")}
        class="text-left w-full rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer relative overflow-hidden group
          {activeTab === 'DITOLAK'
            ? 'bg-rose-50/50 border-2 border-rose-500 ring-4 ring-rose-400/20 shadow-md scale-[1.01]'
            : 'bg-white border border-slate-200/90 hover:border-rose-300 hover:shadow-md hover:scale-[1.01]'}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-rose-700 uppercase tracking-wider">Ditolak / Dikembalikan</span>
          <div class="w-6 h-6 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.riwayatTolakCount}
        </div>
        <p class="text-xs text-slate-500 mt-1">Dokumen dikembalikan dengan catatan revisi</p>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
          <span class={activeTab === 'DITOLAK' ? 'text-rose-800 font-bold' : 'text-slate-400 group-hover:text-rose-700'}>
            {activeTab === 'DITOLAK' ? '● Sedang Ditampilkan' : 'Klik untuk melihat daftar →'}
          </span>
          <span class="text-rose-600 font-mono text-xs">↗</span>
        </div>
      </button>

      <!-- Card 4: Selesai Lingkup Pemkab -->
      <button
        type="button"
        onclick={() => setTab("SELESAI")}
        class="text-left w-full rounded-2xl p-5 shadow-sm transition-all duration-200 cursor-pointer relative overflow-hidden group
          {activeTab === 'SELESAI'
            ? 'bg-blue-50/50 border-2 border-blue-500 ring-4 ring-blue-400/20 shadow-md scale-[1.01]'
            : 'bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]'}"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-blue-700 uppercase tracking-wider">Selesai Lingkup Pemkab</span>
          <div class="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="text-3xl font-extrabold text-slate-900 mt-2">
          {stats.totalSelesaiPemda}
        </div>
        <p class="text-xs text-slate-500 mt-1">Total kontrak rampung final TTE Bupati</p>
        <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
          <span class={activeTab === 'SELESAI' ? 'text-blue-800 font-bold' : 'text-slate-400 group-hover:text-blue-700'}>
            {activeTab === 'SELESAI' ? '● Sedang Ditampilkan' : 'Klik untuk melihat daftar →'}
          </span>
          <span class="text-blue-600 font-mono text-xs">↗</span>
        </div>
      </button>
    </div>

    <!-- Section Daftar Dokumen (Tabel Dinamis Sesuai Tab) -->
    <div class="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      <!-- Header & Filter Search -->
      <div class="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            {#if activeTab !== 'ANTRIAN'}
              <button
                type="button"
                onclick={() => setTab('ANTRIAN')}
                class="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
              >
                ← Kembali ke Antrian
              </button>
              <span class="text-slate-300">•</span>
            {/if}
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded
              {activeTab === 'ANTRIAN' ? 'bg-amber-100 text-amber-800' :
               activeTab === 'SUKSES' ? 'bg-emerald-100 text-emerald-800' :
               activeTab === 'DITOLAK' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}">
              {activeTab === 'ANTRIAN' ? 'Antrian Menunggu Tindakan' :
               activeTab === 'SUKSES' ? 'Telah Anda Proses' :
               activeTab === 'DITOLAK' ? 'Ditolak / Dikembalikan' : 'Rampung Lingkup Pemkab'}
            </span>
          </div>

          <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>
              {activeTab === 'ANTRIAN' ? 'Antrian Dokumen Kontrak PPPK' :
               activeTab === 'SUKSES' ? 'Daftar Dokumen yang Telah Anda Proses' :
               activeTab === 'DITOLAK' ? 'Daftar Dokumen yang Ditolak / Dikembalikan' : 'Daftar Kontrak Rampung Final TTE Bupati'}
            </span>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {pagination.total} Berkas
            </span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            {activeTab === 'ANTRIAN' ? 'Dokumen yang memerlukan perhatian dan otorisasi elektronik resmi dari Anda' :
             activeTab === 'SUKSES' ? 'Rekam jejak seluruh dokumen yang berhasil Anda bubuhkan paraf atau tanda tangan elektronik' :
             activeTab === 'DITOLAK' ? 'Dokumen yang Anda kembalikan ke verifikator/staf dengan catatan revisi' :
             'Semua dokumen kontrak PPPK di lingkup Pemerintah Kabupaten yang telah sah ditandatangani final oleh Bupati'}
          </p>
        </div>

        <div class="flex items-center gap-3">
          {#if activeTab !== 'ANTRIAN'}
            <a
              href="/portal-pejabat/riwayat?status={activeTab}"
              class="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 transition flex items-center gap-1.5 shadow-xs"
              title="Buka tampilan riwayat lengkap"
            >
              <span>Halaman Riwayat Penuh</span>
              <span class="text-xs">↗</span>
            </a>
          {/if}

          <!-- Form Pencarian -->
          <form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="flex items-center gap-2">
            <div class="relative">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Cari nama, NIP, no kontrak..."
                class="w-56 sm:w-72 px-3.5 py-2 pl-9 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
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
      </div>

      <!-- Table / List Content -->
      {#if loading}
        <div class="p-16 text-center text-slate-500">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3"></div>
          <p class="text-sm">Memuat data dokumen...</p>
        </div>
      {:else if antrianList.length === 0}
        <div class="p-16 text-center">
          <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 class="text-base font-bold text-slate-800 mb-1">
            {activeTab === 'ANTRIAN' ? 'Tidak Ada Antrian Dokumen' :
             activeTab === 'SUKSES' ? 'Belum Ada Dokumen Diproses' :
             activeTab === 'DITOLAK' ? 'Tidak Ada Dokumen Ditolak' : 'Belum Ada Kontrak Selesai'}
          </h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'ANTRIAN' ? 'Semua dokumen kontrak untuk tahap kewenangan Anda saat ini telah selesai diproses.' :
             activeTab === 'SUKSES' ? 'Belum ada catatan dokumen yang berhasil Anda paraf atau tandatangani.' :
             activeTab === 'DITOLAK' ? 'Belum ada dokumen yang dikembalikan dengan catatan revisi.' :
             'Belum ada dokumen kontrak yang menyelesaikan alur pengesahan final TTE Bupati.'}
          </p>
          {#if activeTab !== 'ANTRIAN'}
            <button
              onclick={() => setTab('ANTRIAN')}
              class="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
            >
              Lihat Antrian Menunggu Tindakan
            </button>
          {/if}
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-6">Identitas Pegawai PPPK</th>
                <th class="py-3.5 px-6">Jabatan & Unit Kerja</th>
                <th class="py-3.5 px-6">Detail Kontrak</th>
                <th class="py-3.5 px-6">
                  {activeTab === 'ANTRIAN' ? 'Status Alur TTE' :
                   activeTab === 'SUKSES' ? 'Waktu & Hasil Proses' :
                   activeTab === 'DITOLAK' ? 'Waktu & Catatan Penolakan' : 'Status Pengesahan'}
                </th>
                <th class="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each antrianList as item}
                {@const doc = getDocItem(item)}
                <tr class="hover:bg-blue-50/30 transition">
                  <!-- Identitas Pegawai -->
                  <td class="py-4 px-6">
                    <div class="font-bold text-slate-900 text-sm">
                      {doc.nama}
                    </div>
                    <div class="text-slate-500 font-mono text-[11px] mt-0.5">
                      NIP: {doc.nip}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">
                      No. Kontrak: <span class="text-blue-700 font-medium font-mono">{doc.nomorKontrak}</span>
                    </div>
                  </td>

                  <!-- Jabatan & Unit Kerja -->
                  <td class="py-4 px-6">
                    <div class="text-slate-800 font-medium">
                      {doc.jabatan}
                    </div>
                    <div class="text-slate-500 mt-0.5">
                      {doc.unor}
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">
                      Golongan: <span class="text-slate-700 font-bold">{doc.golongan}</span>
                    </div>
                  </td>

                  <!-- Detail Kontrak -->
                  <td class="py-4 px-6">
                    <div class="text-slate-700">
                      Masa: <span class="font-bold text-slate-900">{hitungMasaKontrak(doc.tglMulai, doc.tglSelesai)}</span>
                    </div>
                    <div class="text-slate-500 text-[11px] mt-0.5">
                      TMT: {formatTanggal(doc.tglMulai)} s/d {formatTanggal(doc.tglSelesai)}
                    </div>
                    <div class="text-slate-500 text-[11px] mt-0.5">
                      Kontrak Ke: <span class="text-amber-700 font-bold">{doc.kontrakKe}</span>
                    </div>
                  </td>

                  <!-- Kolom Status Berdasarkan Tab -->
                  <td class="py-4 px-6">
                    {#if activeTab === 'ANTRIAN'}
                      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Menunggu Tindakan Anda
                      </div>
                      <div class="text-[10px] text-slate-500 mt-1">
                        Tahap: {doc.tahap}
                      </div>
                    {:else if activeTab === 'SUKSES'}
                      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Berhasil Diproses
                      </div>
                      <div class="text-[11px] text-slate-600 font-medium mt-1">
                        {formatTanggalWaktu(doc.waktu)}
                      </div>
                      {#if doc.idDokumenBsre}
                        <div class="text-[10px] font-mono text-emerald-700 mt-0.5">
                          ID: {doc.idDokumenBsre}
                        </div>
                      {/if}
                    {:else if activeTab === 'DITOLAK'}
                      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                        <svg class="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Ditolak / Dikembalikan
                      </div>
                      <div class="text-[10px] text-slate-500 mt-1">
                        Waktu: {formatTanggalWaktu(doc.waktu)}
                      </div>
                      {#if doc.catatan}
                        <div class="text-[11px] text-rose-700 bg-rose-50/70 p-2 rounded-lg border border-rose-200 mt-1.5 max-w-xs italic">
                          "{doc.catatan}"
                        </div>
                      {/if}
                    {:else if activeTab === 'SELESAI'}
                      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        Sah BSrE BSSN (Final)
                      </div>
                      <div class="text-[11px] text-slate-600 font-medium mt-1">
                        Selesai: {formatTanggalWaktu(doc.waktu)}
                      </div>
                      <div class="text-[10px] text-slate-400 mt-0.5">
                        Kekuatan hukum tetap
                      </div>
                    {/if}
                  </td>

                  <!-- Aksi -->
                  <td class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Tombol Preview PDF -->
                      <button
                        type="button"
                        onclick={() => openPreview(doc.raw, doc.nama)}
                        class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition shadow-xs"
                        title="Lihat Berkas Dokumen PDF"
                      >
                        <svg class="w-4 h-4 inline-block -mt-0.5 mr-1 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Pratinjau
                      </button>

                      {#if activeTab === 'ANTRIAN'}
                        <!-- Tombol Tolak -->
                        <button
                          type="button"
                          onclick={() => openTolakModal(doc.raw)}
                          class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                          title="Kembalikan Dokumen"
                        >
                          Kembalikan
                        </button>

                        <!-- Tombol Sign / Paraf -->
                        <button
                          type="button"
                          onclick={() => openSignModal(doc.raw)}
                          class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition active:scale-95"
                        >
                          {pejabatInfo?.jenis === 'TTE' ? 'Tandatangani (TTE)' : 'Bubuhkan Paraf'}
                        </button>
                      {:else if activeTab === 'SUKSES' || activeTab === 'SELESAI'}
                        <!-- Tautan Verifikasi Publik -->
                        <a
                          href="/portal/verifikasi/{doc.usulanId}"
                          target="_blank"
                          rel="noreferrer"
                          class="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 shadow-xs"
                          title="Buka Halaman Verifikasi Publik TTE"
                        >
                          <span>Verifikasi</span>
                          <span class="text-xs">↗</span>
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
