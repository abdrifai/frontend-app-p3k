<script>
  import { apiRequest } from "$lib/api";
  import { setAuth } from "$lib/store";
  import { addToast } from "$lib/toastStore";
  import { goto } from "$app/navigation";

  let username = "";
  let password = "";
  let errorMsg = "";
  let isLoading = false;

  const handleLogin = async (e) => {
    e.preventDefault();
    errorMsg = "";
    isLoading = true;
    try {
      const data = await apiRequest("/api/users/login", "POST", {
        username,
        password,
      });
      if (data.success && data.data) {
        setAuth(data.data);
        addToast("Berhasil masuk!", "success");
        const userRoles = Array.isArray(data.data.user?.roles)
          ? data.data.user.roles.map(r => String(r).toLowerCase().trim())
          : String(data.data.user?.role || '').toLowerCase().split(',').map(r => r.trim()).filter(Boolean);
        
        if (userRoles.includes('pegawai')) {
          goto("/portal");
        } else {
          goto("/");
        }
      } else {
        errorMsg = data.message || "Login gagal";
      }
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isLoading = false;
    }
  };
</script>

<svelte:head>
  <title>Masuk — P3K App</title>
</svelte:head>

<div
  class="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
>
  <div class="max-w-md w-full">
    <div class="card p-8 sm:p-10 relative overflow-hidden">
      <div
        class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"
      ></div>

      <div class="text-center mb-8">
        <div
          class="w-24 h-24 mx-auto mb-3 flex items-center justify-center filter drop-shadow-md transition-transform hover:scale-105"
        >
          <img src="/logo.svg" alt="Lambang Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
        </div>
        <h2 class="text-2xl font-bold text-slate-800">Masuk ke SIPPPK</h2>
        <p class="text-xs text-slate-500 mt-1">BKPSDM Kabupaten Tojo Una-Una</p>
      </div>

      <form onsubmit={handleLogin} class="space-y-5">
        <div>
          <label
            for="username"
            class="block text-sm font-medium text-slate-700 mb-1.5"
            >Username</label
          >
          <input
            id="username"
            name="username"
            type="text"
            autocomplete="username"
            bind:value={username}
            required
            class="input-field"
            placeholder="Masukkan username"
          />
        </div>
        <div>
          <label
            for="password"
            class="block text-sm font-medium text-slate-700 mb-1.5"
            >Password</label
          >
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            bind:value={password}
            required
            class="input-field"
            placeholder="Masukkan password"
          />
        </div>

        {#if errorMsg}
          <div
            class="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100"
          >
            <svg
              class="w-4 h-4 text-red-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              /></svg
            >
            <p class="text-sm text-red-600">{errorMsg}</p>
          </div>
        {/if}

        <button
          type="submit"
          disabled={isLoading}
          class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
            Memproses...
          {:else}
            Masuk
          {/if}
        </button>
      </form>
      
      <div class="mt-6 pt-5 border-t border-slate-100 text-center space-y-3">
        <a href="/forgot-password" class="text-xs font-medium text-slate-500 hover:text-blue-600 block transition-colors">Lupa password?</a>
        <div class="pt-1">
          <a
            href="/aktivasi-akun"
            class="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-colors shadow-sm"
          >
            <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Pegawai PPPK Baru? Aktivasi Akun di Sini
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
