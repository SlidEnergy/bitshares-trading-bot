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
		let baseAsset = ChainStore.getAsset(this.asset);
		let quoteAsset = ChainStore.getAsset(this.currency);
		
        _subToMarket(baseAsset, quoteAsset, 10);
    
            let bid = {
            forSaleText: "",
            toReceiveText: "",
            priceText: "",
            for_sale: new Asset({
                asset_id: baseAsset.get("id"),
                precision: baseAsset.get("precision")
            }),
            to_receive: new Asset({
                asset_id: quoteAsset.get("id"),
                precision: quoteAsset.get("precision")
            })
        };
        bid.price = new Price({base: bid.for_sale, quote: bid.to_receive});
        let ask = {
            forSaleText: "",
            toReceiveText: "",
            priceText: "",
            for_sale: new Asset({
                asset_id: props.quoteAsset.get("id"),
                precision: props.quoteAsset.get("precision")
            }),
            to_receive: new Asset({
                asset_id: props.baseAsset.get("id"),
                precision: props.baseAsset.get("precision")
            })
        };

        this.state = { bid, ask };
       	
    });
}

Trader.prototype.buy = async function(amount, price) {

    this._onInputReceive("bid", true, amount);
    this._onInputPrice("bid", price);
    this._createLimitOrder("buy", "1.3.0");

    // var message = {
    //     from: this.account,
    //     amount_to_sell: {
    //         "amount": Math.floor(amount * price * Math.pow(10, markets[this.currency].precision)),
    //         "asset_id": this.currency
    //     },
    //     "min_to_receive": {
    //         "amount": Math.floor(amount * Math.pow(10, markets[this.asset].precision)),
    //         "asset_id": this.asset
    //     },
    //     debug: !this.trade, // 'transction not real if debug equal true'
    //     type: "limit_order_create"
    // };

    // console.log("limit_order_create... message: " + JSON.stringify(message));

    // var result = await co(api_lib.transfer(message)).catch(catch_err);

    // //console.log(result);
	// console.log("result: " + JSON.stringify(result));
}

Trader.prototype.sell = async function(amount, price) {

    this._onInputSell("ask", false, amount);
    this._onInputPrice("ask", price);

    this._createLimitOrder("sell", "1.3.0");

    // var message = {
    //     from: this.account,
    //     amount_to_sell: {
    //         "amount": Math.floor(amount * Math.pow(10, markets[this.asset].precision)), 
    //         "asset_id": this.asset 
    //     },
    //     "min_to_receive": {
    //         "amount": Math.floor(amount * price * Math.pow(10, markets[this.currency].precision)), 
    //         "asset_id": this.currency 
    //     },
    //     debug: !this.trade, // 'transction not real if debug equal true'
    //     type: "limit_order_create" // 'do not change this key'
    // };

    // console.log("limit_order_create... message: " + JSON.stringify(message))

    // var result = await co(api_lib.transfer(message)).catch(catch_err);

    // //console.log(result);
	// console.log("response: " + JSON.stringify(result));
}

Trader.prototype.getOrders = async function() {
    try
	{
        let {combinedBids, combinedAsks} = MarketsStore.getState().marketData;

		const quote = ChainStore.getAsset(this.asset);
		const base = ChainStore.getAsset(this.currency);

        return { 
			asks: combinedAsks.map(order => {
                let {amount, value, price }  = market_utils.parseOrder(order, base, quote);
				return {amount, value, price: price.full};
				}
			),
			bids: combinedBids.map(order => {
                let { amount, value, price }  = market_utils.parseOrder(order, base, quote)
                return { amount, value, price: price.full }
            }
		)};


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
        const account = ChainStore.getAccount(this.account);
        const account_balances = account.get("balances"); 
        //TODO fetch assets

		return account_balances.toArray().map( item => { 
            let balance = ChainStore.getObject(item); 
            let asset_id = balance.get("asset_type");
            let asset = ChainStore.getAsset(asset_id);

            return {
                asset: asset.get("symbol"),
                amount: utils.get_asset_amount(balance.get("balance"), asset)
            }
        }); 
            
		// let history = await this._getHistory();

		// return history[this.account].balance;
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

    
Trader.prototype._onInputSell = function(type, isBid, value) {
        let current = this.state[type];
        // const isBid = type === "bid";
        current.for_sale.setAmount({real: parseFloat(value) || 0});

        if (current.price.isValid()) {
            this._setReceive(current, isBid);
        } else {
            this._setPrice(current);
        }

        current.forSaleText = value;
    }

Trader.prototype._onInputReceive = function(type, isBid, value) {
        let current = this.state[type];
        // const isBid = type === "bid";
        current.to_receive.setAmount({real: parseFloat(value) || 0});

        if (current.price.isValid()) {
            this._setForSale(current, isBid);
        } else {
            this._setPrice(current);
        }

        current.toReceiveText = value;
    }

Trader.prototype._onInputPrice = function (type, value) {
    let current = this.state[type];
    const isBid = type === "bid";
    current.price = new Price({
        base: current[isBid ? "for_sale" : "to_receive"],
        quote: current[isBid ? "to_receive" : "for_sale"],
        real: parseFloat(value) || 0
    });

    if (isBid) {
        this._setForSale(current, isBid) || this._setReceive(current, isBid);
    } else {
        this._setReceive(current, isBid) || this._setForSale(current, isBid);
    }

    current.priceText = value;
}

Trader.prototype._createLimitOrder = function(type, feeID) {
    feeID = "1.3.0";
    let current = this.state[type === "sell" ? "ask" : "bid"];

    const order = new LimitOrderCreate({
        for_sale: current.for_sale,
        to_receive: current.to_receive,
        seller: this.account_id,
        fee: {
            asset_id: feeID,
            amount: 0
        }
    });

    console.log("order:", JSON.stringify(order.toObject()));
    return MarketsActions.createLimitOrder2(order).then((result) => {
        if (result.error) {
            if (result.error.message !== "wallet locked")
                notify.addNotification({
                    message: "Unknown error. Failed to place order for " + current.to_receive.getAmount({real: true}) + " " + current.to_receive.asset_id,
                    level: "error"
                });
        }
        // console.log("order success");
    }).catch(e => {
        console.log("order failed:", e);
    });
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