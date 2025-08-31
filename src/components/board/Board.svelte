<script lang="ts">
  import type { LetterState } from "../types"; // Or define locally

  export let words: string[] = Array(6).fill("");
  export let states: LetterState[][] = Array.from({ length: 6 }, () => Array(5).fill("🔳"));
</script>

<div class="board">
  {#each states as rowState, r}
    <div class="row">
      {#each rowState as tileState, c}
        <div class="tile {tileState}">{words[r][c] || ''}</div>
      {/each}
    </div>
  {/each}
</div>

<style>
  /* Your existing board styles */
  .board { display: grid; grid-template-rows: repeat(6, 1fr); gap: 5px; width: 330px; height: 400px; margin: 0 auto; }
  .row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
  .tile { width: 100%; height: 100%; display: inline-flex; justify-content: center; align-items: center; font-size: 2rem; font-weight: bold; text-transform: uppercase; border: 2px solid #3a3a3c; box-sizing: border-box; color: white; }
  
  /* Use your game's state emojis directly for styling */
  .tile.🟩 { background-color: #538d4e; border-color: #538d4e; }
  .tile.🟨 { background-color: #b59f3b; border-color: #b59f3b; }
  .tile.⬛ { background-color: #3a3a3c; border-color: #3a3a3c; }
  .tile.🔳 { background-color: transparent; border-color: #3a3a3c; } /* Default empty tile */
</style>