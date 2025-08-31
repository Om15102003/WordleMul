<script lang="ts">
  import { onMount } from 'svelte';
  import { gameState, gameOverDetails , roomId, wordToGuess, opponentGuesses, winnerId } from './store';
  import { socketService } from './socketService';
  import { activePlayerId } from './store'; // Add this import
  
  // Import from YOUR existing utils.ts file
  import { words, LetterStates, evaluateGuess } from './utils';
  import type { LetterState } from './types'; // Assuming you have a types.ts, or define it here
  
  // Import Components
  import Lobby from './components/Lobby.svelte';
  import WordInput from './components/WordInput.svelte';
  import Board from './components/board/Board.svelte';
  import Keyboard from './components/keyboard/Keyboard.svelte';
  import Timer from './components/Timer.svelte'; // Add this import


  // --- Local Game State ---
  let currentGuess: string = '';
  let boardWords: string[] = Array(6).fill("");
  let boardStates: LetterState[][] = Array.from({ length: 6 }, () => Array(5).fill("🔳"));
  let currentRow = 0;
  let letterStates = new LetterStates();

  // --- Opponent State ---
  // We'll structure the opponent's board similarly for consistency
  let opponentBoardStates: LetterState[][] = [];
  $: opponentBoardStates = $opponentGuesses.map(guess => guess.states);
  let finalChanceMessage = '';


  // --- Socket Event Listeners ---
  socketService.on('opponentWordReady', (data) => wordToGuess.set(data.wordToGuess.toLowerCase()));
  
  socketService.on('opponentGuessed', (data) => {
    // data.guesses from the server will be an array of {word: string, states: LetterState[]}
    opponentGuesses.set(data.guesses);
  });
  
  socketService.on('turnChange', (data) => {
    activePlayerId.set(data.currentPlayerId);
  });

  socketService.on('gameOver', (data) => {
    winnerId.set(data.winnerId);
    gameOverDetails.set(data); // Store all the details
    gameState.set('gameOver');
  });

  socketService.on('finalChance', (data) => {
    if (data.challengerId === socketService.playerId) {
      finalChanceMessage = "Opponent finished! This is your final chance to tie!";
    } else {
      finalChanceMessage = "You finished! Waiting for opponent's final guess...";
    }
    // Clear the message after a short delay
    setTimeout(() => finalChanceMessage = '', 8000);
  });
  
  socketService.on('opponentLeft', () => {
    alert('Your opponent has disconnected.');
    window.location.reload();
  });

socketService.on('guessProcessed', (data) => {
    const { guesserId, guesses } = data; // `guesses` is an array of {word, states}

    if (guesserId === socketService.playerId) {
      // It's me! Update MY board.
      const newWords = Array(6).fill("");
      const newStates = Array.from({ length: 6 }, () => Array(5).fill("🔳"));
      
      guesses.forEach((g, i) => {
          newWords[i] = g.word;
          newStates[i] = g.states;
      });
      
      boardWords = newWords;
      boardStates = newStates;
      currentRow = guesses.length;
      currentGuess = ""; // Clear the input row

      // Update keyboard state from the most recent guess
      const lastGuess = guesses[guesses.length - 1];
      if (lastGuess) {
        letterStates.update(lastGuess.states, lastGuess.word);
        letterStates = letterStates; // Trigger Svelte reactivity
      }

    } else {
      // It's the opponent. Update THEIR board data.
      opponentGuesses.set(guesses);
    }
  });

  // --- Game Logic ---
  function handleKeyPress(event: CustomEvent<string>) {
    const key = event.detail;

    if (key === 'enter') {
      submitGuess();
    } else if (key === 'backspace') {
      currentGuess = currentGuess.slice(0, -1);
      boardWords[currentRow] = currentGuess;
    } else if (currentGuess.length < 5 && /^[a-zA-Z]$/.test(key)) {
      currentGuess += key.toLowerCase();
      boardWords[currentRow] = currentGuess;
    }
  }

  function submitGuess() {
    if (currentGuess.length !== 5) {
      alert('Not enough letters');
      return;
    }
    if (!words.contains(currentGuess)) {
      alert('Not in word list');
      return;
    }

    // The ONLY job of this function now is to send the word to the server.
    // No more local state updates here!
    socketService.makeGuess($roomId, currentGuess);
  }

  // Allow keyboard input from the physical keyboard
  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ($gameState !== 'playing') return;
      
      const key = event.key.toLowerCase();
      if (key === 'enter') handleKeyPress({ detail: 'enter' } as CustomEvent<string>);
      else if (key === 'backspace') handleKeyPress({ detail: 'backspace' } as CustomEvent<string>);
      else if (key.length === 1 && key >= 'a' && key <= 'z') handleKeyPress({ detail: key } as CustomEvent<string>);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const formatTime = (ms) => (ms / 1000).toFixed(2);

</script>

<main>
  {#if $gameState === 'lobby'}
    <Lobby />
  {:else if $gameState === 'settingWord'}
    <WordInput />
  {:else if $gameState === 'playing'}
    <div class="game-container">
      <div class="player-area">
        <Timer />
        {#if finalChanceMessage}
          <div class="status-message">{finalChanceMessage}</div>
        {:else}
          <div style="height: 24px;"></div> {/if}
        <h2>Your Board</h2>
        <Board words={boardWords} states={boardStates} />
        <Keyboard 
          on:key={handleKeyPress} 
          {letterStates}
          disabled={$activePlayerId !== socketService.playerId}
        />
      </div>
      <div class="opponent-area">
        <div style="height: 54px;"></div> <h2>Opponent's Progress</h2>
        <Board states={opponentBoardStates} />
      </div>
    </div>

  {:else if $gameState === 'gameOver'}
    <div class="game-over">
      <h1>Game Over!</h1>
      {#if $winnerId === socketService.playerId}
        <h2>🎉 You Won! 🎉</h2>
      {:else}
        <h2>You Lost.</h2>
      {/if}

      {#if $gameOverDetails?.reason === 'tiebreaker'}
        <div class="tiebreaker-details">
          <p><strong>Won by Tie-Breaker!</strong></p>
          <p>
            Your Time: 
            <strong>{formatTime($gameOverDetails.details.times[socketService.playerId])}s</strong>
          </p>
          <p>
            Opponent's Time: 
            <strong>{formatTime($gameOverDetails.details.times[Object.keys($gameOverDetails.details.times).find(id => id !== socketService.playerId)])}s</strong>
          </p>
        </div>
      {/if}

      <button on:click={() => window.location.reload()}>Play Again</button>
    </div>
  {/if}
  
</main>

<style>
  /* Your existing App.svelte styles */
  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    padding: 20px;
  }
  @media (min-width: 1024px) {
    .game-container {
      flex-direction: row;
      align-items: flex-start;
      justify-content: center;
    }
  }
  .status-message {
    text-align: center;
    color: #c9b458;
    font-weight: bold;
    height: 24px;
    margin-bottom: 10px;
  }
  .game-over {
    text-align: center;
    margin-top: 50px;
  }
  .tiebreaker-details {
    border: 1px solid #555;
    border-radius: 8px;
    padding: 10px 20px;
    margin: 20px auto;
    max-width: 300px;
  }
  .tiebreaker-details p {
    margin: 5px 0;
  }
</style>