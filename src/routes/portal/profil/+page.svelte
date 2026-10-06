<script>
  import { onMount } from "svelte";
  import { portalApi } from "$lib/portalApi";
  import { page } from "$app/stores";

  let activeTab = $state("utama"); // "utama", "keluarga", "kontrak", "sk_pengangkatan"
  let profile = $state(null);
  let contracts = $state([]);
  let riwayatKeluarga = $state([]);
  let skPengangkatan = $state(null);
  let isLoading = $state(true);
  let errorMsg = $state("");

  onMount(async () => {
    // Cek query tab dari URL jika ada
    const queryTab = $page.url.searchParams.get("tab");
    if (queryTab && ["utama", "keluarga", "kontrak", "sk_pengangkatan"].includes(queryTab)) {
      activeTab = queryTab;
    }

    try {
      const [pRes, cRes, skRes, kRes] = await Promise.allSettled([
        portalApi.getMe(),
        portalApi.getRiwayatKontrak(),
        portalApi.getSkPengangkatan(),
        portalApi.getRiwayatKeluarga()
      ]);

      if (pRes.status === "fulfilled" && pRes.value.success) {
        profile = pRes.value.data;
      } else {
        errorMsg = "Gagal memuat profil pegawai.";
      }

      if (cRes.status === "fulfilled" && cRes.value.success) {
        contracts = cRes.value.data || [];
      }

      if (skRes.status === "fulfilled" && skRes.value.success) {
        skPengangkatan = skRes.value.data;
      }

      if (kRes.status === "fulfilled" && kRes.value.success) {
        riwayatKeluarga = kRes.value.data || [];
      }
    } catch (err) {
      errorMsg = err.message || "Gagal memuat data.";
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Profil & Riwayat Saya — SIPPPK</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header Bar -->
  <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div class="flex items-center gap-4">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
        {profile?.nama?.charAt(0) || "P"}
      </div>
      <div>
        <h1 class="text-lg sm:text-xl font-bold text-slate-800">
          {profile?.nama ? (profile.gelarDepan ? `${profile.gelarDepan} ` : '') + profile.nama + (profile.gelarBelakang ? `, ${profile.gelarBelakang}` : '') : "Profil Pegawai"}
        </h1>
        <div class="flex flex-wrap items-center gap-2 mt-1">
          <span class="text-xs font-mono font-medium text-slate-500">NIP: {profile?.nipBaru || "-"}</span>
          <span class="text-slate-300">•</span>
          <span class="text-xs text-slate-500">{profile?.unorNama || "-"}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold {profile?.jenisPegawaiPortal === 'PENUH_WAKTU' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}">
            {profile?.jenisPegawaiPortal === 'PENUH_WAKTU' ? 'Penuh Waktu' : 'Paruh Waktu'}
          </span>
        </div>
      </div>
    </div>

    <!-- Tombol Usulkan Perbaikan -->
    <a
      href="/portal/usulan/baru"
      class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-colors shadow-xs"
    >
      <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Ajukan Usulan Perbaikan
    </a>
  </div>

  <!-- Tabs Navigation -->
  <div class="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs overflow-x-auto scrollbar-thin">
    <button
      type="button"
      onclick={() => (activeTab = "utama")}
      class="flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 {activeTab === 'utama' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
      </svg>
      Data Utama & Kontak
    </button>

    <button
      type="button"
      onclick={() => (activeTab = "keluarga")}
      class="flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 {activeTab === 'keluarga' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Riwayat Keluarga
    </button>

    <button
      type="button"
      onclick={() => (activeTab = "kontrak")}
      class="flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 {activeTab === 'kontrak' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Riwayat Kontrak ({contracts.length})
    </button>

    <button
      type="button"
      onclick={() => (activeTab = "sk_pengangkatan")}
      class="flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 {activeTab === 'sk_pengangkatan' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      SK Pengangkatan Pertama
    </button>
  </div>

  {#if isLoading}
    <div class="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
      <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-500">Memuat rincian data...</p>
    </div>
  {:else}
    <!-- TAB 1: DATA UTAMA & KONTAK -->
    {#if activeTab === "utama"}
      <div class="space-y-6">
        <!-- Sub-Card Kontak (Dapat Diusulkan Perbaikannya) -->
        <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                Informasi Kontak & Alamat Domisili
              </h2>
              <p class="text-[11px] text-slate-500 mt-0.5">
                Data nomor HP, email, dan alamat dapat diusulkan perbaikannya jika terjadi perubahan
              </p>
            </div>
            <a
              href="/portal/usulan/baru?kategori=DATA_UTAMA"
              class="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200"
            >
              Usulkan Perubahan Kontak
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Nomor Handphone / WhatsApp</span>
              <p class="text-sm font-bold text-slate-800 font-mono">{profile?.nomorHp || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Alamat Email Pribadi</span>
              <p class="text-sm font-bold text-slate-800 truncate">{profile?.email || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Email Kedinasan (Gov)</span>
              <p class="text-sm font-bold text-slate-800 truncate">{profile?.emailGov || "-"}</p>
            </div>

            <div class="sm:col-span-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Alamat Lengkap Domisili</span>
              <p class="text-sm text-slate-800 leading-relaxed font-medium">{profile?.alamat || "-"}</p>
            </div>
          </div>
        </div>

        <!-- Sub-Card Biodata Pribadi -->
        <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
          <h2 class="text-sm sm:text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
            Identitas Pribadi & Kependudukan
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">NIK (KTP)</span>
              <p class="text-sm font-bold font-mono text-slate-800">{profile?.nik || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Tempat & Tanggal Lahir</span>
              <p class="text-sm font-bold text-slate-800">{profile?.tempatLahirNama || "-"}, {profile?.tanggalLahir || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Jenis Kelamin</span>
              <p class="text-sm font-bold text-slate-800">{profile?.jenisKelamin === 'F' ? 'Perempuan' : 'Laki-laki'}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Agama</span>
              <p class="text-sm font-bold text-slate-800">{profile?.agamaNama || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Nomor NPWP</span>
              <p class="text-sm font-bold font-mono text-slate-800">{profile?.npwpNomor || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Nomor BPJS</span>
              <p class="text-sm font-bold font-mono text-slate-800">{profile?.bpjs || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Status Perkawinan</span>
              <p class="text-sm font-bold text-slate-800">{profile?.jenisKawinNama || "-"}</p>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span class="text-[10px] uppercase font-bold text-slate-400">Status Kedudukan Hukum</span>
              <p class="text-sm font-bold text-emerald-700">{profile?.kedudukanHukumNama || "Aktif"}</p>
            </div>
          </div>
        </div>
      </div>

    <!-- TAB 2: KELUARGA -->
    {:else if activeTab === "keluarga"}
      <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Status Pernikahan & Tanggungan Keluarga
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Informasi keluarga terdaftar untuk BPJS dan penggajian</p>
          </div>
          <a
            href="/portal/usulan/baru?kategori=RIWAYAT_KELUARGA"
            class="text-xs font-bold text-pink-700 hover:text-pink-800 flex items-center gap-1 bg-pink-50 px-3 py-1.5 rounded-xl border border-pink-200"
          >
            Usulkan Perbaikan Keluarga
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400">Status Pernikahan</span>
            <p class="text-base font-bold text-slate-800">{profile?.jenisKawinNama || "-"}</p>
            <p class="text-[11px] text-slate-500">Tercatat dalam data ASN</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400">Jumlah Anggota Terdata</span>
            <p class="text-base font-bold text-blue-700">
              {riwayatKeluarga.length} Orang
            </p>
            <p class="text-[11px] text-slate-500">Tercatat di riwayat keluarga</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400">Kartu ASN Virtual</span>
            <p class="text-base font-bold text-emerald-700">{profile?.kartuAsnVirtual || "Terdaftar"}</p>
            <p class="text-[11px] text-slate-500">Satu Pintu BKN</p>
          </div>
        </div>

        <!-- Tabel Anggota Keluarga -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Anggota Keluarga</h3>
            <a
              href="/portal/usulan/baru?kategori=RIWAYAT_KELUARGA&aksi=TAMBAH"
              class="text-xs font-semibold text-pink-700 hover:text-pink-800 flex items-center gap-1 bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200"
            >
              + Tambah Anggota
            </a>
          </div>

          {#if riwayatKeluarga.length === 0}
            <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center text-xs text-slate-400">
              Belum ada data anggota keluarga terdaftar. Klik <strong>+ Tambah Anggota</strong> untuk mengusulkan penambahan anggota keluarga.
            </div>
          {:else}
            <div class="overflow-x-auto rounded-2xl border border-slate-200">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th class="p-3">Hubungan</th>
                    <th class="p-3">Nama Lengkap</th>
                    <th class="p-3">NIK</th>
                    <th class="p-3">Tanggal Lahir</th>
                    <th class="p-3">Tanggungan</th>
                    <th class="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  {#each riwayatKeluarga as k (k.id)}
                    <tr class="hover:bg-slate-50">
                      <td class="p-3 font-semibold text-slate-800">
                        <span class="px-2 py-0.5 rounded-full bg-slate-100 text-[11px]">{k.hubungan}</span>
                      </td>
                      <td class="p-3 font-medium text-slate-800">{k.nama}</td>
                      <td class="p-3 font-mono text-slate-500">{k.nik || "-"}</td>
                      <td class="p-3 text-slate-600">{k.tanggalLahir || "-"}</td>
                      <td class="p-3">
                        <span class={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${k.isTanggungan ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {k.isTanggungan ? 'Ya' : 'Tidak'}
                        </span>
                      </td>
                      <td class="p-3 text-right">
                        <a
                          href={`/portal/usulan/baru?kategori=RIWAYAT_KELUARGA&aksi=UBAH&targetId=${k.id}`}
                          class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md"
                        >
                          Koreksi
                        </a>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>

        <div class="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed">
          <span class="font-bold block mb-1">Catatan Pembaruan Data Keluarga:</span>
          Jika terdapat penambahan anggota keluarga (pernikahan atau kelahiran anak) atau perubahan status, Anda dapat mengunggah bukti Surat Nikah / Akta Kelahiran melalui tombol <strong>+ Tambah Anggota</strong> atau <strong>Koreksi</strong>.
        </div>
      </div>

    <!-- TAB 3: RIWAYAT KONTRAK -->
    {:else if activeTab === "kontrak"}
      <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Riwayat Perjanjian Kerja / Kontrak
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Daftar seluruh perjanjian kerja yang pernah diterbitkan</p>
          </div>
          <a
            href="/portal/usulan/baru?kategori=RIWAYAT_KONTRAK"
            class="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200"
          >
            Usulkan Koreksi Kontrak
          </a>
        </div>

        {#if contracts.length === 0}
          <div class="py-12 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
            Belum ada riwayat kontrak kerja yang tercatat.
          </div>
        {:else}
          <div class="overflow-x-auto rounded-2xl border border-slate-200 scrollbar-thin">
            <table class="w-full min-w-[600px] text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th class="py-3 px-4 text-center w-14">Ke-</th>
                  <th class="py-3 px-4">Nomor Kontrak</th>
                  <th class="py-3 px-4">Masa Berlaku</th>
                  <th class="py-3 px-4">Gaji Pokok</th>
                  <th class="py-3 px-4">Golongan & MK</th>
                  <th class="py-3 px-4 text-right">Dokumen SK</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each contracts as k}
                  <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="py-3.5 px-4 text-center font-bold text-emerald-700 bg-emerald-50/40">
                      {k.kontrakKe}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {k.nomorKontrak || "-"}
                    </td>
                    <td class="py-3.5 px-4 text-slate-600 font-medium">
                      {k.tanggalMulai} s/d {k.tanggalSelesai}
                    </td>
                    <td class="py-3.5 px-4 font-semibold text-slate-700">
                      {k.gajiPokok ? `Rp ${Number(k.gajiPokok).toLocaleString('id-ID')}` : "-"}
                    </td>
                    <td class="py-3.5 px-4 text-slate-600">
                      Gol. {k.golongan || "-"} ({k.mkTahun || 0} Thn {k.mkBulan || 0} Bln)
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      {#if k.arsipKontrak?.fileUrl}
                        <a
                          href={k.arsipKontrak.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                        >
                          Unduh SK
                        </a>
                      {:else}
                        <span class="text-[11px] text-slate-400">Tidak ada file</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

    <!-- TAB 4: SK PENGANGKATAN PERTAMA -->
    {:else if activeTab === "sk_pengangkatan"}
      <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Surat Keputusan Pengangkatan Pertama (CPNS/P3K)
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Dasar pengangkatan awal sebagai pegawai ASN di Pemerintah Daerah</p>
          </div>
          <a
            href="/portal/usulan/baru?kategori=SK_PENGANGKATAN"
            class="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200"
          >
            Usulkan Koreksi SK
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div class="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
            <span class="text-[10px] uppercase font-bold text-blue-500">Nomor SK Pengangkatan</span>
            <p class="text-sm font-bold font-mono text-blue-950 break-all">{skPengangkatan?.nomorSkCpns || "-"}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400">Tanggal SK</span>
            <p class="text-sm font-bold text-slate-800">{skPengangkatan?.tanggalSkCpns || "-"}</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span class="text-[10px] uppercase font-bold text-slate-400">TMT Pengangkatan Awal</span>
            <p class="text-sm font-bold text-emerald-700">{skPengangkatan?.tmtCpns || "-"}</p>
          </div>
        </div>

        {#if skPengangkatan?.arsipSkCpns?.fileUrl}
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                PDF
              </div>
              <div>
                <p class="text-xs font-bold text-slate-800">{skPengangkatan.arsipSkCpns.nomorSk || "Dokumen SK Pengangkatan"}</p>
                <p class="text-[10px] text-slate-400">Arsip Digital Resmi</p>
              </div>
            </div>
            <a
              href={skPengangkatan.arsipSkCpns.fileUrl}
              target="_blank"
              rel="noreferrer"
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs"
            >
              Unduh Berkas
            </a>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>
