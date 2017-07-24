const path = require('path');
module.exports = function(lib) {
    lib.private_keys = { "account": "WIF" };
    lib.wssapi = "wss://bitshares.openledger.info/ws";
}