"use strict";

var GenesisFilter = require("chain/GenesisFilter");

onmessage = function onmessage(event) {
    try {
        console.log("GenesisFilterWorker start");
        var _event$data = event.data,
            account_keys = _event$data.account_keys,
            bloom_filter = _event$data.bloom_filter;

        var genesis_filter = new GenesisFilter(bloom_filter);
        genesis_filter.filter(account_keys, function (status) {
            if (status.success) {
                postMessage({ account_keys: account_keys, status: status });
                console.log("GenesisFilterWorker done");
                return;
            }
            postMessage({ status: status });
        });
    } catch (e) {
        console.error("GenesisFilterWorker", e);
    }
};