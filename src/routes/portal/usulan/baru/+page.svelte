<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { portalApi } from '$lib/portalApi';

  let aturan = {};
  let loadingAturan = true;
  let submitting = false;
  let errorMsg = '';
  let successMsg = '';

  let kategori = 'DATA_UTAMA';
  let aksi = 'UBAH';
  let targetId = '';
  let alasan = '';

  // Data baru form fields
  let formValues = {
    // Data Utama
    nomorHp: '',
    email: '',
    alamat: '',
    // Riwayat Keluarga
    hubungan: 'ISTRI',
    nama: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'P',
    pekerjaan: '',
    statusHidup: true,
    tanggalMenikah: '',
    nomorAktaNikah: '',
    nomorAktaLahir: '',
    isTanggungan: false,
    // Riwayat Kontrak
    kontrakKe: '1',
    nomorKontrak: '',
    tanggalMulai: '',
    tanggalSelesai: '',
    // SK Pengangkatan
    nomorSkCpns: '',
    tanggalSkCpns: '',
    tmtCpns: ''
  };

  let files = [];
  let fileInput;

  // Baca query params jika ada
  $: queryKategori = $page.url.searchParams.get('kategori');
  $: queryAksi = $page.url.searchParams.get('aksi');
  $: queryTargetId = $page.url.searchParams.get('targetId');

  onMount(async () => {
    try {
      const res = await portalApi.getAturanPerbaikan();
      if (res && res.data) {
        aturan = res.data;
      }
      if (queryKategori && aturan[queryKategori]) {
        kategori = queryKategori;
      }
      if (queryAksi) {
        aksi = queryAksi;
      }
      if (queryTargetId) {
        targetId = queryTargetId;
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal memuat konfigurasi aturan';
    } finally {
      loadingAturan = false;
    }
  });

  function handleFileChange(e) {
    if (e.target.files) {
      files = Array.from(e.target.files);
    }
  }

  async function handleSubmit() {
    errorMsg = '';
    successMsg = '';

    if (!alasan || alasan.trim().length < 5) {
      errorMsg = 'Alasan perbaikan wajib diisi minimal 5 karakter';
      return;
    }

    const currentAturan = aturan[kategori];
    if (currentAturan?.lampiranWajib && files.length === 0) {
      errorMsg = 'Lampiran dokumen pendukung wajib diunggah untuk kategori ini';
      return;
    }

    // Bangun payload dataBaru sesuai whitelist
    const payloadDataBaru = {};
    if (aksi !== 'HAPUS' && currentAturan) {
      currentAturan.fieldDiizinkan.forEach(f => {
        if (formValues[f] !== undefined && formValues[f] !== '') {
          payloadDataBaru[f] = formValues[f];
        }
      });
    }

    submitting = true;
    try {
      const fd = new FormData();
      fd.append('kategori', kategori);
      fd.append('aksi', aksi);
      if (targetId) fd.append('targetId', targetId);
      fd.append('alasan', alasan);
      fd.append('dataBaru', JSON.stringify(payloadDataBaru));

      files.forEach(file => {
        fd.append('lampiran', file);
      });

      const res = await portalApi.buatUsulan(fd);
      if (res && res.success) {
        successMsg = 'Usulan perbaikan berhasil diajukan!';
        setTimeout(() => {
          goto(`/portal/usulan/${res.data.id}`);
        }, 1200);
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal mengajukan usulan perbaikan';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Ajukan Usulan Perbaikan — Portal Pegawai</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
  <!-- Back Button & Title -->
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
      <h1 class="text-xl font-bold text-slate-800">Ajukan Usulan Perbaikan Data</h1>
      <p class="text-xs text-slate-500">Pilih kategori data yang ingin Anda perbaiki untuk ditinjau oleh Verifikator BKPSDM.</p>
    </div>
  </div>

  {#if loadingAturan}
    <div class="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
      <div class="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-sm text-slate-500 font-medium">Memuat form usulan...</p>
    </div>
  {:else}
    <form on:submit|preventDefault={handleSubmit} class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      {#if errorMsg}
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-2.5">
          <svg class="w-5 h-5 shrink-0 text-rose-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{errorMsg}</div>
        </div>
      {/if}

      {#if successMsg}
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2.5">
          <svg class="w-5 h-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <div>{successMsg}</div>
        </div>
      {/if}

      <!-- Kategori & Aksi -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="kategori-select" class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Kategori Perbaikan
          </label>
          <select
            id="kategori-select"
            bind:value={kategori}
            on:change={() => {
              if (aturan[kategori] && !aturan[kategori].aksiDiizinkan.includes(aksi)) {
                aksi = aturan[kategori].aksiDiizinkan[0];
              }
            }}
            class="w-full text-sm rounded-xl border-slate-300 bg-slate-50 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 p-2.5"
          >
            {#each Object.entries(aturan) as [key, conf]}
              <option value={key}>{conf.label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="aksi-select" class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Jenis Aksi
          </label>
          <select
            id="aksi-select"
            bind:value={aksi}
            class="w-full text-sm rounded-xl border-slate-300 bg-slate-50 focus:bg-white focus:ring-emerald-500 focus:border-emerald-500 p-2.5"
          >
            {#if aturan[kategori]}
              {#each aturan[kategori].aksiDiizinkan as act}
                <option value={act}>{act}</option>
              {/each}
            {/if}
          </select>
        </div>
      </div>

      <!-- Keterangan / Peringatan Kategori -->
      {#if kategori === 'SK_PENGANGKATAN'}
        <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
          <strong>Perhatian:</strong> Perubahan TMT Pengangkatan Pertama akan memengaruhi perhitungan masa kerja dan gaji perpanjangan kontrak Anda.
        </div>
      {/if}

      <!-- Form Inputs Sesuai Kategori -->
      {#if aksi !== 'HAPUS'}
        <div class="border-t border-slate-100 pt-6 space-y-4">
          <h3 class="text-sm font-semibold text-slate-800">
            Nilai Perubahan yang Diusulkan
          </h3>

          {#if kategori === 'DATA_UTAMA'}
            <div class="space-y-4">
              <div>
                <label for="input-nomor-hp" class="block text-xs font-medium text-slate-700 mb-1">Nomor HP / WhatsApp Baru</label>
                <input
                  id="input-nomor-hp"
                  type="text"
                  bind:value={formValues.nomorHp}
                  placeholder="Contoh: 081234567890"
                  class="w-full text-sm rounded-xl border-slate-300 focus:ring-emerald-500 focus:border-emerald-500 p-2.5"
                />
              </div>
              <div>
                <label for="input-email" class="block text-xs font-medium text-slate-700 mb-1">Email Aktif Baru</label>
                <input
                  id="input-email"
                  type="email"
                  bind:value={formValues.email}
                  placeholder="Contoh: nama@domain.com"
                  class="w-full text-sm rounded-xl border-slate-300 focus:ring-emerald-500 focus:border-emerald-500 p-2.5"
                />
              </div>
              <div>
                <label for="input-alamat" class="block text-xs font-medium text-slate-700 mb-1">Alamat Domisili Baru</label>
                <textarea
                  id="input-alamat"
                  rows="3"
                  bind:value={formValues.alamat}
                  placeholder="Tuliskan alamat domisili lengkap..."
                  class="w-full text-sm rounded-xl border-slate-300 focus:ring-emerald-500 focus:border-emerald-500 p-2.5"
                ></textarea>
              </div>
            </div>

          {:else if kategori === 'RIWAYAT_KELUARGA'}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="input-hubungan" class="block text-xs font-medium text-slate-700 mb-1">Hubungan</label>
                <select id="input-hubungan" bind:value={formValues.hubungan} class="w-full text-sm rounded-xl border-slate-300 p-2.5">
                  <option value="SUAMI">SUAMI</option>
                  <option value="ISTRI">ISTRI</option>
                  <option value="ANAK">ANAK</option>
                  <option value="AYAH">AYAH</option>
                  <option value="IBU">IBU</option>
                </select>
              </div>
              <div>
                <label for="input-nama-anggota" class="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input id="input-nama-anggota" type="text" bind:value={formValues.nama} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-nik-anggota" class="block text-xs font-medium text-slate-700 mb-1">NIK (16 Digit)</label>
                <input id="input-nik-anggota" type="text" bind:value={formValues.nik} maxlength="16" class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-jk-anggota" class="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                <select id="input-jk-anggota" bind:value={formValues.jenisKelamin} class="w-full text-sm rounded-xl border-slate-300 p-2.5">
                  <option value="L">Laki-Laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <label for="input-tempat-lahir" class="block text-xs font-medium text-slate-700 mb-1">Tempat Lahir</label>
                <input id="input-tempat-lahir" type="text" bind:value={formValues.tempatLahir} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-tgl-lahir" class="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input id="input-tgl-lahir" type="date" bind:value={formValues.tanggalLahir} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-pekerjaan" class="block text-xs font-medium text-slate-700 mb-1">Pekerjaan</label>
                <input id="input-pekerjaan" type="text" bind:value={formValues.pekerjaan} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-no-akta-nikah" class="block text-xs font-medium text-slate-700 mb-1">Nomor Akta Nikah / Lahir</label>
                <input id="input-no-akta-nikah" type="text" bind:value={formValues.nomorAktaNikah} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
            </div>

          {:else if kategori === 'RIWAYAT_KONTRAK'}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="input-kontrak-ke" class="block text-xs font-medium text-slate-700 mb-1">Kontrak Ke-</label>
                <input id="input-kontrak-ke" type="number" min="1" bind:value={formValues.kontrakKe} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-no-kontrak" class="block text-xs font-medium text-slate-700 mb-1">Nomor Surat Perjanjian Kerja (SPK)</label>
                <input id="input-no-kontrak" type="text" bind:value={formValues.nomorKontrak} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-tgl-mulai" class="block text-xs font-medium text-slate-700 mb-1">Tanggal Mulai Kontrak</label>
                <input id="input-tgl-mulai" type="date" bind:value={formValues.tanggalMulai} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-tgl-selesai" class="block text-xs font-medium text-slate-700 mb-1">Tanggal Selesai Kontrak</label>
                <input id="input-tgl-selesai" type="date" bind:value={formValues.tanggalSelesai} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
            </div>

          {:else if kategori === 'SK_PENGANGKATAN'}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label for="input-no-sk-cpns" class="block text-xs font-medium text-slate-700 mb-1">Nomor SK Pengangkatan Pertama</label>
                <input id="input-no-sk-cpns" type="text" bind:value={formValues.nomorSkCpns} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-tgl-sk-cpns" class="block text-xs font-medium text-slate-700 mb-1">Tanggal SK</label>
                <input id="input-tgl-sk-cpns" type="date" bind:value={formValues.tanggalSkCpns} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
              <div>
                <label for="input-tmt-cpns" class="block text-xs font-medium text-slate-700 mb-1">TMT Pengangkatan Pertama</label>
                <input id="input-tmt-cpns" type="date" bind:value={formValues.tmtCpns} class="w-full text-sm rounded-xl border-slate-300 p-2.5" />
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Alasan Perbaikan -->
      <div class="border-t border-slate-100 pt-6">
        <label for="input-alasan" class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
          Alasan Pengajuan Perbaikan <span class="text-rose-500">*</span>
        </label>
        <textarea
          id="input-alasan"
          rows="3"
          bind:value={alasan}
          required
          placeholder="Jelaskan alasan pengajuan usulan perbaikan data ini..."
          class="w-full text-sm rounded-xl border-slate-300 focus:ring-emerald-500 focus:border-emerald-500 p-2.5"
        ></textarea>
      </div>

      <!-- Lampiran Berkas -->
      <div class="border-t border-slate-100 pt-6">
        <label for="input-lampiran" class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
          Unggah Dokumen Lampiran {aturan[kategori]?.lampiranWajib ? '(Wajib)' : '(Opsional)'}
        </label>
        <p class="text-xs text-slate-500 mb-3">
          {aturan[kategori]?.keteranganLampiran || 'Format: PDF, JPG, PNG (maksimal 2MB per file, maks 3 file).'}
        </p>

        <input
          id="input-lampiran"
          type="file"
          bind:this={fileInput}
          on:change={handleFileChange}
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          class="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
        />

        {#if files.length > 0}
          <div class="mt-3 space-y-1">
            {#each files as f}
              <div class="text-xs text-slate-600 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Action Buttons -->
      <div class="border-t border-slate-100 pt-6 flex items-center justify-end gap-3">
        <a
          href="/portal/usulan"
          class="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
        >
          Batal
        </a>
        <button
          type="submit"
          disabled={submitting}
          class="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {#if submitting}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Mengirim...</span>
          {:else}
            <span>Kirim Usulan</span>
          {/if}
        </button>
      </div>
    </form>
  {/if}
</div>
