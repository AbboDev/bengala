/**
 *
 */
'use strict';

const Mongo = require('mongodb');

class BengalaMongo {
  /**
   *
   */
  constructor(configuration) {
    this.configuration = configuration;
    this.mongo = Mongo.MongoClient;

    /**
     * @var contains all the current active client, group by db names
     */
    this.connections = {};

    /**
     * @var contains all the databases with relatives collections
     */
    this.databases = {};
  }

  /**
   *
   */
  getPath() {
    return `${this.protocol || 'mongodb'}://${this.uri || 'localhost'}:${this.port || 27017}`;
  }

  /**
   *
   */
  getDatabasePermission(database) {
    return new Promise((resolve, reject) => {
      this.getConnection(this.getPath(), database, {
        useNewUrlParser: true
      })
        .then((db) => this.checkDatabase(db, database))
        .then((db) => this.checkCollection(db, 'permission'))
        .then((collection) => {
          let permission = this.getDocuments(collection);
          resolve(permission);
        }).catch((error) => {
          reject(error);
        });
    });
  }

  /**
   *
   */
  getCollection(database, collection, permission) {
    return new Promise((resolve, reject) => {
      this.getConnection(this.getPath(), database, {
        useNewUrlParser: true
      })
        .then((db) => this.checkDatabase(db, database))
        .then((db) => this.checkCollection(db, collection, permission.passive_mode || false))
        .then((collection) => {
          resolve(collection);
        }).catch((error) => {
          reject(error);
        });
    });
  }

  /**
   *
   */
  getConnection(path, database, configuration = {}) {
    return new Promise((resolve, reject) => {
      // Avoid to recreate multiple connection to the same database
      if (!(database in this.connections)) {
        this.mongo.connect(path, configuration)
          .then((client) => {
            let db = client.db(database);

            if (!(database in this.connections)) {
              this.connections[database] = client;
            }

            resolve(db);
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        let db = this.connections[database].db(database);
        resolve(db);
      }
    });
  }

  /**
   * checkDatabase - description
   *
   * @param  {type} db       description
   * @param  {type} database description
   * @return {type}          description
   */
  checkDatabase(db, database) {
    return new Promise((resolve, reject) => {
      db.admin().listDatabases((error, dbs) => {
        if (error != undefined) {
          reject(error);
        }

        let db_exist = dbs.databases.some((db) => {
          if (!(db.name in this.databases)) {
            this.databases[db.name] = [];
          }

          return db.name === database;
        });

        if (db_exist === false) {
          reject(new Error('Database not found: ' + database));
        }

        resolve(db);
      });
    });
  }

  /**
   * checkCollection - description
   *
   * @param  {type} db                      description
   * @param  {type} collection              description
   * @param  {boolean} createIfNotExist = true description
   * @return {type}                         description
   */
  checkCollection(db, collection, createIfNotExist = true) {
    return new Promise((resolve, reject) => {
      let databaseName = db.s.databaseName;

      db.listCollections().toArray((error, dbcs) => {
        if (error != undefined) {
          reject(error);
        }

        let dbc_exist = dbcs.some((dbc) => {
          if (!this.databases[databaseName].includes(dbc.name)) {
            this.databases[databaseName].push(dbc.name);

            console.log(this.databases);
          }

          return dbc.name === collection;
        });

        if (dbc_exist === false) {
          if (createIfNotExist === true && !this.databases[databaseName].includes(collection)) {
            this.databases[databaseName].push(collection);
            db.createCollection(collection, {})
              .catch((error) => {
                console.info('info', error);
              });
          } else {
            reject(new Error('Collection not found: ' + collection));
          }
        }

        resolve(db.collection(collection));
      });
    });
  }

  /**
   *
   */
  insertTimelog(collection, data) {
    if (Array.isArray(data)) {
      let ts_set = data.every((doc) => {
        return doc.ts !== null;
      });

      if (ts_set === true) {
        return collection.insertMany(data);
      }
    } else {
      if (data.ts !== null) {
        return collection.insertOne(data);
      }
    }
  }

  /**
   *
   */
  getDocuments(collection, filter = {}) {
    return new Promise((resolve, reject) => {
      collection.find(filter)
        .toArray()
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

module.exports = BengalaMongo;
