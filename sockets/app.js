/**
 *
 */

const uniqid = require('uniqid');
const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 9080});

wss.on('connection', (ws, req) => {
  ws.id = uniqid();
  ws.send(ws.id, (error) => {
    if (error == undefined) {
      return;
    } else {
      console.log('Async error: ' + error);
    }
  });

  let ip = req.headers['x-forwarded-for'];
  if (ip === undefined) {
    ip = req.connection.remoteAddress;
  } else {
    ip = ip.split(/\s*,\s*/)[0];
  }
  ws.ip = ip;

  console.log('IP: %s', ws.ip);
  console.log('ID: %s', ws.id);

  ws.on('message', (message) => {
    console.log('Received: %s', message);
    try {
      JSON.parse(message);
    } catch (e) {

    } finally {

    }
  });

  ws.on('error', (error) => {
    console.log('Found error: ', err);
  });

  ws.on('close', () => {
    console.log('Connection closed');
  });

  // let int = setInterval(() => {
  //   if (ws.readyState === WebSocket.OPEN) {
  //     console.log('Send to: %s', ws.id);
  //     ws.send(`${Date.now()}`, (error) => {
  //       if (error == undefined) {
  //         return;
  //       } else {
  //         console.log('Async error: ' + error);
  //       }
  //     });
  //   } else {
  //     clearInterval(int);
  //   }
  // }, 1000);
});

module.exports = wss;
