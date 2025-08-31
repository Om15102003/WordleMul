<script lang="ts">
  import { socketService } from '../socketService';
  import { roomId, gameState } from '../store';
    import { words } from '../utils'; // <--- IMPORT YOUR WORDS UTILITY

  
  let word = '';
  let wordSubmitted = false;
  let validationError = '';


  function handleSubmit() {
    validationError = '';

    // Basic validation
    if (word.length !== 5 || !/^[a-zA-Z]+$/.test(word)) {
      alert('Please enter a valid 5-letter word.');
      return;
    }
    if (!words.contains(word.toLowerCase())) {
      validationError = 'Word not found in dictionary.';
      return;
    }
    socketService.setWord($roomId, word);
    wordSubmitted = true;
  }

  // Listen for when the opponent's word is ready so we can start the game
  socketService.on('opponentWordReady', (data) => {
    // The main App component will handle setting the wordToGuess store
    gameState.set('playing');
  });
</script>

<div class="word-input-container">
  {#if !wordSubmitted}
    <h2>Set the Word for Your Opponent</h2>
    <form on:submit|preventDefault={handleSubmit}>
      <input type="text" bind:value={word} maxlength="5" placeholder="Enter a 5-letter word" />
      <button type="submit">Set Word</button>
    </form>
    {#if validationError}
      <p class="error">{validationError}</p>
    {/if}
  {:else}
    <h2>Word set!</h2>
    <p>Waiting for your opponent to set their word...</p>
  {/if}
</div>

<style>
  .word-input-container { text-align: center; margin: 50px auto; }
  input { padding: 10px; font-size: 1.2rem; width: 200px; text-align: center; }
  button { padding: 10px 15px; margin-left: 10px; }

  .error {
    color: #e74c3c; /* A nice red color for errors */
    margin-top: 10px;
    font-weight: bold;
  }
</style>
