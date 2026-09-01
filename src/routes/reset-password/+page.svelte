<script>
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  // Get token from URL param
  let token = $state($page.url.searchParams.get("token"));
  
  let password = $state("");
  let confirmPassword = $state("");
  let errorMsg = $state("");
  let isLoading = $state(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    errorMsg = "";
    
    if (!token) {
      errorMsg = "Token reset password tidak ditemukan pada URL.";
      return;
    }

    if (password !== confirmPassword) {
      errorMsg = "Konfirmasi password tidak cocok.";
      return;
    }

    if (password.length < 6) {
      errorMsg = "Password minimal 6 karakter.";
      return;
    }

    isLoading = true;
    try {
      const data = await apiRequest("/api/users/reset-password", "POST", { token, password });
      if (data.success) {
        addToast(data.message || "Password berhasil direset", "success");
        goto("/login");
      } else {
        errorMsg = data.message || "Gagal mereset password";
      }
    } catch (err) {
      errorMsg = err.message || "Gagal mereset password";
    } finally {
      isLoading = false;
    }
  };
</script>

<svelte:head>
  <title>Reset Password — P3K App</title>
</svelte:head>

<div class="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full">
    <div class="card p-8 sm:p-10 relative overflow-hidden">
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

      <div class="text-center mb-8">
        <div class="w-16 h-20 mx-auto mb-3 flex items-center justify-center filter drop-shadow-md">
          <img src="/logo-touna.png" alt="Lambang Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
        </div>
        <h2 class="text-2xl font-bold text-slate-800">Ubah Password</h2>
        <p class="mt-2 text-sm text-slate-500">Silakan masukkan password baru untuk akun SIPPPK Anda.</p>
      </div>

      <form onsubmit={handleResetPassword} class="space-y-5">
        <div>
          <label for="password" class="block text-sm font-medium text-slate-700 mb-1.5">Password Baru</label>
          <input
            id="password"
            name="password"
            type="password"
            bind:value={password}
            required
            class="input-field"
            placeholder="Min. 6 karakter"
          />
        </div>
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            required
            class="input-field"
            placeholder="Ulangi password baru"
          />
        </div>

        {#if errorMsg}
          <div class="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
            <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-red-600">{errorMsg}</p>
          </div>
        {/if}

        <button type="submit" disabled={isLoading || !token} class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
          {#if isLoading}
            Memproses...
          {:else}
            Simpan Password Baru
          {/if}
        </button>
      </form>
      
      <div class="mt-6 text-center">
        <a href="/login" class="text-sm font-medium text-blue-600 hover:text-blue-700">Batal & Kembali ke Login</a>
      </div>
    </div>
  </div>
</div>
