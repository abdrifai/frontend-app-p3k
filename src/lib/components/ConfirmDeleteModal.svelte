<script>
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let title = "Hapus Permanen?";
  export let message = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.";
  export let confirmText = "Ya, Hapus";
  export let cancelText = "Batal";
  export let isProcessing = false;
  export let theme = "danger"; // danger | warning | primary

  $: themeStyles = {
    danger: {
      iconBg: "bg-red-100",
      iconText: "text-red-600",
      buttonBg: "bg-red-600 hover:bg-red-700"
    },
    warning: {
      iconBg: "bg-amber-100",
      iconText: "text-amber-600",
      buttonBg: "bg-amber-600 hover:bg-amber-700"
    },
    primary: {
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      buttonBg: "bg-blue-600 hover:bg-blue-700"
    }
  }[theme] || {
    iconBg: "bg-red-100",
    iconText: "text-red-600",
    buttonBg: "bg-red-600 hover:bg-red-700"
  };

  const dispatch = createEventDispatcher();

  const handleConfirm = () => {
    dispatch('confirm');
  };

  const handleCancel = () => {
    if (!isProcessing) {
      show = false;
      dispatch('cancel');
    }
  };
</script>

{#if show}
  <div class="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={handleCancel}
        aria-label="Tutup"
      ></button>
      <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center z-10">
        <div class="w-12 h-12 rounded-full {themeStyles.iconBg} flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 {themeStyles.iconText}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p class="text-sm text-slate-500 mb-6">{message}</p>
        <div class="flex gap-3 w-full">
          <button
            on:click={handleCancel}
            class="flex-1 btn-secondary"
            disabled={isProcessing}
          >
            {cancelText}
          </button>
          <button
            on:click={handleConfirm}
            class="flex-1 text-sm font-semibold text-white {themeStyles.buttonBg} py-2.5 rounded-lg transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            {isProcessing ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
