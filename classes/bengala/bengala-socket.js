'use strict';

const BengalaUser = require('./bengala-user');
const Queue = require('../utilities/queue');

/**
 * Wrapper which connects a socket with its current user
 */
class BengalaWebSocket {
  constructor(ws, storage) {
    this.ws = ws;
    this.storage = storage;

    this.user = null;
    this.queue = new Queue();
    this.ip = null;
  }

  sendWebsiteID() {
    this.ws.send(JSON.stringify({ uid: this.user.identifier }), (error) => {
      if (error) {
        console.error('Async error: ' + error);
      }
    });
  }

  async onMessage(message) {
    let parsed;
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
          this.user = new BengalaUser(parsed.wid, parsed.pid, parsed.uid);
        } else {
          this.user = new BengalaUser(parsed.wid, parsed.pid);
          this.sendWebsiteID();
        }
      }

      if (this.checkParams(parsed.uid)) {
        try {
          const permission = await this.getPermission();
          const collection = await this.storage.getCollection(
            this.user.getDatabase(),
            this.user.getCollection(this.queue.first().pid),
            permission
          );

          const item = this.queue.remove();
          const cleanMessage = this.removeKeys(item, ['wid', 'pid']);

          await this.storage.insertTimelog(collection, cleanMessage);
        } catch (error) {
          console.error(error);
        }
      }
    }
  }

  async getPermission() {
    const documents = await this.storage.getDatabasePermission(
      this.user.getDatabase()
    );
    const permission = documents && documents.length > 0 ? documents[0] : {};

    this.user.setPermission(permission);
    return permission;
  }

  removeKeys(object, keys) {
    const copy = { ...object };
    if (Array.isArray(keys)) {
      for (const key of keys) {
        delete copy[key];
      }
    } else {
      delete copy[keys];
    }
    return copy;
  }

  checkParams(value) {
    return typeof value !== 'undefined' && value !== false && value !== null;
  }

  onClose() {
    console.info('Connection closed');
  }

  onError(error) {
    console.error('Found error: ', error);
  }

  parseMessage(message) {
    try {
      const str =
        typeof message === 'string' ? message : message.toString('utf8');
      return JSON.parse(str);
    } catch (error) {
      throw new Error('Failed to convert message into JSON', { cause: error });
    }
  }
}

module.exports = BengalaWebSocket;
