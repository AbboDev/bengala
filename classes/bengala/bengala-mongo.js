'use strict';

const { MongoClient } = require('mongodb');

class BengalaMongo {
  constructor(configuration = {}) {
    this.configuration = configuration;
    this.protocol = configuration.protocol || 'mongodb';
    this.uri = configuration.domain || configuration.uri || 'localhost';
    this.port = configuration.port || 27017;
    this.prefix = configuration.prefix || 'beng-';

    /**
     * Contains all the current active clients, grouped by database name
     */
    this.connections = {};

    /**
     * Contains all known databases and their cached collections
     */
    this.databases = {};
  }

  getPath() {
    return `${this.protocol}://${this.uri}:${this.port}`;
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

  async getConnection(path, database, configuration = {}) {
    if (!this.connections[database]) {
      const client = new MongoClient(path, configuration);
      await client.connect();
      this.connections[database] = client;
    }
    return this.connections[database].db(database);
  }

  async checkDatabase(db, database) {
    const adminDb = db.admin();
    const dbs = await adminDb.listDatabases();

    for (const d of dbs.databases) {
      if (!(d.name in this.databases)) {
        this.databases[d.name] = [];
      }
    }

    const dbExists = dbs.databases.some((d) => d.name === database);
    if (!dbExists) {
      throw new Error('Database not found: ' + database);
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
}

module.exports = BengalaMongo;
