/**
 * _beng$wid: website ID
 * _beng$uid: user ID / server socket ID
 * _beng$pid: page ID
 */
var _bengala = (function() {
  'use strict';

  var _protected = {
    create: function(uri) {
      if (window.WebSocket) {
        try {
          return new WebSocket(uri);
        } catch (error) {
          console.error('Failed to open WebSocket:', error);
          return false;
        }
      } else {
        console.warn('WebSocket not supported');
        return false;
      }
    },

    errorHandler: function(error) {
      console.error('WebSocket error: ', error);
    },

    closeHandler: function() {
      console.info('WebSocket is closed');
    },

    connect: function(ws, clock, bengala) {
      ws.onmessage = function(message) {
        var data;

        try {
          data = JSON.parse(message.data);
        } catch (e) {
          return;
        }

        if (data.uid != null && bengala.$uid == null) {
          bengala.setUserId(data.uid);
        }
      };

      ws.onerror = this.errorHandler;
      ws.onclose = this.closeHandler;

      ws.onopen = function() {
        console.info('WebSocket is connected');

        var init = {
          ts: Date.now(),
          wid: bengala.$wid,
          pid: bengala.$pid()
        };

        if (bengala.checkUserId()) {
          init.uid = bengala.$uid;
        }

        ws.send(JSON.stringify(init), function(error) {
          if (error == undefined) {
            return;
          } else {
            console.error('Async error: ' + error);
          }
        });
      };

      var int = setInterval(function() {
        var heart_beat = {
          ts: Date.now(),
          wid: bengala.$wid,
          uid: bengala.$uid,
          pid: bengala.$pid()
        };

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(heart_beat), function(error) {
            if (error == undefined) {
              return;
            } else {
              console.error('Async error: ' + error);
            }
          });
        } else {
          clearInterval(int);
        }
      }, clock);
    }
  };

  var bengala = {
    _beng: {
      prefix: 'id-user-beng_',

      $wid: null,
      $uid: null,
      $pid: function() {
        return encodeURIComponent(btoa(window.location.pathname));
      },
      setUserId: function(uid) {
        this.$uid = uid;
        var d = new Date();
        d.setTime(d.getTime() + (60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = this.prefix + this.$uid + '=' + this.$pid() + '; expires=' + expires + '; path=/';
      },
      checkUserId: function() {
        var cookies = document.cookie.split(';');
        let exist = false;

        if (cookies.length > 0) {
          for (var i = cookies.length - 1; i >= 0; i--) {
            var cookie = cookies[i].trim().split('=');

            if (cookie.length > 0) {
              var user = cookie[0].trim().split('_');

              if (user[0] == this.prefix.substring(0, this.prefix.length - 1)) {
                exist = true;
                this.$uid = user[1];
              }
            }
          }
        }

        return exist;
      }
    },

    domain: 'bengala.crystalware.test',
    ports: {
      'ws': 9080,
      'wss': 9443
    },

    getPath: function(secure = false) {
      var protocols = (function(object) {
        if (!Object.keys) {
          Object.keys = (function() {
            'use strict';
            var hasOwnProperty = Object.prototype.hasOwnProperty,
              hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
              dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
              ],
              dontEnumsLength = dontEnums.length;

            return function(obj) {
              if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                throw new TypeError('Object.keys called on non-object');
              }

              var result = [], prop, i;

              for (prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                  result.push(prop);
                }
              }

              if (hasDontEnumBug) {
                for (i = 0; i < dontEnumsLength; i++) {
                  if (hasOwnProperty.call(obj, dontEnums[i])) {
                    result.push(dontEnums[i]);
                  }
                }
              }
              return result;
            };
          }());
        }

        return Object.keys(object);
      })(this.ports);

      return ((!secure) ? protocols[0]: protocols[1])
        + '://' + this.domain + ':'
        + ((!secure) ? this.ports['ws']: this.ports['wss']);
    },

    clockRate: 1000,

    v: function() {
      return '0.0.1';
    },

    init: function() {
      this.wait();
    },

    wait: function() {
      if (typeof _beng$wid !== 'undefined' && _beng$wid !== null && _beng$wid !== false) {
        this._beng.$wid = _beng$wid;
      }

      if (this._beng.$wid !== null) {
        var ws = _protected.create(this.getPath());

        if (ws != false) {
          _protected.connect(ws, this.clockRate, this._beng);
        }
      } else {
        setTimeout(this.wait.bind(this), 250);
      }
    },
  };

  // return bengala;
  return Object.freeze(bengala);
})();

_bengala.init();
