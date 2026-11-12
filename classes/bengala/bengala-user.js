'use strict';

const uniqid = require('uniqid');
const BengalaUserPermission = require('./bengala-user-permission');

class BengalaUser {
  constructor(
    database,
    collection,
    identifier = null,
    prefix = 'beng-',
    permission = null
  ) {
    this.database = database;
    this.collections = collection ? [collection] : [];
    this.prefix = prefix;
    this.identifier = identifier || uniqid();

    this.permission = permission ? new BengalaUserPermission(permission) : {};
  }

  setPermission(permission) {
    this.permission = new BengalaUserPermission(permission);
  }

  getDatabase() {
    return `${this.prefix}${this.database || ''}`;
  }

  getCollection(collection) {
    if (collection && !this.collections.includes(collection)) {
      this.collections.push(collection);
    }
    return `${this.getDatabase()}-${this.decryptCollection(collection) || ''}`;
  }

  decryptCollection(collection) {
    if (!collection) return '';
    const decoded = decodeURIComponent(collection);
    return Buffer.from(decoded, 'base64').toString('utf8');
  }

  getCollectionByName(value) {
    return this.collections[this.collections.indexOf(value)];
  }
}

module.exports = BengalaUser;
