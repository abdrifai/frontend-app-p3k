<script>
  import { addToast } from "$lib/toastStore";
  import { authStore } from "$lib/store";
  import { apiRequest } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let users = [];
  let isLoading = true;
  let searchTerm = "";
  let meta = { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Edit modal state
  let showEditModal = false;
  let editUser = null;
  let editForm = { namaLengkap: "", email: "", password: "", roles: ["user"] };
  let isSubmitting = false;

  // Add modal state
  let showAddModal = false;
  let addForm = { username: "", namaLengkap: "", email: "", password: "", roles: ["user"] };
  let isAdding = false;

  // Delete modal state
  let showDeleteModal = false;
  let deleteUser = null;
  let isDeleting = false;

  let statusFilter = "active"; // "active", "inactive", "all"

  // Reactivate modal state
  let showReactivateModal = false;
  let reactivateUserData = null;
  let isReactivating = false;

  // Permanent Delete modal state
  let showPermanentDeleteModal = false;
  let permanentDeleteUser = null;
  let permanentSecurityKey = "";
  let isPermanentDeleting = false;

  let searchTimeout = null;

  const AVAILABLE_ROLES = [
    { id: "user", label: "Operator P3K (user)", description: "Data P3K, Usulan Kontrak, Task User, dan Laporan", color: "blue" },
    { id: "pensiun", label: "Operator Pensiun (pensiun)", description: "Pengajuan & Manajemen Pensiun Pegawai, Estimasi Pensiun", color: "rose" },
    { id: "admin", label: "Administrator (admin)", description: "Akses penuh seluruh modul, manajemen user, dan pengaturan sistem", color: "purple" }
  ];

  const getUserRoles = (u) => {
    if (!u) return ["user"];
    if (Array.isArray(u.roles) && u.roles.length > 0) {
      return u.roles.map((r) => String(r).toLowerCase().trim());
    }
    return String(u.role || "user")
      .toLowerCase()
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  };

  const toggleRole = (targetForm, roleId) => {
    if (!targetForm.roles) targetForm.roles = [];
    if (targetForm.roles.includes(roleId)) {
      if (targetForm.roles.length > 1) {
        targetForm.roles = targetForm.roles.filter((r) => r !== roleId);
      } else {
        addToast("User wajib memiliki minimal 1 role", "warning");
      }
    } else {
      targetForm.roles = [...targetForm.roles, roleId];
    }
  };

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      addToast("Anda harus login untuk mengakses halaman ini", "error");
      goto("/login");
      return;
    }
    fetchUsers();
  });

  const fetchUsers = async (page = 1) => {
    isLoading = true;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(meta.limit),
        status: statusFilter,
      });
      if (searchTerm) params.set("search", searchTerm);

      const result = await apiRequest(`/api/users?${params.toString()}`, "GET");
      
      if (result && result.success) {
        users = result.data || [];
        meta = result.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      isLoading = false;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const resetSearch = () => {
    searchTerm = "";
    fetchUsers(1);
  };

  const openEditModal = (user) => {
    editUser = user;
    editForm = {
      namaLengkap: user.namaLengkap || "",
      email: user.email || "",
      password: "",
      roles: getUserRoles(user),
    };
    showEditModal = true;
  };

  const closeEditModal = () => {
    showEditModal = false;
    editUser = null;
  };

  const openAddModal = () => {
    addForm = { username: "", namaLengkap: "", email: "", password: "", roles: ["user"] };
    showAddModal = true;
  };

  const closeAddModal = () => {
    showAddModal = false;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.roles || addForm.roles.length === 0) {
      addToast("Pilih minimal 1 role untuk user", "warning");
      return;
    }
    isAdding = true;
    try {
      const payload = {
        ...addForm,
        role: addForm.roles.join(","),
      };
      const result = await apiRequest("/api/users/register", "POST", payload);
      
      if (result.isSoftDeleted) {
        // User exists in soft-deleted state
        reactivateUserData = {
          id: result.data.id,
          username: addForm.username,
          namaLengkap: result.data.namaLengkap || addForm.namaLengkap,
          email: addForm.email,
          newForm: { ...addForm }
        };
        closeAddModal();
        showReactivateModal = true;
      } else if (result && result.success) {
        addToast("User berhasil ditambahkan", "success");
        closeAddModal();
        fetchUsers(1);
      }
    } catch (err) {
      console.error("Add user error:", err);
    } finally {
      isAdding = false;
    }
  };

  const openDirectReactivateModal = (user) => {
    let cleanUsername = user.username || "";
    if (cleanUsername.includes("_del_")) {
      cleanUsername = cleanUsername.split("_del_")[0];
    }
    let cleanEmail = user.email || "";
    if (cleanEmail.includes("_del_")) {
      cleanEmail = cleanEmail.split("_del_")[0];
    }

    reactivateUserData = {
      id: user.id,
      username: cleanUsername,
      namaLengkap: user.namaLengkap,
      email: cleanEmail,
      newForm: { username: cleanUsername, email: cleanEmail, roles: getUserRoles(user), password: "" }
    };
    showReactivateModal = true;
  };

  const closeReactivateModal = () => {
    showReactivateModal = false;
    reactivateUserData = null;
  };

  const handleReactivate = async (e) => {
    if (e) e.preventDefault();
    if (!reactivateUserData) return;
    isReactivating = true;
    try {
      const payload = {
        ...reactivateUserData.newForm,
        role: reactivateUserData.newForm.roles?.join(",") || "user",
      };
      const result = await apiRequest(`/api/users/${reactivateUserData.id}/reactivate`, "POST", payload);
      if (result && result.success) {
        addToast("User berhasil diaktifkan kembali", "success");
        closeReactivateModal();
        fetchUsers(1);
      }
    } catch (err) {
      console.error("Reactivate user error:", err);
    } finally {
      isReactivating = false;
    }
  };

  const openPermanentDeleteModal = (user) => {
    permanentDeleteUser = user;
    permanentSecurityKey = "";
    showPermanentDeleteModal = true;
  };

  const closePermanentDeleteModal = () => {
    showPermanentDeleteModal = false;
    permanentDeleteUser = null;
    permanentSecurityKey = "";
  };

  const handlePermanentDelete = async (e) => {
    if (e) e.preventDefault();
    if (!permanentDeleteUser) return;

    if (permanentSecurityKey !== "234") {
      addToast("Kunci keamanan salah! Masukkan kunci keamanan yang benar ('234')", "error");
      return;
    }

    isPermanentDeleting = true;
    try {
      const result = await apiRequest(`/api/users/${permanentDeleteUser.id}/permanent?securityKey=${encodeURIComponent(permanentSecurityKey)}`, "DELETE", {
        securityKey: permanentSecurityKey
      });

      if (result.success) {
        addToast("User berhasil dihapus secara permanen dari database", "success");
        closePermanentDeleteModal();
        fetchUsers(meta.page);
      }
    } catch (err) {
      console.error("Permanent delete user error:", err);
    } finally {
      isPermanentDeleting = false;
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.roles || editForm.roles.length === 0) {
      addToast("Pilih minimal 1 role untuk user", "warning");
      return;
    }
    isSubmitting = true;
    try {
      const payload = {};
      if (editForm.namaLengkap) payload.namaLengkap = editForm.namaLengkap;
      if (editForm.email) payload.email = editForm.email;
      if (editForm.password) payload.password = editForm.password;
      if (editForm.roles && editForm.roles.length > 0) {
        payload.roles = editForm.roles;
        payload.role = editForm.roles.join(",");
      }

      const result = await apiRequest(`/api/users/${editUser.id}`, "PUT", payload);
      if (result && result.success) {
        addToast("User berhasil diperbarui", "success");
        closeEditModal();
        fetchUsers(meta.page);
      }
    } catch (err) {
      console.error("Update user error:", err);
    } finally {
      isSubmitting = false;
    }
  };

  const openDeleteModal = (user) => {
    deleteUser = user;
    showDeleteModal = true;
  };

  const closeDeleteModal = () => {
    showDeleteModal = false;
    deleteUser = null;
  };

  const handleDelete = async () => {
    isDeleting = true;
    try {
      const result = await apiRequest(`/api/users/${deleteUser.id}`, "DELETE");
      if (result && result.success) {
        addToast("User berhasil dihapus", "success");
        closeDeleteModal();
        fetchUsers(meta.page);
      }
    } catch (err) {
      console.error("Delete user error:", err);
    } finally {
      isDeleting = false;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
</script>

<svelte:head>
  <title>Manajemen User — App P3K</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Manajemen User</h1>
      <p class="mt-1 text-sm text-slate-500">
        Kelola akun pengguna yang terdaftar di sistem. Total <span
          class="font-semibold text-slate-700">{meta.total}</span
        > user.
      </p>
    </div>
    <button on:click={openAddModal} class="btn-primary whitespace-nowrap">
      <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Tambah User
    </button>
  </div>

  <!-- Search & Filter -->
  <div class="card p-4 space-y-3">
    <form
      on:submit={handleSearch}
      class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
    >
      <div class="flex-1 relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Cari username, email, atau nama..."
          class="input-field !pl-10 w-full"
        />
      </div>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary flex-1 sm:flex-none">
          Cari
        </button>
        {#if searchTerm}
          <button
            type="button"
            on:click={resetSearch}
            class="btn-secondary !text-red-500 !border-red-200 hover:!bg-red-50"
          >
            Reset
          </button>
        {/if}
      </div>
    </form>

    <div class="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
      <div class="flex items-center gap-1.5 text-xs font-semibold">
        <span class="text-slate-400 mr-1">Filter Status:</span>
        <button
          type="button"
          on:click={() => { statusFilter = 'active'; fetchUsers(1); }}
          class="px-3 py-1.5 rounded-lg transition-all {statusFilter === 'active' ? 'bg-emerald-600 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
        >
          Aktif
        </button>
        <button
          type="button"
          on:click={() => { statusFilter = 'inactive'; fetchUsers(1); }}
          class="px-3 py-1.5 rounded-lg transition-all {statusFilter === 'inactive' ? 'bg-rose-600 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
        >
          Non-Aktif (Soft Delete)
        </button>
        <button
          type="button"
          on:click={() => { statusFilter = 'all'; fetchUsers(1); }}
          class="px-3 py-1.5 rounded-lg transition-all {statusFilter === 'all' ? 'bg-blue-600 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
        >
          Semua User
        </button>
      </div>
    </div>
  </div>

  <!-- Table -->
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead>
          <tr class="bg-slate-50/80">
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >No</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Username</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Nama Lengkap</th
            >
            <th
              scope="col"
              class="hidden md:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Email</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Role & Status</th
            >
            <th
              scope="col"
              class="hidden lg:table-cell px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Terdaftar</th
            >
            <th
              scope="col"
              class="px-4 sm:px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >Aksi</th
            >
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          {#if isLoading}
            <tr>
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span class="text-sm text-slate-400">Memuat data...</span>
                </div>
              </td>
            </tr>
          {:else if users.length === 0}
            <tr>
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div
                    class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center"
                  >
                    <svg
                      class="w-6 h-6 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <span class="text-sm text-slate-400"
                    >Tidak ada user ditemukan.</span
                  >
                </div>
              </td>
            </tr>
          {:else}
            {#each users as user, i}
              <tr class="hover:bg-blue-50/30 transition-colors {user.isDeleted ? 'bg-rose-50/20' : ''}">
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-full {user.isDeleted ? 'bg-gradient-to-br from-rose-400 to-red-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'} flex items-center justify-center shadow-sm flex-shrink-0"
                    >
                      <span class="text-white text-xs font-bold uppercase"
                        >{(user.namaLengkap || user.username || "U").charAt(
                          0,
                        )}</span
                      >
                    </div>
                    <div>
                      <span class="text-sm font-semibold text-slate-800"
                        >{user.username.includes('_del_') ? user.username.split('_del_')[0] : user.username}</span
                      >
                    </div>
                  </div>
                </td>
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-600"
                  >{user.namaLengkap || "-"}</td
                >
                <td
                  class="hidden md:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500"
                  >{user.email ? (user.email.includes('_del_') ? user.email.split('_del_')[0] : user.email) : "-"}</td
                >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <div class="flex flex-wrap items-center gap-1.5">
                    {#each getUserRoles(user) as r}
                      {#if r === 'admin'}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          <i class="ri-shield-keyhole-line text-[11px]"></i> Admin
                        </span>
                      {:else if r === 'pensiun' || r === 'operator_pensiun'}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          <i class="ri-user-unfollow-line text-[11px]"></i> Pensiun
                        </span>
                      {:else}
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <i class="ri-user-settings-line text-[11px]"></i> Operator P3K
                        </span>
                      {/if}
                    {/each}
                    {#if user.isDeleted}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                        Non-Aktif
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        Aktif
                      </span>
                    {/if}
                  </div>
                </td>
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500"
                  >{formatDate(user.createdAt)}</td
                >
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-right text-sm"
                >
                  <div class="flex items-center justify-end gap-1.5">
                    {#if user.isDeleted}
                      <button
                        on:click|stopPropagation={() => openDirectReactivateModal(user)}
                        class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                        title="Aktifkan kembali akun ini"
                      >
                        <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Aktifkan
                      </button>
                      <button
                        on:click|stopPropagation={() => openPermanentDeleteModal(user)}
                        class="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                        title="Hapus Permanen (Kunci Keamanan: 234)"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    {:else}
                      <button
                        on:click|stopPropagation={() => openEditModal(user)}
                        class="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit user"
                      >
                        <svg
                          class="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        on:click|stopPropagation={() => openDeleteModal(user)}
                        class="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus user (Soft Delete)"
                      >
                        <svg
                          class="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if meta.totalPages > 1}
      <div
        class="border-t border-slate-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <p class="text-sm text-slate-500">
          Menampilkan <span class="font-medium text-slate-700"
            >{(meta.page - 1) * meta.limit + 1}</span
          >
          –
          <span class="font-medium text-slate-700"
            >{Math.min(meta.page * meta.limit, meta.total)}</span
          >
          dari <span class="font-medium text-slate-700">{meta.total}</span>
        </p>
        <div class="flex items-center gap-1">
          <button
            disabled={meta.page === 1}
            on:click={() => fetchUsers(meta.page - 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Halaman sebelumnya"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span class="px-3 py-1.5 text-sm font-medium text-slate-600">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            disabled={meta.page === meta.totalPages}
            on:click={() => fetchUsers(meta.page + 1)}
            class="btn-secondary !px-2.5 !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Halaman selanjutnya"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Add Modal -->
{#if showAddModal}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-[60] overflow-y-auto"
    on:keydown={(e) => e.key === "Escape" && closeAddModal()}
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeAddModal}
        aria-label="Tutup modal"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"
        ></div>

        <div class="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-800">Tambah User</h3>
            <p class="text-sm text-slate-400">Buat akun pengguna baru</p>
          </div>
          <button
            on:click={closeAddModal}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup modal"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form on:submit={handleAdd} class="px-6 pb-6 space-y-4">
          <div>
            <label
              for="addUsername"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Username <span class="text-red-500">*</span></label
            >
            <input
              id="addUsername"
              type="text"
              bind:value={addForm.username}
              required
              class="input-field"
              placeholder="Username"
            />
          </div>
          <div>
            <label
              for="addNamaLengkap"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Nama Lengkap <span class="text-red-500">*</span></label
            >
            <input
              id="addNamaLengkap"
              type="text"
              bind:value={addForm.namaLengkap}
              required
              class="input-field"
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label
              for="addEmail"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Email <span class="text-red-500">*</span></label
            >
            <input
              id="addEmail"
              type="email"
              bind:value={addForm.email}
              required
              class="input-field"
              placeholder="Email valid"
            />
          </div>
          <div>
            <label
              for="addPassword"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Password <span class="text-red-500">*</span></label
            >
            <input
              id="addPassword"
              type="password"
              bind:value={addForm.password}
              required
              minlength="6"
              class="input-field"
              placeholder="Minimal 6 karakter"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">
              Pilih Role Pengguna <span class="text-red-500">*</span>
              <span class="text-xs font-normal text-slate-400 block">Dapat memilih lebih dari satu role</span>
            </label>
            <div class="space-y-2">
              {#each AVAILABLE_ROLES as roleItem}
                {@const isSelected = addForm.roles?.includes(roleItem.id)}
                <button
                  type="button"
                  on:click={() => toggleRole(addForm, roleItem.id)}
                  class="w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between {isSelected ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'}"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-5 h-5 rounded flex items-center justify-center border transition-colors {isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}">
                      {#if isSelected}
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                      {/if}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-800">{roleItem.label}</p>
                      <p class="text-xs text-slate-500">{roleItem.description}</p>
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              on:click={closeAddModal}
              class="btn-secondary flex-1">Batal</button
            >
            <button
              type="submit"
              disabled={isAdding}
              class="btn-primary flex-1"
            >
              {#if isAdding}
                <div
                  class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                ></div>
              {/if}
              Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Modal -->
{#if showEditModal && editUser}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-[60] overflow-y-auto"
    on:keydown={(e) => e.key === "Escape" && closeEditModal()}
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeEditModal}
        aria-label="Tutup modal"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"
        ></div>

        <div class="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-800">Edit User</h3>
            <p class="text-sm text-slate-400">{editUser.username}</p>
          </div>
          <button
            on:click={closeEditModal}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup modal"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form on:submit={handleUpdate} class="px-6 pb-6 space-y-4">
          <div>
            <label
              for="editNamaLengkap"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Nama Lengkap</label
            >
            <input
              id="editNamaLengkap"
              type="text"
              bind:value={editForm.namaLengkap}
              class="input-field"
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label
              for="editEmail"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Email</label
            >
            <input
              id="editEmail"
              type="email"
              bind:value={editForm.email}
              class="input-field"
              placeholder="Email"
            />
          </div>
          <div>
            <label
              for="editPassword"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Password Baru <span class="text-slate-400 font-normal"
                >(kosongkan jika tidak diubah)</span
              ></label
            >
            <input
              id="editPassword"
              type="password"
              bind:value={editForm.password}
              class="input-field"
              placeholder="Password baru"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">
              Pilih Role Pengguna <span class="text-red-500">*</span>
              <span class="text-xs font-normal text-slate-400 block">Dapat memilih lebih dari satu role</span>
            </label>
            <div class="space-y-2">
              {#each AVAILABLE_ROLES as roleItem}
                {@const isSelected = editForm.roles?.includes(roleItem.id)}
                <button
                  type="button"
                  on:click={() => toggleRole(editForm, roleItem.id)}
                  class="w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between {isSelected ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'}"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-5 h-5 rounded flex items-center justify-center border transition-colors {isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}">
                      {#if isSelected}
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                      {/if}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-800">{roleItem.label}</p>
                      <p class="text-xs text-slate-500">{roleItem.description}</p>
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              on:click={closeEditModal}
              class="btn-secondary flex-1">Batal</button
            >
            <button
              type="submit"
              disabled={isSubmitting}
              class="btn-primary flex-1"
            >
              {#if isSubmitting}
                <div
                  class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
                ></div>
              {/if}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && deleteUser}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-[60] overflow-y-auto"
    on:keydown={(e) => e.key === "Escape" && closeDeleteModal()}
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeDeleteModal}
        aria-label="Tutup modal"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-500"
        ></div>

        <div class="p-6 text-center">
          <div
            class="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4"
          >
            <svg
              class="w-7 h-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">Hapus User?</h3>
          <p class="text-sm text-slate-500">
            Anda yakin ingin menghapus user <span
              class="font-semibold text-slate-700">{deleteUser.username}</span
            >? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        <div class="px-6 pb-6 flex gap-3">
          <button
            type="button"
            on:click={closeDeleteModal}
            class="btn-secondary flex-1">Batal</button
          >
          <button
            type="button"
            on:click={handleDelete}
            disabled={isDeleting}
            class="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isDeleting}
              <div
                class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
              ></div>
            {/if}
            Hapus
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Reactivate Modal -->
{#if showReactivateModal && reactivateUserData}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-[60] overflow-y-auto"
    on:keydown={(e) => e.key === "Escape" && closeReactivateModal()}
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closeReactivateModal}
        aria-label="Tutup modal"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"
        ></div>

        <div class="flex items-center justify-between px-6 pt-6 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800">Aktifkan Kembali User</h3>
              <p class="text-xs text-slate-400">User Non-Aktif Terdeteksi</p>
            </div>
          </div>
          <button
            on:click={closeReactivateModal}
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup modal"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="px-6 pb-6 space-y-4">
          <div class="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 leading-relaxed">
            User <b>{reactivateUserData.username}</b> ({reactivateUserData.namaLengkap || '-'}) sebelumnya berstatus <b>Non-Aktif (Soft Delete)</b>.
            <br/><br/>
            Apakah Anda ingin <b>mengaktifkan kembali akun ini</b> dan memperbarui data aksesnya?
          </div>

          <form on:submit={handleReactivate} class="space-y-3">
            <div>
              <label for="reactivateNamaLengkap" class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
              <input
                id="reactivateNamaLengkap"
                type="text"
                bind:value={reactivateUserData.newForm.namaLengkap}
                class="input-field text-xs"
                placeholder="Nama Lengkap"
              />
            </div>
            <div>
              <label for="reactivateEmail" class="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                id="reactivateEmail"
                type="email"
                bind:value={reactivateUserData.newForm.email}
                class="input-field text-xs"
                placeholder="Email Valid"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Role Pengguna <span class="text-red-500">*</span>
                <span class="text-[11px] font-normal text-slate-400 block">Dapat memilih lebih dari satu role</span>
              </label>
              <div class="space-y-1.5">
                {#each AVAILABLE_ROLES as roleItem}
                  {@const isSelected = reactivateUserData.newForm.roles?.includes(roleItem.id)}
                  <button
                    type="button"
                    on:click={() => toggleRole(reactivateUserData.newForm, roleItem.id)}
                    class="w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between {isSelected ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300 bg-white'}"
                  >
                    <div class="flex items-center gap-2.5">
                      <div class="w-4 h-4 rounded flex items-center justify-center border transition-colors {isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}">
                        {#if isSelected}
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
                        {/if}
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-slate-800">{roleItem.label}</p>
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            </div>
            <div>
              <label for="reactivatePassword" class="block text-xs font-semibold text-slate-700 mb-1">Password Baru <span class="text-slate-400 font-normal">(opsional)</span></label>
              <input
                id="reactivatePassword"
                type="password"
                bind:value={reactivateUserData.newForm.password}
                class="input-field text-xs"
                placeholder="Isi jika ingin mengganti password"
              />
            </div>

            <div class="flex gap-3 pt-3">
              <button
                type="button"
                on:click={closeReactivateModal}
                class="btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isReactivating}
                class="btn-primary !bg-emerald-600 hover:!bg-emerald-700 flex-1"
              >
                {#if isReactivating}
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {/if}
                Aktifkan Kembali
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Permanent Delete Confirmation Modal -->
{#if showPermanentDeleteModal && permanentDeleteUser}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-[70] overflow-y-auto"
    on:keydown={(e) => e.key === "Escape" && closePermanentDeleteModal()}
  >
    <div class="flex items-center justify-center min-h-screen px-4 py-8">
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm w-full h-full border-none cursor-default"
        on:click={closePermanentDeleteModal}
        aria-label="Tutup modal"
      ></button>

      <div
        class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-rose-600"
        ></div>

        <div class="p-6 text-center space-y-4">
          <div class="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-inner">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h3 class="text-lg font-bold text-slate-800">Hapus User Permanen?</h3>
            <p class="text-xs text-rose-600 font-semibold mt-1">⚠️ PERINGATAN: TIDAK DAPAT DIBATALKAN</p>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
            Tindakan ini akan menghapus akun <span class="font-bold text-slate-800">{permanentDeleteUser.username.includes('_del_') ? permanentDeleteUser.username.split('_del_')[0] : permanentDeleteUser.username}</span> ({permanentDeleteUser.namaLengkap || '-'}) secara <b class="text-red-600">PERMANEN</b> dari database.
          </p>

          <form on:submit={handlePermanentDelete} class="space-y-4 text-left pt-2">
            <div>
              <label for="permanentSecurityKeyInput" class="block text-xs font-bold text-slate-700 mb-1.5">
                Masukkan Kunci Keamanan: <span class="text-red-500">*</span>
              </label>
              <input
                id="permanentSecurityKeyInput"
                type="password"
                bind:value={permanentSecurityKey}
                placeholder="Masukkan kunci keamanan (234)"
                required
                class="input-field text-center font-mono font-bold text-base text-red-600 tracking-widest border-red-300 focus:ring-red-500 focus:border-red-500"
              />
              <p class="text-[11px] text-slate-400 mt-1">
                Kunci keamanan penghapusan permanen: <code class="font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">234</code>
              </p>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                on:click={closePermanentDeleteModal}
                class="btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPermanentDeleting || permanentSecurityKey !== "234"}
                class="btn-primary !bg-red-600 hover:!bg-red-700 flex-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-red-500/20"
              >
                {#if isPermanentDeleting}
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {/if}
                Hapus Permanen
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}
