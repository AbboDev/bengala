import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import {
  BengalaMongo,
  type MongoConfiguration,
  type BengalaServerConfiguration
} from '@bengala/shared';
import BengalaWebSocket from './socket';

export class BengalaServer {
  public configuration: BengalaServerConfiguration;
  public server: WebSocketServer;
  public mongo: BengalaMongo | null;

  constructor(configuration: BengalaServerConfiguration) {
    this.configuration = configuration;
    this.server = new WebSocketServer(this.configuration);
    this.mongo = null;
  }

  setupMongo(mongo: BengalaMongo | MongoConfiguration): void {
    if (mongo instanceof BengalaMongo) {
      this.mongo = mongo;
    } else if (typeof mongo === 'object' && mongo !== null) {
      this.mongo = new BengalaMongo(mongo);
    } else {
      throw new Error(`${mongo} is not a valid parameter`);
    }
  }

  start(): void {
    if (this.mongo !== null) {
      console.log('WebSocket Server address:', this.server.address());

      this.server.on('listening', this.onListening.bind(this));
      this.server.on('connection', this.onConnection.bind(this));
      this.server.on('close', this.onClose.bind(this));
      this.server.on('error', this.onError.bind(this));
    } else {
      console.error('A storage must be setup first');
    }
  }

  onConnection(ws: WebSocket, req: IncomingMessage): void {
    console.log('Connected clients count:', this.server.clients.size);
    console.info('Open new connection');

    if (!this.mongo) {
      console.error('No mongo storage available for connection');
      return;
    }

    const bws = new BengalaWebSocket(ws, this.mongo);
    bws.ip = this.getConnectionIP(req);

    bws.ws.on('error', bws.onError.bind(bws));
    bws.ws.on('close', bws.onClose.bind(bws));
    bws.ws.on('message', (msg) => {
      void bws.onMessage(msg);
    });
  }

  getConnectionIP(req: IncomingMessage): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (!forwarded) {
      return req.socket ? req.socket.remoteAddress : undefined;
    }
    const firstForwarded = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(/\s*,\s*/)[0];
    return firstForwarded;
  }

  onListening(): void {
    console.info('Bengala WebSocket server is listening');
  }

  onClose(): void {
    console.info('Bengala WebSocket server closed');
  }

  onError(error: Error): void {
    console.error('Bengala WebSocket server error: ', error);
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

export default BengalaServer;
