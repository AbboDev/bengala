/**
 *
 */
'use strict';

const WebSocket = require('ws');

const BengalaMongo = require('./bengala-mongo');
const BengalaWebSocket = require('./bengala-socket');

class Bengala {
  /**
   *
   */
  constructor(configuration) {
    this.configuration = configuration;

    // The server which handle the sockets requests
    this.server = new WebSocket.Server(this.configuration);

    this.mongo = null;
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
      console.log(this.server.address());

      this.server.on('listening', this.onListening.bind(this));
      this.server.on('connection', this.onConnection.bind(this));
      // this.server.on('headers', this.onHeaders.bind(this));

      this.server.on('close', this.onClose.bind(this));
      this.server.on('error', this.onError.bind(this));
    } else {
      console.error('A storage must be setup first');
    }
  }

  /**
   *
   */
  onConnection(ws, req) {
    console.log(this.server.clients.size);
    // console.log(this.server.clients);
    console.info('Open new connection');

    let bws = new BengalaWebSocket(ws, this.mongo);

    bws.ip = this.getConnectionIP(req);

    bws.ws.on('error', bws.onError.bind(bws));
    bws.ws.on('close', bws.onClose.bind(bws));

    bws.ws.on('message', bws.onMessage.bind(bws));
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
  onHeaders(headers, request) {
    console.info('Headers: ', headers);
    console.info('Request: ', typeof request);
    return;
  }

  /**
   *
   */
  onListening() {
    console.error('Bind server');
    return;
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
}

module.exports = Bengala;
