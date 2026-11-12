import type { IncomingMessage, ServerResponse } from 'http';
import {
  BengalaMongo,
  BengalaUser,
  type BengalaIncomingMessage,
  type MongoConfiguration
} from '@bengala/shared';

// Cached MongoDB Atlas connector across warm serverless invocations
let mongoInstance: BengalaMongo | null = null;

const getMongo = (): BengalaMongo => {
  if (!mongoInstance) {
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
    mongoInstance = new BengalaMongo(mongoConf);
  }
  return mongoInstance;
};

const parseBody = async (
  req: IncomingMessage
): Promise<BengalaIncomingMessage> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({});
        } else {
          resolve(JSON.parse(body) as BengalaIncomingMessage);
        }
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', (err) => reject(err));
  });
};

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    let data: BengalaIncomingMessage;
    if (req.body && typeof req.body === 'object') {
      data = req.body as BengalaIncomingMessage;
    } else {
      data = await parseBody(req);
    }

    if (!data.wid || !data.pid) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing wid or pid' }));
      return;
    }

    const storage = getMongo();
    const user = new BengalaUser(
      data.wid as string,
      data.pid as string,
      (data.uid as string) || null
    );

    const documents = await storage.getDatabasePermission(user.getDatabase());
    const permission = documents && documents.length > 0 ? documents[0] : {};
    user.setPermission(permission);

    const collection = await storage.getCollection(
      user.getDatabase(),
      user.getCollection(data.pid as string),
      permission
    );

    const timelog: Record<string, unknown> = {
      ts: data.ts || Date.now(),
      uid: user.identifier
    };

    // Copy any custom metadata passed
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'wid' && key !== 'pid' && key !== 'uid' && key !== 'ts') {
        timelog[key] = val;
      }
    }

    await storage.insertTimelog(collection, timelog);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        uid: user.identifier
      })
    );
  } catch (error: unknown) {
    console.error('Serverless ingestion error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error)
      })
    );
  }
}
