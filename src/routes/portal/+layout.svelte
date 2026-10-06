<script>
  import PortalNavbar from "$lib/components/portal/PortalNavbar.svelte";

  let { children } = $props();
</script>

<div class="min-h-screen bg-slate-50/60 flex flex-col font-sans pb-16 md:pb-0">
  <PortalNavbar />

  <main class="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    {@render children()}
  </main>
</div>
