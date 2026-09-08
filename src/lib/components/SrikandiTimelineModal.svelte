<script>
  import { createEventDispatcher } from 'svelte';
  import { apiRequest } from '$lib/api.js';

  export let show = false;
  export let usulanId = null;
  export let usulanData = null;
  export let canEdit = true;

  const dispatch = createEventDispatcher();

  let timeline = [];
  let currentStatusSrikandi = "";
  let isLoading = false;
  let isSubmitting = false;
  let selectedStatus = "VERIFIKASI_KABAN";
  let catatan = "";
  let errorMessage = "";
  let successMessage = "";

  const SRIKANDI_STEPS = [
    { key: "VERIFIKASI_KABAN", label: "Verifikasi Kaban", icon: "ri-user-star-line", step: 1, desc: "Pemeriksaan berkas oleh Kepala Badan" },
    { key: "VERIFIKASI_SEKDA", label: "Verifikasi Sekda", icon: "ri-shield-user-line", step: 2, desc: "Verifikasi oleh Sekretaris Daerah" },
    { key: "TTE_PPPK", label: "TTE PPPK", icon: "ri-quill-pen-line", step: 3, desc: "Tanda Tangan Elektronik oleh PPPK" },
    { key: "TTE_BUPATI", label: "TTE Bupati", icon: "ri-government-line", step: 4, desc: "Tanda Tangan Elektronik oleh Bupati" }
  ];

  const STATUS_CONFIG = {
    VERIFIKASI_KABAN: { label: "Verifikasi Kaban", color: "bg-blue-50 text-blue-700 border-blue-200", badgeColor: "bg-blue-600 text-white" },
    VERIFIKASI_SEKDA: { label: "Verifikasi Sekda", color: "bg-indigo-50 text-indigo-700 border-indigo-200", badgeColor: "bg-indigo-600 text-white" },
    TTE_PPPK: { label: "TTE PPPK", color: "bg-purple-50 text-purple-700 border-purple-200", badgeColor: "bg-purple-600 text-white" },
    TTE_BUPATI: { label: "TTE Bupati", color: "bg-emerald-50 text-emerald-700 border-emerald-200", badgeColor: "bg-emerald-600 text-white" },
    TOLAK_TIDAK_DITERUSKAN: { label: "Tolak (tidak diteruskan)", color: "bg-red-50 text-red-700 border-red-200", badgeColor: "bg-red-600 text-white" },
    TOLAK_KONSEPTOR: { label: "Tolak (diteruskan ke konseptor)", color: "bg-amber-50 text-amber-700 border-amber-200", badgeColor: "bg-amber-600 text-white" }
  };

  $: if (show && usulanId) {
    loadTimeline();
  }

  function getStepIndex(status) {
    if (!status) return 0;
    const idx = SRIKANDI_STEPS.findIndex(s => s.key === status);
    return idx !== -1 ? idx : -1;
  }

  async function loadTimeline() {
    if (!usulanId) return;
    isLoading = true;
    errorMessage = "";
    try {
      const res = await apiRequest(`/api/v1/perpanjangan/usulan/${usulanId}/srikandi-timeline`, 'GET');
      if (res && res.data) {
        timeline = res.data.timeline || [];
        currentStatusSrikandi = res.data.usulan?.statusSrikandi || usulanData?.statusSrikandi || "VERIFIKASI_KABAN";
        selectedStatus = currentStatusSrikandi || "VERIFIKASI_KABAN";
      }
    } catch (err) {
      errorMessage = err.message || "Gagal memuat riwayat linimasa Srikandi";
    } finally {
      isLoading = false;
    }
  }

  async function handleUpdateStatus() {
    if (!selectedStatus) {
      errorMessage = "Pilih status Srikandi terlebih dahulu";
      return;
    }

    isSubmitting = true;
    errorMessage = "";
    successMessage = "";

    try {
      const res = await apiRequest(`/api/v1/perpanjangan/usulan/${usulanId}/srikandi-status`, 'POST', {
        status: selectedStatus,
        keterangan: catatan.trim() || undefined
      });

      if (res && res.success) {
        successMessage = "Status Srikandi berhasil diperbarui!";
        catatan = "";
        currentStatusSrikandi = selectedStatus;
        await loadTimeline();
        dispatch('statusUpdated', {
          usulanId,
          statusSrikandi: selectedStatus
        });
        setTimeout(() => {
          successMessage = "";
        }, 3000);
      }
    } catch (err) {
      errorMessage = err.message || "Gagal memperbarui status Srikandi";
    } finally {
      isSubmitting = false;
    }
  }

  function handleClose() {
    show = false;
    errorMessage = "";
    successMessage = "";
    catatan = "";
    dispatch('close');
  }

  function formatDateTime(isoString) {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (e) {
      return isoString;
    }
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
      <!-- Backdrop -->
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <button
        type="button"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity w-full h-full border-none cursor-default"
        on:click={handleClose}
        aria-label="Tutup"
      ></button>

      <!-- Modal Panel -->
      <div class="relative bg-white rounded-2xl text-left shadow-2xl overflow-hidden transform transition-all sm:my-8 sm:max-w-2xl sm:w-full border border-slate-100 flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-xl text-purple-200">
              <i class="ri-route-line"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold tracking-tight">Linimasa Status Srikandi</h3>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/30 border border-purple-300/30 text-purple-100">
                  Tracking
                </span>
              </div>
              <p class="text-xs text-purple-200/80 mt-0.5">
                Pelacakan tahapan verifikasi dan tanda tangan berkas di aplikasi Srikandi
              </p>
            </div>
          </div>
          <button
            on:click={handleClose}
            class="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            aria-label="Tutup Modal"
          >
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>

        <!-- Info Bar Pegawai -->
        {#if usulanData}
          <div class="bg-slate-50 border-b border-slate-200/70 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                {(usulanData.namaPegawai || usulanData.dataP3k?.nama || "P").charAt(0)}
              </div>
              <div>
                <p class="font-bold text-slate-800 text-sm leading-tight">
                  {usulanData.namaPegawai || usulanData.dataP3k?.nama || "-"}
                </p>
                <p class="text-slate-500 font-mono text-[11px]">
                  NIP: {usulanData.nipBaru || usulanData.dataP3k?.nipBaru || "-"}
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[10px]">No. Kontrak:</span>
              <span class="font-semibold text-slate-700">
                {usulanData.nomorKontrak || "-"}
              </span>
            </div>
          </div>
        {/if}

        <!-- Scrollable Content -->
        <div class="px-6 py-5 overflow-y-auto space-y-6">
          
          {#if errorMessage}
            <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <i class="ri-error-warning-line text-base shrink-0"></i>
              <span>{errorMessage}</span>
            </div>
          {/if}

          {#if successMessage}
            <div class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <i class="ri-checkbox-circle-line text-base shrink-0"></i>
              <span>{successMessage}</span>
            </div>
          {/if}

          <!-- Visual Stepper Linimasa -->
          <div class="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <i class="ri-map-pin-time-line text-purple-600"></i>
                Tahapan Utama Srikandi
              </h4>
              {#if currentStatusSrikandi}
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full border {STATUS_CONFIG[currentStatusSrikandi]?.color || 'bg-slate-100 text-slate-700 border-slate-200'}">
                  Status Saat Ini: {STATUS_CONFIG[currentStatusSrikandi]?.label || currentStatusSrikandi}
                </span>
              {/if}
            </div>

            <!-- Status Penolakan Banner (Jika statusnya Tolak) -->
            {#if currentStatusSrikandi === "TOLAK_TIDAK_DITERUSKAN" || currentStatusSrikandi === "TOLAK_KONSEPTOR"}
              <div class="mb-4 p-3 rounded-xl border flex items-start gap-3 {currentStatusSrikandi === 'TOLAK_TIDAK_DITERUSKAN' ? 'bg-red-50/80 border-red-200 text-red-800' : 'bg-amber-50/80 border-amber-200 text-amber-800'}">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 {currentStatusSrikandi === 'TOLAK_TIDAK_DITERUSKAN' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}">
                  <i class="ri-close-circle-line text-lg"></i>
                </div>
                <div>
                  <h5 class="text-xs font-bold leading-snug">
                    {currentStatusSrikandi === 'TOLAK_TIDAK_DITERUSKAN' ? 'Berkas Ditolak (Tidak Diteruskan)' : 'Berkas Ditolak (Diteruskan ke Konseptor)'}
                  </h5>
                  <p class="text-[11px] mt-0.5 opacity-90">
                    {currentStatusSrikandi === 'TOLAK_TIDAK_DITERUSKAN' ? 'Proses di Srikandi dihentikan/tidak dilanjutkan.' : 'Terdapat catatan perbaikan berkas yang harus disesuaikan oleh konseptor.'}
                  </p>
                </div>
              </div>
            {/if}

            <!-- 4 Step Stepper UI -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {#each SRIKANDI_STEPS as step, idx}
                {@const currentIdx = getStepIndex(currentStatusSrikandi)}
                {@const isCurrent = currentStatusSrikandi === step.key}
                {@const isPassed = currentIdx > idx && currentIdx !== -1}
                {@const isRejected = currentStatusSrikandi === "TOLAK_TIDAK_DITERUSKAN" || currentStatusSrikandi === "TOLAK_KONSEPTOR"}

                <div class="relative flex flex-col items-center text-center p-3 rounded-xl border transition-all {isCurrent ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-500/20 shadow-sm' : isPassed ? 'bg-emerald-50/60 border-emerald-200 text-slate-700' : 'bg-slate-50/70 border-slate-200 text-slate-400'}">
                  
                  <!-- Step Icon / Indicator -->
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-transform duration-200 {isCurrent ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-105 ring-4 ring-purple-100' : isPassed ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}">
                    {#if isPassed}
                      <i class="ri-check-line text-base font-bold"></i>
                    {:else}
                      <i class={step.icon}></i>
                    {/if}
                  </div>

                  <span class="text-xs font-bold leading-tight {isCurrent ? 'text-purple-900' : isPassed ? 'text-slate-800' : 'text-slate-500'}">
                    {step.label}
                  </span>
                  <span class="text-[10px] mt-1 text-slate-500 hidden sm:block">
                    Tahap {step.step}
                  </span>

                  {#if isCurrent}
                    <span class="inline-block w-2 h-2 rounded-full bg-purple-500 animate-ping absolute top-2 right-2"></span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>

          <!-- Form Update Status (Bagi yang Berwenang) -->
          {#if canEdit}
            <div class="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl p-4 border border-purple-100">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <i class="ri-edit-line text-purple-600"></i>
                Perbarui Tahapan Status Srikandi
              </h4>

              <div class="space-y-3">
                <div>
                  <label for="srikandi-status-select" class="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Status Srikandi:
                  </label>
                  <select
                    id="srikandi-status-select"
                    bind:value={selectedStatus}
                    class="w-full text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  >
                    <optgroup label="Tahapan Reguler (Verifikasi & TTE)">
                      <option value="VERIFIKASI_KABAN">1. Verifikasi Kaban</option>
                      <option value="VERIFIKASI_SEKDA">2. Verifikasi Sekda</option>
                      <option value="TTE_PPPK">3. TTE PPPK</option>
                      <option value="TTE_BUPATI">4. TTE Bupati</option>
                    </optgroup>
                    <optgroup label="Penolakan / Revisi">
                      <option value="TOLAK_KONSEPTOR">Tolak (diteruskan ke konseptor)</option>
                      <option value="TOLAK_TIDAK_DITERUSKAN">Tolak (tidak di teruskan)</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label for="srikandi-catatan" class="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan / Alasan / No. Agenda Srikandi (Opsional):
                  </label>
                  <textarea
                    id="srikandi-catatan"
                    bind:value={catatan}
                    rows="2"
                    placeholder="Contoh: Menunggu paraf dari Sekda, atau catatan revisi template..."
                    class="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                  ></textarea>
                </div>

                <div class="flex justify-end pt-1">
                  <button
                    type="button"
                    on:click={handleUpdateStatus}
                    disabled={isSubmitting}
                    class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-purple-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {#if isSubmitting}
                      <svg class="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    {:else}
                      <i class="ri-save-line text-sm"></i>
                      Simpan Perubahan Status
                    {/if}
                  </button>
                </div>
              </div>
            </div>
          {/if}

          <!-- Riwayat Log Linimasa (Activity Feed) -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <i class="ri-history-line text-purple-600"></i>
                Riwayat Linimasa ({timeline.length})
              </span>
              <button
                type="button"
                on:click={loadTimeline}
                class="text-[11px] font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 normal-case"
              >
                <i class="ri-refresh-line"></i> Refresh
              </button>
            </h4>

            {#if isLoading}
              <div class="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Memuat riwayat linimasa...</span>
              </div>
            {:else if timeline.length === 0}
              <div class="bg-slate-50 rounded-xl p-6 text-center border border-dashed border-slate-200">
                <i class="ri-time-line text-3xl text-slate-300 block mb-1"></i>
                <p class="text-xs font-medium text-slate-500">Belum ada riwayat perubahan status Srikandi.</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Status awal akan tercatat saat pertama kali diperbarui.</p>
              </div>
            {:else}
              <div class="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {#each timeline as item, idx}
                  {@const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-slate-50 text-slate-700 border-slate-200", badgeColor: "bg-slate-600 text-white" }}
                  
                  <div class="relative flex items-start gap-3 group">
                    <!-- Dot indicator -->
                    <div class="absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center {idx === 0 ? 'bg-purple-600 ring-2 ring-purple-100' : 'bg-slate-300'}">
                      <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>

                    <!-- Content Card -->
                    <div class="flex-1 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm hover:border-purple-200 transition-colors">
                      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border {cfg.color}">
                          {cfg.label}
                        </span>
                        <span class="text-[10px] font-medium text-slate-400 font-mono">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>

                      {#if item.keterangan}
                        <p class="text-xs text-slate-600 mt-1.5 bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                          {item.keterangan}
                        </p>
                      {/if}

                      <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span class="flex items-center gap-1">
                          <i class="ri-user-line"></i>
                          {item.createdBy?.namaLengkap || item.createdBy?.username || "Sistem"}
                        </span>
                        {#if idx === 0}
                          <span class="text-purple-600 font-bold font-mono">Terbaru</span>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

        </div>

        <!-- Footer -->
        <div class="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            on:click={handleClose}
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  </div>
{/if}
