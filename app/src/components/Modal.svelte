<script lang="ts">
  import { stopAudio } from "../lib/audio";
  import { closeModal, ui } from "../lib/ui.svelte";
  function close() { stopAudio(); closeModal(); }
</script>

<svelte:window onkeydown={e => { if (e.key === "Escape" && ui.modal) close(); }} />
{#if ui.modal}
  {@const C = ui.modal.comp}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal-bg" id="modal" onclick={e => { if (e.target === e.currentTarget) close(); }}>
    <div class="modal" id="modalBox">
      <button class="iconbtn x" onclick={close} aria-label="Đóng">✕</button>
      <C {...ui.modal.props} />
    </div>
  </div>
{/if}
