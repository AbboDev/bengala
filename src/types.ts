import type { MongoClientOptions } from 'mongodb';
import type { ServerOptions as WsServerOptions } from 'ws';

export interface MongoConfiguration {
  uri?: string;
  protocol?: string;
  domain?: string;
  port?: number;
  user?: string;
  password?: string;
  options?: string | Record<string, string>;
  prefix?: string;
  clientOptions?: MongoClientOptions;
}

export type BengalaServerConfiguration = WsServerOptions;

export interface UserPermissionConfig {
  passive_mode?: boolean;
  permanent_cookie?: boolean;
  refresh_rate?: number;
}

export interface TimelogPayload {
  ts?: number | null;
  uid?: string;
  [key: string]: unknown;
}

export interface BengalaIncomingMessage {
  wid?: string;
  pid?: string;
  uid?: string;
  ts?: number;
  [key: string]: unknown;
}
