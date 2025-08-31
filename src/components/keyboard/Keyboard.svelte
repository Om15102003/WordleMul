<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { LetterStates } from '../utils';

  export let letterStates: LetterStates;
  export let disabled: boolean = false;
  const dispatch = createEventDispatcher();

  const keys1 = "qwertyuiop".split('');
  const keys2 = "asdfghjkl".split('');
  const keys3 = "zxcvbnm".split('');

  
  function handleClick(key: string) {
    if (disabled) return; // Prevent dispatching if disabled
    dispatch('key', key);
  }
</script>

<div class="keyboard">
  <div class="row">{#each keys1 as key}<button class={letterStates[key]} on:click={() => handleClick(key)}>{key}</button>{/each}</div>
  <div class="row">{#each keys2 as key}<button class={letterStates[key]} on:click={() => handleClick(key)}>{key}</button>{/each}</div>
  <div class="row">
    <button class="wide" on:click={() => handleClick('enter')}>Enter</button>
    {#each keys3 as key}<button class={letterStates[key]} on:click={() => handleClick(key)}>{key}</button>{/each}
    <button class="wide" on:click={() => handleClick('backspace')}>⌫</button>
  </div>
</div>

<style>
  /* Your keyboard styles */
  button {
    background-color: #818384; /* Default key color */
    color: white;
    padding: 16px 8px;
    font-weight: bold;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    flex: 1;
    text-transform: uppercase;
  }
  button.wide { flex: 1.5; }
  
  /* Use emojis for classes, just like the board */
  button.🟩 { background-color: #538d4e; }
  button.🟨 { background-color: #b59f3b; }
  button.⬛ { background-color: #3a3a3c; }
  .keyboard.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
</style>