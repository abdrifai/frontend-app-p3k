<script>
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import { goto } from "$app/navigation";

  let username = "";
  let email = "";
  let namaLengkap = "";
  let password = "";
  let errorMsg = "";
  let isLoading = false;

  const handleRegister = async (e) => {
    e.preventDefault();
    errorMsg = "";
    isLoading = true;
    try {
      await apiRequest("/api/users/register", "POST", {
        username,
        email,
        namaLengkap,
        password,
      });
      addToast("Akun berhasil dibuat! Silakan masuk.", "success");
      goto("/login");
    } catch (err) {
      errorMsg = err.message;
    } finally {
      isLoading = false;
    }
  };
</script>

<svelte:head>
  <title>Daftar — P3K App</title>
</svelte:head>

<div
  class="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
>
  <div class="max-w-md w-full">
    <div class="card p-8 sm:p-10 relative overflow-hidden">
      <div
        class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"
      ></div>

      <div class="text-center mb-8">
        <div
          class="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4"
        >
          <svg
            class="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            /></svg
          >
        </div>
        <h2 class="text-2xl font-bold text-slate-800">Buat akun baru</h2>
        <p class="mt-2 text-sm text-slate-500">
          Sudah punya akun?
          <a
            href="/login"
            class="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >Masuk di sini</a
          >
        </p>
      </div>

      <form onsubmit={handleRegister} class="space-y-5">
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
            bind:value={username}
            required
            class="input-field"
            placeholder="Masukkan username"
          />
        </div>
        <div>
          <label
            for="email"
            class="block text-sm font-medium text-slate-700 mb-1.5"
            >Alamat Email</label
          >
          <input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            required
            class="input-field"
            placeholder="nama@email.com"
          />
        </div>
        <div>
          <label
            for="namaLengkap"
            class="block text-sm font-medium text-slate-700 mb-1.5"
            >Nama Lengkap</label
          >
          <input
            id="namaLengkap"
            name="namaLengkap"
            type="text"
            bind:value={namaLengkap}
            required
            class="input-field"
            placeholder="Masukkan nama lengkap"
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
            bind:value={password}
            required
            class="input-field"
            placeholder="Buat password yang kuat"
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
          class="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg
                 text-white bg-gradient-to-r from-emerald-500 to-teal-600
                 hover:from-emerald-600 hover:to-teal-700
                 shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/30
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
                 transition-all duration-200 ease-in-out
                 disabled:opacity-50 disabled:cursor-not-allowed"
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
            Daftar
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>
