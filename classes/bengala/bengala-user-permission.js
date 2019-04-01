/**
 *
 */
'use strict';

class BengalaUserPermission {
  /**
   *
   */
  constructor(permission) {
    // Automatically read page and create collection if not present
    this.passive_mode = permission.passive_mode || true;

    //
    this.permanent_cookie = permission.permanent_cookie || false;

    //
    this.refresh_rate = permission.refresh_rate || 1000;
  }
}

module.exports = BengalaUserPermission;
