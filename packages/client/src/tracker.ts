import type { TransportType } from '@bengala/shared';

declare global {
  interface Window {
    _beng$wid?: string;
    _beng$uid?: string;
    _beng$pid?: string;
    _beng$transport?: TransportType;
    _beng$wsUrl?: string;
    _beng$httpUrl?: string;
    _bengala?: BengalaTrackerInstance;
  }
}

export interface TrackerSession {
  prefix: string;
  $wid: string | null;
  $uid: string | null;
  $pid: () => string;
  setUserId: (uid: string) => void;
  checkUserId: () => boolean;
}

export interface BengalaTrackerInstance {
  transport: TransportType;
  wsUrl: string;
  httpUrl: string;
  clockRate: number;
  init: () => void;
  version: () => string;
  sendBeacon: () => void;
}

export const createTracker = (): BengalaTrackerInstance => {
  const session: TrackerSession = {
    prefix: 'id-user-beng_',
    $wid: null,
    $uid: null,

    $pid: (): string => {
      const path =
        typeof window !== 'undefined' ? window.location.pathname : '/';
      return encodeURIComponent(btoa(path));
    },

    setUserId: function (uid: string): void {
      this.$uid = uid;
      if (typeof document !== 'undefined') {
        const d = new Date();
        d.setTime(d.getTime() + 60 * 60 * 1000);
        const expires = 'expires=' + d.toUTCString();
        document.cookie = `${this.prefix}${this.$uid}=${this.$pid()}; expires=${expires}; path=/`;
      }
    },

    checkUserId: function (): boolean {
      if (typeof document === 'undefined') {
        return false;
      }
      const cookies = document.cookie.split(';');
      let exist = false;

      for (let i = cookies.length - 1; i >= 0; i--) {
        const cookie = cookies[i].trim().split('=');
        if (cookie.length > 0) {
          const user = cookie[0].trim().split('_');
          const expectedPrefix = this.prefix.substring(
            0,
            this.prefix.length - 1
          );
          if (user[0] === expectedPrefix && user[1]) {
            exist = true;
            this.$uid = user[1];
          }
        }
      }

      return exist;
    }
  };

  const getHostname = (): string => {
    return typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'localhost';
  };

  const isSecure = (): boolean => {
    return (
      typeof window !== 'undefined' && window.location.protocol === 'https:'
    );
  };

  const defaultWsUrl = `${isSecure() ? 'wss' : 'ws'}://${getHostname()}:9080`;
  const defaultHttpUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/track`
      : 'http://localhost:3000/api/track';

  const activeTransport: TransportType =
    typeof window !== 'undefined' && window._beng$transport
      ? window._beng$transport
      : 'auto';

  let wsInstance: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      ts: Date.now(),
      wid: session.$wid,
      pid: session.$pid()
    };
    if (session.checkUserId() && session.$uid) {
      payload.uid = session.$uid;
    }
    return payload;
  };

  const sendHttpPing = async (): Promise<void> => {
    const payload = buildPayload();
    const endpoint = tracker.httpUrl;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      });

      if (response.ok) {
        const data = (await response.json()) as { uid?: string };
        if (data.uid && !session.$uid) {
          session.setUserId(data.uid);
        }
      }
    } catch (err) {
      console.warn('Bengala HTTP ping failed:', err);
    }
  };

  const startHttpLoop = (): void => {
    console.info('Bengala running on Low-Budget HTTP transport');
    void sendHttpPing();

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    // Low-budget interval: 15 seconds
    heartbeatTimer = setInterval(() => {
      void sendHttpPing();
    }, 15000);
  };

  const startWebSocket = (): void => {
    console.info('Bengala attempting Fast-Refresh WebSocket transport...');
    try {
      wsInstance = new WebSocket(tracker.wsUrl);

      wsInstance.onopen = () => {
        console.info('Bengala WebSocket connection established');
        wsInstance?.send(JSON.stringify(buildPayload()));

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
        }
        // Fast-refresh interval: 1000ms
        heartbeatTimer = setInterval(() => {
          if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
            wsInstance.send(JSON.stringify(buildPayload()));
          }
        }, tracker.clockRate);
      };

      wsInstance.onmessage = (message: MessageEvent<string>) => {
        try {
          const data = JSON.parse(message.data) as { uid?: string };
          if (data.uid && !session.$uid) {
            session.setUserId(data.uid);
          }
        } catch {
          // ignore non-json
        }
      };

      wsInstance.onerror = (error) => {
        console.warn('Bengala WebSocket error:', error);
        if (activeTransport === 'auto') {
          console.info('Falling back to Low-Budget HTTP transport...');
          startHttpLoop();
        }
      };

      wsInstance.onclose = () => {
        if (activeTransport === 'websocket') {
          console.info('WebSocket closed. Reconnecting in 3s...');
          setTimeout(startWebSocket, 3000);
        }
      };
    } catch (error) {
      console.warn('Failed to initialize WebSocket:', error);
      if (activeTransport === 'auto') {
        startHttpLoop();
      }
    }
  };

  const tracker: BengalaTrackerInstance = {
    transport: activeTransport,
    wsUrl:
      typeof window !== 'undefined' && window._beng$wsUrl
        ? window._beng$wsUrl
        : defaultWsUrl,
    httpUrl:
      typeof window !== 'undefined' && window._beng$httpUrl
        ? window._beng$httpUrl
        : defaultHttpUrl,
    clockRate: 1000,

    version: (): string => '0.0.2',

    sendBeacon: (): void => {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const payload = JSON.stringify(buildPayload());
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(tracker.httpUrl, blob);
      } else {
        void sendHttpPing();
      }
    },

    init: function (): void {
      const waitAndStart = (): void => {
        if (
          typeof window !== 'undefined' &&
          window._beng$wid !== undefined &&
          window._beng$wid !== null &&
          window._beng$wid !== ''
        ) {
          session.$wid = window._beng$wid;
        }

        if (session.$wid !== null) {
          if (this.transport === 'http') {
            startHttpLoop();
          } else {
            // 'auto' or 'websocket'
            startWebSocket();
          }

          // Register exit hooks for guaranteed delivery via sendBeacon
          if (typeof window !== 'undefined') {
            window.addEventListener('pagehide', () => this.sendBeacon());
            window.addEventListener('beforeunload', () => this.sendBeacon());
          }
        } else {
          setTimeout(waitAndStart, 250);
        }
      };

      waitAndStart();
    }
  };

  return Object.freeze(tracker);
};

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  const instance = createTracker();
  window._bengala = instance;
  instance.init();
}

export default createTracker;
