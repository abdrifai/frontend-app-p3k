<script>
  import { portalApi } from "$lib/portalApi";
  import { addToast } from "$lib/toastStore";
  import { goto } from "$app/navigation";

  // State wizard
  let step = $state(1); // 1: Cek Data, 2: Kirim OTP, 3: Verifikasi & Password
  let isLoading = $state(false);
  let errorMsg = $state("");

  // Form Step 1
  let nipBaru = $state("");
  let nik = $state("");
  let tanggalLahir = $state("");

  // Verified Data from Step 1
  let verifiedPegawai = $state(null);

  // Form Step 2
  let email = $state("");

  // Form Step 3
  let otp = $state("");
  let password = $state("");
  let konfirmasiPassword = $state("");
  let showPassword = $state(false);

  // Step 1: Cek Pegawai
  async function handleCekData(e) {
    e.preventDefault();
    errorMsg = "";
    isLoading = true;

    try {
      const res = await portalApi.cekAktivasi({
        nipBaru: nipBaru.trim(),
        nik: nik.trim(),
        tanggalLahir: tanggalLahir.trim()
      });

      if (res.success && res.data) {
        verifiedPegawai = res.data;
        email = res.data.defaultEmail || "";
        step = 2;
        addToast("Data pegawai terverifikasi. Silakan masukkan email untuk menerima kode OTP.", "success");
      } else {
        errorMsg = res.message || "Data tidak ditemukan atau tidak cocok.";
      }
    } catch (err) {
      errorMsg = err.message || "Gagal memverifikasi data pegawai.";
    } finally {
      isLoading = false;
    }
  }

  // Step 2: Kirim OTP
  async function handleKirimOtp(e) {
    e.preventDefault();
    errorMsg = "";
    isLoading = true;

    try {
      const res = await portalApi.kirimOtp({
        nipBaru: nipBaru.trim(),
        nik: nik.trim(),
        tanggalLahir: tanggalLahir.trim(),
        email: email.trim()
      });

      if (res.success) {
        step = 3;
        addToast("Kode OTP 6 digit telah dikirimkan ke email Anda. Silakan periksa inbox atau spam.", "success");
      } else {
        errorMsg = res.message || "Gagal mengirimkan kode OTP.";
      }
    } catch (err) {
      errorMsg = err.message || "Gagal mengirimkan kode OTP.";
    } finally {
      isLoading = false;
    }
  }

  // Step 3: Verifikasi OTP & Buat Akun
  async function handleVerifikasi(e) {
    e.preventDefault();
    errorMsg = "";

    if (password !== konfirmasiPassword) {
      errorMsg = "Konfirmasi password tidak cocok dengan password baru.";
      return;
    }

    isLoading = true;

    try {
      const res = await portalApi.verifikasiOtp({
        nipBaru: nipBaru.trim(),
        otp: otp.trim(),
        password,
        konfirmasiPassword
      });

      if (res.success) {
        addToast("Aktivasi akun berhasil! Silakan login dengan NIP dan password baru Anda.", "success");
        goto("/login");
      } else {
        errorMsg = res.message || "Verifikasi aktivasi gagal.";
      }
    } catch (err) {
      errorMsg = err.message || "Gagal menyelesaikan aktivasi akun.";
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Aktivasi Akun Portal Pegawai — SIPPPK</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
  <div class="max-w-xl w-full">
    <!-- Card Utama -->
    <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden relative">
      <!-- Accent Top Bar -->
      <div class="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600"></div>

      <div class="p-6 sm:p-10">
        <!-- Brand Header -->
        <div class="text-center mb-8">
          <div class="w-20 h-20 mx-auto mb-3 flex items-center justify-center filter drop-shadow">
            <img src="/logo.svg" alt="Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Portal Mandiri PPPK
          </span>
          <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Aktivasi Akun Pegawai</h2>
          <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Khusus Pegawai PPPK Penuh Waktu dan Paruh Waktu BKPSDM Kabupaten Tojo Una-Una
          </p>
        </div>

        <!-- Stepper Indicator -->
        <div class="flex items-center justify-between mb-8 px-2 sm:px-6">
          <!-- Step 1 -->
          <div class="flex flex-col items-center gap-1.5 flex-1">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all {step >= 1 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-50' : 'bg-slate-100 text-slate-400'}">
              {#if step > 1}
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              {:else}
                1
              {/if}
            </div>
            <span class="text-[11px] font-semibold {step >= 1 ? 'text-slate-800' : 'text-slate-400'} text-center">Data Diri</span>
          </div>

          <div class="h-0.5 flex-1 mx-2 transition-colors {step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}"></div>

          <!-- Step 2 -->
          <div class="flex flex-col items-center gap-1.5 flex-1">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all {step >= 2 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-50' : 'bg-slate-100 text-slate-400'}">
              {#if step > 2}
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
              {:else}
                2
              {/if}
            </div>
            <span class="text-[11px] font-semibold {step >= 2 ? 'text-slate-800' : 'text-slate-400'} text-center">Kirim OTP</span>
          </div>

          <div class="h-0.5 flex-1 mx-2 transition-colors {step >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}"></div>

          <!-- Step 3 -->
          <div class="flex flex-col items-center gap-1.5 flex-1">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all {step >= 3 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-50' : 'bg-slate-100 text-slate-400'}">
              3
            </div>
            <span class="text-[11px] font-semibold {step >= 3 ? 'text-slate-800' : 'text-slate-400'} text-center">Selesai</span>
          </div>
        </div>

        <!-- Alert Error -->
        {#if errorMsg}
          <div class="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <svg class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-xs text-rose-700 leading-relaxed font-medium flex-1">
              <p>{errorMsg}</p>
              {#if errorMsg.toLowerCase().includes('sudah aktif') || errorMsg.toLowerCase().includes('login')}
                <div class="mt-2.5 flex items-center gap-3">
                  <a
                    href="/login"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    Menuju Halaman Login
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                  <a
                    href="/forgot-password"
                    class="text-xs text-rose-800 hover:text-rose-950 font-medium underline"
                  >
                    Lupa Password?
                  </a>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- STEP 1: CEK DATA -->
        {#if step === 1}
          <form onsubmit={handleCekData} class="space-y-4">
            <div class="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed">
              <p class="font-bold mb-1 flex items-center gap-1.5 text-blue-950">
                <svg class="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Petunjuk Aktivasi
              </p>
              Masukkan NIP (18 digit), NIK (16 digit), dan tanggal lahir Anda sesuai data yang terdaftar pada SK PPPK atau BKN.
            </div>

            <div>
              <label for="nip" class="block text-xs font-semibold text-slate-700 mb-1.5">Nomor Induk Pegawai (NIP)</label>
              <input
                id="nip"
                type="text"
                maxlength="18"
                bind:value={nipBaru}
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                placeholder="Contoh: 199001012024211001"
              />
            </div>

            <div>
              <label for="nik" class="block text-xs font-semibold text-slate-700 mb-1.5">Nomor Induk Kependudukan (NIK)</label>
              <input
                id="nik"
                type="text"
                maxlength="16"
                bind:value={nik}
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                placeholder="16 digit sesuai KTP"
              />
            </div>

            <div>
              <label for="tgl" class="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Lahir</label>
              <input
                id="tgl"
                type="date"
                bind:value={tanggalLahir}
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              class="w-full mt-6 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {#if isLoading}
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memeriksa Data...
              {:else}
                Periksa & Lanjutkan
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              {/if}
            </button>
          </form>

        <!-- STEP 2: KONFIRMASI NAMA & KIRIM OTP -->
        {:else if step === 2}
          <form onsubmit={handleKirimOtp} class="space-y-5">
            <!-- Info Box Hasil Cek -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <span class="text-xs text-slate-400 font-medium">Status Pegawai</span>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold {verifiedPegawai?.jenisPegawai === 'PENUH_WAKTU' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                  {verifiedPegawai?.jenisPegawai === 'PENUH_WAKTU' ? 'PPPK Penuh Waktu' : 'PPPK Paruh Waktu'}
                </span>
              </div>
              <div>
                <span class="text-[11px] text-slate-400 block font-medium">Nama Lengkap</span>
                <p class="text-base font-bold text-slate-800">{verifiedPegawai?.nama || "-"}</p>
              </div>
              <div>
                <span class="text-[11px] text-slate-400 block font-medium">NIP Terdaftar</span>
                <p class="text-sm font-mono font-semibold text-slate-700">{verifiedPegawai?.nipBaru || "-"}</p>
              </div>
            </div>

            <div>
              <label for="email" class="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email untuk Penerimaan OTP
              </label>
              <input
                id="email"
                type="email"
                bind:value={email}
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="nama.anda@gmail.com"
              />
              <p class="text-[11px] text-slate-500 mt-1.5">
                Pastikan email pribadi Anda aktif dan belum pernah terdaftar pada akun lain di sistem. Kode OTP 6 digit akan dikirimkan ke alamat ini.
              </p>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                onclick={() => (step = 1)}
                class="w-1/3 py-3 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={isLoading}
                class="w-2/3 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {#if isLoading}
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mengirim OTP...
                {:else}
                  Kirim Kode OTP
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                {/if}
              </button>
            </div>
          </form>

        <!-- STEP 3: INPUT OTP & SET PASSWORD -->
        {:else if step === 3}
          <form onsubmit={handleVerifikasi} class="space-y-5">
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800">
              Kode OTP telah dikirimkan ke <strong>{email}</strong>. Periksa kotak masuk atau folder spam Anda. Kode berlaku selama 10 menit.
            </div>

            <div>
              <label for="otp" class="block text-xs font-semibold text-slate-700 mb-1.5">Kode OTP (6 Digit)</label>
              <input
                id="otp"
                type="text"
                maxlength="6"
                bind:value={otp}
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-center tracking-[0.5em] text-xl font-bold font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-emerald-700"
                placeholder="••••••"
              />
            </div>

            <div>
              <label for="pass" class="block text-xs font-semibold text-slate-700 mb-1.5">Password Baru</label>
              <div class="relative">
                <input
                  id="pass"
                  type={showPassword ? "text" : "password"}
                  bind:value={password}
                  minlength="8"
                  required
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all pr-10"
                  placeholder="Minimal 8 karakter kombinasi huruf & angka"
                />
                <button
                  type="button"
                  onclick={() => (showPassword = !showPassword)}
                  class="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label for="confpass" class="block text-xs font-semibold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
              <input
                id="confpass"
                type="password"
                bind:value={konfirmasiPassword}
                minlength="8"
                required
                class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="Ulangi password baru"
              />
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                onclick={() => (step = 2)}
                class="w-1/3 py-3 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Ganti Email
              </button>
              <button
                type="submit"
                disabled={isLoading}
                class="w-2/3 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {#if isLoading}
                  <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Membuat Akun...
                {:else}
                  Aktivasi & Simpan Akun
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                {/if}
              </button>
            </div>
          </form>
        {/if}

        <!-- Footer Card -->
        <div class="mt-8 pt-6 border-t border-slate-100 text-center">
          <p class="text-xs text-slate-500">
            Sudah memiliki akun aktif?
            <a href="/login" class="font-semibold text-blue-600 hover:text-blue-700 ml-1">Masuk ke Sistem</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
