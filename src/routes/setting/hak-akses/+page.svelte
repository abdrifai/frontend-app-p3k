<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { addToast } from "$lib/toastStore";
  import { loadMenuPermissions } from "$lib/menuStore";

  let isLoading = true;
  let isSaving = false;

  let catalog = [];
  let roles = [];
  let matrix = {}; // { [role]: { [menuKey]: boolean } }

  let selectedRole = "user";
  let searchTerm = "";

  onMount(async () => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }

    if (!["admin", "ADMIN", "Admin"].includes($authStore.user?.role)) {
      addToast("Akses ditolak. Hanya administrator yang dapat mengakses halaman ini.", "error");
      goto("/");
      return;
    }

    await fetchPermissions();
  });

  const fetchPermissions = async () => {
    isLoading = true;
    try {
      const result = await apiRequest("/api/role-menus", "GET");
      if (result && result.success && result.data) {
        catalog = result.data.catalog || [];
        roles = result.data.roles || [];
        matrix = result.data.matrix || {};

        if (roles.length > 0 && !roles.includes(selectedRole)) {
          selectedRole = roles[0];
        }
      }
    } catch (err) {
      console.error("Fetch permissions error:", err);
      addToast("Gagal memuat pengaturan hak akses", "error");
    } finally {
      isLoading = false;
    }
  };

  // Group catalog by parent / category
  $: mainMenus = catalog.filter((m) => !m.parentKey);
  $: getSubmenus = (parentKey) => catalog.filter((m) => m.parentKey === parentKey);

  // Grouped by display group
  $: groupedCatalog = catalog.reduce((acc, item) => {
    const grp = item.group || "Lainnya";
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(item);
    return acc;
  }, {});

  const isMenuAllowed = (role, key) => {
    if (!matrix[role]) return false;
    return Boolean(matrix[role][key]);
  };

  const toggleMenu = (key) => {
    if (!matrix[selectedRole]) matrix[selectedRole] = {};
    const current = Boolean(matrix[selectedRole][key]);
    const nextVal = !current;
    matrix[selectedRole][key] = nextVal;

    // If toggling a parent menu, also toggle its submenus accordingly
    const subs = getSubmenus(key);
    if (subs.length > 0) {
      subs.forEach((sub) => {
        matrix[selectedRole][sub.key] = nextVal;
      });
    }

    // If toggling a submenu ON, ensure parent menu is also ON
    const item = catalog.find((m) => m.key === key);
    if (item && item.parentKey && nextVal) {
      matrix[selectedRole][item.parentKey] = true;
    }

    matrix = { ...matrix };
  };

  const selectAllForRole = () => {
    if (!matrix[selectedRole]) matrix[selectedRole] = {};
    catalog.forEach((m) => {
      matrix[selectedRole][m.key] = true;
    });
    matrix = { ...matrix };
    addToast(`Semua menu dipilih untuk role ${selectedRole.toUpperCase()}`, "info");
  };

  const deselectAllForRole = () => {
    if (!matrix[selectedRole]) matrix[selectedRole] = {};
    catalog.forEach((m) => {
      matrix[selectedRole][m.key] = false;
    });
    matrix = { ...matrix };
    addToast(`Semua menu dinonaktifkan untuk role ${selectedRole.toUpperCase()}`, "warning");
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    isSaving = true;

    try {
      const currentRolePerms = matrix[selectedRole] || {};
      const permissionsPayload = catalog.map((m) => ({
        menuKey: m.key,
        isAllowed: Boolean(currentRolePerms[m.key]),
      }));

      const result = await apiRequest("/api/role-menus", "PUT", {
        role: selectedRole,
        permissions: permissionsPayload,
      });

      if (result && result.success) {
        addToast(`Hak akses untuk role "${selectedRole.toUpperCase()}" berhasil disimpan!`, "success");
        // Reload current user permissions in navbar
        await loadMenuPermissions();
      }
    } catch (err) {
      console.error("Save permissions error:", err);
      addToast(err.message || "Gagal menyimpan hak akses", "error");
    } finally {
      isSaving = false;
    }
  };

  const getRoleBadgeClass = (r) => {
    switch (r.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "pensiun":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "user":
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };
</script>

<svelte:head>
  <title>Pengaturan Hak Akses Menu — SIPPPK</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in">
  <!-- Header Card -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl shadow-xl text-white">
    <div class="space-y-1.5">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-200 border border-white/10">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Role-Based Access Control
      </div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
        Pengaturan Hak Akses Menu
      </h1>
      <p class="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
        Kelola visibilitas menu dan sub-menu yang dapat diakses oleh masing-masing role pengguna aplikasi SIPPPK secara dinamis.
      </p>
    </div>

    <!-- Quick Stats -->
    <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
      <div class="text-right">
        <p class="text-xs text-blue-200 uppercase font-semibold">Total Menu</p>
        <p class="text-2xl font-black">{catalog.length}</p>
      </div>
      <div class="h-8 w-px bg-white/20"></div>
      <div class="text-right">
        <p class="text-xs text-blue-200 uppercase font-semibold">Total Role</p>
        <p class="text-2xl font-black">{roles.length}</p>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="card p-12 text-center space-y-4">
      <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-sm font-semibold text-slate-600">Memuat konfigurasi hak akses menu...</p>
    </div>
  {:else}
    <!-- Main Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      <!-- Role Selector Sidebar -->
      <div class="card p-5 space-y-4 lg:col-span-1 border border-slate-200 shadow-sm sticky top-24">
        <div class="border-b border-slate-100 pb-3">
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Pilih Role
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">Pilih role untuk mengatur izin menu.</p>
        </div>

        <div class="space-y-1.5">
          {#each roles as r}
            <button
              type="button"
              on:click={() => (selectedRole = r)}
              class="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border {selectedRole === r ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-bold shadow-xs' : 'bg-slate-50/60 border-slate-200/80 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300 font-medium'}"
            >
              <div class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full {selectedRole === r ? 'bg-indigo-600 ring-4 ring-indigo-200' : 'bg-slate-300'}"></span>
                <span class="text-xs uppercase tracking-wide">{r}</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold {getRoleBadgeClass(r)}">
                {r === 'admin' ? 'Full Access' : r}
              </span>
            </button>
          {/each}
        </div>

        <!-- Action Tools for selected role -->
        <div class="pt-4 border-t border-slate-100 space-y-2">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi Cepat ({selectedRole.toUpperCase()})</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              on:click={selectAllForRole}
              class="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors flex items-center justify-center gap-1.5 border border-indigo-200"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Pilih Semua
            </button>
            <button
              type="button"
              on:click={deselectAllForRole}
              class="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center justify-center gap-1.5 border border-rose-200"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Kosongkan
            </button>
          </div>
        </div>

        <!-- Save Button Floating in Sidebar -->
        <div class="pt-3">
          <button
            type="button"
            on:click={handleSave}
            disabled={isSaving}
            class="w-full btn-primary py-3 justify-center shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            {#if isSaving}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Menyimpan...</span>
            {:else}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Simpan Hak Akses</span>
            {/if}
          </button>
        </div>
      </div>

      <!-- Permissions Tree Workspace -->
      <div class="lg:col-span-3 space-y-6">
        <!-- Top Toolbar -->
        <div class="card p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
          <div>
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              Daftar Menu & Sub-Menu untuk Role: 
              <span class="px-2.5 py-0.5 rounded-lg border text-sm uppercase font-extrabold {getRoleBadgeClass(selectedRole)}">
                {selectedRole}
              </span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Centang menu yang ingin diizinkan tampil untuk role ini.</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              on:click={handleSave}
              disabled={isSaving}
              class="btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
            >
              {#if isSaving}
                <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menyimpan...</span>
              {:else}
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Simpan Perubahan</span>
              {/if}
            </button>
          </div>
        </div>

        <!-- Menu Groups Accordion/Card Grid -->
        <div class="space-y-4">
          {#each mainMenus as main}
            {@const submenus = getSubmenus(main.key)}
            {@const isMainChecked = isMenuAllowed(selectedRole, main.key)}
            {@const allowedSubCount = submenus.filter((s) => isMenuAllowed(selectedRole, s.key)).length}

            <div class="card border border-slate-200 shadow-xs overflow-hidden transition-all {isMainChecked ? 'ring-1 ring-indigo-500/20' : 'opacity-75'}">
              <!-- Main Menu Header Bar -->
              <div class="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <label class="relative flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMainChecked}
                      on:change={() => toggleMenu(main.key)}
                      class="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 focus:ring-2 border-slate-300 transition-all cursor-pointer"
                    />
                  </label>

                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 font-bold">
                      <i class="{main.icon || 'ri-folder-line'} text-base"></i>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {main.label}
                        {#if main.path}
                          <span class="text-[11px] font-mono text-slate-400 font-normal">({main.path})</span>
                        {/if}
                      </h3>
                      <p class="text-[11px] text-slate-500">
                        {#if submenus.length > 0}
                          {allowedSubCount} dari {submenus.length} sub-menu aktif
                        {:else}
                          Menu Tunggal (Direct Page)
                        {/if}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    on:click={() => toggleMenu(main.key)}
                    class="text-xs px-2.5 py-1 rounded-md font-semibold transition-colors {isMainChecked ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}"
                  >
                    {isMainChecked ? 'Diizinkan (Aktif)' : 'Dinonaktifkan'}
                  </button>
                </div>
              </div>

              <!-- Submenus Grid -->
              {#if submenus.length > 0}
                <div class="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {#each submenus as sub}
                    {@const isSubChecked = isMenuAllowed(selectedRole, sub.key)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                      on:click={() => toggleMenu(sub.key)}
                      class="p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none {isSubChecked ? 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50' : 'bg-slate-50/40 border-slate-200/80 hover:bg-slate-100/60 opacity-60'}"
                    >
                      <input
                        type="checkbox"
                        checked={isSubChecked}
                        on:click|stopPropagation={() => toggleMenu(sub.key)}
                        class="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold text-slate-800 truncate {isSubChecked ? 'text-indigo-950' : ''}">
                          {sub.label}
                        </p>
                        {#if sub.path}
                          <p class="text-[10px] font-mono text-slate-400 truncate mt-0.5">{sub.path}</p>
                        {/if}
                        {#if sub.group && sub.group !== main.group}
                          <span class="inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                            {sub.group.replace('Pengaturan - ', '')}
                          </span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Bottom Action Bar -->
        <div class="card p-4 border border-slate-200 shadow-sm flex items-center justify-between bg-slate-50">
          <p class="text-xs text-slate-500">
            Perubahan hak akses akan langsung diterapkan saat menu dimuat kembali oleh pengguna.
          </p>
          <button
            type="button"
            on:click={handleSave}
            disabled={isSaving}
            class="btn-primary py-2.5 px-6 shadow-md shadow-indigo-200 flex items-center gap-2"
          >
            {#if isSaving}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Menyimpan...</span>
            {:else}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Simpan Hak Akses Role {selectedRole.toUpperCase()}</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
