<script>
  import { authStore, updateAuthUser } from "$lib/store";
  import { apiRequest, API_BASE_URL } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import { onMount } from "svelte";

  let user = $authStore.user || {};
  let namaLengkap = user.namaLengkap || "";
  let email = user.email || "";
  let password = "";
  let confirmPassword = "";
  let photoFile = null;
  let photoPreview = user.foto ? `${API_BASE_URL}${user.foto}` : null;
  let isLoading = false;

  async function handleUpdateProfile() {
    if (password && password !== confirmPassword) {
      addToast("Password dan konfirmasi password tidak cocok", "error");
      return;
    }

    isLoading = true;
    try {
      const formData = new FormData();
      formData.append("namaLengkap", namaLengkap);
      formData.append("email", email);
      if (password) {
        formData.append("password", password);
      }
      if (photoFile) {
        formData.append("foto", photoFile);
      }

      const result = await apiRequest("/api/users/profile", "PUT", formData, true);

      if (result.success) {
        addToast("Profil berhasil diperbarui", "success");
        // Update user in store
        updateAuthUser(result.data);
        password = "";
        confirmPassword = "";
        photoFile = null;
      } else {
        addToast(result.message || "Gagal memperbarui profil", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat memperbarui profil", "error");
    } finally {
      isLoading = false;
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
      photoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }
</script>

<svelte:head>
  <title>Edit Profil — App P3K</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
  <div class="mb-8">
    <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Pengaturan Profil</h1>
    <p class="mt-2 text-sm text-slate-500">Kelola informasi akun, kata sandi, dan foto profil Anda.</p>
  </div>

  <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
    <div class="p-6 sm:p-10">
      <form on:submit|preventDefault={handleUpdateProfile} class="space-y-8">
        <!-- Photo Section -->
        <div class="flex flex-col sm:flex-row items-center gap-8">
          <div class="relative group">
            <div class="w-32 h-32 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-md group-hover:shadow-lg transition-all ring-1 ring-slate-200">
              {#if photoPreview}
                <img src={photoPreview} alt="Profile" class="w-full h-full object-cover" />
              {:else}
                <div class="w-full h-full flex items-center justify-center text-slate-300">
                  <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              {/if}
            </div>
            <label for="photo-upload" class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
              <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7h.93a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </label>
            <input id="photo-upload" type="file" accept="image/*" on:change={handlePhotoChange} class="hidden" />
          </div>
          <div class="text-center sm:text-left">
            <h3 class="text-lg font-bold text-slate-800">Foto Profil</h3>
            <p class="text-sm text-slate-500 mt-1 max-w-xs">Unggah foto baru untuk mengubah profil Anda. Maksimal 2MB.</p>
            <button type="button" on:click={() => document.getElementById('photo-upload').click()} class="mt-3 btn-secondary text-xs">Ubah Foto</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-slate-100">
          <!-- Information -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Informasi Dasar</h4>
            
            <div class="space-y-1.5">
              <label for="username" class="block text-sm font-semibold text-slate-700">Username</label>
              <input 
                id="username" 
                type="text" 
                value={user.username} 
                disabled 
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed text-sm" 
              />
              <p class="text-[10px] text-slate-400">Username tidak dapat diubah.</p>
            </div>

            <div class="space-y-1.5">
              <label for="namaLengkap" class="block text-sm font-semibold text-slate-700">Nama Lengkap</label>
              <input 
                id="namaLengkap" 
                type="text" 
                bind:value={namaLengkap} 
                required
                placeholder="Masukkan nama lengkap"
                class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" 
              />
            </div>

            <div class="space-y-1.5">
              <label for="email" class="block text-sm font-semibold text-slate-700">Alamat Email</label>
              <input 
                id="email" 
                type="email" 
                bind:value={email} 
                required
                placeholder="nama@email.com"
                class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" 
              />
            </div>
          </div>

          <!-- Password -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest">Keamanan</h4>
            
            <div class="space-y-1.5">
              <label for="password" class="block text-sm font-semibold text-slate-700">Password Baru</label>
              <input 
                id="password" 
                type="password" 
                bind:value={password} 
                placeholder="••••••••"
                class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" 
              />
              <p class="text-[10px] text-slate-400">Kosongkan jika tidak ingin mengubah password.</p>
            </div>

            <div class="space-y-1.5">
              <label for="confirmPassword" class="block text-sm font-semibold text-slate-700">Konfirmasi Password Baru</label>
              <input 
                id="confirmPassword" 
                type="password" 
                bind:value={confirmPassword} 
                placeholder="••••••••"
                class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm" 
              />
            </div>
          </div>
        </div>

        <div class="pt-8 border-t border-slate-100 flex justify-end gap-3">
          <a href="/" class="btn-secondary">Batal</a>
          <button type="submit" class="btn-primary" disabled={isLoading}>
            {#if isLoading}
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Menyimpan...
            {:else}
              Simpan Perubahan
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  .btn-primary {
    @apply inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 
           hover:bg-blue-700 text-white font-semibold rounded-xl 
           transition-all duration-200 shadow-md shadow-blue-600/20 
           disabled:opacity-50 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply inline-flex items-center justify-center px-6 py-2.5 bg-white border border-slate-200 
           hover:bg-slate-50 text-slate-600 font-semibold rounded-xl 
           transition-all duration-200 h-fit;
  }
</style>
