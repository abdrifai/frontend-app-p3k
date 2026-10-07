<script>
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { page } from "$app/stores";
  import { authStore } from "$lib/store";
  import { goto } from "$app/navigation";
  import Toast from "$lib/components/Toast.svelte";
  import Navbar from "$lib/components/Navbar.svelte";
  import { loadMenuPermissions } from "$lib/menuStore";

  import { apiRequest } from "$lib/api";

  let { children } = $props();

  // Heartbeat tracking for online monitoring
  let heartbeatTimer = null;

  const sendHeartbeat = async () => {
    if ($authStore.isAuthenticated && typeof document !== 'undefined' && document.visibilityState === 'visible') {
      try {
        await apiRequest('/api/users/heartbeat', 'POST');
      } catch (e) {
        // silent fail
      }
    }
  };

  const userRoles = $derived(
    Array.isArray($authStore.user?.roles)
      ? $authStore.user.roles.map(r => String(r).toLowerCase().trim())
      : String($authStore.user?.role || '').toLowerCase().split(',').map(r => r.trim()).filter(Boolean)
  );
  const isPegawaiUser = $derived(userRoles.includes('pegawai'));
  const isPejabatUser = $derived(userRoles.includes('pejabat_ttd') && !userRoles.includes('admin'));
  const isPortalPejabatRoute = $derived($page.url.pathname.startsWith('/portal-pejabat'));
  const isPortalPegawaiRoute = $derived($page.url.pathname.startsWith('/portal') && !isPortalPejabatRoute);

  // Global auth check for protected routes & menu permission loader
  $effect(() => {
    const path = $page.url.pathname;
    const publicPaths = ["/login", "/register", "/", "/forgot-password", "/forget-password", "/reset-password", "/aktivasi-akun"];
    const isPublicPath = publicPaths.some(p => path === p || path === p + "/");

    if (!$authStore.isAuthenticated && !isPublicPath) {
      goto("/login");
    } else if ($authStore.isAuthenticated) {
      if (isPegawaiUser) {
        if (!isPortalPegawaiRoute && !isPublicPath) {
          goto("/portal");
        }
      } else if (isPejabatUser) {
        if (!isPortalPejabatRoute && !isPublicPath) {
          goto("/portal-pejabat");
        }
      } else {
        if (isPortalPegawaiRoute) {
          goto("/");
        } else {
          loadMenuPermissions();
        }
      }

      sendHeartbeat();
      if (!heartbeatTimer) {
        heartbeatTimer = setInterval(sendHeartbeat, 45000); // Heartbeat every 45s
      }
    } else {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    return () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };
  });
</script>

<svelte:window onfocus={sendHeartbeat} />

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>SIPPPK — Sistem Informasi Pegawai P3K</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col">
  {#if !isPegawaiUser && !isPejabatUser && !isPortalPegawaiRoute && !isPortalPejabatRoute}
    <Navbar />
  {/if}

  <main class="flex-grow flex flex-col">
    {@render children()}
  </main>

  {#if !isPortalPejabatRoute}
    <footer class="bg-white border-t border-slate-200/60 mt-auto">
      <div
        class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0"
          >
            <img src="/logo.svg" alt="Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
          </div>
          <p class="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} SIPPPK BKPSDM Kabupaten Tojo Una-Una. All rights reserved.
          </p>
        </div>
        <p class="text-xs text-slate-300">
          Sistem Informasi Pegawai Pemerintah dengan Perjanjian Kerja
        </p>
      </div>
    </footer>
  {/if}

  <Toast />
</div>
