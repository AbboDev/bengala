/**
 * _beng$id: website ID
 * $beng_id: current user ID
 * _bengçid: current page ID
 */
(function(debug) {
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

  function waitId() {
    if (debug) console.log(typeof _beng_id);

    if (typeof _beng$id !== "undefined") {
      if (debug) var listener = document.getElementById('listener');

      if (!Date.now) {
        Date.now = function() {
          return new Date().getTime();
        }
      }

      var xhr = (window.XMLHttpRequest)
        ? new XMLHttpRequest()
        : new ActiveXObject("Microsoft.XMLHTTP");
      xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          if (debug) console.log(this);
        }
      };
      xhr.open('POST', domain + 'api/' + api.auth, true);
      xhr.send();

      if (window.WebSocket) {
        var ws = new WebSocket('ws://bengala.crystalware.test:9080');

        ws.onmessage = function(msg) {
          if (debug) console.log(msg.data);
          if (debug) debuggerMsg(msg);

          ws.send(_beng$id);
        };

        ws.onerror = function(error) {
          console.error('WebSocket error: ', error);
        };

        ws.onclose = function() {

        };

        ws.onopen = function() {
          if (debug) console.log('websocket is connected ...');

          var init = {ts: Date.now(), ci: _beng$id}
          ws.send(JSON.stringify(init));
        };

        var int = setInterval(function() {
          if (debug) console.log(ws.readyState);
          var heart_beat = {ts: Date.now(), ci: _beng$id, ui:}

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(heart_beat), function(error) {
              if (error == undefined) {
                return;
              } else {
                console.log('Async error: ' + error);
              }
            });
          } else {
            clearInterval(int);
          }
        }, 1000);
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
