#!/usr/bin/env node

import './static-server';
import Bengala from './bengala/bengala-server';
import BengalaMongo from './bengala/bengala-mongo';
import type { BengalaServerConfiguration, MongoConfiguration } from './types';

/**
 * Get port from environment
 */
function normalizePort(val: string | number): number | string | false {
  const parsedPort = parseInt(String(val), 10);

  if (isNaN(parsedPort)) {
    return val;
  }

  if (parsedPort >= 0) {
    return parsedPort;
  }

  return false;
}

const port = normalizePort(process.env.PORT || '9080');

const mongoConf: MongoConfiguration = {
  uri: process.env.MONGODB_URI || process.env.MONGO_URI,
  port: parseInt(process.env.MONGO_PORT || '27017', 10),
  protocol: process.env.MONGO_PROTOCOL || 'mongodb',
  domain: process.env.MONGO_HOST || 'localhost',
  user: process.env.MONGO_USER,
  password: process.env.MONGO_PASSWORD,
  options: process.env.MONGO_OPTIONS,
  prefix: process.env.MONGO_PREFIX || 'beng-'
};

const wssConf: BengalaServerConfiguration = {
  host: process.env.HOST || 'localhost',
  port: typeof port === 'number' ? port : parseInt(String(port), 10),
  verifyClient: (info: { origin: string; secure: boolean }) => {
    console.log('origin:', info.origin);
    console.log('secure:', info.secure);
    return true;
  },
  path: '/',
  noServer: false,
  clientTracking: true
};

const bengala = new Bengala(wssConf);
const bengalaMongo = new BengalaMongo(mongoConf);

bengala.setupMongo(bengalaMongo);
bengala.start();

// Graceful shutdown
const handleShutdown = async (signal: string): Promise<void> => {
  console.info(`Received ${signal}. Shutting down Bengala...`);
  try {
    await bengala.close();
    await bengalaMongo.close();
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGINT', () => {
  void handleShutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void handleShutdown('SIGTERM');
});
