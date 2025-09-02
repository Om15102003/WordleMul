const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const wordList = require('./words_5.ts');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Serve static files from the built frontend
app.use(express.static(path.join(__dirname, '../dist')));

// Serve the main app for all routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const gameRooms = {};
const TURN_DURATION = 30000;

const words = {
    ...wordList,
    contains: (word) => {
        const lowerWord = word.toLowerCase();
        return wordList.words.includes(lowerWord) || wordList.valid.includes(lowerWord);
    },
};

// evaluateGuess function is unchanged
function evaluateGuess(guess, targetWord) {
	const target = targetWord.toUpperCase().split("");
    const guessUpper = guess.toUpperCase();
	const result = Array(5).fill("⬛");
	for (let i = 0; i < 5; i++) {
		if (guessUpper[i] === target[i]) {
			result[i] = "🟩";
			target[i] = null;
		}
	}
	for (let i = 0; i < 5; i++) {
		if (result[i] !== "🟩") {
			const charIndex = target.indexOf(guessUpper[i]);
			if (charIndex !== -1) {
				result[i] = "🟨";
				target[charIndex] = null;
			}
		}
	}
	return result;
}

// emitGameOver function is unchanged
function emitGameOver(roomId, winnerId, reason, details = {}) {
    const room = gameRooms[roomId];
    if (!room) return;
    io.to(roomId).emit('gameOver', { winnerId, reason, details });
    if (room.turnTimer) clearTimeout(room.turnTimer);
    delete gameRooms[roomId];
}

// startTurn function is unchanged
function startTurn(roomId) {
  const room = gameRooms[roomId];
  if (!room) return;
  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnStartTime = Date.now();
  io.to(roomId).emit('turnChange', { 
    currentPlayerId: room.currentPlayerId,
    duration: TURN_DURATION 
  });
  room.turnTimer = setTimeout(() => handleTimeout(roomId), TURN_DURATION);
}

// --- REVISED processGuess function ---
function processGuess(roomId, playerId, guessData) {
    const room = gameRooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    const opponent = room.players.find(p => p.id !== playerId);
    if (!player || !opponent) return;

    const timeTaken = Date.now() - (room.turnStartTime || Date.now());
    player.cumulativeTime += timeTaken;
    player.guesses.push(guessData);

    io.to(roomId).emit('guessProcessed', {
        guesserId: playerId,
        guesses: player.guesses
    });

    const isCorrect = guessData.states.every(state => state === '🟩');

    if (isCorrect) {
        // Player 1 wins and is a turn ahead
        if (player.guesses.length > opponent.guesses.length) {
            room.gameState = 'finalChance';
            room.currentPlayerId = opponent.id;
            io.to(roomId).emit('finalChance', { challengerId: opponent.id });
            startTurn(roomId);
        } else {
            // Player 2 wins on equal turns OR Player 2 succeeded on their final chance
            if (room.gameState === 'finalChance') {
                // Player 2 successfully used their final chance. THIS is the tie-breaker.
                const finalWinnerId = player.cumulativeTime < opponent.cumulativeTime ? player.id : opponent.id;
                emitGameOver(roomId, finalWinnerId, 'tiebreaker', {
                    times: { [player.id]: player.cumulativeTime, [opponent.id]: opponent.cumulativeTime }
                });
            } else {
                // Player 2 won on equal turns. This is an outright win, no tie-breaker needed.
                emitGameOver(roomId, player.id, 'default');
            }
        }
    } else { // Guess was incorrect
        if (room.gameState === 'finalChance') {
            // Player 2 failed their final chance. Player 1 wins outright.
            emitGameOver(roomId, opponent.id, 'default');
        } else {
            // Normal turn, switch to opponent.
            room.currentPlayerId = opponent.id;
            startTurn(roomId);
        }
    }
}

function handleTimeout(roomId) {
    const room = gameRooms[roomId];
    if (!room) return;
    const timedOutPlayerId = room.currentPlayerId;
    const opponent = room.players.find(p => p.id !== timedOutPlayerId);
    if (!opponent) return;
    const autoGuessWord = 'xxxxx';
    const guessStates = evaluateGuess(autoGuessWord, opponent.word);
    const autoGuess = { word: autoGuessWord, states: guessStates };
    processGuess(roomId, timedOutPlayerId, autoGuess);
}

// ---UNCHANGED LISTENERS---
io.on('connection', (socket) => {
    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 7);
        socket.join(roomId);
        gameRooms[roomId] = {
            players: [{ id: socket.id, word: null, guesses: [], cumulativeTime: 0 }],
            gameState: 'playing',
            currentPlayerId: null, turnTimer: null, turnStartTime: 0,
        };
        socket.emit('roomCreated', { roomId, playerId: socket.id });
    });
    socket.on('joinRoom', (roomId) => {
        if (gameRooms[roomId] && gameRooms[roomId].players.length < 2) {
            socket.join(roomId);
            gameRooms[roomId].players.push({ id: socket.id, word: null, guesses: [], cumulativeTime: 0 });
            io.to(roomId).emit('gameStart', {
                roomId, players: gameRooms[roomId].players.map(p => p.id)
            });
            gameRooms[roomId].gameState = 'settingWords';
        } else {
            socket.emit('error', { message: 'Room is full or does not exist.' });
        }
    });
    
    socket.on('setWord', ({ roomId, word }) => {
    if (!words.contains(word)) {
      socket.emit('error', { message: 'Word is not in the dictionary.' });
      return; // Stop processing if the word is invalid
    }
  
    const room = gameRooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) player.word = word.toUpperCase();
    
    const opponent = room.players.find(p => p.id !== socket.id);
    if (opponent && opponent.word) {
        io.to(room.players[0].id).emit('opponentWordReady', { wordToGuess: room.players[1].word });
        io.to(room.players[1].id).emit('opponentWordReady', { wordToGuess: room.players[0].word });
        room.gameState = 'playing';
        room.currentPlayerId = room.players[Math.floor(Math.random() * 2)].id;
        startTurn(roomId);
    }
});

    socket.on('makeGuess', ({ roomId, guessWord }) => {
        const room = gameRooms[roomId];
        if (room && socket.id === room.currentPlayerId) {
            const opponent = room.players.find(p => p.id !== socket.id);
            const guessStates = evaluateGuess(guessWord, opponent.word);
            const guessData = { word: guessWord, states: guessStates };
            processGuess(roomId, socket.id, guessData);
        }
    });
    socket.on('disconnect', () => {
        for (const roomId in gameRooms) {
            const room = gameRooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                if (room.turnTimer) clearTimeout(room.turnTimer);
                io.to(roomId).emit('opponentLeft');
                delete gameRooms[roomId];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));