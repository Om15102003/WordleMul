import { io, Socket } from 'socket.io-client';

// Use a simple event emitter pattern for frontend components to listen to socket events
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, payload: any) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(payload));
    }
  }
}

class SocketService extends EventEmitter {
  private socket: Socket;
  public playerId: string;

  constructor() {
    super();
    // Connect to your server. Replace with your server's address if not running locally.
    this.socket = io('http://localhost:3000');
    
    this.socket.on('connect', () => {
      this.playerId = this.socket.id;
      console.log('Connected to server with ID:', this.playerId);
    });

    // Listen for all server events and re-emit them for Svelte components
    this.socket.on('roomCreated', (data) => this.emit('roomCreated', data));
    this.socket.on('gameStart', (data) => this.emit('gameStart', data));
    this.socket.on('opponentWordReady', (data) => this.emit('opponentWordReady', data));
    this.socket.on('opponentGuessed', (data) => this.emit('opponentGuessed', data));
    this.socket.on('gameOver', (data) => this.emit('gameOver', data));
    this.socket.on('error', (data) => this.emit('error', data));
    this.socket.on('opponentLeft', () => this.emit('opponentLeft', null));
    this.socket.on('turnChange', (data) => this.emit('turnChange', data));

  }
  
  // --- Emitters ---
  // Functions to send data to the server

  createRoom() {
    this.socket.emit('createRoom');
  }

  joinRoom(roomId: string) {
    this.socket.emit('joinRoom', roomId);
  }
  
  setWord(roomId: string, word: string) {
    this.socket.emit('setWord', { roomId, word });
  }

  makeGuess(roomId: string, guess: any[]) { // 'guess' should be an array of tile objects
    this.socket.emit('makeGuess', { roomId, guess });
  }
}

// Export a singleton instance
export const socketService = new SocketService();
