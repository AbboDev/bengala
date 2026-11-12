import type { MongoClientOptions } from 'mongodb';

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

export type TransportType = 'auto' | 'websocket' | 'http';

export interface TrackerClientOptions {
  wid?: string;
  transport?: TransportType;
  wsUrl?: string;
  httpUrl?: string;
  clockRate?: number;
}

// Configuration for WebSocket server
export interface BengalaServerConfiguration {
  host?: string;
  port?: number;
  path?: string;
  noServer?: boolean;
  clientTracking?: boolean;
  verifyClient?: (info: {
    origin: string;
    secure: boolean;
    req?: unknown;
  }) => boolean;
  [key: string]: unknown;
}
