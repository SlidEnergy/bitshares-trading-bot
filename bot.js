let AccountManager = require('./accountManager').default;
let Trader = require('./bitshares');
var logger = require('./logger').default;

let trade = process.argv.some(x=>x == '-trade')

let schedule = require('node-schedule');

// BID - ордер на покупку
// ASK - ордер на продажу

class Bot {
	constructor(balance, account, asset, maxAssetAmount, currency, maxCurrencyAmount) {
		this.maxAssetAmount = maxAssetAmount;
		this.maxCurrencyAmount = maxCurrencyAmount;
		this.amount = maxAssetAmount * 0.1;
		this.account = account;
		this.asset = asset;
		this.currency = currency;
		this.balance = balance;

		let trader = new Trader({ account, currency, asset, trade });
		this.accountManager = new AccountManager(trader, asset, currency);
	}

	run() {
		//schedule.scheduleJob("*/1 * * * *", this.loop.bind(this));
		// Даем время 10 сек. на инициализацию классов и получения первоначальных данных с бирж.
		 // ставим запуск следующего цикла минимум через 2 минуты, т.к. повторный цикл может запуститься раньше чем закончится предыдущий.
		logger.info("Запуск первого цикла через 10 сек. Запуск последующих циклов через каждые 2 минуты");
		setTimeout(this.loop.bind(this), 10000);
	}

	async loop() {
		logger.info(`=========================== Заупуск цикла ${this.asset}_${this.currency} ================================`);

		let orders = await this.accountManager.getOrders();

		if(!orders || orders.asks.length < 10 || orders.bids.length < 10) {
			logger.warn("Ордеров мало для дальнейшей торговли. Возможно недостаточный объем или данные о рынке еще не получены.");
			this.finishRun();
			return;
		}

		let openedOrders = await this.accountManager.getOpenedOrders();

		if(!openedOrders || !openedOrders.asks || !openedOrders.bids) {
			logger.error("Не удалось получить открытые ордера");
			return;
		}
		
		let { bestAsk, bestBid } = this.getTheBestAskAndBid(orders, this.amount, openedOrders);

		if(!bestAsk || !bestBid) {
			logger.warn("bestAsk и bestBid не определен.");
			this.finishRun();
			return;
		}

		if(!this.isProfitable(bestAsk, bestBid)) {
			logger.info(`Вычисленные bestAsk ${bestAsk} и bestBid ${bestBid} не принесут прибыль.`);
			finishRun();
			return;
		}

		//let fee = 0.0023; //USD
		//let fee = 0.01213; //BTS
		let fee = 0.00000021; //BTC

		let oldExpirationDate = new Date();
		oldExpirationDate.setFullYear((oldExpirationDate.getFullYear() + 5));
		oldExpirationDate.setHours((oldExpirationDate.getHours() - 1));

		let portfollio = await this.accountManager.getPortfollio();

		// Проверяем ордеры на актуальность
		for(var i = 0; i < openedOrders.bids.length; i++) {
			let order = openedOrders.bids[i];

			if(order.price + fee < bestBid && order.expiration < oldExpirationDate) {
				logger.info(`Отменяем ордер на покупку. Цена ${order.price}, лучшая расчитанная цена ${bestBid}. Дата истечения ордера ${oldExpirationDate.toISOString()}`);
				await this.accountManager.cancelOrder(order);
			}
		};

		if(openedOrders.bids.length == 0) {
			if(this.checkMaxAssetAmount(this.asset, this.amount, portfollio)) {
				logger.info(`Покупаем. Количество ${this.amount} цена ${bestBid}`);
				await this.accountManager.buy(this.amount, bestBid);	
			}
			else
				logger.info(`Мы уже достигли максимального объема по ${this.asset}`);
		}
		else
			logger.info("Мы уже имеем открытую позицию на покупку.");

		// Проверяем ордеры на актуальность
		for(var i = 0; i < openedOrders.asks.length; i++) {
			let order = openedOrders.asks[i];

			if(order.price - fee > bestBid && order.expiration < oldExpirationDate) {
				logger.info(`Отменяем ордер на продажу. Цена ${order.price}, лучшая расчитанная цена ${bestAsk}. Дата истечения ордера ${oldExpirationDate.toISOString()}`);
				await this.accountManager.cancelOrder(order);
			}
		};

		if(openedOrders.asks.length == 0) {
			if(this.checkMaxAssetAmount(this.currency, this.amount * bestAsk, portfollio)) {
				logger.info(`Продаем. Количество ${this.amount} цена ${bestAsk}`);	
				await this.accountManager.sell(this.amount, bestAsk);
			}
			else
				logger.info(`Мы уже достигли максимального объема по ${this.currency}`);
		}
		else
			logger.info("Мы уже имеем открытую позицию на продажу.");

		this.balance.showBalance();
		
		this.finishRun();
	}

	finishRun() {
		logger.info("================================ Конец цикла =====================================");
		setTimeout(this.loop.bind(this), 60*1000);
	}

	checkMaxAssetAmount(asset, amount, portfollio) {
		let balance = portfollio.find(x=> x.asset == this.asset);
		if(balance.amount + amount > this.maxAssetAmount)
			return false;
		
		return true;
	}
	
	isProfitable(bestAsk, bestBid) {
		
		//let fee = 0.0023; //USD
		//let fee = 0.01213; //BTS
		let fee = 0.00000021; //BTC

		let avgPrice = (bestAsk + bestBid) / 2;

		let profit = (Math.abs(bestAsk - bestBid) - fee * 2) / avgPrice;

		if(profit > 0)
			return true;
		else
			return false;
	}

	getTheBestAskAndBid(orders, orderVolume, openedOrders) {

		let smallVolume = orderVolume * 0.1; // 10% от объема

		//let asks = Object.keys(orders.asks).map(k=>parseFloat(k)).sort();
		//let bids = Object.keys(orders.bids).map(k=>parseFloat(k)).sort((a,b) => b-a);

		let total = 0;

		let bestAsk = orders.asks.find(ask => {
			if(!openedOrders.asks.find(openedOrder => openedOrder.id == ask.id))
				total += ask.amount;

			return total > smallVolume;
		});

		total = 0;

		let bestBid = orders.bids.find(bid => {
			if(!openedOrders.bids.find(openedOrder => openedOrder.id == bid.id))
				total += bid.amount;

			return total > smallVolume;
		});

		if(!bestAsk || !bestBid) {
			logger.warn("Не удалось вычислить bestAsk и bestBid.")
			return;
		}

		let percentToBetterPrice = 0.0001; // 0.01 %

		let newAsk = bestAsk.price * (1 - percentToBetterPrice);
		let newBid = bestBid.price * (1 + percentToBetterPrice);

		return { bestAsk: newAsk, bestBid: newBid };
	}

}

exports.Bot = Bot;