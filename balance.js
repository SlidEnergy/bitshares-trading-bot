let path = require('path');
let Immutable = require("immutable");

let bitsharesPath = path.join(__dirname, "lib/bitshares-ui-web");

var { ChainStore, FetchChain } = require("bitsharesjs");
var { Asset } = require(path.join(bitsharesPath, 'lib/common/MarketClasses'));
var utils = require(path.join(bitsharesPath,'lib/common/utils')).default;
var MarketsStore = require(path.join(bitsharesPath, "app/stores/MarketsStore")).default;
var MarketsActions = require(path.join(bitsharesPath, "app/actions/MarketsActions")).default;

class Balance {
	constructor(account) {
		this.fromStatsIntervals = {};
		this.toStatsInterval = null;
		this.account = account;
		this.props = {};
		this.coreAsset = "1.3.0";
	}

	async startShowTotal(toAsset) { 

		await FetchChain("getAccount", this.account); 
		await FetchChain("getAsset", this.coreAsset);
		
		// ToAsset
		await FetchChain("getAsset", toAsset);
		this.toAsset = ChainStore.getAsset(toAsset); 

		let account = ChainStore.getAccount("slidtrader1"); 

		this.AccountWrapper(account);
	}

	async AccountWrapper(account) {

		let balanceList = Immutable.List(), collateral = 0, debt = {}, openOrders = {}; 


		if (account) { 

			account.get("orders") && account.get("orders").forEach( (orderID, key) => { 
				let order = ChainStore.getObject(orderID); 
				if (order) { 
					let orderAsset = order.getIn(["sell_price", "base", "asset_id"]); 
					if (!openOrders[orderAsset]) { 
						openOrders[orderAsset] = parseInt(order.get("for_sale"), 10); 
					} else { 
						openOrders[orderAsset] += parseInt(order.get("for_sale"), 10); 
					} 
				} 
			}); 

			account.get("call_orders") && account.get("call_orders").forEach( (callID, key) => { 
				let position = ChainStore.getObject(callID); 
				if (position) { 
					collateral += parseInt(position.get("collateral"), 10); 

					let debtAsset = position.getIn(["call_price", "quote", "asset_id"]); 
					if (!debt[debtAsset]) { 
						debt[debtAsset] = parseInt(position.get("debt"), 10); 
					} else { 
						debt[debtAsset] += parseInt(position.get("debt"), 10); 
					} 
				} 
			}); 

			let account_balances = account.get("balances"); 

			account_balances && account_balances.forEach( balance => { 
				let balanceAmount = ChainStore.getObject(balance); 
				if (!balanceAmount || !balanceAmount.get("balance")) { 
					return null; 
				} 
				balanceList = balanceList.push(balance); 
			}); 
		} 

		await this.TotalBalaceValue(balanceList,collateral, debt, openOrders);
	}

	async TotalBalaceValue(balances,collateral, debt, openOrders) {
		//TotalBalanceValue

		let assets = Immutable.List(); 
		let amounts = []; 

		balances.forEach(item => {

			let balance = ChainStore.getObject(item);
			if (balance) {
				assets = assets.push(balance.get("asset_type"));
				amounts.push({asset_id: balance.get("asset_type"), amount: parseInt(balance.get("balance"), 10)});
			}
		});

		for (let asset in debt) { 
			if (!assets.has(asset)) { 
				assets = assets.push(asset); 
			} 
		} 

		for (let asset in openOrders) { 
			if (!assets.has(asset)) { 
				assets = assets.push(asset); 
			} 
		} 

		// ValueStoreWrapper 
		await this.ValueStoreWrapper(assets, this.toAsset, collateral,amounts, debt, openOrders);
	} 

	async ValueStoreWrapper(fromAssets, toAsset, collateral, balances, debt, openOrders) {

		for(var i = 0; i < fromAssets.size; i++)
			await FetchChain("getAsset", fromAssets.get(i)); 

		fromAssets = fromAssets.map(item => ChainStore.getAsset(item));

		// Запускаем обновление данных marketStats
		this._startUpdates({ fromAssets: fromAssets, toAsset: toAsset });

		MarketsStore.listen(this.onChange.bind(this));

		// TODO подписываемся на MarketStorage и вызываем снова TotalValue

		//await this.TotalValue(fromAssets, toAsset, collateral,balances, debt, openOrders);

		this.props = { fromAssets, toAsset, collateral, balances, debt, openOrders };
	}

	onChange(state) {

		this.TotalValue(this.props.fromAssets, this.props.toAsset, this.props.collateral, this.props.balances, this.props.debt, this.props.openOrders, state.allMarketStats);
	}

	async TotalValue(fromAssets, toAsset, collateral, balances, debt, openOrders, marketStats) {

		let coreAsset = ChainStore.getAsset("1.3.0"); 

		if (!coreAsset || !toAsset) { 
			return null; 
		} 

		let assets = {};
		fromAssets.forEach(item => {
			if (item) {
				assets[item.get("id")] = item;
			}
		});

		let totalValue = 0;
		let assetValues = {};

		//Collateral value
		let collateralValue = this._convertValue(collateral, coreAsset, toAsset, marketStats, coreAsset);

		totalValue += collateralValue;
		assetValues = this._assetValues(assetValues, collateralValue, coreAsset.get("id"));

		// Open orders value
		for (let asset in openOrders) {
			let fromAsset = assets[asset];
			if (fromAsset) {
				let orderValue = this._convertValue(openOrders[asset], fromAsset, toAsset, marketStats, coreAsset);
				totalValue += orderValue;
				assetValues = this._assetValues(assetValues, orderValue, fromAsset.get("id"));
			}
		}

		// Debt value
		for (let asset in debt) {
			let fromAsset = assets[asset];
			if (fromAsset) {
				let debtValue = this._convertValue(debt[asset], fromAsset, toAsset, marketStats, coreAsset);
				totalValue -= debtValue;
				assetValues = this._assetValues(assetValues, -debtValue, fromAsset.get("id"));
			}
		}

		// Balance value
		balances.forEach(balance => {
			if (balance.asset_id === toAsset.get("id")) {
				totalValue += balance.amount;
			} else {
				let fromAsset = assets[balance.asset_id];
				if (fromAsset) {
					let eqValue = this._convertValue(balance.amount, fromAsset, toAsset, marketStats, coreAsset);
					totalValue += eqValue;
					assetValues = this._assetValues(assetValues, eqValue, fromAsset.get("id"));
				}
			}
		});

		// Determine if higher precision should be displayed
		// let hiPrec = false;
		// for (let asset in assetValues) {
		// 	if (assets[asset] && assetValues[asset]) {
		// 		if (Math.abs(utils.get_asset_amount(assetValues[asset], toAsset)) < 100) {
		// 			hiPrec = true;
		// 			break;
		// 		}
		// 	}
		// }

		// Render each asset's balance, noting if there are any values missing
		// const noDataSymbol = "**";
		// const minValue = 1e-12;
		// let missingData = false;
		// let totalsTip = "<table><tbody>";
		// for (let asset in assetValues) {
		// 	if (assets[asset] && assetValues[asset]) {
		// 		let symbol = assets[asset].get("symbol");
		// 		let amount = utils.get_asset_amount(assetValues[asset], toAsset);
		// 		if (amount) {
		// 			if (amount < minValue && amount > -minValue) { // really close to zero, but not zero, probably a result of incomplete data
		// 				amount = noDataSymbol;
		// 				missingData = true;
		// 			} else if (hiPrec) {
		// 				if (amount >= 0 && amount < 0.01)      amount = "<0.01";
		// 				else if (amount < 0 && amount > -0.01) amount = "-0.01<";
		// 				else                                   amount = utils.format_number(amount, 2);
		// 			} else {
		// 				if (amount >= 0 && amount < 1)         amount = "<1";
		// 				else if (amount < 0 && amount > -0.01) amount = "-1<";
		// 				else                                   amount = utils.format_number(amount, 0);
		// 			}
		// 		} else {
		// 			amount = noDataSymbol;
		// 			missingData = true;
		// 		}
		// 		totalsTip += `<tr><td>${symbol}:&nbsp;</td><td style="text-align: right;">${amount} ${toAsset.get("symbol")}</td></tr>`;
		// 	}
		// }

		console.log("Asset values: " + JSON.stringify(assetValues));
		this.formattedAsset(totalValue, toAsset);
	}

	formattedAsset(amount, asset) {
		
		let decimalOffset = asset.get("symbol").indexOf("BTC") === -1 ? asset.get("precision") : 4

		let precision = utils.get_asset_precision(asset.get("precision"));
		
		let decimals = Math.max(0, asset.get("precision") - decimalOffset);

		let value =  amount / precision;

		console.log("Total value: " + value.toFixed(decimals) + ' ' + asset.get("symbol"));
		
	}

	dispose() {
		this._stopUpdates();
	}

  	_convertValue(amount, fromAsset, toAsset, marketStats, coreAsset) {
		if (!fromAsset || !toAsset) {
			return 0;
		}
		let toStats, fromStats;

		let toID = toAsset.get("id");
		let toSymbol = toAsset.get("symbol");
		let fromID = fromAsset.get("id");
		let fromSymbol = fromAsset.get("symbol");

		if (coreAsset && marketStats) {
			let coreSymbol = coreAsset.get("symbol");

			toStats = marketStats.get(toSymbol + "_" + coreSymbol);
			fromStats = marketStats.get(fromSymbol + "_" + coreSymbol);
		}

		let price = utils.convertPrice(fromStats && fromStats.close ? fromStats.close :
										fromID === "1.3.0" || fromAsset.has("bitasset") ? fromAsset : null,
										toStats && toStats.close ? toStats.close :
										(toID === "1.3.0" || toAsset.has("bitasset")) ? toAsset : null,
										fromID,
										toID);

		return price ? utils.convertValue(price, amount, fromAsset, toAsset) : null;
	}

	_assetValues(totals, amount, asset) {
		if (!totals[asset]) {
			totals[asset] = amount;
		} else {
			totals[asset] += amount;
		}

		return totals;
	}

	_startUpdates(props) {
		let coreAsset = ChainStore.getAsset("1.3.0");
		let {fromAssets} = props;

		if (coreAsset) {
			// From assets
			fromAssets.forEach(asset => {
				if (asset) {

					if (asset.get("id") !== coreAsset.get("id")) {
						setTimeout(() => {
							MarketsActions.getMarketStats(coreAsset, asset);
							this.fromStatsIntervals[asset.get("id")] = setInterval(MarketsActions.getMarketStats.bind(this, coreAsset, asset), 10 * 60 * 1000);
						}, 50)
					}
				}
			});

			// To asset
			if (props.toAsset.get("id") !== coreAsset.get("id")) {
				// wrap this in a timeout to prevent dispatch in the middle of a dispatch
				MarketsActions.getMarketStats.defer(coreAsset, props.toAsset);
				this.toStatsInterval = setInterval(() => {
					MarketsActions.getMarketStats.defer(coreAsset, props.toAsset);
				}, 5 * 60 * 1000);
			}
		}
	}

	_stopUpdates() {
		for (let key in this.fromStatsIntervals) {
			clearInterval(this.fromStatsIntervals[key]);
		}
		clearInterval(this.toStatsInterval);
	}
}

exports.Balance = Balance;