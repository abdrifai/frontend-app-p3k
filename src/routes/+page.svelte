<script>
  import { onMount } from "svelte";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";

  let stats = $state(null);
  let loading = $state(true);

  onMount(async () => {
    if ($authStore.isAuthenticated) {
      try {
        const response = await apiRequest("/api/v1/data-p3k/statistics");
        if (response.success) {
          stats = response.data;
        }
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        loading = false;
      }
    } else {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Beranda — P3K App</title>
</svelte:head>

<div
  class="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
>
  {#if $authStore.isAuthenticated}
    <!-- Authenticated Dashboard -->
    <div class="max-w-4xl w-full space-y-8">
      <!-- Greeting Card -->
      <div class="card p-8 text-center relative overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 opacity-60"
        ></div>
        <div class="relative">
          <div
            class="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4"
          >
            <span class="text-white text-2xl font-bold uppercase"
              >{($authStore.user?.namaLengkap || $authStore.user?.username || "U").charAt(0)}</span
            >
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800">
            Selamat datang, <span
              class="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
              >{$authStore.user?.namaLengkap || $authStore.user?.username}</span
            >!
          </h1>
        </div>
      </div>

      <!-- Data Summary Metrics -->
      {#if !loading && stats?.summary}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <!-- Card 1: Total Pegawai (P3K Aktif + P3K Paruh Waktu) -->
          <div class="card p-5 sm:p-6 border-l-4 border-blue-500 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Pegawai</p>
                <h3 class="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">
                  {((stats.summary.aktif || 0) + (stats.summary.paruhWaktu || 0)).toLocaleString()}
                </h3>
              </div>
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>P3K Aktif + Paruh Waktu</span>
              <span class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Total</span>
            </div>
          </div>

          <!-- Card 2: PPPK Aktif -->
          <div class="card p-5 sm:p-6 border-l-4 border-emerald-500 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">PPPK Aktif</p>
                <h3 class="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{(stats.summary.aktif || 0).toLocaleString()}</h3>
              </div>
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Penuh Waktu</span>
              <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {(((stats.summary.aktif || 0) / ((stats.summary.aktif || 0) + (stats.summary.paruhWaktu || 0) || 1)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <!-- Card 3: P3K Paruh Waktu -->
          <div class="card p-5 sm:p-6 border-l-4 border-violet-500 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">P3K Paruh Waktu</p>
                <h3 class="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{(stats.summary.paruhWaktu || 0).toLocaleString()}</h3>
              </div>
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-xs">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Paruh Waktu</span>
              <span class="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                {(((stats.summary.paruhWaktu || 0) / ((stats.summary.aktif || 0) + (stats.summary.paruhWaktu || 0) || 1)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <!-- Card 4: Sudah Pensiun -->
          <div class="card p-5 sm:p-6 border-l-4 border-amber-500 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Sudah Pensiun</p>
                <h3 class="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{(stats.summary.pensiun || 0).toLocaleString()}</h3>
              </div>
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
            <div class="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Status Pensiun</span>
              <span class="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Arsip</span>
            </div>
          </div>
        </div>
      {:else if loading}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
          {#each Array(4) as _}
            <div class="card p-6 h-32 bg-slate-100/50"></div>
          {/each}
        </div>
      {/if}

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/profil-pegawai"
          class="card group p-6 hover:shadow-md hover:border-blue-200 transition-all duration-300"
        >
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-shadow"
            >
              <svg
                class="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h3
                class="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors"
              >
                Profil Pegawai
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                Pencarian biodata, pendidikan, keluarga, kontrak, dan SK pegawai.
              </p>
            </div>
          </div>
          <div
            class="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700"
          >
            Buka halaman
            <svg
              class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              /></svg
            >
          </div>
        </a>

        <a
          href="/estimasi-pensiun"
          class="card group p-6 hover:shadow-md hover:border-emerald-200 transition-all duration-300"
        >
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-shadow"
            >
              <svg
                class="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                /></svg
              >
            </div>
            <div>
              <h3
                class="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors"
              >
                Estimasi Pensiun
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                Lihat daftar pegawai PPPK yang akan memasuki usia pensiun.
              </p>
            </div>
          </div>
          <div
            class="mt-4 flex items-center text-sm font-medium text-emerald-600 group-hover:text-emerald-700"
          >
            Buka halaman
            <svg
              class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              /></svg
            >
          </div>
        </a>

        <a
          href="/statistik-p3k"
          class="card group p-6 hover:shadow-md hover:border-amber-200 transition-all duration-300"
        >
          <div class="flex items-start gap-4">
            <div
              class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-shadow"
            >
              <svg
                class="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                /></svg
              >
            </div>
            <div>
              <h3
                class="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors"
              >
                Statistik & Laporan
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                Lihat ringkasan statistik dan distribusi data.
              </p>
            </div>
          </div>
          <div
            class="mt-4 flex items-center text-sm font-medium text-amber-600 group-hover:text-amber-700"
          >
            Buka halaman
            <svg
              class="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              /></svg
            >
          </div>
        </a>
      </div>
    </div>
  {:else}
    <!-- Guest Landing -->
    <div class="max-w-md w-full text-center space-y-8">
      <div class="card p-10 relative overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-50"
        ></div>
        <div class="relative space-y-6">
          <div
            class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
          >
            <span class="text-white font-bold text-lg">P3</span>
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-800">
              Selamat Datang di P3K
            </h1>
            <p class="mt-3 text-slate-500 text-sm leading-relaxed">
              Sistem informasi dan pengelolaan data Pegawai Pemerintah dengan
              Perjanjian Kerja (PPPK). Silakan masuk atau daftar untuk
              melanjutkan.
            </p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/login" class="btn-primary"> Masuk </a>
            <!-- <a href="/register" class="btn-secondary"> Daftar Akun </a> -->
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
