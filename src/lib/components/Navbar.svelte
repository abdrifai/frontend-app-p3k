<script>
  import { page } from "$app/stores";
  import { authStore, clearAuth } from "$lib/store";
  import { API_BASE_URL } from "$lib/api";
  import { goto } from "$app/navigation";
  import favicon from "$lib/assets/favicon.svg";

  let mobileMenuOpen = $state(false);
  let utamaMenuOpen = $state(false);
  let importMenuOpen = $state(false);
  let settingMenuOpen = $state(false);
  let perpanjanganMenuOpen = $state(false);
  let mobileUtamaOpen = $state(false);
  let mobileImportOpen = $state(false);
  let mobileSettingOpen = $state(false);
  let mobilePerpanjanganOpen = $state(false);
  let taskUserMenuOpen = $state(false);
  let mobileTaskUserOpen = $state(false);
  let laporanMenuOpen = $state(false);
  let mobileLaporanOpen = $state(false);

  const handleLogout = () => {
    clearAuth();
    goto("/login");
  };

  const toggleMobile = () => {
    mobileMenuOpen = !mobileMenuOpen;
  };

  const closeMobile = () => {
    mobileMenuOpen = false;
    mobileUtamaOpen = false;
    mobileImportOpen = false;
    mobileSettingOpen = false;
    mobilePerpanjanganOpen = false;
    mobileTaskUserOpen = false;
    mobileLaporanOpen = false;
  };

  const isActive = (path) => $page.url.pathname === path;

  const isUtamaActive = () =>
    isActive("/data-p3k") ||
    isActive("/statistik-p3k") ||
    isActive("/manajemen-pensiun") ||
    isActive("/perbedaan-data") ||
    isActive("/ref-unor");

  const isImportActive = () =>
    isActive("/data-p3k-import") ||
    isActive("/import-p3k-csv") ||
    isActive("/statistik-p3k-import");

  const isPensiunActive = () => isActive("/manajemen-pensiun");

  const isSettingActive = () =>
    isActive("/manajemen-user") ||
    isActive("/data-p3k-import") ||
    isActive("/statistik-p3k-import") ||
    isActive("/setting/pembagian-task-peremajaan") ||
    isActive("/setting/pembagian-task-usulan-pk") ||
    isActive("/setting/referensi-gaji") ||
    isActive("/setting/activity-log");

  const isPerpanjanganActive = () =>
    isActive("/perpanjangan-kontrak/dashboard") ||
    isActive("/perpanjangan-kontrak/usulan") ||
    isActive("/perpanjangan-kontrak/inbox");

  const isTaskUserActive = () =>
    isActive("/task-user-peremajaan") || isActive("/task-user-usulan-pk");

  const isLaporanActive = () =>
    isActive("/laporan/perpanjangan-pk") ||
    isActive("/estimasi-pensiun") ||
    isActive("/statistik-task");

  // Delayed close for dropdown menus
  let utamaCloseTimer = null;
  let importCloseTimer = null;
  let settingCloseTimer = null;
  let perpanjanganCloseTimer = null;
  let laporanCloseTimer = null;

  const openUtama = () => {
    if (utamaCloseTimer) {
      clearTimeout(utamaCloseTimer);
      utamaCloseTimer = null;
    }
    importMenuOpen = false;
    settingMenuOpen = false;
    perpanjanganMenuOpen = false;
    taskUserMenuOpen = false;
    utamaMenuOpen = true;
  };
  const closeUtamaDelayed = () => {
    utamaCloseTimer = setTimeout(() => {
      utamaMenuOpen = false;
    }, 200);
  };

  const openImport = () => {
    if (importCloseTimer) {
      clearTimeout(importCloseTimer);
      importCloseTimer = null;
    }
    utamaMenuOpen = false;
    settingMenuOpen = false;
    perpanjanganMenuOpen = false;
    taskUserMenuOpen = false;
    importMenuOpen = true;
  };
  const closeImportDelayed = () => {
    importCloseTimer = setTimeout(() => {
      importMenuOpen = false;
    }, 200);
  };

  const openSetting = () => {
    if (settingCloseTimer) {
      clearTimeout(settingCloseTimer);
      settingCloseTimer = null;
    }
    utamaMenuOpen = false;
    importMenuOpen = false;
    perpanjanganMenuOpen = false;
    taskUserMenuOpen = false;
    settingMenuOpen = true;
  };
  const closeSettingDelayed = () => {
    settingCloseTimer = setTimeout(() => {
      settingMenuOpen = false;
    }, 200);
  };

  const openPerpanjangan = () => {
    if (perpanjanganCloseTimer) {
      clearTimeout(perpanjanganCloseTimer);
      perpanjanganCloseTimer = null;
    }
    utamaMenuOpen = false;
    importMenuOpen = false;
    settingMenuOpen = false;
    taskUserMenuOpen = false;
    perpanjanganMenuOpen = true;
  };
  const closePerpanjanganDelayed = () => {
    perpanjanganCloseTimer = setTimeout(() => {
      perpanjanganMenuOpen = false;
    }, 200);
  };

  let taskUserCloseTimer = null;
  const openTaskUser = () => {
    if (taskUserCloseTimer) {
      clearTimeout(taskUserCloseTimer);
      taskUserCloseTimer = null;
    }
    utamaMenuOpen = false;
    importMenuOpen = false;
    settingMenuOpen = false;
    perpanjanganMenuOpen = false;
    taskUserMenuOpen = true;
  };
  const closeTaskUserDelayed = () => {
    taskUserCloseTimer = setTimeout(() => {
      taskUserMenuOpen = false;
    }, 200);
  };

  const openLaporan = () => {
    if (laporanCloseTimer) {
      clearTimeout(laporanCloseTimer);
      laporanCloseTimer = null;
    }
    utamaMenuOpen = false;
    importMenuOpen = false;
    settingMenuOpen = false;
    perpanjanganMenuOpen = false;
    taskUserMenuOpen = false;
    laporanMenuOpen = true;
  };
  const closeLaporanDelayed = () => {
    laporanCloseTimer = setTimeout(() => {
      laporanMenuOpen = false;
    }, 200);
  };
</script>

<header
  class="bg-white border-b border-slate-200/60 sticky top-0 z-50 shadow-sm"
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16 items-center">
      <!-- Logo -->
      <div class="flex-shrink-0">
        <a href="/" class="flex items-center gap-3 group" onclick={closeMobile}>
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:shadow-blue-600/30 transition-all group-hover:scale-105"
          >
            <span class="text-white font-extrabold text-[11px] tracking-tight"
              >P3K</span
            >
          </div>
          <div class="hidden sm:block">
            <p class="text-sm font-bold text-slate-800 leading-tight">SIPPPK</p>
            <p class="text-[10px] text-slate-400 leading-tight">
              Pegawai Pemerintah dengan Perjanjian Kerja
            </p>
          </div>
        </a>
      </div>

      <!-- Desktop Navigation -->
      <nav class="hidden lg:flex items-center gap-1">
        <a
          href="/"
          class="nav-link {isActive('/')
            ? 'nav-link-active'
            : 'nav-link-inactive'}"
        >
          <span class="flex items-center gap-1.5">
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              /></svg
            >
            Beranda
          </span>
        </a>

        {#if $authStore.isAuthenticated}
          <!-- Dropdown: Data P3K Utama -->
          <div
            class="relative"
            role="group"
            onmouseenter={openUtama}
            onmouseleave={closeUtamaDelayed}
          >
            <button
              type="button"
              onfocus={openUtama}
              onclick={() => (utamaMenuOpen = !utamaMenuOpen)}
              class="nav-link flex items-center gap-1 {isUtamaActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-1.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  /></svg
                >
                Data Utama
              </span>
              <svg
                class="w-3 h-3 transition-transform duration-200 {utamaMenuOpen
                  ? 'rotate-180'
                  : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            {#if utamaMenuOpen}
              <div class="absolute top-full left-0 pt-1 z-50">
                <div
                  class="w-60 bg-white rounded-xl shadow-2xl shadow-slate-200/60 border border-slate-100 py-2 ring-1 ring-black/[0.03]"
                >
                  <p
                    class="px-4 pt-1.5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >
                    Data P3K Utama
                  </p>
                  <a
                    href="/data-p3k"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/data-p3k',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (utamaMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Data Pegawai</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Kelola data PPPK utama
                      </p>
                    </div>
                  </a>
                  <a
                    href="/statistik-p3k"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/statistik-p3k',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (utamaMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-emerald-500"
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
                      <p class="font-medium leading-tight">Statistik</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Ringkasan & grafik data
                      </p>
                    </div>
                  </a>

                  <a
                    href="/manajemen-pensiun"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/manajemen-pensiun',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (utamaMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Manajemen Pensiun</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Kelola status & SK pensiun
                      </p>
                    </div>
                  </a>
                  <a
                    href="/perbedaan-data"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/perbedaan-data',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (utamaMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-rose-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Perbedaan Data</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Bandingkan data utama & import
                      </p>
                    </div>
                  </a>

                  <a
                    href="/ref-unor"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/ref-unor',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (utamaMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-teal-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Ref Unit Kerja</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Kelola master referensi
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            {/if}
          </div>

          <!-- Dropdown: Perpanjangan Kontrak -->
          <div
            class="relative"
            role="group"
            onmouseenter={openPerpanjangan}
            onmouseleave={closePerpanjanganDelayed}
          >
            <button
              type="button"
              onfocus={openPerpanjangan}
              onclick={() => (perpanjanganMenuOpen = !perpanjanganMenuOpen)}
              class="nav-link flex items-center gap-1 {isPerpanjanganActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-1.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  /></svg
                >
                Kontrak
              </span>
              <svg
                class="w-3 h-3 transition-transform duration-200 {perpanjanganMenuOpen
                  ? 'rotate-180'
                  : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            {#if perpanjanganMenuOpen}
              <div class="absolute top-full left-0 pt-1 z-50">
                <div
                  class="w-60 bg-white rounded-xl shadow-2xl shadow-slate-200/60 border border-slate-100 py-2 ring-1 ring-black/[0.03]"
                >
                  <p
                    class="px-4 pt-1.5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >
                    Perpanjangan Kontrak
                  </p>
                  <a
                    href="/perpanjangan-kontrak/dashboard"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/perpanjangan-kontrak/dashboard',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (perpanjanganMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-blue-500"
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
                      <p class="font-medium leading-tight">
                        Dashboard Progres
                      </p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Monitoring status usulan PK
                      </p>
                    </div>
                  </a>
                  <a
                    href="/perpanjangan-kontrak/usulan"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/perpanjangan-kontrak/usulan',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (perpanjanganMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">
                        Usulan Perpanjangan
                      </p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Buat & kelola usulan kontrak
                      </p>
                    </div>
                  </a>
                  <a
                    href="/perpanjangan-kontrak/inbox"
                    class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                      '/perpanjangan-kontrak/inbox',
                    )
                      ? 'text-blue-700 bg-blue-50 font-medium'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                    onclick={() => (perpanjanganMenuOpen = false)}
                  >
                    <div
                      class="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"
                    >
                      <svg
                        class="w-3.5 h-3.5 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">
                        Inbox Perpanjangan
                      </p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Proses persetujuan kontrak
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            {/if}
          </div>

          <!-- Dropdown: Task User -->
          <div
            class="relative"
            role="group"
            onmouseenter={openTaskUser}
            onmouseleave={closeTaskUserDelayed}
          >
            <button
              type="button"
              onfocus={openTaskUser}
              onclick={() => (taskUserMenuOpen = !taskUserMenuOpen)}
              class="nav-link flex items-center gap-1 {isTaskUserActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-1.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  /></svg
                >
                Task User
              </span>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 {taskUserMenuOpen
                  ? 'rotate-180 text-blue-600'
                  : 'text-slate-400'}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            <!-- Task User Dropdown Menu -->
            {#if taskUserMenuOpen}
              <div
                class="absolute left-1/2 -translate-x-1/2 mt-1 w-[280px] origin-top bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/50 focus:outline-none transition-all duration-200 z-50 overflow-hidden"
              >
                <div class="p-2 space-y-1">
                  <!-- Peremajaan Data (Original Task User) -->
                  <a
                    href="/task-user-peremajaan"
                    class="flex items-start gap-3 p-3 rounded-lg transition-all {isActive(
                      '/task-user-peremajaan',
                    )
                      ? 'bg-blue-50/80 text-blue-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'}"
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5"
                    >
                      <svg
                        class="w-4 h-4 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Peremajaan</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Penugasan update Data P3K
                      </p>
                    </div>
                  </a>

                  <!-- Usulan Perpanjangan Kontrak -->
                  <a
                    href="/task-user-usulan-pk"
                    class="flex items-start gap-3 p-3 rounded-lg transition-all {isActive(
                      '/task-user-usulan-pk',
                    )
                      ? 'bg-blue-50/80 text-blue-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'}"
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5"
                    >
                      <svg
                        class="w-4 h-4 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Usulan PK</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Penugasan persetujuan kontrak
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            {/if}
          </div>

          <!-- Dropdown: Laporan -->
          <div
            class="relative"
            role="group"
            onmouseenter={openLaporan}
            onmouseleave={closeLaporanDelayed}
          >
            <button
              type="button"
              onfocus={openLaporan}
              onclick={() => (laporanMenuOpen = !laporanMenuOpen)}
              class="nav-link flex items-center gap-1 {isLaporanActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-1.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  /></svg
                >
                Laporan
              </span>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 {laporanMenuOpen
                  ? 'rotate-180 text-blue-600'
                  : 'text-slate-400'}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            {#if laporanMenuOpen}
              <div
                class="absolute left-1/2 -translate-x-1/2 mt-1 w-[280px] origin-top bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/50 focus:outline-none transition-all duration-200 z-50 overflow-hidden"
              >
                <div class="p-2 space-y-1">
                  <a
                    href="/laporan/perpanjangan-pk"
                    class="flex items-start gap-3 p-3 rounded-lg transition-all {isActive(
                      '/laporan/perpanjangan-pk',
                    )
                      ? 'bg-blue-50/80 text-blue-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'}"
                    onclick={() => (laporanMenuOpen = false)}
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5"
                    >
                      <svg
                        class="w-4 h-4 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Perpanjangan PK</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Daftar kontrak yang sudah selesai
                      </p>
                    </div>
                  </a>

                  <a
                    href="/estimasi-pensiun"
                    class="flex items-start gap-3 p-3 rounded-lg transition-all {isActive(
                      '/estimasi-pensiun',
                    )
                      ? 'bg-blue-50/80 text-blue-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'}"
                    onclick={() => (laporanMenuOpen = false)}
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5"
                    >
                      <svg
                        class="w-4 h-4 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Estimasi Pensiun</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Laporan data usia pensiun pegawai
                      </p>
                    </div>
                  </a>

                  <a
                    href="/statistik-task"
                    class="flex items-start gap-3 p-3 rounded-lg transition-all {isActive(
                      '/statistik-task',
                    )
                      ? 'bg-blue-50/80 text-blue-700 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'}"
                    onclick={() => (laporanMenuOpen = false)}
                  >
                    <div
                      class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5"
                    >
                      <svg
                        class="w-4 h-4 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        /></svg
                      >
                    </div>
                    <div>
                      <p class="font-medium leading-tight">Statistik Task</p>
                      <p
                        class="text-[10px] text-slate-400 leading-tight mt-0.5"
                      >
                        Laporan performa task per operator
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            {/if}
          </div>

          <!-- Dropdown: Setting -->
          {#if $authStore.user?.role === "admin"}
            <div
              class="relative"
              role="group"
              onmouseenter={openSetting}
              onmouseleave={closeSettingDelayed}
            >
              <button
                type="button"
                onfocus={openSetting}
                onclick={() => (settingMenuOpen = !settingMenuOpen)}
                class="nav-link flex items-center gap-1 {isSettingActive()
                  ? 'nav-link-active'
                  : 'nav-link-inactive'}"
              >
                <span class="flex items-center gap-1.5">
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    /><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    /></svg
                  >
                  Setting
                </span>
                <svg
                  class="w-3 h-3 transition-transform duration-200 {settingMenuOpen
                    ? 'rotate-180'
                    : ''}"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M19 9l-7 7-7-7"
                  /></svg
                >
              </button>

              {#if settingMenuOpen}
                <div class="absolute top-full right-0 pt-1 z-50">
                  <div
                    class="w-60 bg-white rounded-xl shadow-2xl shadow-slate-200/60 border border-slate-100 py-2 ring-1 ring-black/[0.03]"
                  >
                    <p
                      class="px-4 pt-1.5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                      Import SIASN
                    </p>
                    <a
                      href="/data-p3k-import"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/data-p3k-import',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0"
                      >
                        <svg
                          class="w-3.5 h-3.5 text-violet-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 6h16M4 10h16M4 14h16M4 18h16"
                          /></svg
                        >
                      </div>
                      <div>
                        <p class="font-medium leading-tight">Data Import</p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Lihat data hasil import
                        </p>
                      </div>
                    </a>
                    <a
                      href="/import-p3k-csv"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/import-p3k-csv',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0"
                      >
                        <svg
                          class="w-3.5 h-3.5 text-cyan-500"
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
                        <p class="font-medium leading-tight">Import CSV</p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Upload file data SIASN
                        </p>
                      </div>
                    </a>
                    <a
                      href="/statistik-p3k-import"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/statistik-p3k-import',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0"
                      >
                        <svg
                          class="w-3.5 h-3.5 text-rose-500"
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
                        <p class="font-medium leading-tight">
                          Statistik Import
                        </p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Ringkasan data import
                        </p>
                      </div>
                    </a>
                    <div class="my-1.5 mx-3 border-t border-slate-100"></div>
                    <p
                      class="px-4 pt-1.5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                      Pengaturan
                    </p>
                    <a
                      href="/manajemen-user"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/manajemen-user',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"
                      >
                        <svg
                          class="w-3.5 h-3.5 text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          /></svg
                        >
                      </div>
                      <div>
                        <p class="font-medium leading-tight">Manajemen User</p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Kelola akun pengguna
                        </p>
                      </div>
                    </a>
                    <div class="my-1.5 mx-3 border-t border-slate-100"></div>
                    <p
                      class="px-4 pt-1.5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >
                      Menu Task
                    </p>
                    <a
                      href="/setting/pembagian-task-peremajaan"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/setting/pembagian-task-peremajaan',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0"
                      >
                        <svg
                          class="w-3.5 h-3.5 text-orange-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          /></svg
                        >
                      </div>
                      <div>
                        <p class="font-medium leading-tight">Task Peremajaan Data</p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Bagi task edit P3K
                        </p>
                      </div>
                    </a>
                    <a
                      href="/setting/pembagian-task-usulan-pk"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/setting/pembagian-task-usulan-pk',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"
                      >
                        <svg
                          class="w-3.5 h-3.5 text-indigo-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          /></svg
                        >
                      </div>
                      <div>
                        <p class="font-medium leading-tight">Task Usulan PK</p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Bagi task usulan
                        </p>
                      </div>
                    </a>
                    <a
                      href="/setting/referensi-gaji"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/setting/referensi-gaji',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"
                      >
                        <svg
                          class="w-3.5 h-3.5 text-emerald-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p class="font-medium leading-tight">Referensi Gaji</p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Tabel referensi gaji P3K
                        </p>
                      </div>
                    </a>
                    <a
                      href="/setting/activity-log"
                      class="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all {isActive(
                        '/setting/activity-log',
                      )
                        ? 'text-blue-700 bg-blue-50 font-medium'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'}"
                      onclick={() => (settingMenuOpen = false)}
                    >
                      <div
                        class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"
                      >
                        <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p class="font-medium leading-tight">Laporan Aktivitas</p>
                        <p
                          class="text-[10px] text-slate-400 leading-tight mt-0.5"
                        >
                          Riwayat manipulasi data
                        </p>
                      </div>
                    </a>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      </nav>

      <!-- Right side -->
      <div class="flex items-center gap-2">
        {#if $authStore.isAuthenticated}
          <!-- Desktop: full user info -->
          <div
            class="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200"
          >
            <a
              href="/profile"
              class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors {isActive(
                '/profile',
              )
                ? 'bg-slate-50 shadow-sm ring-1 ring-slate-100'
                : ''}"
            >
              <div
                class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm ring-2 ring-white overflow-hidden"
              >
                {#if $authStore.user?.foto}
                  <img
                    src="{API_BASE_URL}{$authStore.user.foto}"
                    alt="Avatar"
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <span class="text-white text-xs font-bold uppercase"
                    >{(
                      $authStore.user?.namaLengkap ||
                      $authStore.user?.username ||
                      "U"
                    ).charAt(0)}</span
                  >
                {/if}
              </div>
              <span class="text-sm font-medium text-slate-700"
                >{$authStore.user?.namaLengkap ||
                  $authStore.user?.username}</span
              >
            </a>
            <button
              onclick={handleLogout}
              class="text-sm font-medium text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              title="Keluar"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                /></svg
              >
            </button>
          </div>

          <!-- Mobile: compact user avatar + hamburger -->
          <div class="lg:hidden flex items-center gap-2">
            <div class="flex items-center gap-2 px-2 py-1">
              <div
                class="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm ring-2 ring-white overflow-hidden"
              >
                {#if $authStore.user?.foto}
                  <img
                    src="{API_BASE_URL}{$authStore.user.foto}"
                    alt="Avatar"
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <span class="text-white text-[10px] font-bold uppercase"
                    >{(
                      $authStore.user?.namaLengkap ||
                      $authStore.user?.username ||
                      "U"
                    ).charAt(0)}</span
                  >
                {/if}
              </div>
              <span class="text-xs font-medium text-slate-600 hidden sm:inline"
                >{$authStore.user?.namaLengkap ||
                  $authStore.user?.username}</span
              >
            </div>
            <button
              onclick={toggleMobile}
              class="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {#if mobileMenuOpen}
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  /></svg
                >
              {:else}
                <svg
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  /></svg
                >
              {/if}
            </button>
          </div>
        {:else}
          <!-- Not logged in -->
          <div class="hidden lg:flex items-center gap-2">
            <a href="/login" class="btn-primary text-sm !py-2">Masuk</a>
            <!-- <a href="/register" class="nav-link nav-link-inactive">Daftar</a> -->
          </div>
          <!-- Mobile hamburger when not logged in -->
          <button
            onclick={toggleMobile}
            class="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {#if mobileMenuOpen}
              <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                /></svg
              >
            {:else}
              <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                /></svg
              >
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Mobile Menu Drawer -->
  {#if mobileMenuOpen}
    <div
      class="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-sm"
    >
      <div class="px-4 pt-3 pb-4 space-y-1">
        <a
          href="/"
          onclick={closeMobile}
          class="nav-link block {isActive('/')
            ? 'nav-link-active'
            : 'nav-link-inactive'}"
        >
          <span class="flex items-center gap-2.5">
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              /></svg
            >
            Beranda
          </span>
        </a>

        {#if $authStore.isAuthenticated}
          <!-- Mobile: Data P3K Utama Group -->
          <div class="pt-2">
            <button
              type="button"
              onclick={() => (mobileUtamaOpen = !mobileUtamaOpen)}
              class="w-full text-left nav-link flex justify-between items-center {isUtamaActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-2.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  /></svg
                >
                Data Utama
              </span>
              <svg
                class="w-4 h-4 transition-transform duration-200 {mobileUtamaOpen
                  ? 'rotate-180'
                  : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            {#if mobileUtamaOpen}
              <div
                class="mt-1 mb-1 ml-5 pl-4 border-l-2 border-blue-200 space-y-0.5"
              >
                <a
                  href="/data-p3k"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/data-p3k',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      /></svg
                    >
                  </div>
                  Data Pegawai
                </a>
                <a
                  href="/statistik-p3k"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/statistik-p3k',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-emerald-500"
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
                  Statistik
                </a>
                <a
                  href="/estimasi-pensiun"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/estimasi-pensiun',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-amber-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      /></svg
                    >
                  </div>
                  Estimasi Pensiun
                </a>
                <a
                  href="/manajemen-pensiun"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/manajemen-pensiun',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      /></svg
                    >
                  </div>
                  Manajemen Pensiun
                </a>
                <a
                  href="/perbedaan-data"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/perbedaan-data',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-rose-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      /></svg
                    >
                  </div>
                  Perbedaan Data
                </a>
                <a
                  href="/ref-unor"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/ref-unor',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-teal-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                      /></svg
                    >
                  </div>
                  Ref Unit Kerja
                </a>
                <a
                  href="/statistik-task"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/statistik-task',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      /></svg
                    >
                  </div>
                  Statistik Task
                </a>
              </div>
            {/if}
          </div>

          <!-- Mobile: Perpanjangan Kontrak Group -->
          <div class="pt-2">
            <button
              type="button"
              onclick={() => (mobilePerpanjanganOpen = !mobilePerpanjanganOpen)}
              class="w-full text-left nav-link flex justify-between items-center {isPerpanjanganActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-2.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  /></svg
                >
                Perpanjangan Kontrak
              </span>
              <svg
                class="w-4 h-4 transition-transform duration-200 {mobilePerpanjanganOpen
                  ? 'rotate-180'
                  : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            {#if mobilePerpanjanganOpen}
              <div
                class="mt-1 mb-1 ml-5 pl-4 border-l-2 border-indigo-200 space-y-0.5"
              >
                <a
                  href="/perpanjangan-kontrak/usulan"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/perpanjangan-kontrak/usulan',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      /></svg
                    >
                  </div>
                  Usulan Perpanjangan
                </a>
                <a
                  href="/perpanjangan-kontrak/inbox"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/perpanjangan-kontrak/inbox',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-amber-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      /></svg
                    >
                  </div>
                  Inbox Perpanjangan
                </a>
              </div>
            {/if}
          </div>

          <!-- Mobile: Task User Group -->
          <div class="pt-2">
            <button
              type="button"
              onclick={() => (mobileTaskUserOpen = !mobileTaskUserOpen)}
              class="w-full text-left nav-link flex justify-between items-center {isTaskUserActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-2.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  /></svg
                >
                Task User
              </span>
              <svg
                class="w-4 h-4 transition-transform duration-200 {mobileTaskUserOpen
                  ? 'rotate-180'
                  : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            {#if mobileTaskUserOpen}
              <div
                class="mt-1 mb-1 ml-5 pl-4 border-l-2 border-indigo-200 space-y-0.5"
              >
                <a
                  href="/task-user-peremajaan"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/task-user-peremajaan',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-orange-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      /></svg
                    >
                  </div>
                  Peremajaan
                </a>
                <a
                  href="/task-user-usulan-pk"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/task-user-usulan-pk',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      /></svg
                    >
                  </div>
                  Usulan PK
                </a>
              </div>
            {/if}
          </div>

          <!-- Mobile: Laporan Group -->
          <div class="pt-2">
            <button
              type="button"
              onclick={() => (mobileLaporanOpen = !mobileLaporanOpen)}
              class="w-full text-left nav-link flex justify-between items-center {isLaporanActive()
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-2.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  /></svg
                >
                Laporan
              </span>
              <svg
                class="w-4 h-4 transition-transform duration-200 {mobileLaporanOpen
                  ? 'rotate-180'
                  : ''}"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </button>

            {#if mobileLaporanOpen}
              <div
                class="mt-1 mb-1 ml-5 pl-4 border-l-2 border-blue-200 space-y-0.5"
              >
                <a
                  href="/estimasi-pensiun"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/estimasi-pensiun',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-amber-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      /></svg
                    >
                  </div>
                  Estimasi Pensiun
                </a>
                <a
                  href="/statistik-task"
                  onclick={closeMobile}
                  class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                    '/statistik-task',
                  )
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'}"
                >
                  <div
                    class="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center"
                  >
                    <svg
                      class="w-3 h-3 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      ><path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      /></svg
                    >
                  </div>
                  Statistik Task
                </a>
              </div>
            {/if}
          </div>

          <!-- Mobile: Setting Group -->
          {#if $authStore.user?.role === "admin"}
            <div class="pt-2">
              <button
                type="button"
                onclick={() => (mobileSettingOpen = !mobileSettingOpen)}
                class="w-full text-left nav-link flex justify-between items-center {isSettingActive()
                  ? 'nav-link-active'
                  : 'nav-link-inactive'}"
              >
                <span class="flex items-center gap-2.5">
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    ><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    /><path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    /></svg
                  >
                  Setting
                </span>
                <svg
                  class="w-4 h-4 transition-transform duration-200 {mobileSettingOpen
                    ? 'rotate-180'
                    : ''}"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  /></svg
                >
              </button>
              {#if mobileSettingOpen}
                <div
                  class="mt-1 mb-1 ml-5 pl-4 border-l-2 border-slate-200 space-y-0.5"
                >
                  <p
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 pb-1 px-3"
                  >
                    Import SIASN
                  </p>
                  <a
                    href="/data-p3k-import"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/data-p3k-import',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center"
                    >
                      <svg
                        class="w-3 h-3 text-violet-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 6h16M4 10h16M4 14h16M4 18h16"
                        /></svg
                      >
                    </div>
                    Data Import
                  </a>
                  <a
                    href="/import-p3k-csv"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/import-p3k-csv',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-cyan-50 flex items-center justify-center"
                    >
                      <svg
                        class="w-3 h-3 text-cyan-500"
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
                    Import CSV
                  </a>
                  <a
                    href="/statistik-p3k-import"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/statistik-p3k-import',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center"
                    >
                      <svg
                        class="w-3 h-3 text-rose-500"
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
                    Statistik Import
                  </a>
                  <div class="my-1.5 border-t border-slate-100"></div>
                  <p
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 pb-1 px-3"
                  >
                    Pengaturan
                  </p>
                  <a
                    href="/manajemen-user"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/manajemen-user',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center"
                    >
                      <svg
                        class="w-3 h-3 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        /></svg
                      >
                    </div>
                    Manajemen User
                  </a>
                  <div class="my-1.5 border-t border-slate-100"></div>
                  <p
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 pb-1 px-3"
                  >
                    Menu Task
                  </p>
                  <a
                    href="/setting/pembagian-task-peremajaan"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/setting/pembagian-task-peremajaan',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center"
                    >
                      <svg
                        class="w-3 h-3 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        /></svg
                      >
                    </div>
                    Task Peremajaan Data
                  </a>
                  <a
                    href="/setting/pembagian-task-usulan-pk"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/setting/pembagian-task-usulan-pk',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center"
                    >
                      <svg
                        class="w-3 h-3 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        ><path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        /></svg
                      >
                    </div>
                    Task Usulan PK
                  </a>
                  <a
                    href="/setting/referensi-gaji"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/setting/referensi-gaji',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center"
                    >
                      <svg
                        class="w-3 h-3 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    Referensi Gaji
                  </a>
                  <a
                    href="/setting/activity-log"
                    onclick={closeMobile}
                    class="flex items-center gap-2.5 py-2.5 px-3 rounded-lg text-sm transition-colors {isActive(
                      '/setting/activity-log',
                    )
                      ? 'text-blue-700 bg-blue-50 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'}"
                  >
                    <div
                      class="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center"
                    >
                      <svg class="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Laporan Aktivitas
                  </a>
                </div>
              {/if}
            </div>
          {/if}

          <!-- Mobile user section -->
          <div class="border-t border-slate-100 pt-3 mt-3">
            <div
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50/70"
            >
              <div
                class="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm ring-2 ring-white overflow-hidden"
              >
                {#if $authStore.user?.foto}
                  <img
                    src="{API_BASE_URL}{$authStore.user.foto}"
                    alt="Avatar"
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <span class="text-white text-xs font-bold uppercase"
                    >{($authStore.user?.username || "U").charAt(0)}</span
                  >
                {/if}
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-700">
                  {$authStore.user?.username}
                </p>
                <p class="text-[10px] text-slate-400">Pengguna aktif</p>
              </div>
            </div>
            <a
              href="/profile"
              onclick={closeMobile}
              class="nav-link w-full text-left mt-1 {isActive('/profile')
                ? 'nav-link-active'
                : 'nav-link-inactive'}"
            >
              <span class="flex items-center gap-2.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  /></svg
                >
                Ubah Profil
              </span>
            </a>
            <button
              onclick={() => {
                handleLogout();
                closeMobile();
              }}
              class="nav-link w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600 mt-1"
            >
              <span class="flex items-center gap-2.5">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  ><path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  /></svg
                >
                Keluar
              </span>
            </button>
          </div>
        {:else}
          <div class="border-t border-slate-100 pt-3 mt-3 space-y-2">
            <a
              href="/login"
              onclick={closeMobile}
              class="nav-link block nav-link-inactive">Masuk</a
            >
            <!-- <a href="/register" onclick={closeMobile} class="btn-primary block text-center">Daftar</a> -->
          </div>
        {/if}
      </div>
    </div>
  {/if}
</header>
