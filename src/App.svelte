<script lang="ts">
  import { onMount } from 'svelte';

  import { gameState, gameOverDetails , roomId, wordToGuess, opponentGuesses, winnerId,mySecretWord } from './store';
  import { socketService } from './socketService';
  import { activePlayerId } from './store'; // Add this import
  
  // Import from YOUR existing utils.ts file
  import { words, LetterStates, evaluateGuess } from './utils';
  import type { LetterState } from './types'; // Assuming you have a types.ts, or define it here
  
  // Import Components
  import GameOverModal from './components/GameOverModal.svelte';

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
  $: opponentBoardWords = $opponentGuesses.map(g => g.word);
  $: opponentBoardStates = $opponentGuesses.map(g => g.states);
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
 <GameOverModal 
    isOpen={$gameState === 'gameOver'}
    winnerId={$winnerId}
    gameOverDetails={$gameOverDetails}
  />
  {#if $gameState === 'lobby'}
    <Lobby />
  {:else if $gameState === 'settingWord'}
    <WordInput />
  {:else if $gameState === 'playing' || $gameState=='gameOver'}
    <div class="game-view-container">
      <div class="main-game-area">
        <header>
          <h1>Wordle</h1>
        </header>
        
        {#if $gameState === 'playing'}
          <div class="game-status">
            <Timer />
            {#if finalChanceMessage}
              <div class="status-message">{finalChanceMessage}</div>
            {/if}
          </div>
        {/if}

        
        
        <div class="board-wrapper">
            <Board words={boardWords} states={boardStates} />
        </div>
        
        <div class="keyboard-wrapper">
          <Keyboard 
            on:key={handleKeyPress} 
            {letterStates}
            disabled={$activePlayerId !== socketService.playerId || $gameState === 'gameOver'}
          />
        </div>
      </div>

     <div class="opponent-sidebar">
  <h3>OPPONENT'S BOARD</h3>
  <div class="secret-word">
    {#each $mySecretWord.toUpperCase().padEnd(5).split('') as char}
      <div class="secret-word-tile">{char}</div>
    {/each}
  </div>
  <div class="opponent-board-wrapper">
    <Board words={opponentBoardWords} states={opponentBoardStates} />
  </div>
</div>

    </div>
  {/if}
</main>

<style>
  :global(body) {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    background-color: #121213;
    color: #fff;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  main {
    width: 100%;
    height: 100vh;
  }

  .game-view-container {
    display: flex;
    justify-content: center;
    gap: 40px;
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .main-game-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 500px;
  }

  header {
    width: 100%;
    text-align: center;
    border-bottom: 1px solid #3a3a3c;
    margin-bottom: 10px;
  }

  header h1 {
    margin: 0.2em 0;
    font-size: 2.2rem;
    letter-spacing: 0.1rem;
  }
  
  .game-status {
    height: 60px;
    margin-bottom: 10px;
  }

  .status-message {
    text-align: center;
    color: #c9b458;
    font-weight: bold;
  }

  .board-wrapper {
    margin-bottom: 20px;
  }

  .keyboard-wrapper {
    width: 100%;
  }

  .opponent-sidebar {
    padding: 10px 20px;
    border-left: 1px solid #3a3a3c;
    width: 320px;
    flex-shrink: 0; /* Prevents the sidebar from shrinking */
  }

  .opponent-sidebar h3 {
    text-align: center;
    margin-top: 0;
  }
  
  .secret-word {
    text-align: center;
    font-size: 0.9rem;
    color: #818384;
  }
  
  .secret-word strong {
    color: #fff;
    letter-spacing: 0.1rem;
  }

  .opponent-board-wrapper {
    /* Scale down the entire board component for a minimized look */
    transform: scale(0.8);
    transform-origin: top center;
  }

  /* Game Over Styling */
  .game-over-summary {
    text-align: center;
    margin: 20px 0;
  }
  
  .game-over-summary h2 {
    margin: 0;
  }

  .tiebreaker-details {
    border: 1px solid #3a3a3c;
    border-radius: 8px;
    padding: 10px 20px;
    margin: 15px auto;
    max-width: 300px;
    font-size: 0.9rem;
  }
  
  .play-again {
    padding: 10px 20px;
    font-size: 1rem;
    margin-top: 10px;
    background-color: #538d4e;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  /* Responsive Design for smaller screens */
  @media (max-width: 900px) {
    .game-view-container {
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .opponent-sidebar {
      width: 100%;
      max-width: 500px;
      border-left: none;
      border-top: 1px solid #3a3a3c;
      padding: 20px 10px;
    }
    .opponent-board-wrapper {
      transform: scale(1); /* Reset scale on small screens */
    }
  }

.opponent-sidebar {
    display: flex; /* Centers the content */
    flex-direction: column;
    align-items: center;
    padding: 0 20px;
    margin-left: 20px;
    border-left: 1px solid #3a3a3c;
    width: 280px;
    flex-shrink: 0;
  }

  .opponent-sidebar h3 {
    text-align: center;
    margin-top: 0;
    font-weight: normal;
    letter-spacing: 0.1em;
    font-size: 1rem;
    color: #818384;
  }
  
  .secret-word {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    margin-bottom: 8px;
    width: 250px; /* Set a fixed width to align with the board */
  }

  .secret-word-tile {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 40px; /* Reduced height */
    font-size: 1.5rem; /* Reduced font size */
    font-weight: bold;
    color: #fff;
    text-transform: uppercase;
    background-color: #538d4e;
    border: 2px solid #538d4e;
    box-sizing: border-box;
    border-radius: 2px;
  }


  .opponent-board-wrapper :global(.board) {
    width: 250px;
    height: 300px;
    gap: 4px;
  }

  .opponent-board-wrapper :global(.tile) {
    font-size: 1.5rem; /* Match the smaller font size */
  }

   
</style>