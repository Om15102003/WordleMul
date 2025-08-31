const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const gameRooms = {}; // Stores all active game rooms
const TURN_DURATION = 30000; // 30 seconds in milliseconds

// --- Turn Management Function ---
function startTurn(roomId) {
  const room = gameRooms[roomId];
  if (!room) return;

  // Clear any previous timer
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
  }

  // Notify clients about the turn change
  io.to(roomId).emit('turnChange', { 
    currentPlayerId: room.currentPlayerId,
    duration: TURN_DURATION 
  });

  // Set a timer for the current turn
  room.turnTimer = setTimeout(() => {
    handleTimeout(roomId);
  }, TURN_DURATION);
}

function handleTimeout(roomId) {
    const room = gameRooms[roomId];
    if (!room) return;

    const timedOutPlayerId = room.currentPlayerId;
    console.log(`Player ${timedOutPlayerId} in room ${roomId} timed out.`);

    // --- Create the automatic "xxxxx" guess ---
    // We need to know the target word for the player who timed out
    const opponent = room.players.find(p => p.id !== timedOutPlayerId);
    const targetWord = opponent ? opponent.word : '?????'; // Fallback
    const autoGuessWord = 'xxxxx';

    // Simulate the checkGuess logic to build the states array
    const states = Array(5).fill('⬛');
    for (let i = 0; i < autoGuessWord.length; i++) {
        if (targetWord.includes(autoGuessWord[i])) {
            states[i] = '🟨';
        }
        if (autoGuessWord[i] === targetWord[i]) {
            states[i] = '🟩';
        }
    }
    const autoGuess = { word: autoGuessWord, states };
    
    // Process this guess as if the player sent it
    processGuess(roomId, timedOutPlayerId, autoGuess);
}

function processGuess(roomId, playerId, guess) {
    const room = gameRooms[roomId];
    if (!room || room.gameState !== 'playing') return;

    const player = room.players.find(p => p.id === playerId);
    const opponent = room.players.find(p => p.id !== playerId);
    
    if (player && opponent) {
      player.guesses.push(guess);

      if (guess.states.every(state => state === '🟩')) {
        io.to(roomId).emit('gameOver', { winnerId: playerId });
        clearTimeout(room.turnTimer);
        delete gameRooms[roomId];
      } else {
        io.to(opponent.id).emit('opponentGuessed', { guesses: player.guesses });
        
        // Switch turns and start the next timer
        room.currentPlayerId = opponent.id;
        startTurn(roomId);
      }
    }
}

io.on('connection', (socket) => {
  // ... (createRoom and joinRoom listeners are unchanged)
  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).substring(2, 7);
    socket.join(roomId);
    gameRooms[roomId] = {
      players: [{ id: socket.id, word: null, guesses: [] }],
      gameState: 'waiting',
      currentPlayerId: null,
      turnTimer: null,
    };
    socket.emit('roomCreated', { roomId, playerId: socket.id });
  });

  socket.on('joinRoom', (roomId) => {
    if (gameRooms[roomId] && gameRooms[roomId].players.length < 2) {
      socket.join(roomId);
      gameRooms[roomId].players.push({ id: socket.id, word: null, guesses: [] });
      io.to(roomId).emit('gameStart', { 
        roomId,
        players: gameRooms[roomId].players.map(p => p.id)
      });
      gameRooms[roomId].gameState = 'settingWords';
    } else {
      socket.emit('error', { message: 'Room is full or does not exist.' });
    }
  });

  socket.on('setWord', ({ roomId, word }) => {
    const room = gameRooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.word = word.toUpperCase();
    }
    
    const opponent = room.players.find(p => p.id !== socket.id);
    if (opponent && opponent.word) {
      // Both words are set, start the game
      io.to(room.players[0].id).emit('opponentWordReady', { wordToGuess: room.players[1].word });
      io.to(room.players[1].id).emit('opponentWordReady', { wordToGuess: room.players[0].word });
      room.gameState = 'playing';

      // Randomly select the first player and start their turn
      room.currentPlayerId = room.players[Math.floor(Math.random() * 2)].id;
      startTurn(roomId);
    }
  });

  socket.on('makeGuess', ({ roomId, guess }) => {
    // Basic validation: Is it the player's turn?
    const room = gameRooms[roomId];
    if (room && socket.id === room.currentPlayerId) {
        processGuess(roomId, socket.id, guess);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in gameRooms) {
      const room = gameRooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        clearTimeout(room.turnTimer); // Stop the timer
        io.to(roomId).emit('opponentLeft');
        delete gameRooms[roomId];
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));