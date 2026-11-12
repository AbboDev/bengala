declare global {
  interface Window {
    _beng$wid?: string;
    _beng$uid?: string;
    _beng$pid?: string;
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
  domain: string;
  ports: {
    ws: number;
    wss: number;
  };
  clockRate: number;
  init: () => void;
  version: () => string;
  getPath: (secure?: boolean) => string;
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

  const tracker: BengalaTrackerInstance = {
    domain:
      typeof window !== 'undefined' &&
      window.location.hostname &&
      window.location.hostname !== ''
        ? window.location.hostname
        : 'localhost',
    ports: {
      ws: 9080,
      wss: 9443
    },
    clockRate: 1000,

    version: (): string => '0.0.2',

    getPath: function (secure = false): string {
      const isHttps =
        typeof window !== 'undefined' && window.location.protocol === 'https:';
      const useSecure = secure || isHttps;
      const protocol = useSecure ? 'wss' : 'ws';
      const port = useSecure ? this.ports.wss : this.ports.ws;
      return `${protocol}://${this.domain}:${port}`;
    },

    init: function (): void {
      const connect = (ws: WebSocket): void => {
        ws.onmessage = (message: MessageEvent<string>) => {
          try {
            const data = JSON.parse(message.data) as { uid?: string };
            if (data.uid != null && session.$uid == null) {
              session.setUserId(data.uid);
            }
          } catch {
            // ignore non-json messages
          }
        };

        ws.onerror = (error) => {
          console.error('Bengala WebSocket error:', error);
        };

        ws.onclose = () => {
          console.info('Bengala WebSocket connection closed');
        };

        ws.onopen = () => {
          console.info('Bengala WebSocket connection established');

          const initPayload: Record<string, unknown> = {
            ts: Date.now(),
            wid: session.$wid,
            pid: session.$pid()
          };

          if (session.checkUserId() && session.$uid) {
            initPayload.uid = session.$uid;
          }

          ws.send(JSON.stringify(initPayload));
        };

        const intervalId = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const heartbeat = {
              ts: Date.now(),
              wid: session.$wid,
              uid: session.$uid,
              pid: session.$pid()
            };
            ws.send(JSON.stringify(heartbeat));
          } else {
            clearInterval(intervalId);
          }
        }, this.clockRate);
      };

      const waitAndConnect = (): void => {
        if (
          typeof window !== 'undefined' &&
          window._beng$wid !== undefined &&
          window._beng$wid !== null &&
          window._beng$wid !== ''
        ) {
          session.$wid = window._beng$wid;
        }

        if (session.$wid !== null) {
          try {
            const ws = new WebSocket(this.getPath());
            connect(ws);
          } catch (error) {
            console.error('Failed to open Bengala WebSocket:', error);
          }
        } else {
          setTimeout(waitAndConnect, 250);
        }
      };

      waitAndConnect();
    }
  };

  return Object.freeze(tracker);
};

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
  const instance = createTracker();
  window._bengala = instance;
  instance.init();
}

export default createTracker;
