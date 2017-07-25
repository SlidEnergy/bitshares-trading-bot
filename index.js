var { Apis } = require("bitsharesjs-ws"); 
var { ChainStore } = require("bitsharesjs");
var { Balance } = require("./balance"); 
var { Bot } = require("./bot"); 
var logger = require('./logger').default;

let trade = process.argv.some(x=>x == '-trade')
let debug = process.argv.some(x=>x == '-debug')

logger.info("Параметры запуска: " + process.argv)

var toAsset = "1.3.861"; // BTC
var account = "slidtrader1";

global.__DEV__ = false;
	
initBitshares().then(() => {
	// Balance
	let balance = new Balance(account);
	balance.startShowTotal(toAsset);

	// Bot
	let btc_usd_bot = new Bot(account, 0.001, "BTC", "USD", balance);
	btc_usd_bot.run();

	setTimeout(() => {
		let bts_cny_bot = new Bot(account, 4, "BTS", "CNY", balance);
		bts_cny_bot.run();
	}, 30 * 1000);
});

function initBitshares() {

	return new Promise((resolve, reject) => {

		const WS_NODE_LIST = [
				{url: "wss://node.market.rudex.org", location: "Germany"},
				{url: "wss://fake.automatic-selection.com", location: {translate: "settings.api_closest"}},
				{url: "ws://127.0.0.1:8090", location: "Locally hosted"},
				{url: "wss://bitshares.openledger.info/ws", location: "Nuremberg, Germany"},
				{url: "wss://eu.openledger.info/ws", location: "Berlin, Germany"},
				{url: "wss://bit.btsabc.org/ws", location: "Hong Kong"},
				{url: "wss://bts.transwiser.com/ws", location: "Hangzhou, China"},
				{url: "wss://bitshares.dacplay.org/ws", location:  "Hangzhou, China"},
				{url: "wss://openledger.hk/ws", location: "Hong Kong"},
				{url: "wss://secure.freedomledger.com/ws", location: "Toronto, Canada"},
				{url: "wss://dexnode.net/ws", location: "Dallas, USA"},
				{url: "wss://altcap.io/ws", location: "Paris, France"},
				{url: "wss://node.testnet.bitshares.eu", location: "Public Testnet Server (Frankfurt, Germany)"}
		];

		Apis.instance(WS_NODE_LIST[0].url, true).init_promise.then(res => {
			logger.info("connected to:", res[0].network); 

			//ChainStore.subscribe(object => {}); 

			ChainStore.init().then(() => resolve());
		});
	});
}