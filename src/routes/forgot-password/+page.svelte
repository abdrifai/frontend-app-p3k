<script>
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";

  let email = $state("");
  let errorMsg = $state("");
  let successMsg = $state("");
  let isLoading = $state(false);

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    addToast("Memproses permintaan reset...", "info");
    
    errorMsg = "";
    successMsg = "";
    isLoading = true;
    
    try {
      console.log("Sending forgot password request for:", email);
      const data = await apiRequest("/api/users/forgot-password", "POST", { email });
      if (data.success) {
        successMsg = data.message || "Tautan reset password telah dikirim ke email Anda.";
        addToast("Berhasil! Silakan cek email Anda.", "success");
      } else {
        errorMsg = data.message || "Gagal mengirim permintaan";
        addToast(errorMsg, "error");
      }
    } catch (err) {
      errorMsg = err.message || "Gagal mengirim permintaan";
      // apiRequest already shows a toast for network errors
    } finally {
      isLoading = false;
    }
  };
</script>

<svelte:head>
  <title>Lupa Password — P3K App</title>
</svelte:head>

<div class="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full">
    <div class="card p-8 sm:p-10 relative overflow-hidden">
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

      <div class="text-center mb-8">
        <div
          class="w-16 h-20 mx-auto mb-3 flex items-center justify-center filter drop-shadow-md"
        >
          <img src="/logo-touna.png" alt="Lambang Kabupaten Tojo Una-Una" class="w-full h-full object-contain" />
        </div>
        <h2 class="text-2xl font-bold text-slate-800">Lupa Password</h2>
        <p class="mt-2 text-sm text-slate-500">Masukkan email yang terdaftar untuk menerima tautan reset password akun SIPPPK.</p>
      </div>

      <form onsubmit={handleForgotPassword} class="space-y-5">
        <div>
          <label for="email" class="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            required
            class="input-field"
            placeholder="Masukkan email"
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

        {#if successMsg}
          <div class="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-green-600">{successMsg}</p>
          </div>
        {/if}

        <button type="submit" disabled={isLoading} class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
          {#if isLoading}
            Memproses...
          {:else}
            Kirim Tautan Reset
          {/if}
        </button>
      </form>

      <div class="mt-6 text-center">
        <a href="/login" class="text-sm font-medium text-blue-600 hover:text-blue-700">Kembali ke halaman Login</a>
      </div>
    </div>
  </div>
</div>
