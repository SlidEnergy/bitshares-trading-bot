"use strict";

var _es = require("bitsharesjs/es");

onmessage = function onmessage(event) {
    try {
        console.log("AddressIndexWorker start");
        var _event$data = event.data,
            pubkeys = _event$data.pubkeys,
            address_prefix = _event$data.address_prefix;

        var results = [];
        for (var _iterator = pubkeys, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var pubkey = _ref;

            results.push(_es.key.addresses(pubkey, address_prefix));
        }
        postMessage(results);
        console.log("AddressIndexWorker done");
    } catch (e) {
        console.error("AddressIndexWorker", e);
    }
};