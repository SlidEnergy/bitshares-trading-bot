var _ = require('lodash');

let path = require('path');
let Immutable = require("immutable");

let bitsharesPath = path.join(__dirname, "lib/bitshares-ui-web");
var { ChainStore, FetchChain } = require("bitsharesjs");
var MarketsStore = require(path.join(bitsharesPath, "app/stores/MarketsStore")).default;
var MarketsActions = require(path.join(bitsharesPath, "app/actions/MarketsActions")).default;
var utils = require(path.join(bitsharesPath,'lib/common/utils')).default;
var market_utils = require(path.join(bitsharesPath, "lib/common/market_utils")).default;
//var { Asset, Price } = require(path.join(bitsharesPath, 'lib/common/MarketClasses'));

const co = require('co');
let api_lib = require('openledger_nodejs_api/libs');
require('./bitshares-cfg.js')(api_lib); // patching to pass private keys and wssapi address

const assetsInfo = { "USD": "1.3.121", "BTC": "1.3.861", "BTS": "1.3.0", "CNY": "1.3.113" };

var Trader = function(config) {
    _.bindAll(this);
    if(_.isObject(config)) {
        this.trade = config.trade;

        this.account_name = config.account
        this.currency = config.currency;

        this.baseAsset_id = assetsInfo[config.asset];
        this.quoteAsset_id = assetsInfo[config.currency];
    }
    this.name = 'Bitshares';
    this.balance;
    this.price;
    this.initialized = false;

    Promise.all([
        FetchChain("getAsset", this.baseAsset_id),
        FetchChain("getAsset", this.quoteAsset_id),
        FetchChain("getAccount", this.account_name)
	]).then( res => {
		this.baseAsset = ChainStore.getAsset(this.baseAsset_id);
        this.quoteAsset = ChainStore.getAsset(this.quoteAsset_id);
        this.account = ChainStore.getAccount(this.account_name);
        
        if(!this.baseAsset || !this.quoteAsset || !this.account)
            throw Error("Не удалось инициировать класс.");

        this._subToMarket();

        this.initialized = true;
    
        // let bid = {
        //     forSaleText: "",
        //     toReceiveText: "",
        //     priceText: "",
        //     for_sale: new Asset({
        //         asset_id: baseAsset.get("id"),
        //         precision: baseAsset.get("precision")
        //     }),
        //     to_receive: new Asset({
        //         asset_id: quoteAsset.get("id"),
        //         precision: quoteAsset.get("precision")
        //     })
        // };
        // bid.price = new Price({base: bid.for_sale, quote: bid.to_receive});

        // let ask = {
        //     forSaleText: "",
        //     toReceiveText: "",
        //     priceText: "",
        //     for_sale: new Asset({
        //         asset_id: quoteAsset.get("id"),
        //         precision: quoteAsset.get("precision")
        //     }),
        //     to_receive: new Asset({
        //         asset_id: baseAsset.get("id"),
        //         precision: baseAsset.get("precision")
        //     })
        // };

        // this.state = { bid, ask };
       	
    });
}

Trader.prototype.buy = async function(amount, price) {

    try
	{
        if(!this.initialized) {
            console.log("Работа с биржей еще не иницилизирована.");
            return;
        }

        // this._onInputReceive("bid", true, amount);
        // this._onInputPrice("bid", price);
        // this._createLimitOrder("buy", "1.3.0");

        let base_satoshi_amount = utils.get_satoshi_amount(amount, this.baseAsset);
        let quote_satoshi_amount = utils.get_satoshi_amount(amount * price, this.quoteAsset);
      
        var message = {
            from: this.account_name,
            amount_to_sell: {
                "amount": quote_satoshi_amount,
                "asset_id": this.quoteAsset_id
            },
            "min_to_receive": {
                "amount": base_satoshi_amount,
                "asset_id": this.baseAsset_id
            },
            debug: !this.trade, // 'transction not real if debug equal true'
            type: "limit_order_create"
        };

        console.log("limit_order_create... message: " + JSON.stringify(message));

        var result = await co(api_lib.transfer(message)).catch(catch_err);

        //console.log(result);
        console.log("result: " + JSON.stringify(result));
    }
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.sell = async function(amount, price) {

    try
	{
        if(!this.initialized) {
            console.log("Работа с биржей еще не иницилизирована.");
            return;
        }

        // this._onInputSell("ask", false, amount);
        // this._onInputPrice("ask", price);

        // this._createLimitOrder("sell", "1.3.0");

        let base_satoshi_amount = utils.get_satoshi_amount(amount, this.baseAsset);
        let quote_satoshi_amount = utils.get_satoshi_amount(amount * price, this.quoteAsset);

        var message = {
            from: this.account_name,
            amount_to_sell: {
                "amount": base_satoshi_amount, 
                "asset_id": this.baseAsset_id
            },
            "min_to_receive": {
                "amount": quote_satoshi_amount, 
                "asset_id": this.quoteAsset_id
            },
            debug: !this.trade, // 'transction not real if debug equal true'
            type: "limit_order_create" // 'do not change this key'
        };

        console.log("limit_order_create... message: " + JSON.stringify(message))

        var result = await co(api_lib.transfer(message)).catch(catch_err);

        //console.log(result);
        console.log("response: " + JSON.stringify(result));
    }
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.cancelOrder = async function(order) {
    try
	{  
        if(!this.initialized) {
            console.log("Работа с биржей еще не иницилизирована.");
            return;
        }

        message = {
            from: this.account_name,
            order_id: order.id,
            type: "limit_order_cancel"
        };

        console.log("limit_order_cancel... message: " + JSON.stringify(message))

        var result = await co(api_lib.transfer(message)).catch(catch_err);

        //console.log(result);
        console.log("response: " + JSON.stringify(result));
    }
	catch(err) {
		catch_err(err);
	}
}

Trader.prototype.getOrders = async function() {
    try
	{
        if(!this.initialized) {
            console.log("Работа с биржей еще не иницилизирована.");
            return;
        }

        // Inverted terms for bitshares-ui
        let baseAsset = ChainStore.getAsset(this.quoteAsset_id);
        let quoteAsset = ChainStore.getAsset(this.baseAsset_id);
        
        let {combinedBids, combinedAsks} = MarketsStore.getState().marketData;

        return { 
			asks: combinedAsks.map(order => {
                let {amount, value, price }  = market_utils.parseOrder(order, baseAsset, quoteAsset);
                return { 
                    id: order.id,
                    amount, 
                    value, 
                    price: price.full, 
                    expiration: new Date(order.expiration.getTime() - order.expiration.getTimezoneOffset()*60*1000)
                };
			}),
			bids: combinedBids.map(order => {
                let { amount, value, price }  = market_utils.parseOrder(order, baseAsset, quoteAsset)
                return { 
                    id: order.id,
                    amount, 
                    value, 
                    price: price.full, 
                    expiration: new Date(order.expiration.getTime() - order.expiration.getTimezoneOffset()*60*1000)
                };
            })
        };

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

Trader.prototype.checkOrders = async function(order) {
    try
	{
        if(!this.initialized) {
            console.log("Работа с биржей еще не иницилизирована.");
            return;
        }

        let message = {
            orders: [ order.id ],
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
        if(!this.initialized) {
            console.log("Работа с биржей еще не иницилизирована.");
            return;
        }

        const account_balances = this.account.get("balances"); 
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
        if(!this.initialized) {
            console.log("Работа с биржей еще не иницилизирована.");
            return;
        }

        // Inverted terms for bitshares-ui
        let baseAsset = ChainStore.getAsset(this.quoteAsset_id);
        let quoteAsset = ChainStore.getAsset(this.baseAsset_id);

        let orders = MarketsStore.getState().marketLimitOrders;
        let account_id = this.account.get("id");

        return {
            bids: orders.filter(a => {
                return (a.seller === account_id && a.sell_price.quote.asset_id === quoteAsset.get("id"));
            }).sort((a, b) => {
                let {price: a_price} = market_utils.parseOrder(a, baseAsset, quoteAsset);
                let {price: b_price} = market_utils.parseOrder(b, baseAsset, quoteAsset);

                return b_price.full - a_price.full;
            }).map(order => {
                let { value, price, amount } = market_utils.parseOrder(order, baseAsset, quoteAsset);

                return {
                    id: order.id,
                    value,
                    price: price.full,
                    amount, 
                    expiration: new Date(order.expiration.getTime() - order.expiration.getTimezoneOffset()*60*1000)
                };
            }).toArray(),

            asks: orders.filter(a => {
                return (a.seller === account_id && a.sell_price.quote.asset_id === baseAsset.get("id"));
            }).sort((a, b) => {
                let {price: a_price} = market_utils.parseOrder(a, baseAsset, quoteAsset);
                let {price: b_price} = market_utils.parseOrder(b, baseAsset, quoteAsset);

                return a_price.full - b_price.full;
            }).map(order => {
                let { value, price, amount } = market_utils.parseOrder(order, baseAsset, quoteAsset);
                
                return {
                    id: order.id,
                    value,
                    price: price.full,
                    amount,
                    expiration: new Date(order.expiration.getTime() - order.expiration.getTimezoneOffset()*60*1000)
                };
            }).toArray()
        }
		// let history = await this._getHistory();

		// return history[this.account].limit_orders;
    }
	catch(err) {
		catch_err(err);
	}
}

    
// Trader.prototype._onInputSell = function(type, isBid, value) {
//         let current = this.state[type];
//         // const isBid = type === "bid";
//         current.for_sale.setAmount({real: parseFloat(value) || 0});

//         if (current.price.isValid()) {
//             this._setReceive(current, isBid);
//         } else {
//             this._setPrice(current);
//         }

//         current.forSaleText = value;
//     }

// Trader.prototype._onInputReceive = function(type, isBid, value) {
//         let current = this.state[type];
//         // const isBid = type === "bid";
//         current.to_receive.setAmount({real: parseFloat(value) || 0});

//         if (current.price.isValid()) {
//             this._setForSale(current, isBid);
//         } else {
//             this._setPrice(current);
//         }

//         current.toReceiveText = value;
//     }

// Trader.prototype._onInputPrice = function (type, value) {
//     let current = this.state[type];
//     const isBid = type === "bid";
//     current.price = new Price({
//         base: current[isBid ? "for_sale" : "to_receive"],
//         quote: current[isBid ? "to_receive" : "for_sale"],
//         real: parseFloat(value) || 0
//     });

//     if (isBid) {
//         this._setForSale(current, isBid) || this._setReceive(current, isBid);
//     } else {
//         this._setReceive(current, isBid) || this._setForSale(current, isBid);
//     }

//     current.priceText = value;
// }

// Trader.prototype._createLimitOrder = function(type, feeID) {
//     feeID = "1.3.0";
//     let current = this.state[type === "sell" ? "ask" : "bid"];

//     const order = new LimitOrderCreate({
//         for_sale: current.for_sale,
//         to_receive: current.to_receive,
//         seller: this.account_id,
//         fee: {
//             asset_id: feeID,
//             amount: 0
//         }
//     });

//     console.log("order:", JSON.stringify(order.toObject()));
//     return MarketsActions.createLimitOrder2(order).then((result) => {
//         if (result.error) {
//             if (result.error.message !== "wallet locked")
//                 notify.addNotification({
//                     message: "Unknown error. Failed to place order for " + current.to_receive.getAmount({real: true}) + " " + current.to_receive.asset_id,
//                     level: "error"
//                 });
//         }
//         // console.log("order success");
//     }).catch(e => {
//         console.log("order failed:", e);
//     });
// }

// Trader.prototype._setReceive = function(state, isBid) {
//     if (state.price.isValid() && state.for_sale.hasAmount()) {
//         state.to_receive = state.for_sale.times(state.price, isBid);
//         state.toReceiveText = state.to_receive.getAmount({real: true}).toString();
//         return true;
//     }
//     return false;
// }

// Trader.prototype._setForSale = function(state, isBid) {
//     if (state.price.isValid() && state.to_receive.hasAmount()) {
//         state.for_sale = state.to_receive.times(state.price, isBid);
//         state.forSaleText = state.for_sale.getAmount({real: true}).toString();
//         return true;
//     }
//     return false;
// }

// Trader.prototype._setPrice = function(state) {
//     if (state.for_sale.hasAmount() && state.to_receive.hasAmount()) {
//         state.price = new Price({
//             base: state.for_sale,
//             quote: state.to_receive
//         });
//         state.priceText = state.price.toReal().toString();
//         return true;
//     }
//     return false;
// }

// Trader.prototype._getHistory = async function() {
//     try
//     {
//         let message = {
//             account: this.account, // an account which history you want to get
//             position: 0, // start position from history getting
//             //option: 'realorders',
//             type: 'account_history'
//         };

//         //console.log("account_history...");

//         var result = await co(api_lib.history(message));

//         //console.log(result);

//         return result;
//     }
// 	catch(err) {
// 		catch_err(err);
// 	}
// }

//function _subToMarket(quoteAsset, baseAsset, bucketSize) {
Trader.prototype._subToMarket = function() {

    
    // Inverted terms for bitshares-ui
    let baseAsset = ChainStore.getAsset(this.quoteAsset_id);
    let quoteAsset = ChainStore.getAsset(this.baseAsset_id);

    const bucketSize = 10;

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