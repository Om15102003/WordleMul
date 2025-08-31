<script lang="ts">
  import { socketService } from "../socketService";
  import { activePlayerId } from "../store";

  let timeLeft = 0;
  let interval;

  socketService.on('turnChange', (data) => {
    activePlayerId.set(data.currentPlayerId);
    timeLeft = Math.ceil(data.duration / 1000);

    clearInterval(interval);
    interval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  });
</script>

<div class="timer-container">
  {#if $activePlayerId}
    {#if $activePlayerId === socketService.playerId}
      <h3 class="my-turn">Your Turn ({timeLeft}s)</h3>
    {:else}
      <h3 class="opponent-turn">Opponent's Turn ({timeLeft}s)</h3>
    {/if}
  {/if}
</div>

<style>
  .timer-container {
    text-align: center;
    margin-bottom: 1rem;
    height: 30px; /* Reserve space to prevent layout shift */
  }
  h3 {
    margin: 0;
    padding: 5px;
    border-radius: 5px;
  }
  .my-turn {
    color: #538d4e; /* Green */
  }
  .opponent-turn {
    color: #b59f3b; /* Yellow */
  }
</style>