<script lang="ts">
  import { ui } from "../lib/ui.svelte";
</script>
<div class="toast" class:show={ui.toast.show} id="toast">{ui.toast.msg}</div>
