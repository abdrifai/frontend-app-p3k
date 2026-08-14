<script>
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { page } from "$app/stores";
  import { authStore } from "$lib/store";
  import { goto } from "$app/navigation";
  import Toast from "$lib/components/Toast.svelte";
  import Navbar from "$lib/components/Navbar.svelte";
  import { loadMenuPermissions } from "$lib/menuStore";

  let { children } = $props();

  // Global auth check for protected routes & menu permission loader
  $effect(() => {
    const path = $page.url.pathname;
    const publicPaths = ["/login", "/register", "/", "/forgot-password", "/forget-password", "/reset-password"];
    const isPublicPath = publicPaths.some(p => path === p || path === p + "/");

    if (!$authStore.isAuthenticated && !isPublicPath) {
      goto("/login");
    } else if ($authStore.isAuthenticated) {
      loadMenuPermissions();
    }
  });
</script>

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
          class="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center"
        >
          <span class="text-white font-bold text-[6px]">P3K</span>
        </div>
        <p class="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} SIPPPK. All rights reserved.
        </p>
      </div>
      <p class="text-xs text-slate-300">
        Sistem Informasi Pegawai Pemerintah dengan Perjanjian Kerja
      </p>
    </div>
  </footer>

  <Toast />
</div>
