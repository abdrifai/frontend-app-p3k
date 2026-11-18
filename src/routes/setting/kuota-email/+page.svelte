<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, isUserAdmin } from '$lib/store';
  import { addToast } from '$lib/toastStore';
  import { apiRequest } from '$lib/api';

  // ── State ──────────────────────────────────────────────────────────────────
  let loading = $state(true);
  let testingSmtp = $state(false);
  let quotaData = $state(null);
  let searchQuery = $state('');
  let lastTestedAt = $state(null);
  let testResult = $state(null); // { success: boolean, message: string }

  // ── Helper Formatter ───────────────────────────────────────────────────────
  const fmtNum = (n) => (n ?? 0).toLocaleString('id-ID');

  const fmtDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  async function fetchQuotaSummary() {
    loading = true;
    try {
      const res = await apiRequest('/api/v1/email-monitoring/quota', 'GET');
      if (res?.success) {
        quotaData = res.data;
      }
    } catch (err) {
      console.error('Error fetching email quota:', err);
      // apiRequest already shows toast on error
    } finally {
      loading = false;
    }
  }

  // ── Test SMTP Connection ───────────────────────────────────────────────────
  async function handleTestConnection() {
    testingSmtp = true;
    testResult = null;
    try {
      const res = await apiRequest('/api/v1/email-monitoring/test-connection', 'POST');
      if (res?.success) {
        testResult = { success: true, message: res.message || 'Koneksi ke server SMTP berhasil diverifikasi.' };
        lastTestedAt = new Date();
        addToast(res.message || 'Koneksi SMTP aktif & siap digunakan!', 'success');
      }
    } catch (err) {
      testResult = { success: false, message: err.message || 'Koneksi ke server SMTP gagal.' };
      lastTestedAt = new Date();
      // apiRequest already toasts error
    } finally {
      testingSmtp = false;
    }
  }

  // ── Derived Filtered Recent Emails ─────────────────────────────────────────
  let filteredEmails = $derived(
    (quotaData?.recentEmails || []).filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (item.emailTujuan || '').toLowerCase().includes(q) ||
        (item.deskripsi || '').toLowerCase().includes(q) ||
        (item.tipe || '').toLowerCase().includes(q)
      );
    })
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  onMount(async () => {
    if (!$authStore.isAuthenticated || !isUserAdmin($authStore.user)) {
      addToast('Akses ditolak. Halaman ini hanya untuk Administrator.', 'error');
      goto('/');
      return;
    }
    await fetchQuotaSummary();
  });
</script>

<svelte:head>
  <title>Monitoring Kuota Email SMTP | SIPPPK</title>
</svelte:head>

<div class="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Monitoring Kuota Email SMTP</h1>
          <p class="text-sm text-slate-500 mt-1">
            Pantau limit harian pengiriman email Gmail (Aktivasi Akun Pegawai & Reset Password).
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5">
        <button
          onclick={fetchQuotaSummary}
          disabled={loading}
          class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-60 cursor-pointer shadow-xs"
        >
          <svg class="w-4 h-4 text-slate-500 {loading ? 'animate-spin' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Segarkan Data
        </button>

        <button
          onclick={handleTestConnection}
          disabled={testingSmtp || loading}
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-60 cursor-pointer shadow-sm hover:shadow"
        >
          {#if testingSmtp}
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Menguji Koneksi...
          {:else}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Uji Koneksi SMTP
          {/if}
        </button>
      </div>
    </div>

    <!-- ── Alert Status Kuota (Jika Peringatan / Habis) ───────────────────── -->
    {#if quotaData?.usage24h?.status === 'HABIS'}
      <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 shadow-xs">
        <svg class="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="text-sm">
          <p class="font-bold text-red-950">PERHATIAN: Kuota Pengiriman Email Harian Telah Habis!</p>
          <p class="text-red-800 mt-0.5">
            Akun pengirim telah mencapai batas maksimal ({quotaData?.dailyQuotaLimit} email). Email baru seperti OTP aktivasi akun akan ditolak oleh Google hingga kuota bergulir di-reset.
          </p>
        </div>
      </div>
    {:else if quotaData?.usage24h?.status === 'PERINGATAN'}
      <div class="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-xs">
        <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="text-sm">
          <p class="font-bold text-amber-950">Peringatan Kuota Email Mendekati Batas ({quotaData?.usage24h?.percentUsed}%)</p>
          <p class="text-amber-800 mt-0.5">
            Sisa kuota pengiriman untuk 24 jam ke depan tersisa <strong>{quotaData?.usage24h?.remainingQuota} email</strong> lagi.
          </p>
        </div>
      </div>
    {/if}

    <!-- ── Hasil Uji Koneksi SMTP Terakhir (Jika ada) ─────────────────────── -->
    {#if testResult}
      <div class="flex items-center justify-between p-3.5 rounded-xl border text-sm {testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}">
        <div class="flex items-center gap-2.5">
          {#if testResult.success}
            <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {:else}
            <svg class="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          {/if}
          <span><strong>Uji Koneksi:</strong> {testResult.message}</span>
        </div>
        {#if lastTestedAt}
          <span class="text-xs text-slate-500 font-mono">Pukul {fmtDate(lastTestedAt)}</span>
        {/if}
      </div>
    {/if}

    <!-- ── Kartu Statistik Kuota (4 Kolom) ────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      <!-- Card 1: Sisa Kuota 24 Jam -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold tracking-wider text-slate-500 uppercase">Sisa Kuota 24 Jam</span>
          {#if quotaData?.usage24h?.status === 'AMAN'}
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              AMAN
            </span>
          {:else if quotaData?.usage24h?.status === 'PERINGATAN'}
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              PERINGATAN
            </span>
          {:else}
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
              HABIS
            </span>
          {/if}
        </div>
        <div class="mt-3">
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '-' : fmtNum(quotaData?.usage24h?.remainingQuota)}
            </span>
            <span class="text-sm font-medium text-slate-400">/ {fmtNum(quotaData?.dailyQuotaLimit)}</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">Kuota terpakai: {quotaData?.usage24h?.percentUsed ?? 0}%</p>
        </div>
        <!-- Progress Bar -->
        <div class="mt-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full transition-all duration-500 {quotaData?.usage24h?.status === 'HABIS' ? 'bg-red-500' : quotaData?.usage24h?.status === 'PERINGATAN' ? 'bg-amber-500' : 'bg-blue-600'}"
            style="width: {quotaData?.usage24h?.percentUsed ?? 0}%"
          ></div>
        </div>
      </div>

      <!-- Card 2: Terkirim 24 Jam Terakhir -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold tracking-wider text-slate-500 uppercase">Terkirim (24 Jam)</span>
          <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="mt-3">
          <div class="text-3xl font-extrabold text-slate-900 tracking-tight">
            {loading ? '-' : fmtNum(quotaData?.usage24h?.totalSent)}
          </div>
          <p class="text-xs text-slate-500 mt-1">Total pengiriman dalam 24 jam bergulir</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
          <span>Hari ini (00:00 - now):</span>
          <span class="font-semibold text-slate-800">{fmtNum(quotaData?.usageToday?.totalSent)} email</span>
        </div>
      </div>

      <!-- Card 3: Aktivasi Akun (OTP) -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold tracking-wider text-slate-500 uppercase">OTP Aktivasi Akun</span>
          <div class="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
        <div class="mt-3">
          <div class="text-3xl font-extrabold text-sky-700 tracking-tight">
            {loading ? '-' : fmtNum(quotaData?.usage24h?.otpAktivasi)}
          </div>
          <p class="text-xs text-slate-500 mt-1">Kode OTP verifikasi pegawai baru</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
          <span>Terkirim hari ini:</span>
          <span class="font-semibold text-sky-800">{fmtNum(quotaData?.usageToday?.otpAktivasi)} email</span>
        </div>
      </div>

      <!-- Card 4: Reset Password -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold tracking-wider text-slate-500 uppercase">Reset Password</span>
          <div class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
        <div class="mt-3">
          <div class="text-3xl font-extrabold text-indigo-700 tracking-tight">
            {loading ? '-' : fmtNum(quotaData?.usage24h?.resetPassword)}
          </div>
          <p class="text-xs text-slate-500 mt-1">Tautan atur ulang kata sandi pengguna</p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
          <span>Terkirim hari ini:</span>
          <span class="font-semibold text-indigo-800">{fmtNum(quotaData?.usageToday?.resetPassword)} email</span>
        </div>
      </div>

    </div>

    <!-- ── Konfigurasi Server Pengirim ────────────────────────────────────── -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <h2 class="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Informasi Layanan SMTP Server
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Penyedia Layanan</p>
          <p class="font-semibold text-slate-800 mt-1">{quotaData?.provider || 'Google Gmail SMTP'}</p>
        </div>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Akun Email Pengirim</p>
          <p class="font-semibold text-slate-800 mt-1 font-mono text-xs truncate" title={quotaData?.smtpUser}>
            {quotaData?.smtpUser || '-'}
          </p>
        </div>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Host & Port</p>
          <p class="font-semibold text-slate-800 mt-1 font-mono text-xs">
            {quotaData?.smtpHost || 'smtp.gmail.com'} : {quotaData?.smtpPort || 465} (SSL)
          </p>
        </div>
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p class="text-xs text-slate-400 font-medium uppercase tracking-wider">Kebijakan Kuota Google</p>
          <p class="font-semibold text-slate-800 mt-1 text-xs">
            Maks. 500 / 24 Jam <span class="text-slate-400">(Akun Standar)</span>
          </p>
        </div>
      </div>
    </div>

    <!-- ── Tabel Riwayat Pengiriman Email Terbaru ────────────────────────── -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Riwayat Pengiriman Email Terkini</h2>
          <p class="text-xs text-slate-500 mt-0.5">Daftar permintaan email OTP aktivasi dan reset password terbaru</p>
        </div>
        
        <!-- Search -->
        <div class="w-full sm:w-64">
          <div class="relative">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Cari email atau NIP..."
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
            <tr>
              <th class="py-3 px-4 w-12 text-center">No</th>
              <th class="py-3 px-4">Tipe Email</th>
              <th class="py-3 px-4">Alamat Tujuan</th>
              <th class="py-3 px-4">Deskripsi / Sasaran</th>
              <th class="py-3 px-4">Waktu Dikirim</th>
              <th class="py-3 px-4">Status Token</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            {#if loading}
              <tr>
                <td colspan="6" class="py-10 text-center text-slate-400">
                  <div class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Memuat riwayat pengiriman...</span>
                  </div>
                </td>
              </tr>
            {:else if filteredEmails.length === 0}
              <tr>
                <td colspan="6" class="py-10 text-center text-slate-400">
                  Tidak ada data pengiriman email yang cocok.
                </td>
              </tr>
            {:else}
              {#each filteredEmails as item, idx}
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td class="py-3 px-4">
                    {#if item.tipe === 'AKTIVASI_OTP'}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        Aktivasi Akun OTP
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Reset Password
                      </span>
                    {/if}
                  </td>
                  <td class="py-3 px-4 font-mono font-medium text-slate-900">{item.emailTujuan}</td>
                  <td class="py-3 px-4 text-slate-700">{item.deskripsi}</td>
                  <td class="py-3 px-4 text-slate-500 whitespace-nowrap">{fmtDate(item.waktuKirim)}</td>
                  <td class="py-3 px-4">
                    {#if item.statusAktivasi === 'SUDAH_DIGUNAKAN'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Sudah Digunakan
                      </span>
                    {:else if item.statusAktivasi === 'BELUM_DIGUNAKAN'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        Menunggu Verifikasi
                      </span>
                    {:else if item.statusAktivasi === 'AKTIF'}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Tautan Aktif
                      </span>
                    {:else}
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Kadaluarsa
                      </span>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>

  </div>
</div>

