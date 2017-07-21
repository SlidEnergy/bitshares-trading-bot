"use strict";

exports.__esModule = true;

var _altInstance = require("./../alt-instance");

var _altInstance2 = _interopRequireDefault(_altInstance);

var _bitsharesjs = require("bitsharesjs");

var _bitsharesjsWs = require("bitsharesjs-ws");

var _market_utils = require("./../../lib/common/market_utils");

var _market_utils2 = _interopRequireDefault(_market_utils);

var _account_utils = require("./../../lib/common/account_utils");

var _account_utils2 = _interopRequireDefault(_account_utils);

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
//import WalletApi from "./../api/WalletApi";
//import WalletDb from "./../stores/WalletDb";


var subs = {};
var currentBucketSize = void 0;
//let wallet_api = new WalletApi();
var marketStats = {};
var statTTL = 60 * 2 * 1000; // 2 minutes

var cancelBatchIDs = _immutable2.default.List();
var dispatchCancelTimeout = null;
var cancelBatchTime = 500;

var subBatchResults = _immutable2.default.List();
var dispatchSubTimeout = null;
var subBatchTime = 500;

function clearBatchTimeouts() {
    clearTimeout(dispatchCancelTimeout);
    clearTimeout(dispatchSubTimeout);
    dispatchCancelTimeout = null;
    dispatchSubTimeout = null;
}

var MarketsActions = function () {
    function MarketsActions() {
        _classCallCheck(this, MarketsActions);
    }

    MarketsActions.prototype.changeBase = function changeBase(market) {
        clearBatchTimeouts();
        return market;
    };

    MarketsActions.prototype.changeBucketSize = function changeBucketSize(size) {
        return size;
    };

    MarketsActions.prototype.getMarketStats = function getMarketStats(base, quote) {
        return function (dispatch) {
            var market = quote.get("id") + "_" + base.get("id");
            var marketName = quote.get("symbol") + "_" + base.get("symbol");
            var now = new Date();
            var endDate = new Date();
            var startDateShort = new Date();
            endDate.setDate(endDate.getDate() + 1);
            startDateShort = new Date(startDateShort.getTime() - 3600 * 50 * 1000);

            var refresh = false;

            if (marketStats[market]) {
                if (now - marketStats[market].lastFetched < statTTL) {
                    return false;
                } else {
                    refresh = true;
                }
            }

            if (!marketStats[market] || refresh) {
                marketStats[market] = {
                    lastFetched: new Date()
                };
                Promise.all([_bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), 3600, startDateShort.toISOString().slice(0, -5), endDate.toISOString().slice(0, -5)]), _bitsharesjsWs.Apis.instance().history_api().exec("get_fill_order_history", [base.get("id"), quote.get("id"), 1])]).then(function (result) {
                    dispatch({ history: result[0], last: result[1], market: marketName, base: base, quote: quote });
                });
            }
        };
    };

    MarketsActions.prototype.switchMarket = function switchMarket() {
        return true;
    };

    MarketsActions.prototype.subscribeMarket = function subscribeMarket(base, quote, bucketSize) {
        clearBatchTimeouts();
        var subID = quote.get("id") + "_" + base.get("id");

        var _marketUtils$isMarket = _market_utils2.default.isMarketAsset(quote, base),
            isMarketAsset = _marketUtils$isMarket.isMarketAsset,
            marketAsset = _marketUtils$isMarket.marketAsset,
            inverted = _marketUtils$isMarket.inverted;

        var bucketCount = 200;
        // let lastLimitOrder = null;
        return function (dispatch) {

            var subscription = function subscription(subResult) {
                /* In the case of many market notifications arriving at the same time,
                * we queue them in a batch here and dispatch them all at once at a frequency
                * defined by "subBatchTime"
                */
                if (!dispatchSubTimeout) {
                    subBatchResults = subBatchResults.concat(subResult);

                    dispatchSubTimeout = setTimeout(function () {
                        var hasLimitOrder = false;
                        var onlyLimitOrder = true;
                        var hasFill = false;

                        // // We get two notifications for each limit order created, ignore the second one
                        // if (subResult.length === 1 && subResult[0].length === 1 && subResult[0][0] === lastLimitOrder) {
                        //     return;
                        // }

                        // Check whether the market had a fill order, and whether it only has a new limit order
                        subBatchResults.forEach(function (result) {

                            result.forEach(function (notification) {
                                if (typeof notification === "string") {
                                    var split = notification.split(".");
                                    if (split.length >= 2 && split[1] === "7") {
                                        hasLimitOrder = true;
                                    } else {
                                        onlyLimitOrder = false;
                                    }
                                } else {
                                    onlyLimitOrder = false;
                                    if (notification.length === 2 && notification[0] && notification[0][0] === 4) {
                                        hasFill = true;
                                    }
                                }
                            });
                        });

                        var callPromise = null,
                            settlePromise = null;

                        // Only check for call and settle orders if either the base or quote is the CORE asset
                        if (isMarketAsset) {
                            callPromise = _bitsharesjsWs.Apis.instance().db_api().exec("get_call_orders", [marketAsset.id, 200]);
                            settlePromise = _bitsharesjsWs.Apis.instance().db_api().exec("get_settle_orders", [marketAsset.id, 200]);
                        }

                        var startDate = new Date();
                        var startDate2 = new Date();
                        var startDate3 = new Date();
                        var endDate = new Date();
                        var startDateShort = new Date();
                        startDate = new Date(startDate.getTime() - bucketSize * bucketCount * 1000);
                        startDate2 = new Date(startDate2.getTime() - bucketSize * bucketCount * 2000);
                        startDate3 = new Date(startDate3.getTime() - bucketSize * bucketCount * 3000);
                        endDate.setDate(endDate.getDate() + 1);
                        startDateShort = new Date(startDateShort.getTime() - 3600 * 50 * 1000);

                        subBatchResults = subBatchResults.clear();
                        dispatchSubTimeout = null;
                        // Selectively call the different market api calls depending on the type
                        // of operations received in the subscription update
                        Promise.all([_bitsharesjsWs.Apis.instance().db_api().exec("get_limit_orders", [base.get("id"), quote.get("id"), 200]), onlyLimitOrder ? null : callPromise, onlyLimitOrder ? null : settlePromise, !hasFill ? null : _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), bucketSize, startDate.toISOString().slice(0, -5), endDate.toISOString().slice(0, -5)]), !hasFill ? null : _bitsharesjsWs.Apis.instance().history_api().exec("get_fill_order_history", [base.get("id"), quote.get("id"), 200]), !hasFill ? null : _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), 3600, startDateShort.toISOString().slice(0, -5), endDate.toISOString().slice(0, -5)]), !hasFill ? null : _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), bucketSize, startDate2.toISOString().slice(0, -5), startDate.toISOString().slice(0, -5)]), !hasFill ? null : _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), bucketSize, startDate3.toISOString().slice(0, -5), startDate2.toISOString().slice(0, -5)])]).then(function (results) {
                            var data1 = results[6] || [];
                            var data2 = results[7] || [];
                            dispatch({
                                limits: results[0],
                                calls: !onlyLimitOrder && results[1],
                                settles: !onlyLimitOrder && results[2],
                                price: hasFill && data1.concat(data2.concat(results[3])),
                                history: hasFill && results[4],
                                recent: hasFill && results[5],
                                market: subID,
                                base: base,
                                quote: quote,
                                inverted: inverted
                            });
                        }).catch(function (error) {
                            console.log("Error in MarketsActions.subscribeMarket: ", error);
                        });
                    }, subBatchTime);
                } else {
                    subBatchResults = subBatchResults.concat(subResult);
                }
            };

            if (!subs[subID] || currentBucketSize !== bucketSize) {
                dispatch({ switchMarket: true });
                currentBucketSize = bucketSize;
                var callPromise = null,
                    settlePromise = null;

                if (isMarketAsset) {
                    callPromise = _bitsharesjsWs.Apis.instance().db_api().exec("get_call_orders", [marketAsset.id, 200]);
                    settlePromise = _bitsharesjsWs.Apis.instance().db_api().exec("get_settle_orders", [marketAsset.id, 200]);
                }

                var startDate = new Date();
                var startDate2 = new Date();
                var startDate3 = new Date();
                var endDate = new Date();
                var startDateShort = new Date();
                startDate = new Date(startDate.getTime() - bucketSize * bucketCount * 1000);
                startDate2 = new Date(startDate2.getTime() - bucketSize * bucketCount * 2000);
                startDate3 = new Date(startDate3.getTime() - bucketSize * bucketCount * 3000);
                startDateShort = new Date(startDateShort.getTime() - 3600 * 50 * 1000);
                endDate.setDate(endDate.getDate() + 1);
                if (__DEV__) console.time("Fetch market data");
                return Promise.all([_bitsharesjsWs.Apis.instance().db_api().exec("subscribe_to_market", [subscription, base.get("id"), quote.get("id")]), _bitsharesjsWs.Apis.instance().db_api().exec("get_limit_orders", [base.get("id"), quote.get("id"), 200]), callPromise, settlePromise, _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), bucketSize, startDate.toISOString().slice(0, -5), endDate.toISOString().slice(0, -5)]), _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history_buckets", []), _bitsharesjsWs.Apis.instance().history_api().exec("get_fill_order_history", [base.get("id"), quote.get("id"), 200]), _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), 3600, startDateShort.toISOString().slice(0, -5), endDate.toISOString().slice(0, -5)]), _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), bucketSize, startDate2.toISOString().slice(0, -5), startDate.toISOString().slice(0, -5)]), _bitsharesjsWs.Apis.instance().history_api().exec("get_market_history", [base.get("id"), quote.get("id"), bucketSize, startDate3.toISOString().slice(0, -5), startDate2.toISOString().slice(0, -5)])]).then(function (results) {
                    var data1 = results[9] || [];
                    var data2 = results[8] || [];
                    subs[subID] = subscription;
                    if (__DEV__) console.timeEnd("Fetch market data");
                    dispatch({
                        limits: results[1],
                        calls: results[2],
                        settles: results[3],
                        price: data1.concat(data2.concat(results[4])),
                        buckets: results[5],
                        history: results[6],
                        recent: results[7],
                        market: subID,
                        base: base,
                        quote: quote,
                        inverted: inverted
                    });
                }).catch(function (error) {
                    console.log("Error in MarketsActions.subscribeMarket: ", error);
                });
            }
            return Promise.resolve(true);
        };
    };

    MarketsActions.prototype.clearMarket = function clearMarket() {
        clearBatchTimeouts();
        return true;
    };

    MarketsActions.prototype.unSubscribeMarket = function unSubscribeMarket(quote, base) {
        var subID = quote + "_" + base;
        clearBatchTimeouts();
        return function (dispatch) {
            if (subs[subID]) {
                return _bitsharesjsWs.Apis.instance().db_api().exec("unsubscribe_from_market", [subs[subID], quote, base]).then(function (unSubResult) {
                    delete subs[subID];
                    dispatch({ unSub: true });
                }).catch(function (error) {
                    subs[subID] = true;
                    console.log("Error in MarketsActions.unSubscribeMarket: ", error);
                    dispatch({ unSub: false, market: subID });
                });
            }
            return Promise.resolve(true);
        };
    };

    // createLimitOrder(account, sellAmount, sellAsset, buyAmount, buyAsset, expiration, isFillOrKill, fee_asset_id) {

    //     var tr = wallet_api.new_transaction();

    //     let feeAsset = ChainStore.getAsset(fee_asset_id);
    //     if( feeAsset.getIn(["options", "core_exchange_rate", "base", "asset_id"]) === "1.3.0" && feeAsset.getIn(["options", "core_exchange_rate", "quote", "asset_id"]) === "1.3.0" ) {
    //         fee_asset_id = "1.3.0";
    //     }

    //     tr.add_type_operation("limit_order_create", {
    //         fee: {
    //             amount: 0,
    //             asset_id: fee_asset_id
    //         },
    //         "seller": account,
    //         "amount_to_sell": {
    //             "amount": sellAmount,
    //             "asset_id": sellAsset.get("id")
    //         },
    //         "min_to_receive": {
    //             "amount": buyAmount,
    //             "asset_id": buyAsset.get("id")
    //         },
    //         "expiration": expiration,
    //         "fill_or_kill": isFillOrKill
    //     });

    //     return (dispatch) => {
    //         return WalletDb.process_transaction(tr, null, true).then(result => {
    //             dispatch(true);
    //             return true;
    //         })
    //         .catch(error => {
    //             console.log("order error:", error);
    //             dispatch({error});
    //             return {error};
    //         });
    //     };
    // }

    // createLimitOrder2(order) {
    //     var tr = wallet_api.new_transaction();

    //     // let feeAsset = ChainStore.getAsset(fee_asset_id);
    //     // if( feeAsset.getIn(["options", "core_exchange_rate", "base", "asset_id"]) === "1.3.0" && feeAsset.getIn(["options", "core_exchange_rate", "quote", "asset_id"]) === "1.3.0" ) {
    //     //     fee_asset_id = "1.3.0";
    //     // }

    //     order.setExpiration();
    //     order = order.toObject();

    //     tr.add_type_operation("limit_order_create", order);

    //     return WalletDb.process_transaction(tr, null, true).then(result => {
    //         return true;
    //     })
    //     .catch(error => {
    //         console.log("order error:", error);
    //         return {error};
    //     });
    // }

    // createPredictionShort(order, collateral, account, sellAmount, sellAsset, buyAmount, collateralAmount, buyAsset, expiration, isFillOrKill, fee_asset_id = "1.3.0") {

    //     var tr = wallet_api.new_transaction();

    //     // Set the fee asset to use
    //     fee_asset_id = accountUtils.getFinalFeeAsset(order.seller, "call_order_update", order.fee.asset_id);

    //     order.setExpiration();

    //     tr.add_type_operation("call_order_update", {
    //         "fee": {
    //             amount: 0,
    //             asset_id: fee_asset_id
    //         },
    //         "funding_account": order.seller,
    //         "delta_collateral": collateral.toObject(),
    //         "delta_debt": order.amount_for_sale.toObject(),
    //         "expiration": order.getExpiration()
    //     });

    //     tr.add_type_operation("limit_order_create", order.toObject());

    //     return WalletDb.process_transaction(tr, null, true).then(result => {
    //         return true;
    //     })
    //         .catch(error => {
    //             console.log("order error:", error);
    //             return {error};
    //         });
    // }

    // cancelLimitOrder(accountID, orderID) {
    //     // Set the fee asset to use
    //     let fee_asset_id = accountUtils.getFinalFeeAsset(accountID, "limit_order_cancel");

    //     var tr = wallet_api.new_transaction();
    //     tr.add_type_operation("limit_order_cancel", {
    //         fee: {
    //             amount: 0,
    //             asset_id: fee_asset_id
    //         },
    //         "fee_paying_account": accountID,
    //         "order": orderID
    //     });
    //     return WalletDb.process_transaction(tr, null, true)
    //     .catch(error => {
    //         console.log("cancel error:", error);
    //     });
    // }

    MarketsActions.prototype.cancelLimitOrderSuccess = function cancelLimitOrderSuccess(ids) {
        return function (dispatch) {
            /* In the case of many cancel orders being issued at the same time,
            * we batch them here and dispatch them all at once at a frequency
            * defined by "dispatchCancelTimeout"
            */
            if (!dispatchCancelTimeout) {
                cancelBatchIDs = cancelBatchIDs.concat(ids);
                dispatchCancelTimeout = setTimeout(function () {
                    dispatch(cancelBatchIDs.toJS());
                    dispatchCancelTimeout = null;
                    cancelBatchIDs = cancelBatchIDs.clear();
                }, cancelBatchTime);
            } else {
                cancelBatchIDs = cancelBatchIDs.concat(ids);
            }
        };
    };

    MarketsActions.prototype.closeCallOrderSuccess = function closeCallOrderSuccess(orderID) {
        return orderID;
    };

    MarketsActions.prototype.callOrderUpdate = function callOrderUpdate(order) {
        return order;
    };

    MarketsActions.prototype.feedUpdate = function feedUpdate(asset) {
        return asset;
    };

    MarketsActions.prototype.settleOrderUpdate = function settleOrderUpdate(asset) {
        return function (dispatch) {
            _bitsharesjsWs.Apis.instance().db_api().exec("get_settle_orders", [asset, 100]).then(function (result) {
                dispatch({
                    settles: result
                });
            });
        };
    };

    MarketsActions.prototype.toggleStars = function toggleStars() {
        return true;
    };

    return MarketsActions;
}();

exports.default = _altInstance2.default.createActions(MarketsActions);