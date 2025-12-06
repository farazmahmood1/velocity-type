import { Peer, DataConnection } from 'peerjs';

export type MessageType = 'INIT' | 'START' | 'UPDATE' | 'FINISH';

export interface GameMessage {
  type: MessageType;
  payload?: any;
}

class MultiplayerService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onDataCallback: ((data: GameMessage) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;

  initialize(isHost: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create Peer instance. Using default public PeerJS server.
      this.peer = new Peer();

      this.peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        resolve(id);
      });

      this.peer.on('error', (err) => {
        console.error(err);
        reject(err);
      });

      if (isHost) {
        this.peer.on('connection', (conn) => {
          this.handleConnection(conn);
        });
      }
    });
  }

  join(hostId: string) {
    if (!this.peer) return;
    const conn = this.peer.connect(hostId);
    this.handleConnection(conn);
  }

  private handleConnection(conn: DataConnection) {
    this.conn = conn;
    
    this.conn.on('open', () => {
      console.log('Connected to peer!');
      if (this.onConnectCallback) this.onConnectCallback();
    });

    this.conn.on('data', (data) => {
      if (this.onDataCallback) {
        this.onDataCallback(data as GameMessage);
      }
    });
  }

  send(type: MessageType, payload?: any) {
    if (this.conn && this.conn.open) {
      this.conn.send({ type, payload });
    }
  }

  onData(callback: (data: GameMessage) => void) {
    this.onDataCallback = callback;
  }

  onConnect(callback: () => void) {
    this.onConnectCallback = callback;
  }

  cleanup() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.conn = null;
  }
}

export const multiplayer = new MultiplayerService();