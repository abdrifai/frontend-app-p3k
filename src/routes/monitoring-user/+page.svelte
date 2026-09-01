<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  onMount(() => {
    goto("/setting/user-online");
  });
</script>

<div class="flex items-center justify-center min-h-[50vh]">
  <div class="text-center space-y-2">
    <div class="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
    <p class="text-xs text-slate-500">Membuka Monitoring User Online...</p>
  </div>
</div>
