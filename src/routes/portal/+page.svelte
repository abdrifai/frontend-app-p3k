<script>
  import { onMount } from "svelte";
  import { portalApi } from "$lib/portalApi";
  import { authStore } from "$lib/store";

  let profile = $state(null);
  let contracts = $state([]);
  let perpanjangan = $state(null);
  let isLoading = $state(true);
  let errorMsg = $state("");

  // Waktu sapaan
  const hour = new Date().getHours();
  const sapaanWaktu = hour < 11 ? "Selamat Pagi" : hour < 15 ? "Selamat Siang" : hour < 18 ? "Selamat Sore" : "Selamat Malam";

  onMount(async () => {
    try {
      const [profileRes, contractsRes, perpanjanganRes] = await Promise.allSettled([
        portalApi.getMe(),
        portalApi.getRiwayatKontrak(),
        portalApi.getPerpanjangan()
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value.success) {
        profile = profileRes.value.data;
      } else {
        errorMsg = "Gagal memuat profil pegawai.";
      }

      if (contractsRes.status === "fulfilled" && contractsRes.value.success) {
        contracts = contractsRes.value.data || [];
      }

      if (perpanjanganRes.status === "fulfilled" && perpanjanganRes.value?.success) {
        perpanjangan = perpanjanganRes.value.data;
      }
    } catch (err) {
      errorMsg = err.message || "Terjadi kesalahan saat memuat data.";
    } finally {
      isLoading = false;
    }
  });

  // Kontrak aktif terakhir
  const latestContract = $derived(contracts.length > 0 ? contracts[contracts.length - 1] : null);

  // Hitung sisa hari kontrak
  const sisaHari = $derived.by(() => {
    if (!latestContract?.tanggalSelesai) return null;
    const parts = latestContract.tanggalSelesai.split("-");
    let end;
    if (parts.length === 3) {
      if (parts[0].length === 4) end = new Date(latestContract.tanggalSelesai);
      else end = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      end = new Date(latestContract.tanggalSelesai);
    }
    const diffTime = end.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  });
</script>

<svelte:head>
  <title>Beranda Portal Pegawai — SIPPPK</title>
</svelte:head>

<div class="space-y-6">
  <!-- Greeting Header -->
  <div class="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-700/15 relative overflow-hidden">
    <!-- Decorative background circle -->
    <div class="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/10 blur-xl"></div>
    <div class="absolute right-32 -top-12 w-32 h-32 rounded-full bg-white/5 blur-lg"></div>

    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md border border-white/20 text-emerald-100">
          <span class="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
          {sapaanWaktu}, Rekan ASN
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {profile?.nama ? (profile.gelarDepan ? `${profile.gelarDepan} ` : '') + profile.nama + (profile.gelarBelakang ? `, ${profile.gelarBelakang}` : '') : ($authStore.user?.namaLengkap || $authStore.user?.username)}
        </h1>
        <p class="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-xl leading-relaxed">
          Selamat datang di Portal Layanan Mandiri Pegawai Pemerintah dengan Perjanjian Kerja (P3K) BKPSDM Kabupaten Tojo Una-Una.
        </p>
      </div>

      <!-- Badge Status Kepegawaian -->
      <div class="shrink-0 flex sm:flex-col items-start sm:items-end gap-2">
        <span class="px-4 py-1.5 rounded-2xl text-xs font-bold bg-white text-emerald-800 shadow-md">
          {profile?.jenisPegawaiPortal === 'PENUH_WAKTU' ? 'PPPK Penuh Waktu' : 'PPPK Paruh Waktu'}
        </span>
        <span class="text-[11px] text-emerald-200 font-mono">
          NIP: {profile?.nipBaru || $authStore.user?.username}
        </span>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
      <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-500 font-medium">Memuat data portal pegawai...</p>
    </div>
  {:else if errorMsg}
    <div class="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
      <svg class="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {errorMsg}
    </div>
  {:else}
    <!-- Grid Content Utama -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Kolom 1 & 2: Data Kepegawaian & Status Kontrak -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Kartu Ringkasan Jabatan & Unit Kerja -->
        <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 class="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Penempatan & Informasi Jabatan
            </h2>
            <a href="/portal/profil" class="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
              Profil Lengkap
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jabatan Saat Ini</span>
              <p class="text-sm font-bold text-slate-800">{profile?.jabatanNama || "-"}</p>
              <p class="text-[11px] text-slate-500">{profile?.jenisJabatanNama || "Jabatan Fungsional"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit Kerja / Penempatan</span>
              <p class="text-sm font-bold text-slate-800">{profile?.unorNama || "-"}</p>
              <p class="text-[11px] text-slate-500">{profile?.satuanKerjaKerjaNama || profile?.instansiIndukNama || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Golongan & Masa Kerja</span>
              <p class="text-sm font-bold text-blue-700">Golongan {profile?.golAkhirNama || profile?.golAwalNama || "-"}</p>
              <p class="text-[11px] text-slate-500">Masa Kerja: {profile?.mkTahun || 0} Tahun {profile?.mkBulan || 0} Bulan</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pendidikan Terakhir</span>
              <p class="text-sm font-bold text-slate-800 truncate">{profile?.pendidikanNama || "-"}</p>
              <p class="text-[11px] text-slate-500">Lulus Tahun: {profile?.tahunLulus || "-"}</p>
            </div>
          </div>
        </div>

        <!-- Kartu Masa Berlaku Kontrak Terakhir -->
        <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 class="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Perjanjian Kerja Terakhir
            </h2>
            <a href="/portal/profil?tab=kontrak" class="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Semua Riwayat Kontrak
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {#if latestContract}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div class="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                <span class="text-[10px] uppercase font-bold text-blue-500">Nomor Perjanjian Kerja</span>
                <p class="text-sm font-bold font-mono text-blue-900 break-all">{latestContract.nomorKontrak || "-"}</p>
                <p class="text-[11px] text-blue-700 font-semibold">Kontrak Ke-{latestContract.kontrakKe}</p>
              </div>

              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-400">Periode Kontrak</span>
                <p class="text-sm font-bold text-slate-800">
                  {latestContract.tanggalMulai} s/d {latestContract.tanggalSelesai}
                </p>
                <p class="text-[11px] text-slate-500">Batas akhir perjanjian kerja</p>
              </div>

              <div class="p-4 rounded-2xl {sisaHari !== null && sisaHari <= 60 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'} border space-y-1">
                <span class="text-[10px] uppercase font-bold text-slate-400">Sisa Masa Kontrak</span>
                <p class="text-lg font-extrabold">
                  {sisaHari !== null ? `${sisaHari} Hari` : "-"}
                </p>
                <p class="text-[11px] font-medium opacity-80">
                  {sisaHari !== null && sisaHari <= 60 ? "Mendekati perpanjangan" : "Status kontrak aktif"}
                </p>
              </div>
            </div>
          {:else}
            <div class="text-center py-8 bg-slate-50 rounded-2xl text-xs text-slate-400">
              Belum ada riwayat kontrak kerja yang tercatat.
            </div>
          {/if}
        </div>
      </div>

      <!-- Kolom 3: Status Perpanjangan & Quick Access -->
      <div class="space-y-6">
        <!-- Status Usulan Perpanjangan Kontrak -->
        {#if perpanjangan}
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
                Usulan Perpanjangan
              </h3>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {perpanjangan.status}
              </span>
            </div>

            <p class="text-xs text-slate-600 leading-relaxed">
              Usulan perpanjangan kontrak untuk masa <strong>{perpanjangan.tanggalMulai} s/d {perpanjangan.tanggalSelesai}</strong> sedang diproses.
            </p>

            <div class="space-y-2 pt-2">
              <div class="flex items-center gap-2.5 text-xs">
                <div class="w-6 h-6 rounded-full {['APPROVED', 'UPLOAD_SRIKANDI', 'SELESAI'].includes(perpanjangan.status) ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'} flex items-center justify-center font-bold text-[10px]">
                  1
                </div>
                <span class="font-medium text-slate-700">Verifikasi Usulan BKPSDM</span>
              </div>
              <div class="flex items-center gap-2.5 text-xs">
                <div class="w-6 h-6 rounded-full {['UPLOAD_SRIKANDI', 'SELESAI'].includes(perpanjangan.status) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'} flex items-center justify-center font-bold text-[10px]">
                  2
                </div>
                <span class="font-medium text-slate-700">Draft Dokumen Kontrak</span>
              </div>
              <div class="flex items-center gap-2.5 text-xs">
                <div class="w-6 h-6 rounded-full {perpanjangan.status === 'SELESAI' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'} flex items-center justify-center font-bold text-[10px]">
                  3
                </div>
                <span class="font-medium text-slate-700">Tanda Tangan & Selesai</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Menu Aksi Cepat -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 class="text-sm font-bold text-slate-800">Layanan Mandiri Pegawai</h3>
          <div class="space-y-2.5">
            <a
              href="/portal/profil"
              class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-800">Profil & Riwayat Saya</p>
                  <p class="text-[10px] text-slate-400">Biodata, Keluarga, Kontrak, & SK</p>
                </div>
              </div>
              <svg class="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href="/portal/usulan"
              class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-800">Usulan Perbaikan Data</p>
                  <p class="text-[10px] text-slate-400">Kontak, Keluarga, Riwayat Kontrak</p>
                </div>
              </div>
              <svg class="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <a
              href="/portal/tanda-tangan"
              class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-800">Tanda Tangan Elektronik</p>
                  <p class="text-[10px] text-slate-400">TTE Perpanjangan Kontrak BSrE</p>
                </div>
              </div>
              <svg class="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
