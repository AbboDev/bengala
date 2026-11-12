import {
  MongoClient,
  Db,
  Collection,
  Document,
  Filter,
  InsertOneResult,
  InsertManyResult,
  MongoClientOptions
} from 'mongodb';
import type { MongoConfiguration, UserPermissionConfig } from '../types';

export class BengalaMongo {
  public configuration: MongoConfiguration;
  public uri: string;
  public protocol: string;
  public port: number;
  public user: string | null;
  public password: string | null;
  public options: string | Record<string, string> | null;
  public prefix: string;

  /**
   * Map of shared MongoClient instances indexed by connection URI
   */
  public clients: Record<string, MongoClient>;

  /**
   * Cache of known databases and collections
   */
  public databases: Record<string, string[]>;

  constructor(configuration: MongoConfiguration = {}) {
    this.configuration = configuration;

    this.uri =
      configuration.uri ||
      configuration.domain ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      'localhost';
    this.protocol = configuration.protocol || 'mongodb';
    this.port = configuration.port || 27017;
    this.user = configuration.user || null;
    this.password = configuration.password || null;
    this.options = configuration.options || null;
    this.prefix = configuration.prefix || 'beng-';

    this.clients = {};
    this.databases = {};
  }

  getPath(): string {
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

  async getClient(
    path: string,
    configuration: MongoClientOptions = {}
  ): Promise<MongoClient> {
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

  async getConnection(
    path: string,
    database: string,
    configuration: MongoClientOptions = {}
  ): Promise<Db> {
    const client = await this.getClient(path, configuration);
    return client.db(database);
  }

  async getDatabasePermission(database: string): Promise<Document[]> {
    const db = await this.getConnection(this.getPath(), database);
    await this.checkDatabase(db, database);
    try {
      const collection = await this.checkCollection(db, 'permission', false);
      return await this.getDocuments(collection);
    } catch {
      return [];
    }
  }

  async getCollection(
    database: string,
    collection: string,
    permission: UserPermissionConfig = {}
  ): Promise<Collection<Document>> {
    const db = await this.getConnection(this.getPath(), database);
    await this.checkDatabase(db, database);
    const passiveMode =
      permission.passive_mode !== undefined ? permission.passive_mode : true;
    return await this.checkCollection(db, collection, passiveMode);
  }

  async checkDatabase(db: Db, database: string): Promise<Db> {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.databases[database] = this.databases[database] || [];
      console.info(
        `Notice: listDatabases check bypassed (${message}) - targeting "${database}"`
      );
    }

    return db;
  }

  async checkCollection(
    db: Db,
    collection: string,
    createIfNotExist = true
  ): Promise<Collection<Document>> {
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

  async insertTimelog(
    collection: Collection<Document>,
    data: Document | Document[]
  ): Promise<
    InsertOneResult<Document> | InsertManyResult<Document> | undefined
  > {
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

  async getDocuments(
    collection: Collection<Document>,
    filter: Filter<Document> = {}
  ): Promise<Document[]> {
    return await collection.find(filter).toArray();
  }

  async close(): Promise<void> {
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

export default BengalaMongo;
