<script>
  import { page } from "$app/stores";
  import { authStore, clearAuth } from "$lib/store";
  import { goto } from "$app/navigation";

  let isUserDropdownOpen = $state(false);

  function handleLogout() {
    clearAuth();
    goto("/login");
  }

  const currentPath = $derived($page.url.pathname);

  const navItems = [
    {
      label: "Beranda",
      path: "/portal",
      icon: "ri-home-5-line",
      exact: true
    },
    {
      label: "Profil Saya",
      path: "/portal/profil",
      icon: "ri-user-line",
      exact: false
    },
    {
      label: "Usulan Perbaikan",
      path: "/portal/usulan",
      icon: "ri-edit-box-line",
      exact: false
    },
    {
      label: "TTE Kontrak",
      path: "/portal/tanda-tangan",
      icon: "ri-quill-pen-line",
      exact: false
    }
  ];

  function isActive(item) {
    if (item.exact) {
      return currentPath === item.path || currentPath === item.path + "/";
    }
    return currentPath.startsWith(item.path);
  }
</script>

<!-- Top Navbar Desktop & Tablet -->
<header class="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo & Brand -->
      <a href="/portal" class="flex items-center gap-3 group">
        <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center p-1.5 shadow-xs transition-transform group-hover:scale-105">
          <img src="/logo.svg" alt="SIPPPK" class="w-full h-full object-contain" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-extrabold text-slate-800 tracking-tight">SIPPPK</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Portal Pegawai
            </span>
          </div>
          <p class="text-[10px] text-slate-400 font-medium leading-none">BKPSDM Kab. Tojo Una-Una</p>
        </div>
      </a>

      <!-- Desktop Nav Links -->
      <nav class="hidden md:flex items-center gap-1.5">
        {#each navItems as item}
          {@const active = isActive(item)}
          <a
            href={item.path}
            class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 {active ? 'bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/60 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
          >
            {#if item.icon === 'ri-home-5-line'}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            {:else if item.icon === 'ri-user-line'}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
              </svg>
            {:else if item.icon === 'ri-edit-box-line'}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            {:else if item.icon === 'ri-quill-pen-line'}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            {/if}
            {item.label}
          </a>
        {/each}
      </nav>

      <!-- User Profile & Action -->
      <div class="flex items-center gap-3">
        <div class="relative">
          <button
            type="button"
            onclick={() => (isUserDropdownOpen = !isUserDropdownOpen)}
            class="flex items-center gap-2.5 py-1.5 px-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200/80 cursor-pointer text-left"
          >
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {$authStore.user?.namaLengkap?.charAt(0) || $authStore.user?.username?.charAt(0) || "P"}
            </div>
            <div class="hidden sm:block">
              <p class="text-xs font-bold text-slate-800 leading-tight truncate max-w-[150px]">
                {$authStore.user?.namaLengkap || $authStore.user?.username}
              </p>
              <p class="text-[10px] text-slate-400 leading-tight">
                NIP: {$authStore.user?.username}
              </p>
            </div>
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown Profile -->
          {#if isUserDropdownOpen}
            <div class="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl shadow-slate-200/80 border border-slate-200/80 py-2 z-50">
              <div class="px-4 py-2 border-b border-slate-100">
                <p class="text-xs font-bold text-slate-800 truncate">
                  {$authStore.user?.namaLengkap || $authStore.user?.username}
                </p>
                <p class="text-[10px] text-slate-400 truncate">
                  {$authStore.user?.email || "-"}
                </p>
              </div>
              <a
                href="/portal/profil"
                onclick={() => (isUserDropdownOpen = false)}
                class="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                </svg>
                Lihat Profil Saya
              </a>
              <button
                type="button"
                onclick={handleLogout}
                class="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100 mt-1 cursor-pointer font-medium"
              >
                <svg class="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Keluar (Logout)
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</header>

<!-- Bottom Mobile Navigation Bar -->
<div class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 shadow-lg">
  <div class="flex items-center justify-around">
    {#each navItems as item}
      {@const active = isActive(item)}
      <a
        href={item.path}
        class="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all {active ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'}"
      >
        {#if item.icon === 'ri-home-5-line'}
          <svg class="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        {:else if item.icon === 'ri-user-line'}
          <svg class="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
          </svg>
        {:else if item.icon === 'ri-edit-box-line'}
          <svg class="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        {:else if item.icon === 'ri-quill-pen-line'}
          <svg class="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        {/if}
        {item.label}
      </a>
    {/each}
  </div>
</div>
