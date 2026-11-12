import type { WebSocket, RawData } from 'ws';
import BengalaUser from './bengala-user';
import type BengalaMongo from './bengala-mongo';
import Queue from '../utilities/queue';
import type { BengalaIncomingMessage, UserPermissionConfig } from '../types';

export class BengalaWebSocket {
  public ws: WebSocket;
  public storage: BengalaMongo;
  public user: BengalaUser | null;
  public queue: Queue<BengalaIncomingMessage>;
  public ip?: string;

  constructor(ws: WebSocket, storage: BengalaMongo) {
    this.ws = ws;
    this.storage = storage;

    this.user = null;
    this.queue = new Queue<BengalaIncomingMessage>();
  }

  sendWebsiteID(): void {
    if (!this.user) {
      return;
    }
    this.ws.send(JSON.stringify({ uid: this.user.identifier }), (error) => {
      if (error) {
        console.error('Async error: ' + error);
      }
    });
  }

  async onMessage(message: RawData): Promise<void> {
    let parsed: BengalaIncomingMessage;
    try {
      parsed = this.parseMessage(message);
    } catch (err) {
      console.error(err);
      return;
    }

    this.queue.add(parsed);

    if (this.checkParams(parsed.wid) && this.checkParams(parsed.pid)) {
      if (this.user === null) {
        if (this.checkParams(parsed.uid)) {
          this.user = new BengalaUser(
            parsed.wid as string,
            parsed.pid as string,
            parsed.uid as string
          );
        } else {
          this.user = new BengalaUser(
            parsed.wid as string,
            parsed.pid as string
          );
          this.sendWebsiteID();
        }
      }

      if (this.checkParams(parsed.uid)) {
        try {
          const permission = await this.getPermission();
          const firstItem = this.queue.first();
          const collection = await this.storage.getCollection(
            this.user.getDatabase(),
            this.user.getCollection(firstItem?.pid as string | undefined),
            permission
          );

          const item = this.queue.remove();
          if (item) {
            const cleanMessage = this.removeKeys(item, ['wid', 'pid']);
            await this.storage.insertTimelog(collection, cleanMessage);
          }
        } catch (error) {
          console.error(error);
        }
      }
    }
  }

  async getPermission(): Promise<UserPermissionConfig> {
    if (!this.user) {
      return {};
    }
    const documents = await this.storage.getDatabasePermission(
      this.user.getDatabase()
    );
    const permission = (
      documents && documents.length > 0 ? documents[0] : {}
    ) as UserPermissionConfig;

    this.user.setPermission(permission);
    return permission;
  }

  removeKeys<T extends Record<string, unknown>>(
    object: T,
    keys: string | string[]
  ): Record<string, unknown> {
    const copy: Record<string, unknown> = { ...object };
    if (Array.isArray(keys)) {
      for (const key of keys) {
        delete copy[key];
      }
    } else {
      delete copy[keys];
    }
    return copy;
  }

  checkParams(value: unknown): boolean {
    return typeof value !== 'undefined' && value !== false && value !== null;
  }

  onClose(): void {
    console.info('Connection closed');
  }

  onError(error: Error): void {
    console.error('Found error: ', error);
  }

  parseMessage(message: RawData | string): BengalaIncomingMessage {
    try {
      const str =
        typeof message === 'string' ? message : message.toString('utf8');
      return JSON.parse(str) as BengalaIncomingMessage;
    } catch (error) {
      throw new Error('Failed to convert message into JSON', { cause: error });
    }
  }
}

export default BengalaWebSocket;
