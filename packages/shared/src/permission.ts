import type { UserPermissionConfig } from './types';

export class BengalaUserPermission {
  public passive_mode: boolean;
  public permanent_cookie: boolean;
  public refresh_rate: number;

  constructor(permission: UserPermissionConfig = {}) {
    this.passive_mode = permission.passive_mode ?? true;
    this.permanent_cookie = permission.permanent_cookie ?? false;
    this.refresh_rate = permission.refresh_rate ?? 1000;
  }
}

export default BengalaUserPermission;
