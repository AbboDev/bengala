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
    this.collection = collection;
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
  getCollection() {
    return `${this.getDatabase()}-${this.decryptPage() || ''}`;
  }

  /**
   *
   */
  decryptPage() {
    return Buffer.from(decodeURIComponent(this.collection), 'base64').toString();
  }
}

module.exports = BengalaUser;
