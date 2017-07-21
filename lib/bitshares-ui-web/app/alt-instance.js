"use strict";

exports.__esModule = true;

var _alt = require("alt");

var _alt2 = _interopRequireDefault(_alt);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var alt = new _alt2.default();

// DEBUG log all action events
// alt.dispatcher.register(console.log.bind(console, 'alt.dispatcher'))

exports.default = alt;