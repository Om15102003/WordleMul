<script lang="ts">
  import { socketService } from '../socketService';
  import { gameState, roomId, errorMessage } from '../store';

  let joinRoomId = '';

  function handleCreateRoom() {
    socketService.createRoom();
  }

  function handleJoinRoom() {
    if (joinRoomId.trim()) {
      socketService.joinRoom(joinRoomId.trim());
    }
  }

  // When a room is created, the server sends back the ID
  socketService.on('roomCreated', (data) => {
    roomId.set(data.roomId);
  });

  // When game starts (2 players have joined)
  socketService.on('gameStart', (data) => {
    roomId.set(data.roomId);
    gameState.set('settingWord');
  });

  // Handle errors from the server
  socketService.on('error', (data) => {
    errorMessage.set(data.message);
    setTimeout(() => errorMessage.set(null), 3000); // Clear error after 3s
  });
</script>

<div class="lobby-container">
  <h1>Multiplayer Wordle</h1>
  
  {#if $roomId && $gameState === 'lobby'}
    <div class="room-info">
      <p>Room created! Share this code with a friend:</p>
      <strong class="room-code">{$roomId}</strong>
      <p>Waiting for an opponent to join...</p>
    </div>
  {:else if !$roomId}
    <div class="actions">
      <button on:click={handleCreateRoom}>Create Game</button>
      <div class="join-game">
        <input type="text" bind:value={joinRoomId} placeholder="Enter room code" />
        <button on:click={handleJoinRoom}>Join Game</button>
      </div>
    </div>
  {/if}

  {#if $errorMessage}
    <p class="error">{$errorMessage}</p>
  {/if}
</div>

<style>
  .lobby-container { text-align: center; max-width: 400px; margin: 50px auto; }
  .actions { display: flex; flex-direction: column; gap: 20px; }
  .join-game { display: flex; gap: 10px; }
  input { flex: 1; padding: 10px; }
  button { padding: 10px 15px; cursor: pointer; }
  .room-info { margin-top: 20px; }
  .room-code { font-size: 1.5rem; background: #eee; padding: 5px 10px; border-radius: 5px; }
  .error { color: red; margin-top: 15px; }
</style>