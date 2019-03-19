/**
 * _beng$wid: website ID
 * _beng$uid: user ID / server socket ID
 * _beng$pid: page ID
 */
(function(debug) {
  var _beng$wid;
  var _beng$uid;
  var _beng$pid = btoa(window.location.pathname);

  var domain = 'bengala.crystalware.test';
  var api = {
    'auth': '/auth'
  };

  var ports = {
    'ws': 9080,
    'wss': 9443,
    'http': 80,
    'https': 443,
    'dev': 3000,
  };

  var clockRate = 1000;

  function waitId() {
    if (typeof _beng$wid !== "undefined") {
      if (debug) var listener = document.getElementById('listener');

      if (!Date.now) {
        Date.now = function() {
          return new Date().getTime();
        }
      }

      if (window.WebSocket) {
        var ws = new WebSocket('ws://bengala.crystalware.test:9080');

        ws.onmessage = function(message) {
          let data = message.data;

          try {
            data = JSON.parse(message.data);
          } catch (e) {
            if (debug) console.warn('Error during parse message to JSON');
          } finally {
            if (debug) console.log(data);
            if (debug) debuggerMsg(message);

            if (_beng$uid === undefined && data.uid !== undefined && data.uid !== false) {
              _beng$uid = data.uid;
              if (debug) console.log(_beng$uid);
            }
          }
        };

        ws.onerror = function(error) {
          console.error('WebSocket error: ', error);
        };

        ws.onclose = function() {
          if (debug) console.info('WebSocket is closed...');
        };

        ws.onopen = function() {
          if (debug) console.info('WebSocket is connected...');

          var init = {ts: Date.now(), wid: _beng$wid, pid: _beng$pid};
          ws.send(JSON.stringify(init));
        };

        var int = setInterval(function() {
          if (debug) console.log(ws.readyState);
          var heart_beat = {
            ts: Date.now(),
            wid: _beng$wid,
            uid: _beng$uid,
            pid: _beng$pid
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
        }, clockRate);
      } else {
        var ws;
        console.warn('WebSocket not supported');
      }
    } else {
      setTimeout(waitId, 250);
    }
  }

  function debuggerMsg(msg) {
    var node = document.createElement("LI");
    var textnode = document.createTextNode(msg.data);
    node.appendChild(textnode);

    listener.appendChild(node);
  }

  waitId();
})(true);
