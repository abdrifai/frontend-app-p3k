<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let files = null;
  let isLoading = false;
  let uploadProgress = 0;

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
    }
  });

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      addToast("Silakan pilih file CSV terlebih dahulu", "error");
      return;
    }

    const file = files[0];

    if (!file.name.toLowerCase().endsWith(".csv")) {
      addToast("Format file harus berupa CSV (.csv)", "error");
      return;
    }

    isLoading = true;
    uploadProgress = 0;

    const interval = setInterval(() => {
      if (uploadProgress < 90) {
        uploadProgress += Math.floor(Math.random() * 10) + 1;
        if (uploadProgress > 90) uploadProgress = 90;
      }
    }, 500);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await apiRequest("/api/v1/p3k-csv-import", "POST", formData, true);

      uploadProgress = 100;

      if (result.success) {
        addToast(
          `Berhasil mengimpor ${result.data?.importedCount || 0} data PPPK`,
          "success",
        );
        files = null;
      } else {
        addToast(result.message || "Gagal mengimpor data", "error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      addToast("Terjadi kesalahan jaringan saat menghubungi server", "error");
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        isLoading = false;
        uploadProgress = 0;
      }, 500);
    }
  };
</script>

<svelte:head>
  <title>Import CSV — App P3K</title>
</svelte:head>

<div class="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div>
    <h1 class="text-2xl font-bold text-slate-800">Import Data PPPK</h1>
    <p class="mt-1 text-sm text-slate-500">
      Unggah file CSV berisi data profil PPPK dari SIASN ke dalam database.
    </p>
  </div>

  <!-- Upload Card -->
  <div class="card overflow-hidden">
    <div class="p-6 sm:p-8">
      <!-- Info Banner -->
      <div
        class="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 mb-6"
      >
        <svg
          class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          /></svg
        >
        <p class="text-sm text-blue-700">
          Pastikan format file CSV menggunakan delimiter <code
            class="px-1.5 py-0.5 bg-blue-100 rounded text-xs font-mono">|</code
          > (pipe) dan kolom sesuai template dari SIASN.
        </p>
      </div>

      <!-- Drop Zone -->
      <div
        class="relative flex items-center justify-center px-6 py-10 border-2 border-dashed rounded-2xl transition-colors duration-200
               {files && files.length > 0
          ? 'border-blue-300 bg-blue-50/50'
          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}"
      >
        <div class="space-y-3 text-center">
          {#if files && files.length > 0}
            <div
              class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20"
            >
              <svg
                class="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                /></svg
              >
            </div>
            <div>
              <p class="text-sm font-semibold text-blue-700">{files[0].name}</p>
              <p class="text-xs text-slate-400 mt-1">
                {(files[0].size / 1024).toFixed(1)} KB
              </p>
            </div>
          {:else}
            <div
              class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center"
            >
              <svg
                class="w-7 h-7 text-slate-400"
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
              <label for="csv-upload" class="cursor-pointer">
                <span
                  class="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >Pilih file</span
                >
                <span class="text-sm text-slate-500"> atau seret ke sini</span>
                <input
                  id="csv-upload"
                  name="csv-upload"
                  type="file"
                  accept=".csv"
                  class="sr-only"
                  bind:files
                />
              </label>
              <p class="text-xs text-slate-400 mt-1">File CSV, maks 10MB</p>
            </div>
          {/if}

          {#if isLoading}
            <div class="max-w-xs mx-auto mt-4">
              <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style="width: {uploadProgress}%"
                ></div>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                Mengunggah... {uploadProgress}%
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Upload Button -->
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          on:click={handleUpload}
          disabled={isLoading || !files}
          class="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex-1 sm:flex-none"
        >
          {#if isLoading}
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Mengunggah...
          {:else}
            <svg
              class="w-4 h-4 mr-1.5"
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
            Upload Data
          {/if}
        </button>
        {#if files && files.length > 0 && !isLoading}
          <button
            type="button"
            on:click={() => (files = null)}
            class="btn-secondary"
          >
            Ganti File
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
