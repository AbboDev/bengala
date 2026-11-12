#!/usr/bin/env node

'use strict';

require('./static-server');

/**
 * Get port from environment
 */
const port = normalizePort(process.env.PORT || '9080');

function normalizePort(val) {
  const port = parseInt(val, 10);

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

const mongoConf = {
  // Direct connection string for MongoDB Atlas or standalone URI
  uri: process.env.MONGODB_URI || process.env.MONGO_URI,
  port: parseInt(process.env.MONGO_PORT || '27017', 10),
  protocol: process.env.MONGO_PROTOCOL || 'mongodb',
  domain: process.env.MONGO_HOST || 'localhost',
  user: process.env.MONGO_USER,
  password: process.env.MONGO_PASSWORD,
  options: process.env.MONGO_OPTIONS,
  prefix: process.env.MONGO_PREFIX || 'beng-'
};

const wssConf = {
  host: process.env.HOST || 'localhost',
  port: port,
  verifyClient: function (info) {
    console.log('origin:', info.origin);
    console.log('secure:', info.secure);
    return true;
  },
  path: '/',
  noServer: false,
  clientTracking: true
};

const bengala = new Bengala(wssConf);
const bengalaMongo = new Bengala.Mongo(mongoConf);

bengala.setupMongo(bengalaMongo);
bengala.start();

// Graceful shutdown
const handleShutdown = async (signal) => {
  console.info(`Received ${signal}. Shutting down Bengala...`);
  try {
    await bengalaMongo.close();
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
