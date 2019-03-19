/**
 *
 */

const uniqid = require('uniqid');
const WebSocket = require('ws');
const Mongo = require('mongodb');

module.exports = class Bengala {
  constructor(mongo_conf, wss_conf) {
    this.user_data = {
      app: null,
      database: null,
      collection: null,
      permission: {
        passive_mode: true, // Create collection if not present
      },
    };

    this.mongo_conf = mongo_conf;
    this.mongo_conf.path = function() {
      return `${this.protocol || 'mongodb'}://${this.uri || 'localhost'}:${this.port || 27017}`;
    }
    this.mongo_conf.database = function(user) {
      return `${this.prefix || 'beng-'}${user.database || ''}`;
    }
    this.mongo_conf.collection = function(user) {
      return `${this.database(user)}-${user.collection || ''}`;
    }
    this.mongo = Mongo.MongoClient;

    this.wss_conf = wss_conf;
    this.wss = new WebSocket.Server(this.wss_conf);

    this.init();
  }

  init() {
    this.wss.on('connection', this.onWSSConnection.bind(this));
  }

  onWSSConnection(ws, req) {
    this.user_data.app = ws.id = uniqid(); // equal to client ID
    console.info('Open new connection: ', ws.id);

    this.sendWSSWebsiteID(ws);
    ws.ip = this.getWSSConnectionIP(req);

    ws.on('error', this.onWSSError.bind(this));
    ws.on('close', this.onWSSClose.bind(this));

    ws.on('message', this.onWSSMessage.bind(this));
  }

  onWSSClose() {
    console.info('Connection closed');
    return;
  }

  onWSSError(error) {
    console.error('Found error: ', error);
    return;
  }

  onWSSMessage(message) {
    try {
      message = JSON.parse(message);
    } catch (e) {
      console.warn('Failed to convert message into JSON');
    } finally {
      console.info('Received: ', message);

      if (this.user_data.database === null
        && message.wid !== undefined
        && message.wid !== false
      ) {
        this.user_data.database = message.wid; // equal to website ID
      }

      if (message.pid !== undefined && message.pid !== false) {
        this.user_data.collection = message.pid; // equal to page ID
      }

      if (this.user_data.database && this.user_data.collection) {
        console.log(this.connectMongo());
      }
    }
  }

  connectMongo() {
    return this.mongo.connect(this.mongo_conf.path(), {
      useNewUrlParser: true
    })
    .then((client) => {
      return new Promise((resolve, reject) => {
        let db = client.db(this.mongo_conf.database(this.user_data));

        resolve(db);
      })
    })
    .then((db) => this.checkMongoDatabase(db))
    .then((db) => this.checkMongoCollection(db))
    .then((collection) => {
      // console.log('collection', collection);
      return collection;
    }).catch((error) => {
      console.error(error);
    });
  }

  checkMongoDatabase(db) {
    return new Promise((resolve, reject) => {
      db.admin().listDatabases((error, dbs) => {
        if (error != undefined) {
          reject(error);
        }

        let db_exist = dbs.databases.some((db) => {
          return db.name === this.mongo_conf.database(this.user_data);
        });

        if (db_exist === false) {
          reject(new Error('Database not found: ' + this.user_data.database));
        }

        resolve(db);
      });
    });
  }

  checkMongoCollection(db) {
    return new Promise((resolve, reject) => {
      db.listCollections().toArray((error, dbcs) => {
        if (error != undefined) {
          reject(error);
        }

        // this.user_data
        // permission
        // passive_mode

        let dbc_exist = dbcs.some((dbc) => {
          return dbc.name === this.mongo_conf.collection(this.user_data);
        });

        if (dbc_exist === false) {
          reject(new Error('Collection not found: ' + this.user_data.collection));
        }

        resolve(db.collection(this.mongo_conf.collection(this.user_data)));
      });
    });
  }

  insertMongoTimelog(collection) {
    collection.find({})
    .toArray()
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.error(error);
    });
  }

  sendWSSWebsiteID(ws) {
    ws.send(JSON.stringify(ws.id), (error) => {
      if (error == undefined) {
        return;
      } else {
        console.error('Async error: ' + error);
      }
    });
  }

  getWSSConnectionIP(req) {
    if (req.headers['x-forwarded-for'] === undefined) {
      return req.connection.remoteAddress;
    } else {
      return req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
    }
  }
}
