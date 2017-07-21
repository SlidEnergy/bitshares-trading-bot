//import * as Logger from 'log4js'
var log4js = require('log4js');

log4js.configure({
  appenders: {
    cheeseLogs: { type: 'file', filename: 'cheese.log' },
    console: { type: 'console' }
  },
    categories: {
    debug: { appenders: ['console'], level: 'trace' },
    prod: { appenders: ['console', 'cheeseLogs'], level: 'info' },
    default: { appenders: ['console', 'cheeseLogs'], level: 'trace' }
  }
});

let categories = process.argv.some(x=>x == '-debug') ? 'debug' : 'prod';

let logger = log4js.getLogger(categories);

exports.default = logger;