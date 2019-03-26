/**
 *
 */
'use strict';

const Bengala = require('./bengala/bengala-server');

Bengala.Mongo = require('./bengala/bengala-mongo');
// Bengala.WSS = require('./bengala/bengala-wss');

module.exports = Bengala;
