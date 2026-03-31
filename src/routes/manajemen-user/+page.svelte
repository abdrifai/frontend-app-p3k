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
  let editForm = { namaLengkap: "", email: "", password: "", role: "user" };
  let isSubmitting = false;

  // Add modal state
  let showAddModal = false;
  let addForm = { username: "", namaLengkap: "", email: "", password: "", role: "user" };
  let isAdding = false;

  // Delete modal state
  let showDeleteModal = false;
  let deleteUser = null;
  let isDeleting = false;

  let searchTimeout = null;

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
      });
      if (searchTerm) params.set("search", searchTerm);

      const result = await apiRequest(`/api/users?${params.toString()}`, "GET");
      
      if (result.success) {
        users = result.data;
        meta = result.meta;
      } else {
        addToast(result.message || "Gagal memuat data user", "error");
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      addToast("Terjadi kesalahan sistem", "error");
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
      role: user.role || "user",
    };
    showEditModal = true;
  };

  const closeEditModal = () => {
    showEditModal = false;
    editUser = null;
  };

  const openAddModal = () => {
    addForm = { username: "", namaLengkap: "", email: "", password: "", role: "user" };
    showAddModal = true;
  };

  const closeAddModal = () => {
    showAddModal = false;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    isAdding = true;
    try {
      const result = await apiRequest("/api/users/register", "POST", addForm);
      if (result.success) {
        addToast("User berhasil ditambahkan", "success");
        closeAddModal();
        fetchUsers(1);
      } else {
        addToast(result.message || "Gagal menambahkan user", "error");
      }
    } catch (err) {
      console.error("Add user error:", err);
      addToast("Terjadi kesalahan sistem", "error");
    } finally {
      isAdding = false;
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    isSubmitting = true;
    try {
      const payload = {};
      if (editForm.namaLengkap) payload.namaLengkap = editForm.namaLengkap;
      if (editForm.email) payload.email = editForm.email;
      if (editForm.password) payload.password = editForm.password;
      if (editForm.role) payload.role = editForm.role;

      const result = await apiRequest(`/api/users/${editUser.id}`, "PUT", payload);
      if (result.success) {
        addToast("User berhasil diperbarui", "success");
        closeEditModal();
        fetchUsers(meta.page);
      } else {
        addToast(result.message || "Gagal memperbarui user", "error");
      }
    } catch (err) {
      console.error("Update user error:", err);
      addToast("Terjadi kesalahan sistem", "error");
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
      if (result.success) {
        addToast("User berhasil dihapus", "success");
        closeDeleteModal();
        fetchUsers(meta.page);
      } else {
        addToast(result.message || "Gagal menghapus user", "error");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      addToast("Terjadi kesalahan sistem", "error");
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

  <!-- Search -->
  <div class="card p-4">
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
              >Role</th
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
              <td colspan="6" class="px-6 py-16 text-center">
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
              <td colspan="6" class="px-6 py-16 text-center">
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
              <tr class="hover:bg-blue-50/30 transition-colors">
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-400 font-mono"
                  >{(meta.page - 1) * meta.limit + i + 1}</td
                >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm flex-shrink-0"
                    >
                      <span class="text-white text-xs font-bold uppercase"
                        >{(user.namaLengkap || user.username || "U").charAt(
                          0,
                        )}</span
                      >
                    </div>
                    <span class="text-sm font-semibold text-slate-800"
                      >{user.username}</span
                    >
                  </div>
                </td>
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-600"
                  >{user.namaLengkap || "-"}</td
                >
                <td
                  class="hidden md:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500"
                  >{user.email || "-"}</td
                >
                <td class="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}">
                    {user.role || "user"}
                  </span>
                </td>
                <td
                  class="hidden lg:table-cell px-4 sm:px-6 py-3.5 whitespace-nowrap text-sm text-slate-500"
                  >{formatDate(user.createdAt)}</td
                >
                <td
                  class="px-4 sm:px-6 py-3.5 whitespace-nowrap text-right text-sm"
                >
                  <div class="flex items-center justify-end gap-1.5">
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
                      title="Hapus user"
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
            <label
              for="addRole"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Role <span class="text-red-500">*</span></label
            >
            <select
              id="addRole"
              bind:value={addForm.role}
              required
              class="input-field"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
            <label
              for="editRole"
              class="block text-sm font-medium text-slate-700 mb-1.5"
              >Role</label
            >
            <select
              id="editRole"
              bind:value={editForm.role}
              class="input-field"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
