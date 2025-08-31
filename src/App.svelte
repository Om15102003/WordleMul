<script lang="ts">
  import { onMount } from 'svelte';
  import { gameState, roomId, wordToGuess, opponentGuesses, winnerId } from './store';
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
    gameState.set('gameOver');
  });
  
  socketService.on('opponentLeft', () => {
    alert('Your opponent has disconnected.');
    window.location.reload();
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
    // Use your existing word list for validation!
    if (!words.contains(currentGuess)) {
      alert('Not in word list');
      return;
    }

    // Use our new utility function for evaluation
    const resultStates = evaluateGuess(currentGuess, $wordToGuess);
    boardStates[currentRow] = resultStates;
    
    // Update keyboard colors using your LetterStates class
    letterStates.update(resultStates, currentGuess);
    letterStates = letterStates; // Force Svelte to recognize the update

    // Send the complete guess data to the server
    const guessData = { word: currentGuess, states: resultStates };
    socketService.makeGuess($roomId, guessData);
    
    // Move to the next row
    currentRow++;
    currentGuess = '';
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

</script>

<main>
  {#if $gameState === 'lobby'}
    <Lobby />
  {:else if $gameState === 'settingWord'}
    <WordInput />
  {:else if $gameState === 'playing'}
    <div class="game-container">
      <div class="player-area">
        <Timer /> <h2>Your Board</h2>
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
      <h2>{$winnerId === socketService.playerId ? '🎉 You Won! 🎉' : 'You Lost.'}</h2>
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
</style>