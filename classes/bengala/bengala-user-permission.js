/**
 *
 */
'use strict';

class BengalaUserPermission {
  /**
   *
   */
  constructor() {
    this.passive_mode = true; // Automatically read page and create collection if not present
    this.permanent_cookie = false;
    this.refresh_rate = 1000;
  }
}

module.exports = BengalaUserPermission;
