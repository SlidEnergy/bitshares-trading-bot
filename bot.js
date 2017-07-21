let AccountManager = require('./accountManager').default;
let Trader = require('./bitshares');
var logger = require('./logger').default;

let trade = process.argv.some(x=>x == '-trade')

let schedule = require('node-schedule');



class Bot {
	constructor(account, asset, currency, balance) {
		this.account = account;
		this.asset = asset;
		this.currency = currency;
		this.balance = balance;

		let trader = new Trader({ account, currency: "1.3.121", asset: "1.3.861", trade });
		this.accountManager = new AccountManager(trader);
	}

	run() {
		schedule.scheduleJob("*/1 * * * *", this.loop.bind(this));
		logger.info("Запуск первого цикла через 10 сек. Запуск последующих циклов через каждую 1 минуту")
		setTimeout(this.loop.bind(this), 10000);
	}

	async loop() {
		logger.info("=========================== Заупуск цикла =========================================");

		let orderVolume = 0.001;

		let orders = await this.accountManager.getOrders();

		if(orders.asks.length < 10 || orders.bids.length < 10) {
			logger.warn("Ордеров мало для дальнейшей торговли. Возможно недостаточный объем или данные о рынке еще не получены.");
			this.finishRun();
			return;
		}
		
		let { bestAsk, bestBid } = this.getTheBestAskAndBid(orders, orderVolume);

		if(!bestAsk || !bestBid) {
			logger.warn("bestAsk и bestBid не определен.");
			this.finishRun();
			return;
		}

		if(!this.isProfitable(bestAsk, bestBid)) {
			logger.info("Вычисленные bestAsk и bestBid не принесут прибыль.");
			finishRun();
			return;
		}
		
		let openedOrders = await this.accountManager.getOpenedOrders();

		if(!openedOrders || !openedOrders.asks || !openedOrders.bids) {
			logger.error("Не удалось получить открытые ордера");
			return;
		}

		if(openedOrders.bids.length == 0) {
			logger.info("Покупаем");
			await this.accountManager.buy(orderVolume, bestBid);	
		}
		else
			logger.info("Мы уже имеем открытую позицию на покупку.");

		if(openedOrders.asks.length == 0) {
			logger.info("Продаем");	
			await this.accountManager.sell(orderVolume, bestAsk);
		}
		else
			logger.info("Мы уже имеем открытую позицию на продажу.");

		this.balance.showBalance();
		
		this.finishRun();
	}

	finishRun() {
		logger.info("=========================== Конец цикла =========================================");
	}

	
	isProfitable(bestAsk, bestBid) {
		
		//let fee = 0.0018; //USD
		//let fee = 0.01213; //BTS
		let fee = 0.0000002; //BTC

		let avgPrice = (bestAsk + bestBid) / 2;

		let profit = (Math.abs(bestAsk - bestBid) - fee * 2) / avgPrice;

		if(profit > 0)
			return true;
		else
			return false;
	}

	getTheBestAskAndBid(orders, orderVolume) {

		let smallVolume = orderVolume * 0.1; // 10% от объема

		//let asks = Object.keys(orders.asks).map(k=>parseFloat(k)).sort();
		//let bids = Object.keys(orders.bids).map(k=>parseFloat(k)).sort((a,b) => b-a);

		let total = 0;

		let bestAsk = orders.asks.find(ask => {
			total += ask.amount;

			return total > smallVolume;
		});

		total = 0;

		let bestBid = orders.bids.find(bid => {
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