#!/usr/bin/env node

require('./static-server');

/**
 * Module dependencies.
 */
// const cookieParser = require('cookie-parser');

// const fs = require('fs');
// const path = require('path');
// const finalhandler = require('finalhandler');
// const morgan = require('morgan');

// const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs/access.log'), {
//     flags: 'a'
// });
// const logger = morgan('combined', {
//     stream: accessLogStream
// });

/**
 * Get port from environment
 */
const port = normalizePort(process.env.PORT || '9080');

function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Create new Bengala Server
 */
const Bengala = require('./classes/bengala');

const mongo_conf = {
  port: 27017,
  protocol: 'mongodb',
  domain: 'localhost',
  prefix: 'beng-',
};

const wss_conf = {
  host: 'bengala.crystalware.test', // The hostname where to bind the server
  port: port, // The port where to bind the server
  // backlog: port, // The maximum length of the queue of pending connections
  verifyClient: function(info) {
    // console.log('req:', info.req);
    // console.log('info:', info);
    console.log('origin:', info.origin);
    console.log('secure:', info.secure);
    return true;
  },
  // handleProtocols: function(protocols, request) {
  //   console.log('protocols', protocols);
  //   let test = request;
  //
  //   return true;
  // },
  path: '/',
  noServer: false, // Disable no server mode
  clientTracking: true, // Specifies to track clients
  // perMessageDeflate: true, // Enable permessage-deflate
  // maxPayload: // The maximum allowed message size in bytes
};

let bengala = new Bengala(wss_conf);

let bengala_mongo = new Bengala.Mongo(mongo_conf);
bengala.setupMongo(bengala_mongo);

bengala.start();
