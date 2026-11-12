import uniqid from 'uniqid';
import BengalaUserPermission from './bengala-user-permission';
import type { UserPermissionConfig } from '../types';

export class BengalaUser {
  public database: string;
  public collections: string[];
  public prefix: string;
  public identifier: string;
  public permission: BengalaUserPermission;

  constructor(
    database: string,
    collection?: string,
    identifier: string | null = null,
    prefix = 'beng-',
    permission: UserPermissionConfig | null = null
  ) {
    this.database = database;
    this.collections = collection ? [collection] : [];
    this.prefix = prefix;
    this.identifier = identifier || uniqid();
    this.permission = permission
      ? new BengalaUserPermission(permission)
      : new BengalaUserPermission({});
  }

  setPermission(permission: UserPermissionConfig): void {
    this.permission = new BengalaUserPermission(permission);
  }

  getDatabase(): string {
    return `${this.prefix}${this.database || ''}`;
  }

  getCollection(collection?: string): string {
    if (collection && !this.collections.includes(collection)) {
      this.collections.push(collection);
    }
    return `${this.getDatabase()}-${this.decryptCollection(collection) || ''}`;
  }

  decryptCollection(collection?: string): string {
    if (!collection) {
      return '';
    }
    const decoded = decodeURIComponent(collection);
    return Buffer.from(decoded, 'base64').toString('utf8');
  }

  getCollectionByName(value: string): string | undefined {
    return this.collections[this.collections.indexOf(value)];
  }
}

export default BengalaUser;
