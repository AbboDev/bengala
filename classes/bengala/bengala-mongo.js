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
  getCollection(database, collection) {
    return new Promise((resolve, reject) => {
      this.getConnection(this.getPath(), database, {
        useNewUrlParser: true
      })
        .then((db) => this.checkDatabase(db, database))
        .then((db) => this.checkCollection(db, collection))
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
      this.mongo.connect(path, configuration)
        .then((client) => {
          let db = client.db(database);

          resolve(db);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   *
   */
  checkDatabase(db, database) {
    return new Promise((resolve, reject) => {
      db.admin().listDatabases((error, dbs) => {
        if (error != undefined) {
          reject(error);
        }

        let db_exist = dbs.databases.some((db) => {
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
   *
   */
  checkCollection(db, collection, createIfNotExist = true) {
    return new Promise((resolve, reject) => {
      db.listCollections().toArray((error, dbcs) => {
        if (error != undefined) {
          reject(error);
        }

        let dbc_exist = dbcs.some((dbc) => {
          return dbc.name === collection;
        });

        if (dbc_exist === false) {
          if (createIfNotExist === true) {
            db.createCollection(collection, {})
              .catch((error) => {
                console.error(error);

                reject(new Error('Impossible to create collection: ' + collection));
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
