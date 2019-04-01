/**
 *
 */
'use strict';

const BengalaUser = require('./bengala-user');

const Queue = require('../utilities/queue');

/**
 * Wrapper which connect a socket with is current user
 */
class BengalaWebSocket {
  /**
   *
   */
  constructor(ws, storage) {
    this.ws = ws;
    this.storage = storage;

    this.user = null;
    this.queue = new Queue();
  }

  /**
   *
   */
  sendWebsiteID() {
    this.ws.send(JSON.stringify({uid: this.user.identifier}), (error) => {
      if (error == undefined) {
        return;
      } else {
        console.error('Async error: ' + error);
      }
    });
  }

  /**
   *
   */
  onMessage(message) {
    let parsed = this.parseMessage(message);

    this.queue.add(parsed);

    // console.info('Received: ', parsed);

    if (this.checkParams(parsed.wid) && this.checkParams(parsed.pid)) {
      if (this.user === null) { // First boot of user/socket
        if (this.checkParams(parsed.uid)) { // The user was already on the website
          this.user = new BengalaUser(parsed.wid, parsed.pid, parsed.uid);
        } else {
          this.user = new BengalaUser(parsed.wid, parsed.pid);
          this.sendWebsiteID();
        }
      }

      if (this.checkParams(parsed.uid)) { // First boot of user/socket
        this.getPermission()
          .then(() => this.storage.getCollection(
            this.user.getDatabase(),
            this.user.getCollection(parsed.pid))
          )
          .then((collection) => {
            console.log(parsed);

            this.storage.insertTimelog(collection, parsed);
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }

  getPermission() {
    return new Promise((resolve, reject) => {
      this.storage.getDatabasePermission(this.user.getDatabase())
        .then((collection) => {
          let permission = collection[0];

          this.user.setPermission(permission);
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   *
   */
  checkParams(value) {
    return typeof value !== 'undefined' && value !== false && value !== null;
  }

  /**
   *
   */
  onClose() {
    console.info('Connection closed');
    return;
  }

  /**
   *
   */
  onError(error) {
    console.error('Found error: ', error);
    return;
  }

  /**
   *
   */
  parseMessage(message) {
    try {
      let parsed = JSON.parse(message);
      return parsed;
    } catch (error) {
      throw new Error('Failed to convert message into JSON');
    }
  }
}

module.exports = BengalaWebSocket;
