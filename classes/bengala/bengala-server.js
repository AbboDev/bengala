/**
 *
 */
'use strict';

const WebSocket = require('ws');
const BengalaMongo = require('./bengala-mongo');
const BengalaUser = require('./bengala-user');

class Bengala {
  /**
   *
   */
  constructor(configuration) {
    this.configuration = configuration;

    this.server = new WebSocket.Server(this.configuration);
    this.mongo = null;
    this.user = null;
  }

  /**
   *
   */
  setupMongo(mongo) {
    if (mongo instanceof BengalaMongo) {
      this.mongo = mongo;
    } else if (typeof mongo !== 'object') {
      this.mongo = new BengalaMongo(mongo);
    } else {
      throw new Error(mongo, 'is not a valid parameter');
    }
  }

  /**
   *
   */
  start() {
    if (this.mongo !== null) {
      this.server.on('connection', this.onConnection.bind(this));

      this.server.on('headers', this.onHeaders.bind(this));
      this.server.on('listening', this.onListening.bind(this));
    } else {
      console.error('Storage must be setup first');
    }
  }

  /**
   *
   */
  onConnection(ws, req) {
    console.info('Open new connection');

    this.sendWebsiteID(ws);
    ws.ip = this.getConnectionIP(req);

    ws.on('error', this.onError.bind(this));
    ws.on('close', this.onClose.bind(this));

    ws.on('message', this.onMessage.bind(this));
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

  /**
   *
   */
  onMessage(message) {
    let parsed = this.parseMessage(message);

    // console.info('Received: ', parsed);

    if (typeof parsed.wid !== 'undefined'
      && parsed.wid !== false
      && parsed.wid !== null
      && typeof parsed.pid !== 'undefined'
      && parsed.pid !== false
      && parsed.pid !== null
    ) {
      if (this.user === null) {
        this.user = new BengalaUser(parsed.wid, parsed.pid);

        this.mongo.getDatabasePermission(this.user.getDatabase())
          .then((collection) => {
            this.user.setPermission(collection);
          })
          .catch((error) => {
            console.error(error);
          });

        this.mongo.getCollection(this.user.getDatabase(), this.user.getCollection())
          .then((collection) => {
            this.mongo.insertTimelog(collection, parsed);
          })
          .catch((error) => {
            console.error(error);
          });
      }
    }
  }

  /**
   *
   */
  sendWebsiteID(ws) {
    ws.send(JSON.stringify({uid: ws.id}), (error) => {
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
  getConnectionIP(req) {
    if (req.headers['x-forwarded-for'] === undefined) {
      return req.connection.remoteAddress;
    } else {
      return req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
    }
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
  onHeaders(headers, request) {
    console.info('Headers: ', headers);
    console.info('Request: ', request);
    return;
  }

  /**
   *
   */
  onListening() {
    console.error('Bind server');
    return;
  }
}

module.exports = Bengala;
