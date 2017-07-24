let logger = require('./logger').default;

class AccountManager {
	constructor(trader, asset, currency) {
		this.trader = trader;
		this.asset = asset;
		this.currency = currency;
	}

	async buy(amount, price) {

		let portfollio = await this.getPortfollio();

		if(!this._hasMoney(portfollio, this.currency, amount * price)) {
			logger.warn("недостаточно денег");
			return;
		}

		await this.trader.buy(amount, price);
	}

	async sell(amount, price) {
		
		let portfollio = await this.getPortfollio();

		if(!this._hasMoney(portfollio, this.asset, amount)) {
			logger.warn("недостаточно денег");
			return;
		}
		
		await this.trader.sell(amount, price);
	}
	
	async cancelOrder(order) {
		await this.trader.cancelOrder(order);
	}

	async getOrders() {
		logger.info("Получаем все ордера");
		return await this.trader.getOrders();
	}

	async getPortfollio() {
		logger.info("Получаем портфель пользователя");
		return await this.trader.getPortfollio();
	}

	async getOpenedOrders() {

		logger.info("Получаем наши открытые ордера");

		return await this.trader.getOpenedOrders();

		// return {
		// 	buyOrders: orders.filter((element) => {
		// 		return element.sell_price.base.asset_id == this.trader.markets[this.trader.currency].asset_id &&
		// 			element.sell_price.quote.asset_id == this.trader.markets[this.trader.asset].asset_id
		// 	}),
		// 	sellOrders: orders.filter((element) => {
		// 		return element.sell_price.base.asset_id == this.trader.markets[this.trader.asset].asset_id &&
		// 			element.sell_price.quote.asset_id == this.trader.markets[this.trader.currency].asset_id
		// })}
	}


	_hasMoney(portfollio, asset, amount) {
		let fee = 0.01213;

		let  balance = portfollio.find(value => value.asset = "BTS");

		if(!balance || balance.amount < fee) {
			logger.info("На счете нет BTS для уплаты коммиссии.");
			return false;
		}

		balance = portfollio.find(value => value.asset == asset)

		if(!balance || balance.amount < amount) {
			logger.info("На счете не хватает средств " + asset + " для размещения ордера.");
			return false;
		}

		return true;
	}
}

exports.default = AccountManager;