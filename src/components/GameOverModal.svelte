<script lang="ts">
  import { socketService } from "../socketService";

  // Props to control the modal's content and visibility
  export let isOpen = false;
  export let winnerId = '';
  export let gameOverDetails: any = null;

  // Helper function to format time
  const formatTime = (ms) => (ms / 1000).toFixed(2);
</script>

{#if isOpen}
  <div class="modal-backdrop">
    <div class="modal-content">
      {#if winnerId === socketService.playerId}
        <h2>🎉 You Won! 🎉</h2>
      {:else}
        <h2>You Lost.</h2>
      {/if}

      {#if gameOverDetails?.reason === 'tiebreaker'}
        <div class="tiebreaker-details">
          <p>
            <strong>
              {#if winnerId === socketService.playerId}
                Won by Tie-Breaker!
              {:else}
                Lost by Tie-Breaker!
              {/if}
            </strong>
          </p>
          <p>
            Your Time: 
            <strong>{formatTime(gameOverDetails.details.times[socketService.playerId])}s</strong>
          </p>
          <p>
            Opponent's Time: 
            <strong>{formatTime(gameOverDetails.details.times[Object.keys(gameOverDetails.details.times).find(id => id !== socketService.playerId)])}s</strong>
          </p>
        </div>
      {/if}

      <button class="play-again" on:click={() => window.location.reload()}>Play Again</button>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    animation: fadeIn 0.3s ease;
  }

  .modal-content {
    background-color: #121213;
    border: 1px solid #3a3a3c;
    border-radius: 12px;
    padding: 25px 35px;
    text-align: center;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    animation: slideIn 0.3s ease-out;
  }

  h2 {
    margin-top: 0;
    font-size: 2rem;
  }

  .tiebreaker-details {
    background-color: #262627;
    border: 1px solid #3a3a3c;
    border-radius: 8px;
    padding: 10px 20px;
    margin: 20px auto;
    max-width: 300px;
    font-size: 0.9rem;
  }
  
  .tiebreaker-details p {
    margin: 8px 0;
  }

  .play-again {
    padding: 12px 25px;
    font-size: 1.1rem;
    font-weight: bold;
    margin-top: 15px;
    background-color: #538d4e;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .play-again:hover {
    background-color: #6aaa64;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: translateY(-30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>