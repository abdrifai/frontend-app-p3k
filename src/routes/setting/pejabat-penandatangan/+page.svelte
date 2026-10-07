<script>
  import { onMount } from 'svelte';
  import { tteApi } from '$lib/tteApi';
  import { apiRequest } from '$lib/api';
  import { addToast } from '$lib/toastStore';

  let listPejabat = [];
  let listUsers = [];
  let loading = true;
  let errorMsg = '';

  // Form Modal State
  let showModal = false;
  let isEditing = false;
  let editingId = null;
  let formSubmitting = false;
  let formError = '';

  let formData = {
    userId: '',
    jabatan: 'KEPALA_BKPSDM',
    nama: '',
    nip: '',
    nik: '',
    jenis: 'PARAF',
    urutan: 1,
    isActive: true
  };

  const jabatanOptions = [
    { value: 'KEPALA_BKPSDM', label: 'Kepala BKPSDM (Tahap 1 - Paraf)', defaultJenis: 'PARAF', defaultUrutan: 1 },
    { value: 'SEKDA', label: 'Sekretaris Daerah (Tahap 2 - Paraf)', defaultJenis: 'PARAF', defaultUrutan: 2 },
    { value: 'BUPATI', label: 'Bupati (Tahap 4 - TTE Final)', defaultJenis: 'TTE', defaultUrutan: 4 }
  ];

  async function loadData() {
    loading = true;
    errorMsg = '';
    try {
      const [resPejabat, resUsers] = await Promise.all([
        tteApi.listPejabat(),
        apiRequest('/api/v1/users', 'GET')
      ]);

      if (resPejabat && resPejabat.data) {
        listPejabat = resPejabat.data;
      }
      if (resUsers && resUsers.data) {
        const allUsers = Array.isArray(resUsers.data) ? resUsers.data : resUsers.data.users || [];
        // Hanya akun aktif ber-role pejabat_ttd yang boleh ditautkan sebagai pejabat penandatangan
        listUsers = allUsers.filter((u) => {
          if (u.isDeleted) return false;
          const roles = Array.isArray(u.roles) && u.roles.length > 0
            ? u.roles
            : String(u.role || '').split(',');
          return roles.map((r) => String(r).trim().toLowerCase()).includes('pejabat_ttd');
        });
      }
    } catch (err) {
      errorMsg = err.message || 'Gagal memuat data pejabat penandatangan';
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    isEditing = false;
    editingId = null;
    formError = '';
    formData = {
      userId: listUsers.length > 0 ? listUsers[0].id : '',
      jabatan: 'KEPALA_BKPSDM',
      nama: '',
      nip: '',
      nik: '',
      jenis: 'PARAF',
      urutan: 1,
      isActive: true
    };
    showModal = true;
  }

  function openEditModal(pejabat) {
    isEditing = true;
    editingId = pejabat.id;
    formError = '';
    formData = {
      userId: pejabat.userId || '',
      jabatan: pejabat.jabatan || 'KEPALA_BKPSDM',
      nama: pejabat.nama || '',
      nip: pejabat.nip || '',
      nik: pejabat.nik || '',
      jenis: pejabat.jenis || 'PARAF',
      urutan: pejabat.urutan || 1,
      isActive: pejabat.isActive ?? true
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    isEditing = false;
    editingId = null;
  }

  function onJabatanChange() {
    const opt = jabatanOptions.find((o) => o.value === formData.jabatan);
    if (opt) {
      formData.jenis = opt.defaultJenis;
      formData.urutan = opt.defaultUrutan;
    }
  }

  function onUserSelect() {
    const u = listUsers.find((x) => x.id === formData.userId);
    if (u && !formData.nama) {
      formData.nama = u.namaLengkap || u.username;
    }
  }

  async function handleSubmit() {
    if (!formData.userId) {
      formError = 'Pilih akun pengguna pejabat';
      return;
    }
    if (!formData.nama.trim()) {
      formError = 'Nama lengkap pejabat wajib diisi';
      return;
    }
    if (!formData.nik.trim() || formData.nik.length !== 16 || !/^\d+$/.test(formData.nik)) {
      formError = 'NIK pejabat harus terdiri dari 16 digit angka';
      return;
    }

    formSubmitting = true;
    formError = '';

    try {
      const payload = {
        userId: formData.userId,
        jabatan: formData.jabatan,
        nama: formData.nama.trim(),
        nip: formData.nip.trim() || null,
        nik: formData.nik.trim(),
        jenis: formData.jenis,
        urutan: Number(formData.urutan),
        isActive: Boolean(formData.isActive)
      };

      if (isEditing) {
        await tteApi.updatePejabat(editingId, payload);
        addToast('Data pejabat berhasil diperbarui', 'success');
      } else {
        await tteApi.createPejabat(payload);
        addToast('Pejabat penandatangan berhasil ditambahkan', 'success');
      }

      closeModal();
      await loadData();
    } catch (err) {
      formError = err.message || 'Gagal menyimpan data pejabat';
    } finally {
      formSubmitting = false;
    }
  }

  async function handleDelete(id, nama) {
    if (!confirm(`Hapus konfigurasi pejabat penandatangan ${nama}?`)) return;

    try {
      await tteApi.deletePejabat(id);
      addToast('Pejabat penandatangan berhasil dihapus', 'success');
      await loadData();
    } catch (err) {
      addToast(err.message || 'Gagal menghapus pejabat', 'error');
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>Pengaturan Pejabat Penandatangan TTE - BKPSDM</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Konfigurasi TTE BSrE
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Pejabat Penandatangan Kontrak Kerja</h1>
          <p class="text-sm text-slate-500 mt-1">
            Atur urutan dan akun pejabat berwenang (Kepala BKPSDM, Sekda, Bupati) untuk pembubuhan paraf & tanda tangan elektronik.
          </p>
        </div>

        <div class="flex gap-3">
          <button
            on:click={loadData}
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            Muat Ulang
          </button>
          <button
            on:click={openCreateModal}
            class="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm inline-flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pejabat
          </button>
        </div>
      </div>
    </div>

    <!-- Informasi Alur TTE Resmi -->
    <div class="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 text-indigo-950 text-sm">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="space-y-1">
          <p class="font-semibold text-indigo-950">Urutan Alur Penandatanganan Kontrak Kerja (TTE BSrE):</p>
          <p class="text-indigo-800 text-xs sm:text-sm">
            1. <strong>Paraf Kepala BKPSDM</strong> &nbsp;⟶&nbsp; 
            2. <strong>Paraf Sekretaris Daerah</strong> &nbsp;⟶&nbsp; 
            3. <strong>TTE Pegawai PPPK</strong> (melalui Portal Mandiri) &nbsp;⟶&nbsp; 
            4. <strong>TTE Final Bupati</strong> (Dokumen sah &amp; kontrak aktif otomatis).
          </p>
        </div>
      </div>
    </div>

    <!-- Tabel Data Pejabat -->
    {#if loading}
      <div class="bg-white rounded-2xl p-12 border border-slate-200 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        <p class="text-slate-500 text-sm mt-3 font-medium">Memuat konfigurasi pejabat...</p>
      </div>
    {:else if errorMsg}
      <div class="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-6 text-center">
        <p class="font-medium">{errorMsg}</p>
        <button on:click={loadData} class="mt-3 text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700">Coba Lagi</button>
      </div>
    {:else}
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th class="py-4 px-6 text-center w-16">Urutan</th>
                <th class="py-4 px-6">Jabatan TTE</th>
                <th class="py-4 px-6">Nama & Identitas</th>
                <th class="py-4 px-6">Jenis TTE</th>
                <th class="py-4 px-6">Akun Pengguna</th>
                <th class="py-4 px-6 text-center">Status</th>
                <th class="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              {#if listPejabat.length === 0}
                <tr>
                  <td colspan="7" class="py-8 text-center text-slate-400">
                    Belum ada pejabat penandatangan yang dikonfigurasi.
                  </td>
                </tr>
              {:else}
                {#each listPejabat as p}
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-4 px-6 text-center font-bold text-slate-700">
                      <span class="w-8 h-8 rounded-full bg-slate-100 inline-flex items-center justify-center">
                        {p.urutan}
                      </span>
                    </td>
                    <td class="py-4 px-6">
                      <span class="font-bold text-slate-800">{p.jabatan}</span>
                    </td>
                    <td class="py-4 px-6">
                      <p class="font-semibold text-slate-800">{p.nama}</p>
                      <p class="text-xs text-slate-500">NIP: {p.nip || '-'}</p>
                      <p class="text-xs text-slate-400">NIK: {p.nik}</p>
                    </td>
                    <td class="py-4 px-6">
                      <span class="px-2.5 py-1 text-xs font-bold rounded-lg border {p.jenis === 'TTE' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200'}">
                        {p.jenis}
                      </span>
                    </td>
                    <td class="py-4 px-6">
                      <p class="font-medium text-slate-700">{p.user?.username || '-'}</p>
                      <p class="text-xs text-slate-400">{p.user?.email || '-'}</p>
                    </td>
                    <td class="py-4 px-6 text-center">
                      <span class="px-2.5 py-1 text-xs font-semibold rounded-full {p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                        {p.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td class="py-4 px-6 text-right space-x-2">
                      <button
                        on:click={() => openEditModal(p)}
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        on:click={() => handleDelete(p.id, p.nama)}
                        class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Modal Form Pejabat -->
{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
    <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <h3 class="text-lg font-bold text-slate-800">
          {isEditing ? 'Edit Pejabat Penandatangan' : 'Tambah Pejabat Penandatangan'}
        </h3>
        <button on:click={closeModal} class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="py-5 space-y-4">
        {#if formError}
          <div class="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {formError}
          </div>
        {/if}

        <div>
          <label for="akun-user-select" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tautkan ke Akun Pengguna *
          </label>
          <select
            id="akun-user-select"
            bind:value={formData.userId}
            on:change={onUserSelect}
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Pilih Akun Pengguna --</option>
            {#each listUsers as u}
              <option value={u.id}>{u.namaLengkap || u.username} ({u.role}) - {u.email}</option>
            {/each}
          </select>
          {#if listUsers.length === 0}
            <p class="mt-1.5 text-xs text-amber-700">
              Belum ada akun ber-role <strong>pejabat_ttd</strong>. Buat atau tambahkan role tersebut di menu
              <a href="/manajemen-user" class="underline font-semibold">Manajemen User</a> terlebih dahulu.
            </p>
          {/if}
        </div>

        <div>
          <label for="jabatan-select" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Jabatan TTE *
          </label>
          <select
            id="jabatan-select"
            bind:value={formData.jabatan}
            on:change={onJabatanChange}
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {#each jabatanOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="nama-pejabat-input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Nama Lengkap Pejabat *
          </label>
          <input
            id="nama-pejabat-input"
            type="text"
            bind:value={formData.nama}
            placeholder="Contoh: Dr. H. Ahmad Fauzi, M.Si"
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="nip-pejabat-input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              NIP (Opsional)
            </label>
            <input
              id="nip-pejabat-input"
              type="text"
              bind:value={formData.nip}
              placeholder="198001012005011001"
              class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label for="nik-pejabat-input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              NIK (16 Digit) *
            </label>
            <input
              id="nik-pejabat-input"
              type="text"
              bind:value={formData.nik}
              maxlength="16"
              placeholder="16 Digit NIK KTP"
              class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="jenis-tte-select" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Jenis TTE *
            </label>
            <select
              id="jenis-tte-select"
              bind:value={formData.jenis}
              class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PARAF">PARAF (Tahap Awal)</option>
              <option value="TTE">TTE (Tanda Tangan Final)</option>
            </select>
          </div>
          <div>
            <label for="urutan-input" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Urutan Alur (1-4) *
            </label>
            <input
              id="urutan-input"
              type="number"
              min="1"
              max="5"
              bind:value={formData.urutan}
              class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isActiveCheck"
            bind:checked={formData.isActive}
            class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label for="isActiveCheck" class="text-sm font-semibold text-slate-700">
            Aktifkan Pejabat Ini
          </label>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          on:click={closeModal}
          disabled={formSubmitting}
          class="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
        >
          Batal
        </button>
        <button
          type="button"
          on:click={handleSubmit}
          disabled={formSubmitting}
          class="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
        >
          {#if formSubmitting}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Menyimpan...
          {:else}
            Simpan Pejabat
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
