'use strict';

const { WebSocketServer } = require('ws');

const BengalaMongo = require('./bengala-mongo');
const BengalaWebSocket = require('./bengala-socket');

class Bengala {
  constructor(configuration) {
    this.configuration = configuration;
    this.server = new WebSocketServer(this.configuration);
    this.mongo = null;
  }

  setupMongo(mongo) {
    if (mongo instanceof BengalaMongo) {
      this.mongo = mongo;
    } else if (typeof mongo === 'object' && mongo !== null) {
      this.mongo = new BengalaMongo(mongo);
    } else {
      throw new Error(`${mongo} is not a valid parameter`);
    }
  }

  start() {
    if (this.mongo !== null) {
      console.log('Server address:', this.server.address());

      this.server.on('listening', this.onListening.bind(this));
      this.server.on('connection', this.onConnection.bind(this));
      this.server.on('close', this.onClose.bind(this));
      this.server.on('error', this.onError.bind(this));
    } else {
      console.error('A storage must be setup first');
    }
  }

  onConnection(ws, req) {
    console.log('Connected clients count:', this.server.clients.size);
    console.info('Open new connection');

    const bws = new BengalaWebSocket(ws, this.mongo);
    bws.ip = this.getConnectionIP(req);

    bws.ws.on('error', bws.onError.bind(bws));
    bws.ws.on('close', bws.onClose.bind(bws));
    bws.ws.on('message', bws.onMessage.bind(bws));
  }

  getConnectionIP(req) {
    if (!req.headers['x-forwarded-for']) {
      return req.socket
        ? req.socket.remoteAddress
        : req.connection?.remoteAddress;
    }
    return req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
  }

  onListening() {
    console.info('Bengala WebSocket server is listening');
  }

  onClose() {
    console.info('Bengala WebSocket server closed');
  }

  onError(error) {
    console.error('Bengala WebSocket server error: ', error);
  }
}

module.exports = Bengala;
