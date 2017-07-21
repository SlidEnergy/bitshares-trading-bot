"use strict";

exports.__esModule = true;

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _altInstance = require("./../alt-instance");

var _altInstance2 = _interopRequireDefault(_altInstance);

var _MarketsActions = require("./../actions/MarketsActions");

var _MarketsActions2 = _interopRequireDefault(_MarketsActions);

var _market_utils = require("./../../lib/common/market_utils");

var _market_utils2 = _interopRequireDefault(_market_utils);

var _localStorage = require("./../../lib/common/localStorage");

var _localStorage2 = _interopRequireDefault(_localStorage);

var _bitsharesjs = require("bitsharesjs");

var _utils = require("./../../lib/common/utils");

var _utils2 = _interopRequireDefault(_utils);

var _MarketClasses = require("./../../lib/common/MarketClasses");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var nullPrice = {
    getPrice: function getPrice() {
        return 0;
    },
    sellPrice: function sellPrice() {
        return 0;
    }
};

var marketStorage = new _localStorage2.default("__graphene__");

var MarketsStore = function () {
    function MarketsStore() {
        _classCallCheck(this, MarketsStore);

        this.markets = _immutable2.default.Map();
        this.asset_symbol_to_id = {};
        this.pendingOrders = _immutable2.default.Map();
        this.marketLimitOrders = _immutable2.default.Map();
        this.marketCallOrders = _immutable2.default.Map();
        this.allCallOrders = [];
        this.feedPrice = null;
        this.marketSettleOrders = _immutable2.default.OrderedSet();
        this.activeMarketHistory = _immutable2.default.OrderedSet();
        this.marketData = {
            bids: [],
            asks: [],
            calls: [],
            combinedBids: [],
            highestBid: nullPrice,
            combinedAsks: [],
            lowestAsk: nullPrice,
            flatBids: [],
            flatAsks: [],
            flatCalls: [],
            flatSettles: []
        };
        this.totals = {
            bid: 0,
            ask: 0,
            call: 0
        };
        this.priceData = [];
        this.volumeData = [];
        this.pendingCreateLimitOrders = [];
        this.activeMarket = null;
        this.quoteAsset = null;
        this.pendingCounter = 0;
        this.buckets = [15, 60, 300, 3600, 86400];
        this.bucketSize = this._getBucketSize();
        this.priceHistory = [];
        this.lowestCallPrice = null;
        this.marketBase = "BTS";
        this.marketStats = _immutable2.default.Map({
            change: 0,
            volumeBase: 0,
            volumeQuote: 0
        });
        this.marketReady = false;

        this.allMarketStats = _immutable2.default.Map();
        this.lowVolumeMarkets = _immutable2.default.Map(marketStorage.get("lowVolumeMarkets", {}));
        this.onlyStars = marketStorage.get("onlyStars", false);

        this.baseAsset = {
            id: "1.3.0",
            symbol: "BTS",
            precision: 5
        };

        this.coreAsset = {
            id: "1.3.0",
            symbol: "CORE",
            precision: 5
        };

        this.bindListeners({
            onSubscribeMarket: _MarketsActions2.default.subscribeMarket,
            onUnSubscribeMarket: _MarketsActions2.default.unSubscribeMarket,
            onChangeBase: _MarketsActions2.default.changeBase,
            onChangeBucketSize: _MarketsActions2.default.changeBucketSize,
            onCancelLimitOrderSuccess: _MarketsActions2.default.cancelLimitOrderSuccess,
            onCloseCallOrderSuccess: _MarketsActions2.default.closeCallOrderSuccess,
            onCallOrderUpdate: _MarketsActions2.default.callOrderUpdate,
            onClearMarket: _MarketsActions2.default.clearMarket,
            onGetMarketStats: _MarketsActions2.default.getMarketStats,
            onSettleOrderUpdate: _MarketsActions2.default.settleOrderUpdate,
            onSwitchMarket: _MarketsActions2.default.switchMarket,
            onFeedUpdate: _MarketsActions2.default.feedUpdate,
            onToggleStars: _MarketsActions2.default.toggleStars
        });
    }

    MarketsStore.prototype.onGetCollateralPositions = function onGetCollateralPositions(payload) {
        this.borrowMarketState = {
            totalDebt: payload.totalDebt,
            totalCollateral: payload.totalCollateral
        };
    };

    MarketsStore.prototype._getBucketSize = function _getBucketSize() {
        return parseInt(marketStorage.get("bucketSize", 4 * 3600));
    };

    MarketsStore.prototype._setBucketSize = function _setBucketSize(size) {
        this.bucketSize = size;
        marketStorage.set("bucketSize", size);
    };

    MarketsStore.prototype.onChangeBase = function onChangeBase(market) {
        this.marketBase = market;
    };

    MarketsStore.prototype.onChangeBucketSize = function onChangeBucketSize(size) {
        this._setBucketSize(size);
    };

    MarketsStore.prototype.onToggleStars = function onToggleStars() {
        this.onlyStars = !this.onlyStars;
        marketStorage.set("onlyStars", this.onlyStars);
    };

    MarketsStore.prototype.onUnSubscribeMarket = function onUnSubscribeMarket(payload) {

        // Optimistic removal of activeMarket
        if (payload.unSub) {
            this.activeMarket = null;
        } else {
            // Unsub failed, restore activeMarket
            this.activeMarket = payload.market;
        }
    };

    MarketsStore.prototype.onSwitchMarket = function onSwitchMarket() {
        this.marketReady = false;
    };

    MarketsStore.prototype.onClearMarket = function onClearMarket() {
        this.activeMarket = null;
        this.is_prediction_market = false;
        this.marketLimitOrders = this.marketLimitOrders.clear();
        this.marketCallOrders = this.marketCallOrders.clear();
        this.allCallOrders = [];
        this.feedPrice = null;
        this.marketSettleOrders = this.marketSettleOrders.clear();
        this.activeMarketHistory = this.activeMarketHistory.clear();
        this.marketData = {
            bids: [],
            asks: [],
            calls: [],
            combinedBids: [],
            highestBid: nullPrice,
            combinedAsks: [],
            lowestAsk: nullPrice,
            flatBids: [],
            flatAsks: [],
            flatCalls: [],
            flatSettles: []
        };
        this.totals = {
            bid: 0,
            ask: 0,
            call: 0
        };
        this.lowestCallPrice = null;
        this.pendingCreateLimitOrders = [];
        this.priceHistory = [];
        this.marketStats = _immutable2.default.Map({
            change: 0,
            volumeBase: 0,
            volumeQuote: 0
        });
    };

    MarketsStore.prototype._marketHasCalls = function _marketHasCalls() {
        var quoteAsset = this.quoteAsset,
            baseAsset = this.baseAsset;

        if (quoteAsset.has("bitasset") && quoteAsset.getIn(["bitasset", "options", "short_backing_asset"]) === baseAsset.get("id")) {
            return true;
        } else if (baseAsset.has("bitasset") && baseAsset.getIn(["bitasset", "options", "short_backing_asset"]) === quoteAsset.get("id")) {
            return true;
        }
        return false;
    };

    MarketsStore.prototype.onSubscribeMarket = function onSubscribeMarket(result) {
        var _assets,
            _this = this;

        if (result.switchMarket) {
            this.marketReady = false;
            return this.emitChange();
        }

        var limitsChanged = false,
            callsChanged = false;

        this.invertedCalls = result.inverted;

        // Get updated assets every time for updated feed data
        this.quoteAsset = _bitsharesjs.ChainStore.getAsset(result.quote.get("id"));
        this.baseAsset = _bitsharesjs.ChainStore.getAsset(result.base.get("id"));

        var assets = (_assets = {}, _assets[this.quoteAsset.get("id")] = { precision: this.quoteAsset.get("precision") }, _assets[this.baseAsset.get("id")] = { precision: this.baseAsset.get("precision") }, _assets);

        if (result.market && result.market !== this.activeMarket) {
            // console.log("switch active market from", this.activeMarket, "to", result.market);
            this.onClearMarket();
            this.activeMarket = result.market;
        }

        /* Set the feed price (null if not a bitasset market) */
        this.feedPrice = this._getFeed();

        if (result.buckets) {
            this.buckets = result.buckets;
            if (result.buckets.indexOf(this.bucketSize) === -1) {
                this.bucketSize = result.buckets[result.buckets.length - 1];
            }
        }

        if (result.buckets) {
            this.buckets = result.buckets;
        }

        if (result.limits) {
            // Keep an eye on this as the number of orders increases, it might not scale well
            var oldmarketLimitOrders = this.marketLimitOrders;
            this.marketLimitOrders = this.marketLimitOrders.clear();
            // console.time("Create limit orders " + this.activeMarket);
            result.limits.forEach(function (order) {
                // ChainStore._updateObject(order, false, false);
                if (typeof order.for_sale !== "number") {
                    order.for_sale = parseInt(order.for_sale, 10);
                }
                order.expiration = new Date(order.expiration);
                _this.marketLimitOrders = _this.marketLimitOrders.set(order.id, new _MarketClasses.LimitOrder(order, assets, _this.quoteAsset.get("id")));
            });

            limitsChanged = (0, _MarketClasses.didOrdersChange)(this.marketLimitOrders, oldmarketLimitOrders);

            // Loop over pending orders to remove temp order from orders map and remove from pending

            var _loop = function _loop(i) {
                var myOrder = _this.pendingCreateLimitOrders[i];
                var order = _this.marketLimitOrders.find(function (order) {
                    return myOrder.seller === order.seller && myOrder.expiration === order.expiration;
                });

                // If the order was found it has been confirmed, delete it from pending
                if (order) {
                    _this.pendingCreateLimitOrders.splice(i, 1);
                }
            };

            for (var i = this.pendingCreateLimitOrders.length - 1; i >= 0; i--) {
                _loop(i);
            }

            // console.timeEnd("Create limit orders " + this.activeMarket);

            if (this.pendingCreateLimitOrders.length === 0) {
                this.pendingCounter = 0;
            }

            // console.log("time to process limit orders:", new Date() - limitStart, "ms");
        }

        if (result.calls) {
            var oldmarketCallOrders = this.marketCallOrders;
            this.allCallOrders = result.calls;
            this.marketCallOrders = this.marketCallOrders.clear();

            result.calls.forEach(function (call) {
                // ChainStore._updateObject(call, false, false);
                try {
                    var callOrder = new _MarketClasses.CallOrder(call, assets, _this.quoteAsset.get("id"), _this.feedPrice, _this.is_prediction_market);
                    if (callOrder.isMarginCalled()) {
                        _this.marketCallOrders = _this.marketCallOrders.set(call.id, new _MarketClasses.CallOrder(call, assets, _this.quoteAsset.get("id"), _this.feedPrice));
                    }
                } catch (err) {
                    console.error("Unable to construct calls array, invalid feed price or prediction market?");
                }
            });

            callsChanged = (0, _MarketClasses.didOrdersChange)(this.marketCallOrders, oldmarketCallOrders);
        }

        this.updateSettleOrders(result);

        if (result.history) {
            this.activeMarketHistory = this.activeMarketHistory.clear();
            result.history.forEach(function (order) {
                order.op.time = order.time;
                /* Only include history objects that aren't 'something for nothing' to avoid confusion */
                if (!(order.op.receives.amount == 0 || order.op.pays.amount == 0)) {
                    _this.activeMarketHistory = _this.activeMarketHistory.add(order.op);
                }
            });
        }

        if (result.fillOrders) {
            result.fillOrders.forEach(function (fill) {
                // console.log("fill:", fill);
                _this.activeMarketHistory = _this.activeMarketHistory.add(fill[0][1]);
            });
        }

        if (result.recent && result.recent.length) {

            var stats = this._calcMarketStats(result.recent, this.baseAsset, this.quoteAsset, result.history, this.quoteAsset.get("symbol") + "_" + this.baseAsset.get("symbol"));

            this.marketStats = this.marketStats.set("change", stats.change);
            this.marketStats = this.marketStats.set("volumeBase", stats.volumeBase);
            this.marketStats = this.marketStats.set("volumeQuote", stats.volumeQuote);

            if (stats.volumeBase) {
                this.lowVolumeMarkets = this.lowVolumeMarkets.delete(result.market);
            }
        } else if (result.recent && !result.recent.length) {
            this.lowVolumeMarkets = this.lowVolumeMarkets.set(result.market, true);
        }

        if (callsChanged || limitsChanged) {
            // Update orderbook
            this._orderBook(limitsChanged, callsChanged);

            // Update depth chart data
            this._depthChart();
        }

        // Update pricechart data
        if (result.price) {
            this.priceHistory = result.price;
            this._priceChart();
        }

        marketStorage.set("lowVolumeMarkets", this.lowVolumeMarkets.toJS());

        this.marketReady = true;
        this.emitChange();
    };

    MarketsStore.prototype.onCancelLimitOrderSuccess = function onCancelLimitOrderSuccess(cancellations) {
        var _this2 = this;

        if (cancellations && cancellations.length) {
            var didUpdate = false;
            cancellations.forEach(function (orderID) {
                if (orderID && _this2.marketLimitOrders.has(orderID)) {
                    didUpdate = true;
                    _this2.marketLimitOrders = _this2.marketLimitOrders.delete(orderID);
                }
            });

            if (this.marketLimitOrders.size === 0) {
                this.marketData.bids = [];
                this.marketData.flatBids = [];
                this.marketData.asks = [];
                this.marketData.flatAsks = [];
            }

            if (didUpdate) {
                // Update orderbook
                this._orderBook(true, false);

                // Update depth chart data
                this._depthChart();
            }
        } else {
            return false;
        }
    };

    MarketsStore.prototype.onCloseCallOrderSuccess = function onCloseCallOrderSuccess(orderID) {
        if (orderID && this.marketCallOrders.has(orderID)) {
            this.marketCallOrders = this.marketCallOrders.delete(orderID);
            if (this.marketCallOrders.size === 0) {
                this.marketData.calls = [];
                this.marketData.flatCalls = [];
            }
            // Update orderbook
            this._orderBook(false, true);

            // Update depth chart data
            this._depthChart();
        } else {
            return false;
        }
    };

    MarketsStore.prototype.onCallOrderUpdate = function onCallOrderUpdate(call_order) {
        if (call_order && this.quoteAsset && this.baseAsset) {
            if (call_order.call_price.quote.asset_id === this.quoteAsset.get("id") || call_order.call_price.quote.asset_id === this.baseAsset.get("id")) {
                var _assets2;

                var assets = (_assets2 = {}, _assets2[this.quoteAsset.get("id")] = { precision: this.quoteAsset.get("precision") }, _assets2[this.baseAsset.get("id")] = { precision: this.baseAsset.get("precision") }, _assets2);
                try {
                    var callOrder = new _MarketClasses.CallOrder(call_order, assets, this.quoteAsset.get("id"), this.feedPrice);
                    // console.log("**** onCallOrderUpdate **", call_order, "isMarginCalled:", callOrder.isMarginCalled());

                    if (callOrder.isMarginCalled()) {
                        this.marketCallOrders = this.marketCallOrders.set(call_order.id, callOrder);

                        // Update orderbook
                        this._orderBook(false, true);

                        // Update depth chart data
                        this._depthChart();
                    }
                } catch (err) {
                    console.error("Unable to construct calls array, invalid feed price or prediction market?");
                }
            }
        } else {
            return false;
        }
    };
    //


    MarketsStore.prototype.onFeedUpdate = function onFeedUpdate(asset) {
        var _this3 = this;

        if (!this.quoteAsset || !this.baseAsset) {
            return false;
        }
        if (asset.get("id") === this[this.invertedCalls ? "baseAsset" : "quoteAsset"].get("id")) {
            this[this.invertedCalls ? "baseAsset" : "quoteAsset"] = asset;
        } else {
            return false;
        }

        var feedChanged = false;
        var newFeed = this._getFeed();
        if (newFeed && !this.feedPrice || this.feedPrice && this.feedPrice.ne(newFeed)) {
            feedChanged = true;
        }

        if (feedChanged) {
            var _assets3;

            this.feedPrice = newFeed;
            var assets = (_assets3 = {}, _assets3[this.quoteAsset.get("id")] = { precision: this.quoteAsset.get("precision") }, _assets3[this.baseAsset.get("id")] = { precision: this.baseAsset.get("precision") }, _assets3);

            /*
            * If the feed price changed, we need to check whether the orders
            * being margin called have changed and filter accordingly. To do so
            * we recreate the marketCallOrders map from scratch using the
            * previously fetched data and the new feed price.
            */
            this.marketCallOrders = this.marketCallOrders.clear();
            this.allCallOrders.forEach(function (call) {
                // ChainStore._updateObject(call, false, false);
                try {
                    var callOrder = new _MarketClasses.CallOrder(call, assets, _this3.quoteAsset.get("id"), _this3.feedPrice, _this3.is_prediction_market);
                    if (callOrder.isMarginCalled()) {
                        _this3.marketCallOrders = _this3.marketCallOrders.set(call.id, new _MarketClasses.CallOrder(call, assets, _this3.quoteAsset.get("id"), _this3.feedPrice));
                    }
                } catch (err) {
                    console.error("Unable to construct calls array, invalid feed price or prediction market?");
                }
            });

            // this.marketCallOrders = this.marketCallOrders.withMutations(callOrder => {
            //     if (callOrder && callOrder.first()) {
            //         callOrder.first().setFeed(this.feedPrice);
            //     }
            // });


            // this.marketCallOrders = this.marketCallOrders.filter(callOrder => {
            //     if (callOrder) {
            //         return callOrder.isMarginCalled();
            //     } else {
            //         return false;
            //     }
            // });

            // Update orderbook
            this._orderBook(true, true);

            // Update depth chart data
            this._depthChart();
        }
    };

    MarketsStore.prototype._getFeed = function _getFeed() {
        var _assets4;

        if (!this._marketHasCalls()) {
            this.bitasset_options = null;
            this.is_prediction_market = false;
            return null;
        }

        var assets = (_assets4 = {}, _assets4[this.quoteAsset.get("id")] = { precision: this.quoteAsset.get("precision") }, _assets4[this.baseAsset.get("id")] = { precision: this.baseAsset.get("precision") }, _assets4);
        var settlePrice = this[this.invertedCalls ? "baseAsset" : "quoteAsset"].getIn(["bitasset", "current_feed", "settlement_price"]);

        try {
            var sqr = this[this.invertedCalls ? "baseAsset" : "quoteAsset"].getIn(["bitasset", "current_feed", "maximum_short_squeeze_ratio"]);

            this.is_prediction_market = this[this.invertedCalls ? "baseAsset" : "quoteAsset"].getIn(["bitasset", "is_prediction_market"], false);
            this.bitasset_options = this[this.invertedCalls ? "baseAsset" : "quoteAsset"].getIn(["bitasset", "options"]).toJS();
            /* Prediction markets don't need feeds for shorting, so the settlement price can be set to 1:1 */
            if (this.is_prediction_market && settlePrice.getIn(["base", "asset_id"]) === settlePrice.getIn(["quote", "asset_id"])) {
                var backingAsset = this.bitasset_options.short_backing_asset;
                if (!assets[backingAsset]) assets[backingAsset] = { precision: this.quoteAsset.get("precision") };
                settlePrice = settlePrice.setIn(["base", "amount"], 1);
                settlePrice = settlePrice.setIn(["base", "asset_id"], backingAsset);
                settlePrice = settlePrice.setIn(["quote", "amount"], 1);
                settlePrice = settlePrice.setIn(["quote", "asset_id"], this.quoteAsset.get("id"));
                sqr = 1000;
            }
            var feedPrice = new _MarketClasses.FeedPrice({
                priceObject: settlePrice,
                market_base: this.quoteAsset.get("id"),
                sqr: sqr,
                assets: assets
            });

            return feedPrice;
        } catch (err) {
            console.error(this.activeMarket, "does not have a properly configured feed price");
            return null;
        }
    };

    MarketsStore.prototype._priceChart = function _priceChart() {
        var volumeData = [];
        var prices = [];

        var open = void 0,
            high = void 0,
            low = void 0,
            close = void 0,
            volume = void 0;

        var addTime = function addTime(time, i, bucketSize) {
            return new Date(time.getTime() + i * bucketSize * 1000);
        };

        for (var i = 0; i < this.priceHistory.length; i++) {
            var findMax = function findMax(a, b) {
                if (a !== Infinity && b !== Infinity) {
                    return Math.max(a, b);
                } else if (a === Infinity) {
                    return b;
                } else {
                    return a;
                }
            };

            var findMin = function findMin(a, b) {
                if (a !== 0 && b !== 0) {
                    return Math.min(a, b);
                } else if (a === 0) {
                    return b;
                } else {
                    return a;
                }
            };

            var current = this.priceHistory[i];
            var date = new Date(current.key.open + "+00:00");

            if (this.quoteAsset.get("id") === current.key.quote) {
                high = _utils2.default.get_asset_price(current.high_base, this.baseAsset, current.high_quote, this.quoteAsset);
                low = _utils2.default.get_asset_price(current.low_base, this.baseAsset, current.low_quote, this.quoteAsset);
                open = _utils2.default.get_asset_price(current.open_base, this.baseAsset, current.open_quote, this.quoteAsset);
                close = _utils2.default.get_asset_price(current.close_base, this.baseAsset, current.close_quote, this.quoteAsset);
                volume = _utils2.default.get_asset_amount(current.quote_volume, this.quoteAsset);
            } else {
                low = _utils2.default.get_asset_price(current.high_quote, this.baseAsset, current.high_base, this.quoteAsset);
                high = _utils2.default.get_asset_price(current.low_quote, this.baseAsset, current.low_base, this.quoteAsset);
                open = _utils2.default.get_asset_price(current.open_quote, this.baseAsset, current.open_base, this.quoteAsset);
                close = _utils2.default.get_asset_price(current.close_quote, this.baseAsset, current.close_base, this.quoteAsset);
                volume = _utils2.default.get_asset_amount(current.base_volume, this.quoteAsset);
            }

            if (low === 0) {
                low = findMin(open, close);
            }

            if (isNaN(high) || high === Infinity) {
                high = findMax(open, close);
            }

            if (close === Infinity || close === 0) {
                close = open;
            }

            if (open === Infinity || open === 0) {
                open = close;
            }

            if (high > 1.3 * ((open + close) / 2)) {
                high = findMax(open, close);
            }

            if (low < 0.7 * ((open + close) / 2)) {
                low = findMin(open, close);
            }

            prices.push({ date: date, open: open, high: high, low: low, close: close, volume: volume });
            volumeData.push([date, volume]);
        }

        // max buckets returned is 200, if we get less, fill in the gaps starting at the first data point
        var priceLength = prices.length;
        if (priceLength > 0 && priceLength < 200) {
            var now = new Date().getTime();
            // let firstDate = prices[0].date;
            // ensure there's a final entry close to the current time
            var _i = 1;
            while (addTime(prices[0].date, _i, this.bucketSize).getTime() < now) {
                _i++;
            }
            var finalDate = addTime(prices[0].date, _i - 1, this.bucketSize);
            if (prices[priceLength - 1].date !== finalDate) {
                if (priceLength === 1) {
                    prices.push({ date: addTime(finalDate, -1, this.bucketSize), open: prices[0].close, high: prices[0].close, low: prices[0].close, close: prices[0].close, volume: 0 });
                    prices.push({ date: finalDate, open: prices[0].close, high: prices[0].close, low: prices[0].close, close: prices[0].close, volume: 0 });
                    volumeData.push([addTime(finalDate, -1, this.bucketSize), 0]);
                } else {
                    prices.push({ date: finalDate, open: prices[priceLength - 1].close, high: prices[priceLength - 1].close, low: prices[priceLength - 1].close, close: prices[priceLength - 1].close, volume: 0 });
                }
                volumeData.push([finalDate, 0]);
            }

            // Loop over the data and fill in any blank time periods
            for (var ii = 0; ii < prices.length - 1; ii++) {
                // If next date is beyond one bucket up
                if (prices[ii + 1].date.getTime() !== addTime(prices[ii].date, 1, this.bucketSize).getTime()) {

                    // Break if next date is beyond now
                    if (addTime(prices[ii].date, 1, this.bucketSize).getTime() > now) {
                        break;
                    }

                    prices.splice(ii + 1, 0, { date: addTime(prices[ii].date, 1, this.bucketSize), open: prices[ii].close, high: prices[ii].close, low: prices[ii].close, close: prices[ii].close, volume: 0 });
                    volumeData.splice(ii + 1, 0, [addTime(prices[ii].date, 1, this.bucketSize), 0]);
                }
            };
        }

        this.priceData = prices;
        this.volumeData = volumeData;
    };

    MarketsStore.prototype._orderBook = function _orderBook() {
        var limitsChanged = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        var callsChanged = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        // Loop over limit orders and return array containing bids
        var constructBids = function constructBids(orderArray) {
            var bids = orderArray.filter(function (a) {
                return a.isBid();
            }).sort(function (a, b) {
                return a.getPrice() - b.getPrice();
            }).map(function (order) {
                return order;
            }).toArray();

            // Sum bids at same price
            if (bids.length > 1) {
                for (var i = bids.length - 2; i >= 0; i--) {
                    if (bids[i].getPrice() === bids[i + 1].getPrice()) {
                        bids[i] = bids[i].sum(bids[i + 1]);
                        bids.splice(i + 1, 1);
                    }
                }
            }
            return bids;
        };
        // Loop over limit orders and return array containing asks
        var constructAsks = function constructAsks(orderArray) {
            var asks = orderArray.filter(function (a) {
                return !a.isBid();
            }).sort(function (a, b) {
                return a.getPrice() - b.getPrice();
            }).map(function (order) {
                return order;
            }).toArray();

            // Sum asks at same price
            if (asks.length > 1) {
                for (var i = asks.length - 2; i >= 0; i--) {
                    if (asks[i].getPrice() === asks[i + 1].getPrice()) {
                        asks[i] = asks[i].sum(asks[i + 1]);
                        asks.splice(i + 1, 1);
                    }
                }
            }
            return asks;
        };

        // Assign to store variables
        if (limitsChanged) {
            if (__DEV__) console.time("Construct limit orders " + this.activeMarket);
            this.marketData.bids = constructBids(this.marketLimitOrders);
            this.marketData.asks = constructAsks(this.marketLimitOrders);
            if (!callsChanged) {
                this._combineOrders();
            }
            if (__DEV__) console.timeEnd("Construct limit orders " + this.activeMarket);
        }

        if (callsChanged) {
            if (__DEV__) console.time("Construct calls " + this.activeMarket);
            this.marketData.calls = this.constructCalls(this.marketCallOrders);
            this._combineOrders();
            if (__DEV__) console.timeEnd("Construct calls " + this.activeMarket);
        }

        // console.log("time to construct orderbook:", new Date() - orderBookStart, "ms");
    };

    MarketsStore.prototype.constructCalls = function constructCalls(callsArray) {
        var _this4 = this;

        var calls = [];
        if (callsArray.size) {
            calls = callsArray.sort(function (a, b) {
                return a.getPrice() - b.getPrice();
            }).map(function (order) {
                if (_this4.invertedCalls) {
                    _this4.lowestCallPrice = !_this4.lowestCallPrice ? order.getPrice(false) : Math.max(_this4.lowestCallPrice, order.getPrice(false));
                } else {
                    _this4.lowestCallPrice = !_this4.lowestCallPrice ? order.getPrice(false) : Math.min(_this4.lowestCallPrice, order.getPrice(false));
                }

                return order;
            }).toArray();

            // Sum calls at same price
            if (calls.length > 1) {
                for (var i = calls.length - 2; i >= 0; i--) {
                    calls[i] = calls[i].sum(calls[i + 1]);
                    calls.splice(i + 1, 1);
                }
            }
        } else {
            this.lowestCallPrice = null;
        }
        return calls;
    };

    MarketsStore.prototype._combineOrders = function _combineOrders() {
        var hasCalls = !!this.marketCallOrders.size;
        var isBid = hasCalls && this.marketCallOrders.first().isBid();

        var combinedBids = void 0,
            combinedAsks = void 0;

        if (isBid) {
            combinedBids = this.marketData.bids.concat(this.marketData.calls);
            combinedAsks = this.marketData.asks.concat([]);
        } else {
            combinedBids = this.marketData.bids.concat([]);
            combinedAsks = this.marketData.asks.concat(this.marketData.calls);
        }

        var totalToReceive = new _MarketClasses.Asset({
            asset_id: this.quoteAsset.get("id"),
            precision: this.quoteAsset.get("precision")
        });

        var totalForSale = new _MarketClasses.Asset({
            asset_id: this.baseAsset.get("id"),
            precision: this.baseAsset.get("precision")
        });
        combinedBids.sort(function (a, b) {
            return b.getPrice() - a.getPrice();
        }).forEach(function (a) {
            totalToReceive.plus(a.amountToReceive(false));
            totalForSale.plus(a.amountForSale());

            a.setTotalForSale(totalForSale.clone());
            a.setTotalToReceive(totalToReceive.clone());
        });

        totalToReceive = new _MarketClasses.Asset({
            asset_id: this.baseAsset.get("id"),
            precision: this.baseAsset.get("precision")
        });

        totalForSale = new _MarketClasses.Asset({
            asset_id: this.quoteAsset.get("id"),
            precision: this.quoteAsset.get("precision")
        });

        combinedAsks.sort(function (a, b) {
            return a.getPrice() - b.getPrice();
        }).forEach(function (a) {
            totalForSale.plus(a.amountForSale());
            totalToReceive.plus(a.amountToReceive(true));
            a.setTotalForSale(totalForSale.clone());
            a.setTotalToReceive(totalToReceive.clone());
        });

        this.marketData.lowestAsk = !combinedAsks.length ? nullPrice : combinedAsks[0];

        this.marketData.highestBid = !combinedBids.length ? nullPrice : combinedBids[0];

        this.marketData.combinedBids = combinedBids;
        this.marketData.combinedAsks = combinedAsks;
    };

    MarketsStore.prototype._depthChart = function _depthChart() {
        var _this5 = this;

        var bids = [],
            asks = [],
            calls = [],
            totalBids = 0,
            totalAsks = 0,
            totalCalls = 0;
        var flat_bids = [],
            flat_asks = [],
            flat_calls = [],
            flat_settles = [];

        if (this.marketLimitOrders.size) {

            this.marketData.bids.forEach(function (order) {
                bids.push([order.getPrice(), order.amountToReceive().getAmount({ real: true })]);
                totalBids += order.amountForSale().getAmount({ real: true });
            });

            this.marketData.asks.forEach(function (order) {
                asks.push([order.getPrice(), order.amountForSale().getAmount({ real: true })]);
            });

            // Make sure the arrays are sorted properly
            asks.sort(function (a, b) {
                return a[0] - b[0];
            });

            bids.sort(function (a, b) {
                return a[0] - b[0];
            });

            // Flatten the arrays to get the step plot look
            flat_bids = _market_utils2.default.flatten_orderbookchart_highcharts(bids, true, true, 1000);

            if (flat_bids.length) {
                flat_bids.unshift([0, flat_bids[0][1]]);
            }

            flat_asks = _market_utils2.default.flatten_orderbookchart_highcharts(asks, true, false, 1000);
            if (flat_asks.length) {
                flat_asks.push([flat_asks[flat_asks.length - 1][0] * 1.5, flat_asks[flat_asks.length - 1][1]]);
                totalAsks = flat_asks[flat_asks.length - 1][1];
            }
        }

        /* Flatten call orders if there any */
        if (this.marketData.calls.length) {

            var callsAsBids = this.marketData.calls[0].isBid();
            this.marketData.calls.forEach(function (order) {
                calls.push([order.getSqueezePrice(), order[order.isBid() ? "amountToReceive" : "amountForSale"]().getAmount({ real: true })]);
            });

            // Calculate total value of call orders
            calls.forEach(function (call) {
                if (_this5.invertedCalls) {
                    totalCalls += call[1];
                } else {
                    totalCalls += call[1] * call[0];
                }
            });

            if (callsAsBids) {
                totalBids += totalCalls;
            } else {
                totalAsks += totalCalls;
            }

            // Make sure the array is sorted properly
            calls.sort(function (a, b) {
                return a[0] - b[0];
            });

            // Flatten the array to get the step plot look
            if (this.invertedCalls) {
                flat_calls = _market_utils2.default.flatten_orderbookchart_highcharts(calls, true, false, 1000);
                if (flat_asks.length && flat_calls[flat_calls.length - 1][0] < flat_asks[flat_asks.length - 1][0]) {
                    flat_calls.push([flat_asks[flat_asks.length - 1][0], flat_calls[flat_calls.length - 1][1]]);
                }
            } else {
                flat_calls = _market_utils2.default.flatten_orderbookchart_highcharts(calls, true, true, 1000);
                if (flat_calls.length > 0) {
                    flat_calls.unshift([0, flat_calls[0][1]]);
                }
            }
        }

        /* Flatten settle orders if there are any */
        if (this.marketSettleOrders.size) {
            flat_settles = this.marketSettleOrders.reduce(function (final, a) {
                if (!final) {
                    return [[a.getPrice(), a[!a.isBid() ? "amountForSale" : "amountToReceive"]().getAmount({ real: true })]];
                } else {
                    final[0][1] = final[0][1] + a[!a.isBid() ? "amountForSale" : "amountToReceive"]().getAmount({ real: true });
                    return final;
                }
            }, null);

            if (!this.feedPrice.inverted) {
                flat_settles.unshift([0, flat_settles[0][1]]);
            } else {
                flat_settles.push([flat_asks[flat_asks.length - 1][0], flat_settles[0][1]]);
            }
        }

        // Assign to store variables
        this.marketData.flatAsks = flat_asks;
        this.marketData.flatBids = flat_bids;
        this.marketData.flatCalls = flat_calls;
        this.marketData.flatSettles = flat_settles;
        this.totals = {
            bid: totalBids,
            ask: totalAsks,
            call: totalCalls
        };
    };

    MarketsStore.prototype._calcMarketStats = function _calcMarketStats(history, baseAsset, quoteAsset, recent, market) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday = yesterday.getTime();
        var volumeBase = 0,
            volumeQuote = 0,
            change = 0,
            last = { close_quote: null, close_base: null },
            invert = void 0,
            latestPrice = void 0,
            noTrades = true;

        if (history.length) {
            var first = void 0;
            history.forEach(function (bucket, i) {
                var date = new Date(bucket.key.open + "+00:00").getTime();
                if (date > yesterday) {
                    noTrades = false;
                    if (!first) {
                        first = history[i > 0 ? i - 1 : i];
                        invert = first.key.base === baseAsset.get("id");
                    }
                    if (invert) {
                        volumeBase += parseInt(bucket.base_volume, 10);
                        volumeQuote += parseInt(bucket.quote_volume, 10);
                    } else {
                        volumeQuote += parseInt(bucket.base_volume, 10);
                        volumeBase += parseInt(bucket.quote_volume, 10);
                    }
                }
            });
            if (!first) {
                first = history[0];
            }
            last = history[history.length - 1];
            var open = void 0,
                _close = void 0;
            if (invert) {
                open = _utils2.default.get_asset_price(first.open_quote, quoteAsset, first.open_base, baseAsset, invert);
                _close = _utils2.default.get_asset_price(last.close_quote, quoteAsset, last.close_base, baseAsset, invert);
            } else {
                open = _utils2.default.get_asset_price(first.open_quote, baseAsset, first.open_base, quoteAsset, invert);
                _close = _utils2.default.get_asset_price(last.close_quote, baseAsset, last.close_base, quoteAsset, invert);
            }

            change = noTrades ? 0 : Math.round(10000 * (_close - open) / open) / 100;
            if (!isFinite(change) || isNaN(change)) {
                change = 0;
            }
        }

        if (recent && recent.length && recent.length > 1) {
            var order = recent[1].op;
            var paysAsset = void 0,
                receivesAsset = void 0,
                isAsk = false;

            if (order.pays.asset_id === baseAsset.get("id")) {
                paysAsset = baseAsset;
                receivesAsset = quoteAsset;
                isAsk = true;
            } else {
                paysAsset = quoteAsset;
                receivesAsset = baseAsset;
            }
            var flipped = baseAsset.get("id").split(".")[2] > quoteAsset.get("id").split(".")[2];
            latestPrice = _market_utils2.default.parse_order_history(order, paysAsset, receivesAsset, isAsk, flipped).full;
        }

        var price = void 0;

        if (last.close_base && last.close_quote) {
            var _invert = last.key.base !== baseAsset.get("id");
            var base = new _MarketClasses.Asset({ amount: last[_invert ? "close_quote" : "close_base"], asset_id: last.key[_invert ? "quote" : "base"], precision: baseAsset.get("precision") });
            var quote = new _MarketClasses.Asset({ amount: last[!_invert ? "close_quote" : "close_base"], asset_id: last.key[!_invert ? "quote" : "base"], precision: quoteAsset.get("precision") });
            price = new _MarketClasses.Price({ base: base, quote: quote });
        }

        var close = last.close_base && last.close_quote ? {
            quote: {
                amount: invert ? last.close_quote : last.close_base,
                asset_id: invert ? last.key.quote : last.key.base
            },
            base: {
                amount: invert ? last.close_base : last.close_quote,
                asset_id: invert ? last.key.base : last.key.quote
            }
        } : null;
        var volumeBaseAsset = new _MarketClasses.Asset({ amount: volumeBase, asset_id: baseAsset.get("id"), precision: baseAsset.get("precision") });
        var volumeQuoteAsset = new _MarketClasses.Asset({ amount: volumeQuote, asset_id: quoteAsset.get("id"), precision: quoteAsset.get("precision") });
        volumeBase = _utils2.default.get_asset_amount(volumeBase, baseAsset);
        volumeQuote = _utils2.default.get_asset_amount(volumeQuote, quoteAsset);

        var coreVolume = volumeBaseAsset.asset_id === "1.3.0" ? volumeBaseAsset.getAmount({ real: true }) : volumeQuoteAsset.asset_id === "1.3.0" ? volumeQuoteAsset.getAmount({ real: true }) : null;
        var usdVolume = !!coreVolume ? null : volumeBaseAsset.asset_id === "1.3.121" ? volumeBaseAsset.getAmount({ real: true }) : volumeQuoteAsset.asset_id === "1.3.121" ? volumeQuoteAsset.getAmount({ real: true }) : null;
        var btcVolume = !!coreVolume || !!usdVolume ? null : volumeBaseAsset.asset_id === "1.3.861" || volumeBaseAsset.asset_id === "1.3.103" ? volumeBaseAsset.getAmount({ real: true }) : volumeQuoteAsset.asset_id === "1.3.861" || volumeQuoteAsset.asset_id === "1.3.103" ? volumeQuoteAsset.getAmount({ real: true }) : null;

        if (market) {
            if (coreVolume && coreVolume <= 1000 || usdVolume && usdVolume < 10 || btcVolume && btcVolume < 0.01 || !Math.floor(volumeBase * 100)) {
                this.lowVolumeMarkets = this.lowVolumeMarkets.set(market, true);
                // console.log("lowVolume:", market, coreVolume, usdVolume, btcVolume, volumeBase);
            } else {
                this.lowVolumeMarkets = this.lowVolumeMarkets.delete(market);
                /* Clear both market directions from the list */
                var invertedMarket = market.split("_");
                this.lowVolumeMarkets = this.lowVolumeMarkets.delete(invertedMarket[1] + "_" + invertedMarket[0]);
            }
            marketStorage.set("lowVolumeMarkets", this.lowVolumeMarkets.toJS());
        }
        return {
            change: change.toFixed(2),
            volumeBase: volumeBase,
            volumeQuote: volumeQuote,
            close: close,
            latestPrice: latestPrice,
            price: price,
            volumeBaseAsset: volumeBaseAsset,
            volumeQuoteAsset: volumeQuoteAsset
        };
    };

    MarketsStore.prototype.onGetMarketStats = function onGetMarketStats(payload) {
        if (payload) {
            var stats = this._calcMarketStats(payload.history, payload.base, payload.quote, payload.last, payload.market);
            this.allMarketStats = this.allMarketStats.set(payload.market, stats);
        }
    };

    MarketsStore.prototype.onSettleOrderUpdate = function onSettleOrderUpdate(result) {
        this.updateSettleOrders(result);
    };

    MarketsStore.prototype.updateSettleOrders = function updateSettleOrders(result) {
        var _this6 = this;

        if (result.settles && result.settles.length) {
            var _assets5;

            var assets = (_assets5 = {}, _assets5[this.quoteAsset.get("id")] = { precision: this.quoteAsset.get("precision") }, _assets5[this.baseAsset.get("id")] = { precision: this.baseAsset.get("precision") }, _assets5);
            this.marketSettleOrders = this.marketSettleOrders.clear();

            result.settles.forEach(function (settle) {
                // let key = settle.owner + "_" + settle.balance.asset_id;

                settle.settlement_date = new Date(settle.settlement_date);

                _this6.marketSettleOrders = _this6.marketSettleOrders.add(new _MarketClasses.SettleOrder(settle, assets, _this6.quoteAsset.get("id"), _this6.feedPrice, _this6.bitasset_options));
            });
        }
    };

    return MarketsStore;
}();

exports.default = _altInstance2.default.createStore(MarketsStore, "MarketsStore");