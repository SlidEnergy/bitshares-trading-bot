"use strict";

exports.__esModule = true;
exports.WithdrawAddresses = undefined;
exports.fetchCoins = fetchCoins;
exports.fetchBridgeCoins = fetchBridgeCoins;
exports.getDepositLimit = getDepositLimit;
exports.estimateOutput = estimateOutput;
exports.getActiveWallets = getActiveWallets;
exports.requestDepositAddress = requestDepositAddress;
exports.getBackedCoins = getBackedCoins;
exports.validateAddress = validateAddress;

var _localStorage = require("./localStorage");

var _localStorage2 = _interopRequireDefault(_localStorage);

var _apiConfig = require("api/apiConfig");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var blockTradesStorage = new _localStorage2.default("");

function fetchCoins() {
    var url = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _apiConfig.blockTradesAPIs.BASE_OL + _apiConfig.blockTradesAPIs.COINS_LIST;

    return fetch(url).then(function (reply) {
        return reply.json().then(function (result) {
            return result;
        });
    }).catch(function (err) {
        console.log("error fetching blocktrades list of coins", err, url);
    });
}

function fetchBridgeCoins() {
    var baseurl = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _apiConfig.blockTradesAPIs.BASE;

    var url = baseurl + _apiConfig.blockTradesAPIs.TRADING_PAIRS;
    return fetch(url, { method: "get", headers: new Headers({ "Accept": "application/json" }) }).then(function (reply) {
        return reply.json().then(function (result) {
            return result;
        });
    }).catch(function (err) {
        console.log("error fetching blocktrades list of coins", err, url);
    });
}

function getDepositLimit(inputCoin, outputCoin) {
    var url = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _apiConfig.blockTradesAPIs.BASE + _apiConfig.blockTradesAPIs.DEPOSIT_LIMIT;

    return fetch(url + "?inputCoinType=" + encodeURIComponent(inputCoin) + "&outputCoinType=" + encodeURIComponent(outputCoin), { method: "get", headers: new Headers({ "Accept": "application/json" }) }).then(function (reply) {
        return reply.json().then(function (result) {
            return result;
        });
    }).catch(function (err) {
        console.log("error fetching deposit limit of", inputCoin, outputCoin, err);
    });
}

function estimateOutput(inputAmount, inputCoin, outputCoin) {
    var url = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _apiConfig.blockTradesAPIs.BASE + _apiConfig.blockTradesAPIs.ESTIMATE_OUTPUT;

    return fetch(url + "?inputAmount=" + encodeURIComponent(inputAmount) + "&inputCoinType=" + encodeURIComponent(inputCoin) + "&outputCoinType=" + encodeURIComponent(outputCoin), { method: "get", headers: new Headers({ "Accept": "application/json" }) }).then(function (reply) {
        return reply.json().then(function (result) {
            return result;
        });
    }).catch(function (err) {
        console.log("error fetching deposit limit of", inputCoin, outputCoin, err);
    });
}

function getActiveWallets() {
    var url = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _apiConfig.blockTradesAPIs.BASE_OL + _apiConfig.blockTradesAPIs.ACTIVE_WALLETS;

    return fetch(url).then(function (reply) {
        return reply.json().then(function (result) {
            return result;
        });
    }).catch(function (err) {
        console.log("error fetching blocktrades active wallets", err, url);
    });
}

function requestDepositAddress(_ref) {
    var inputCoinType = _ref.inputCoinType,
        outputCoinType = _ref.outputCoinType,
        outputAddress = _ref.outputAddress,
        _ref$url = _ref.url,
        url = _ref$url === undefined ? _apiConfig.blockTradesAPIs.BASE_OL : _ref$url,
        stateCallback = _ref.stateCallback;

    var body = {
        inputCoinType: inputCoinType,
        outputCoinType: outputCoinType,
        outputAddress: outputAddress
    };

    var body_string = JSON.stringify(body);

    fetch(url + "/simple-api/initiate-trade", {
        method: "post",
        headers: new Headers({ "Accept": "application/json", "Content-Type": "application/json" }),
        body: body_string
    }).then(function (reply) {
        reply.json().then(function (json) {
            // console.log( "reply: ", json )
            var address = { "address": json.inputAddress || "unknown", "memo": json.inputMemo, error: json.error || null };
            if (stateCallback) stateCallback(address);
        }, function (error) {
            // console.log( "error: ",error  );
            if (stateCallback) stateCallback({ "address": "unknown", "memo": null });
        });
    }, function (error) {
        // console.log( "error: ",error  );
        if (stateCallback) stateCallback({ "address": "unknown", "memo": null });
    }).catch(function (err) {
        console.log("fetch error:", err);
    });
}

function getBackedCoins(_ref2) {
    var allCoins = _ref2.allCoins,
        tradingPairs = _ref2.tradingPairs,
        backer = _ref2.backer;

    var coins_by_type = {};
    allCoins.forEach(function (coin_type) {
        return coins_by_type[coin_type.coinType] = coin_type;
    });

    var allowed_outputs_by_input = {};
    tradingPairs.forEach(function (pair) {
        if (!allowed_outputs_by_input[pair.inputCoinType]) allowed_outputs_by_input[pair.inputCoinType] = {};
        allowed_outputs_by_input[pair.inputCoinType][pair.outputCoinType] = true;
    });

    var blocktradesBackedCoins = [];
    allCoins.forEach(function (coin_type) {
        if (coin_type.walletSymbol.startsWith(backer + ".") && coin_type.backingCoinType && coins_by_type[coin_type.backingCoinType]) {
            var isDepositAllowed = allowed_outputs_by_input[coin_type.backingCoinType] && allowed_outputs_by_input[coin_type.backingCoinType][coin_type.coinType];
            var isWithdrawalAllowed = allowed_outputs_by_input[coin_type.coinType] && allowed_outputs_by_input[coin_type.coinType][coin_type.backingCoinType];

            blocktradesBackedCoins.push({
                name: coins_by_type[coin_type.backingCoinType].name,
                walletType: coins_by_type[coin_type.backingCoinType].walletType,
                backingCoinType: coins_by_type[coin_type.backingCoinType].walletSymbol,
                symbol: coin_type.walletSymbol,
                supportsMemos: coins_by_type[coin_type.backingCoinType].supportsOutputMemos,
                depositAllowed: isDepositAllowed,
                withdrawalAllowed: isWithdrawalAllowed
            });
        }
    });
    return blocktradesBackedCoins;
}

function validateAddress(_ref3) {
    var _ref3$url = _ref3.url,
        url = _ref3$url === undefined ? _apiConfig.blockTradesAPIs.BASE : _ref3$url,
        walletType = _ref3.walletType,
        newAddress = _ref3.newAddress;

    if (!newAddress) return new Promise(function (res) {
        return res();
    });
    return fetch(url + "/wallets/" + walletType + "/address-validator?address=" + encodeURIComponent(newAddress), {
        method: "get",
        headers: new Headers({ "Accept": "application/json" })
    }).then(function (reply) {
        return reply.json().then(function (json) {
            return json.isValid;
        });
    }).catch(function (err) {
        console.log("validate error:", err);
    });
}

function hasWithdrawalAddress(wallet) {
    return blockTradesStorage.has("history_address_" + wallet);
}

function setWithdrawalAddresses(_ref4) {
    var wallet = _ref4.wallet,
        addresses = _ref4.addresses;

    blockTradesStorage.set("history_address_" + wallet, addresses);
}

function getWithdrawalAddresses(wallet) {
    return blockTradesStorage.get("history_address_" + wallet, []);
}

function setLastWithdrawalAddress(_ref5) {
    var wallet = _ref5.wallet,
        address = _ref5.address;

    blockTradesStorage.set("history_address_last_" + wallet, address);
}

function getLastWithdrawalAddress(wallet) {
    return blockTradesStorage.get("history_address_last_" + wallet, "");
}

var WithdrawAddresses = exports.WithdrawAddresses = {
    has: hasWithdrawalAddress,
    set: setWithdrawalAddresses,
    get: getWithdrawalAddresses,
    setLast: setLastWithdrawalAddress,
    getLast: getLastWithdrawalAddress
};