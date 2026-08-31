<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  onMount(() => {
    goto("/data-p3k-import?tab=stats", { replaceState: true });
  });
</script>

<div class="p-8 text-center text-xs text-slate-500">
  Mengarahkan ke menu P3K Full Waktu (Tab Statistik)...
</div>
