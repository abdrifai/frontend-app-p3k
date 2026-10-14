<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let usulanId = $derived($page.params.id);
  let loading = $state(true);
  let errorMsg = $state('');
  let dataVerifikasi = $state(null);

  const fetchVerifikasi = async () => {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch(`/api/v1/portal/verifikasi/${usulanId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memverifikasi dokumen');
      }
      dataVerifikasi = json.data;
    } catch (err) {
      errorMsg = err.message || 'Terjadi kesalahan saat memverifikasi dokumen';
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    if (usulanId) {
      fetchVerifikasi();
    }
  });

  const formatTgl = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return d;
    }
  };

  const formatWaktu = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return `${dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
    } catch {
      return d;
    }
  };
</script>

<svelte:head>
  <title>Verifikasi Keabsahan Dokumen TTE — SIPPPK BKPSDM</title>
</svelte:head>

<div class="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto space-y-6">

    <!-- Header Instansi -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-4 text-center sm:text-left">
        <div class="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0">
          <img src="/logo.svg" alt="Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
        </div>
        <div>
          <h1 class="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            PEMERINTAH KABUPATEN TOJO UNA-UNA
          </h1>
          <p class="text-xs sm:text-sm text-slate-600 font-medium">
            Badan Kepegawaian dan Pengembangan Sumber Daya Manusia (BKPSDM)
          </p>
          <p class="text-xs text-slate-400">
            Layanan Verifikasi Publik Tanda Tangan Elektronik (TTE) & Paraf Dokumen
          </p>
        </div>
      </div>
      <div class="shrink-0 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Sistem Terhubung BSrE
      </div>
    </div>

    <!-- State Loading & Error -->
    {#if loading}
      <div class="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
        <div class="inline-block w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 class="text-base font-semibold text-slate-800">Memverifikasi Keabsahan Dokumen...</h3>
        <p class="text-xs text-slate-500 mt-1">Mengambil data sertifikat digital dan riwayat pengesahan</p>
      </div>
    {:else if errorMsg}
      <div class="bg-white rounded-2xl p-10 text-center border border-rose-200 shadow-sm">
        <div class="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✕
        </div>
        <h3 class="text-lg font-bold text-slate-800">Dokumen Tidak Ditemukan</h3>
        <p class="text-sm text-rose-600 mt-1 max-w-md mx-auto">{errorMsg}</p>
        <p class="text-xs text-slate-400 mt-4">Pastikan Anda memindai QR Code yang valid dari naskah dinas resmi SIPPPK.</p>
      </div>
    {:else if dataVerifikasi}
      <!-- Status Banner Keabsahan -->
      <div class="rounded-2xl p-6 shadow-sm border {dataVerifikasi.usulan.isSelesai ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400'}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl {dataVerifikasi.usulan.isSelesai ? 'bg-white/20' : 'bg-white/20'} flex items-center justify-center text-2xl shrink-0">
              {dataVerifikasi.usulan.isSelesai ? '✓' : '⏳'}
            </div>
            <div>
              <span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase {dataVerifikasi.usulan.isSelesai ? 'bg-white text-emerald-800' : 'bg-white text-amber-800'} mb-1.5">
                {dataVerifikasi.usulan.isSelesai ? 'DOKUMEN RESMI & SAH' : 'DOKUMEN DRAFT / PROSES TTE'}
              </span>
              <h2 class="text-lg sm:text-xl font-bold leading-snug">
                {dataVerifikasi.usulan.isSelesai
                  ? 'Dokumen Terverifikasi Sah Ditandatangani Secara Elektronik'
                  : 'Dokumen Masih Dalam Alur Penandatanganan / Paraf'}
              </h2>
              <p class="text-xs text-white/90 mt-1 max-w-xl">
                {dataVerifikasi.usulan.isSelesai
                  ? 'Dokumen ini memiliki kekuatan hukum yang sah dan telah tersertifikasi oleh Balai Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).'
                  : 'Dokumen ini belum selesai ditandatangani oleh pejabat yang berwenang. Tidak sah digunakan sebagai arsip final.'}
              </p>
            </div>
          </div>
          {#if dataVerifikasi.usulan.pdfUrl}
            <div class="shrink-0">
              <a
                href={dataVerifikasi.usulan.pdfUrl}
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white {dataVerifikasi.usulan.isSelesai ? 'text-emerald-800 hover:bg-emerald-50' : 'text-amber-800 hover:bg-amber-50'} font-semibold text-xs shadow-sm transition"
              >
                <span>Lihat Dokumen PDF</span>
                <span class="text-sm">↗</span>
              </a>
            </div>
          {/if}
        </div>
      </div>

      {#if dataVerifikasi.pembatalanTerakhir}
        <div class="rounded-2xl p-5 bg-rose-50 border border-rose-200 text-rose-800 shadow-sm">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
              ⚠️
            </div>
            <div class="space-y-1">
              <h4 class="text-sm font-bold text-rose-900">Catatan Audit Pembatalan & Reset Dokumen</h4>
              <p class="text-xs text-rose-700">Dokumen kontrak ini pernah dibatalkan / di-reset untuk perbaikan materi perjanjian kerja:</p>
              <div class="text-xs font-medium text-rose-900 italic bg-white/70 p-2.5 rounded-xl border border-rose-200">
                "{dataVerifikasi.pembatalanTerakhir.alasan}"
              </div>
              <p class="text-[11px] text-rose-600">
                Dibatalkan pada {formatWaktu(dataVerifikasi.pembatalanTerakhir.waktu)} oleh {dataVerifikasi.pembatalanTerakhir.namaPelaku}
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Ringkasan Identitas Dokumen -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
        <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
          <span>📄</span> Informasi Perjanjian Kerja PPPK
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span class="text-slate-400 block font-medium">Nomor Kontrak</span>
            <span class="text-slate-900 font-bold text-sm">{dataVerifikasi.usulan.nomorKontrak}</span>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span class="text-slate-400 block font-medium">Nama Pegawai (Pihak Kedua)</span>
            <span class="text-slate-900 font-bold text-sm">{dataVerifikasi.pegawai.nama}</span>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span class="text-slate-400 block font-medium">NIP PPPK</span>
            <span class="text-slate-900 font-bold">{dataVerifikasi.pegawai.nipBaru}</span>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span class="text-slate-400 block font-medium">Jabatan</span>
            <span class="text-slate-800 font-semibold">{dataVerifikasi.pegawai.jabatanNama}</span>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span class="text-slate-400 block font-medium">Unit Organisasi (Unor)</span>
            <span class="text-slate-800 font-semibold">{dataVerifikasi.pegawai.unorNama}</span>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <span class="text-slate-400 block font-medium">Masa Perjanjian Kerja</span>
            <span class="text-slate-800 font-semibold">
              {formatTgl(dataVerifikasi.usulan.tanggalMulai)} s/d {formatTgl(dataVerifikasi.usulan.tanggalSelesai)}
            </span>
          </div>
        </div>
      </div>

      <!-- Dua Kotak TTE Utama (Bupati & Pegawai) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Pihak Kesatu: Bupati -->
        <div class="bg-white rounded-2xl shadow-sm border p-5 {dataVerifikasi.tteUtama.bupati.isSigned ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/40'}">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">PIHAK KESATU</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full {dataVerifikasi.tteUtama.bupati.isSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              {dataVerifikasi.tteUtama.bupati.isSigned ? '✓ Sudah TTE Sah' : '⏳ Belum TTE'}
            </span>
          </div>
          <div class="text-slate-900 font-bold text-sm">{dataVerifikasi.tteUtama.bupati.label}</div>
          <p class="text-xs text-slate-600 mt-1">{dataVerifikasi.tteUtama.bupati.nama}</p>
          <div class="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
            <div class="flex justify-between">
              <span>Waktu TTE:</span>
              <span class="font-semibold text-slate-700">{formatWaktu(dataVerifikasi.tteUtama.bupati.waktu)}</span>
            </div>
            {#if dataVerifikasi.tteUtama.bupati.idDokumenBsre}
              <div class="flex justify-between">
                <span>ID BSrE:</span>
                <span class="font-mono text-emerald-700 text-[10px]">{dataVerifikasi.tteUtama.bupati.idDokumenBsre}</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Pihak Kedua: Pegawai -->
        <div class="bg-white rounded-2xl shadow-sm border p-5 {dataVerifikasi.tteUtama.pegawai.isSigned ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/40'}">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">PIHAK KEDUA</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full {dataVerifikasi.tteUtama.pegawai.isSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              {dataVerifikasi.tteUtama.pegawai.isSigned ? '✓ Sudah TTE Sah' : '⏳ Belum TTE'}
            </span>
          </div>
          <div class="text-slate-900 font-bold text-sm">{dataVerifikasi.tteUtama.pegawai.nama}</div>
          <p class="text-xs text-slate-600 mt-1">NIP: {dataVerifikasi.tteUtama.pegawai.nip}</p>
          <div class="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
            <div class="flex justify-between">
              <span>Waktu TTE:</span>
              <span class="font-semibold text-slate-700">{formatWaktu(dataVerifikasi.tteUtama.pegawai.waktu)}</span>
            </div>
            {#if dataVerifikasi.tteUtama.pegawai.idDokumenBsre}
              <div class="flex justify-between">
                <span>ID BSrE:</span>
                <span class="font-mono text-emerald-700 text-[10px]">{dataVerifikasi.tteUtama.pegawai.idDokumenBsre}</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Catatan Paraf Koordinasi (Tanpa QR Code) -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span>🖋️</span> Catatan Paraf Koordinasi (Internal Tata Naskah Dinas)
          </h3>
          <span class="text-[11px] text-slate-400 italic">Disematkan pada naskah tanpa QR Code</span>
        </div>
        <p class="text-xs text-slate-500 mb-4">
          Paraf hierarki dibubuhkan secara elektronik oleh pejabat verifikator untuk meneliti keabsahan naskah sebelum penandatanganan final.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {#each dataVerifikasi.parafKoordinasi as paraf}
            <div class="p-4 rounded-xl border flex items-start gap-3 {paraf.isParaf ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50 border-slate-200'}">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 {paraf.isParaf ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}">
                {paraf.isParaf ? '✓' : paraf.urutan}
              </div>
              <div class="flex-grow min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="text-xs font-bold text-slate-800">{paraf.jabatan}</h4>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded {paraf.isParaf ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}">
                    {paraf.isParaf ? 'Sudah Diparaf' : 'Menunggu Paraf'}
                  </span>
                </div>
                <p class="text-[11px] text-slate-600 truncate mt-0.5">{paraf.nama}</p>
                <p class="text-[10px] text-slate-400 mt-1">
                  Waktu: <span class="font-medium text-slate-600">{formatWaktu(paraf.waktu)}</span>
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Linimasa Riwayat Pengesahan -->
      {#if dataVerifikasi.linimasa && dataVerifikasi.linimasa.length > 0}
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <span>🕒</span> Linimasa Riwayat Pengesahan (Audit Trail)
          </h3>
          <div class="space-y-4">
            {#each dataVerifikasi.linimasa as log, idx}
              <div class="flex items-start gap-3 text-xs">
                <div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div class="flex-grow bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span class="font-bold text-slate-800">{log.namaPelaku} ({log.tahap})</span>
                    <span class="text-[10px] text-slate-400">{formatWaktu(log.waktu)}</span>
                  </div>
                  <p class="text-slate-600 text-[11px]">{log.pesan || `Proses ${log.jenis} berhasil dicatat`}</p>
                  {#if log.idDokumenBsre}
                    <p class="font-mono text-[10px] text-emerald-700 mt-1">Sertifikat BSrE: {log.idDokumenBsre}</p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Footer Standar BSrE -->
      <div class="text-center text-xs text-slate-400 py-4 space-y-1">
        <p>Dokumen ini ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh</p>
        <p class="font-semibold text-slate-500">Balai Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN)</p>
      </div>
    {/if}

  </div>
</div>
