<script lang="ts">
  // A small mark: an outer shell frame cradling an inner napplet tile — the
  // whole protocol idea in one glyph.
  let { size = 28 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="np-logo" x1="0" y1="0" x2="32" y2="32">
      <stop offset="0" stop-color="#c98bff" />
      <stop offset="1" stop-color="#7b2ff7" />
    </linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="url(#np-logo)" stroke-width="2" />
  <rect x="8" y="8" width="16" height="16" rx="4" fill="url(#np-logo)" opacity="0.9" />
  <circle cx="16" cy="16" r="3" fill="#120820" />
</svg>
