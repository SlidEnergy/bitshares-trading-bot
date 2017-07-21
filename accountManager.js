let logger = require('./logger').default;

class AccountManager {
	constructor(trader) {
		this.trader = trader;
	}

	async buy(amount, price) {

		let portfollio = await this.getPortfollio();

		if(!this.hasMoney(portfollio, this.trader.currency, amount * price)) {
			logger.info("недостаточно денег");
			return;
		}

		await this.trader.buy(amount, price);
	}

	async sell(amount, price) {
		
		let portfollio = await this.getPortfollio();

		if(!this.hasMoney(portfollio, this.trader.asset, amount)) {
			logger.warn("недостаточно денег");
			return;
		}
		
		await this.trader.sell(amount, price);
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

		if(portfollio["BTS"] < fee) {
			logger.info("На счете нет BTS для уплаты коммиссии.");
			return false;
		}

		if(portfollio[asset] < amount) {
			logger.info("На счете не хватает средств " + asset + " для размещения ордера.");
			return false;
		}

		return true;
	}
}

exports.default = AccountManager;