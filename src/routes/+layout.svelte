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

  // Global auth check for protected routes & menu permission loader
  $effect(() => {
    const path = $page.url.pathname;
    const publicPaths = ["/login", "/register", "/", "/forgot-password", "/forget-password", "/reset-password"];
    const isPublicPath = publicPaths.some(p => path === p || path === p + "/");

    if (!$authStore.isAuthenticated && !isPublicPath) {
      goto("/login");
    } else if ($authStore.isAuthenticated) {
      loadMenuPermissions();
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
  <Navbar />

  <main class="flex-grow flex flex-col">
    {@render children()}
  </main>

  <footer class="bg-white border-t border-slate-200/60 mt-auto">
    <div
      class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2"
    >
      <div class="flex items-center gap-2">
        <div
          class="w-5 h-6 overflow-hidden flex items-center justify-center shrink-0"
        >
          <img src="/logo-touna.png" alt="Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
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

  <Toast />
</div>
