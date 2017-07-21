var _ = require('lodash');

let path = require('path');
let Immutable = require("immutable");

let bitsharesPath = path.join(__dirname, "lib/bitshares-ui-web");
var { ChainStore, FetchChain } = require("bitsharesjs");
var MarketsStore = require(path.join(bitsharesPath, "app/stores/MarketsStore")).default;
var MarketsActions = require(path.join(bitsharesPath, "app/actions/MarketsActions")).default;
var utils = require(path.join(bitsharesPath,'lib/common/utils')).default;
var market_utils = require(path.join(bitsharesPath, "lib/common/market_utils")).default;

var Trader = function(config) {
  _.bindAll(this);
  if(_.isObject(config)) {
    this.account = config.account
    this.currency = config.currency;
    this.asset = config.asset;
	this.trade = config.trade;
  }
  this.name = 'Bitshares';
  this.balance;
  this.price;

  this.pair = [this.currency, this.asset].join('_');

    FetchChain("getAsset", this.asset),
          
    Promise.all([
        FetchChain("getAsset", this.currency),
        FetchChain("getAccount", this.account)
	]).then( res => {
		let asset = ChainStore.getAsset(this.asset);
		let currency = ChainStore.getAsset(this.currency);
		
		_subToMarket(asset, currency, 10);
	});
}

Trader.prototype.buy = async function(amount, price) {

    var message = {
        from: this.account,
        amount_to_sell: {
            "amount": Math.floor(amount * price * Math.pow(10, markets[this.currency].precision)),
            "asset_id": this.currency
        },
        "min_to_receive": {
            "amount": Math.floor(amount * Math.pow(10, markets[this.asset].precision)),
            "asset_id": this.asset
        },
        debug: !this.trade, // 'transction not real if debug equal true'
        type: "limit_order_create"
    };

    console.log("limit_order_create... message: " + JSON.stringify(message));

    var result = await co(api_lib.transfer(message)).catch(catch_err);

    //console.log(result);
	console.log("result: " + JSON.stringify(result));
}

Trader.prototype.sell = async function(amount, price) {
    var message = {
        from: this.account,
        amount_to_sell: {
            "amount": Math.floor(amount * Math.pow(10, markets[this.asset].precision)), 
            "asset_id": this.asset 
        },
        "min_to_receive": {
            "amount": Math.floor(amount * price * Math.pow(10, markets[this.currency].precision)), 
            "asset_id": this.currency 
        },
        debug: !this.trade, // 'transction not real if debug equal true'
        type: "limit_order_create" // 'do not change this key'
    };

    console.log("limit_order_create... message: " + JSON.stringify(message))

    var result = await co(api_lib.transfer(message)).catch(catch_err);

    //console.log(result);
	console.log("response: " + JSON.stringify(result));
}

Trader.prototype.getOrders = async function() {
    try
	{
        let {combinedBids, combinedAsks} = MarketsStore.getState().marketData;

		const quote = ChainStore.getAsset(this.asset);
		const base = ChainStore.getAsset(this.currency);

        return { 
			asks: combinedAsks.map(ask => {
				return { 
					price: ask.getPrice(), 
					amount: utils.format_number(ask.amountForSale().getAmount({real: true}), quote.get("precision")),
					value: utils.format_number(ask.amountToReceive().getAmount({real: true}), base.get("precision")),
					total: utils.format_number(ask.totalToReceive().getAmount({real: true}), base.get("precision"))
				}
			}),
			bids: combinedBids.map(bid => {
				return {
					price: bid.getPrice(),
					amount: utils.format_number(bid.amountToReceive().getAmount({real: true}), quote.get("precision")),
					value: utils.format_number(bid.amountForSale().getAmount({real: true}), base.get("precision")),
					total: utils.format_number(bid.totalForSale().getAmount({real: true}), base.get("precision"))
				}
			})};


        // let message = {
        //     base: markets[this.asset].asset_id,
        //     quote: markets[this.currency].asset_id,
        //     type: "get_orders"
        // };

        // //console.log("get_orders...");

        // var result = await co(api_lib.history(message));

        // //console.log(result);
        // //console.log(JSON.stringify(result, null, 2));

        // return result;
   	}
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.checkOrders = async function() {
    try
	{
        let message = {
            orders: [ markets[this.asset].asset_id, markets[this.currency].asset_id ],
            type: "check_orders"
        };

        //console.log("check_orders...");

        var result = await co(api_lib.history(message));

        //console.log(result);
        //console.log(JSON.stringify(result, null, 2));
        
        return result;
   	}
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.getPortfollio = async function() {
    try
    {
		let history = await this._getHistory();

		return history[this.account].balance;
    }
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.getOpenedOrders = async function() {
    try
    {
        let orders = MarketsStore.getState().marketLimitOrders;

        const quote = ChainStore.getAsset(this.asset);
        const base = ChainStore.getAsset(this.currency);
        let account_id = ChainStore.getAccount(this.account).get("id");

        return {
            bids: orders.filter(a => {
                return (a.seller === account_id && a.sell_price.quote.asset_id !== base.get("id"));
            }).sort((a, b) => {
                let {price: a_price} = market_utils.parseOrder(a, base, quote);
                let {price: b_price} = market_utils.parseOrder(b, base, quote);

                return b_price.full - a_price.full;
            }).map(order => {
                return {value, price, amount} = market_utils.parseOrder(order, base, quote);
            }).toArray(),

            asks: orders.filter(a => {
                return (a.seller === account_id && a.sell_price.quote.asset_id === base.get("id"));
            }).sort((a, b) => {
                let {price: a_price} = market_utils.parseOrder(a, base, quote);
                let {price: b_price} = market_utils.parseOrder(b, base, quote);

                return a_price.full - b_price.full;
            }).map(order => {
                return {value, price, amount} = market_utils.parseOrder(order, base, quote);
            }).toArray()
        }
		// let history = await this._getHistory();

		// return history[this.account].limit_orders;
    }
	catch(err) {
		catch_err(err);
	}
}


Trader.prototype._getHistory = async function() {
    try
    {
        let message = {
            account: this.account, // an account which history you want to get
            position: 0, // start position from history getting
            //option: 'realorders',
            type: 'account_history'
        };

        //console.log("account_history...");

        var result = await co(api_lib.history(message));

        //console.log(result);

        return result;
    }
	catch(err) {
		catch_err(err);
	}
}

function _subToMarket(quoteAsset, baseAsset, bucketSize) {

    if (quoteAsset.get("id") && baseAsset.get("id")) {
        MarketsActions.subscribeMarket.defer(baseAsset, quoteAsset, bucketSize);
    }
}

function catch_err(err) {

	console.log("\x1b[31m", err, "\x1b[0m");

	if (err && err.message) {
		_error_message = err.message.toLowerCase().split('{')[0].match(/[a-z,0-9,\,\-]+/g).filter((e, i, arr) => {
			return arr[i] !== arr[i + 1] && arr[i] !== arr[i + 2];
		}).join(' ');
	} else {
		_error_message = { "_error": "unknown error" };
	}

	console.log(_error_message);
}

module.exports = Trader;