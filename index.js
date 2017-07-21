const { Apis } = require("bitsharesjs-ws"); 
var { ChainStore } = require("bitsharesjs");
const { Balance } = require("./balance"); 

var toAsset = "1.3.861"; // BTC
var account = "slidtrader1";
	
initBitshares().then(() => {
	let balance = new Balance(account);
	balance.startShowTotal(toAsset);
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
			console.log("connected to:", res[0].network); 

			//ChainStore.subscribe(object => {}); 

			ChainStore.init().then(() => resolve());
		});
	});
}