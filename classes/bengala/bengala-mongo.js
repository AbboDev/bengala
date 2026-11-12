'use strict';

const { MongoClient } = require('mongodb');

class BengalaMongo {
  constructor(configuration = {}) {
    this.configuration = configuration;

    // Full URI support (e.g. mongodb+srv://... or mongodb://...)
    this.uri =
      configuration.uri ||
      configuration.domain ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      'localhost';
    this.protocol = configuration.protocol || 'mongodb';
    this.port = configuration.port || 27017;
    this.user = configuration.user || configuration.username || null;
    this.password = configuration.password || null;
    this.options = configuration.options || null;
    this.prefix = configuration.prefix || 'beng-';

    /**
     * Map of shared MongoClient instances indexed by connection URI
     */
    this.clients = {};

    /**
     * Cache of known databases and collections
     */
    this.databases = {};
  }

  getPath() {
    // If a full URI is already provided (e.g. mongodb+srv://... or mongodb://...)
    if (
      typeof this.uri === 'string' &&
      (this.uri.startsWith('mongodb://') ||
        this.uri.startsWith('mongodb+srv://'))
    ) {
      return this.uri;
    }

    const protocol = this.protocol || 'mongodb';
    const auth =
      this.user && this.password
        ? `${encodeURIComponent(this.user)}:${encodeURIComponent(this.password)}@`
        : '';

    let hostPort = this.uri || 'localhost';
    if (protocol !== 'mongodb+srv' && this.port) {
      hostPort += `:${this.port}`;
    }

    let url = `${protocol}://${auth}${hostPort}`;
    if (this.options) {
      const queryString =
        typeof this.options === 'string'
          ? this.options.startsWith('?')
            ? this.options
            : `?${this.options}`
          : `?${new URLSearchParams(this.options).toString()}`;
      url += queryString;
    }

    return url;
  }

  async getClient(path, configuration = {}) {
    if (!this.clients[path]) {
      const client = new MongoClient(path, {
        serverSelectionTimeoutMS: 10000,
        ...this.configuration.clientOptions,
        ...configuration
      });
      await client.connect();
      this.clients[path] = client;
    }
    return this.clients[path];
  }

  async getConnection(path, database, configuration = {}) {
    const client = await this.getClient(path, configuration);
    return client.db(database);
  }

  async getDatabasePermission(database) {
    const db = await this.getConnection(this.getPath(), database);
    await this.checkDatabase(db, database);
    try {
      const collection = await this.checkCollection(db, 'permission', false);
      return await this.getDocuments(collection);
    } catch {
      return [];
    }
  }

  async getCollection(database, collection, permission = {}) {
    const db = await this.getConnection(this.getPath(), database);
    await this.checkDatabase(db, database);
    const passiveMode =
      permission.passive_mode !== undefined ? permission.passive_mode : true;
    return await this.checkCollection(db, collection, passiveMode);
  }

  async checkDatabase(db, database) {
    try {
      const adminDb = db.admin();
      const dbs = await adminDb.listDatabases();

      for (const d of dbs.databases) {
        if (!(d.name in this.databases)) {
          this.databases[d.name] = [];
        }
      }

      const dbExists = dbs.databases.some((d) => d.name === database);
      if (!dbExists) {
        this.databases[database] = this.databases[database] || [];
      }
    } catch (err) {
      // In Atlas, regular database users often lack cluster-wide listDatabases permission.
      // Register locally and proceed with lazy collection provisioning.
      this.databases[database] = this.databases[database] || [];
      console.info(
        `Notice: listDatabases check bypassed (${err.message}) - targeting "${database}"`
      );
    }

    return db;
  }

  async checkCollection(db, collection, createIfNotExist = true) {
    const databaseName = db.databaseName;
    if (!this.databases[databaseName]) {
      this.databases[databaseName] = [];
    }

    const dbcs = await db.listCollections().toArray();
    for (const dbc of dbcs) {
      if (!this.databases[databaseName].includes(dbc.name)) {
        this.databases[databaseName].push(dbc.name);
      }
    }

    const dbcExists = dbcs.some((dbc) => dbc.name === collection);

    if (!dbcExists) {
      if (createIfNotExist) {
        if (!this.databases[databaseName].includes(collection)) {
          this.databases[databaseName].push(collection);
        }
        await db.createCollection(collection);
      } else {
        throw new Error('Collection not found: ' + collection);
      }
    }

    return db.collection(collection);
  }

  async insertTimelog(collection, data) {
    if (Array.isArray(data)) {
      const tsSet = data.every(
        (doc) => doc.ts !== null && doc.ts !== undefined
      );
      if (tsSet) {
        return await collection.insertMany(data);
      }
    } else {
      if (data && data.ts !== null && data.ts !== undefined) {
        return await collection.insertOne(data);
      }
    }
  }

  async getDocuments(collection, filter = {}) {
    return await collection.find(filter).toArray();
  }

  async close() {
    for (const path of Object.keys(this.clients)) {
      try {
        await this.clients[path].close();
      } catch (err) {
        console.error('Error closing MongoDB client:', err);
      }
    }
    this.clients = {};
  }
}

module.exports = BengalaMongo;
