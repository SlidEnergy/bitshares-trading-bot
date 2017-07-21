"use strict";

var _es = require("bitsharesjs/es");

require("babel-polyfill");


onmessage = function onmessage(event) {
    try {
        console.log("AesWorker start");
        var _event$data = event.data,
            private_plainhex_array = _event$data.private_plainhex_array,
            iv = _event$data.iv,
            key = _event$data.key;

        var aes = new _es.Aes(iv, key);
        var private_cipherhex_array = [];
        for (var _iterator = private_plainhex_array, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var private_plainhex = _ref;

            var private_cipherhex = aes.encryptHex(private_plainhex);
            private_cipherhex_array.push(private_cipherhex);
        }
        postMessage(private_cipherhex_array);
        console.log("AesWorker done");
    } catch (e) {
        console.error("AesWorker", e);
    }
};