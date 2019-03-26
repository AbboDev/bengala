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
  port: port
};

let bengala = new Bengala(wss_conf);

let bengala_mongo = new Bengala.Mongo(mongo_conf);
bengala.setupMongo(bengala_mongo);

bengala.start();
