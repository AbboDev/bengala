/**
 *
 */
'use strict';

const uniqid = require('uniqid');

const BengalaUserPermission = require('./bengala-user-permission');

class BengalaUser {
  /**
   *
   */
  constructor(database, collection, identifier = null, prefix = 'beng-', permission = null) {
    this.database = database;
    this.collections = [collection];
    this.prefix = prefix;
    this.identifier = identifier || uniqid();

    this.permission = (permission) ? new BengalaUserPermission(permission) : {};
  }

  setPermission(permission) {
    this.permission = new BengalaUserPermission(permission);
  }

  /**
   *
   */
  getDatabase() {
    return `${this.prefix}${this.database || ''}`;
  }

  /**
   *
   */
  getCollection(collection) {
    return `${this.getDatabase()}-${this.decryptCollection(collection) || ''}`;
  }

  /**
   *
   */
  decryptCollection(collection) {
    let decoded = decodeURIComponent(this.getCollectionByName(collection));

    return Buffer.from(decoded, 'base64').toString();
  }

  /**
   *
   */
  getCollectionByName(value) {
    return this.collections[this.collections.indexOf(value)];
  }
}

module.exports = BengalaUser;
