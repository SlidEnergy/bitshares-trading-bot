"use strict";

exports.__esModule = true;

var _WalletDb = require("stores/WalletDb");

var _WalletDb2 = _interopRequireDefault(_WalletDb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BlockTradesDepositAddressCache = function () {
    function BlockTradesDepositAddressCache() {
        _classCallCheck(this, BlockTradesDepositAddressCache);

        // increment this to force generating new addresses for all mappings
        this.current_blocktrades_address_cache_version_string = "2";

        //let wallet = WalletDb.getWallet();
        //delete wallet.deposit_keys["blocktrades"];
        //delete wallet.deposit_keys["openledger"];
        //WalletDb._updateWallet();
    }

    BlockTradesDepositAddressCache.prototype.getIndexForDepositKeyInExchange = function getIndexForDepositKeyInExchange(account_name, input_coin_type, output_coin_type) {
        var args = [this.current_blocktrades_address_cache_version_string, account_name, input_coin_type, output_coin_type];
        return args.reduce(function (previous, current) {
            return previous.concat("[", current, "]");
        }, "");
    };

    // returns {"address": address, "memo": memo}, with a null memo if not applicable


    BlockTradesDepositAddressCache.prototype.getCachedInputAddress = function getCachedInputAddress(exchange_name, account_name, input_coin_type, output_coin_type) {
        var wallet = _WalletDb2.default.getWallet();
        if (!wallet) return null;
        wallet.deposit_keys = wallet.deposit_keys || {};
        wallet.deposit_keys[exchange_name] = wallet.deposit_keys[exchange_name] || {};
        var index = this.getIndexForDepositKeyInExchange(account_name, input_coin_type, output_coin_type);
        wallet.deposit_keys[exchange_name][index] = wallet.deposit_keys[exchange_name][index] || [];

        var number_of_keys = wallet.deposit_keys[exchange_name][index].length;
        if (number_of_keys) return wallet.deposit_keys[exchange_name][index][number_of_keys - 1];
        return null;
    };

    BlockTradesDepositAddressCache.prototype.cacheInputAddress = function cacheInputAddress(exchange_name, account_name, input_coin_type, output_coin_type, address, memo) {
        var wallet = _WalletDb2.default.getWallet();
        if (!wallet) return null;
        wallet.deposit_keys = wallet.deposit_keys || {};
        wallet.deposit_keys[exchange_name] = wallet.deposit_keys[exchange_name] || {};
        var index = this.getIndexForDepositKeyInExchange(account_name, input_coin_type, output_coin_type);
        wallet.deposit_keys[exchange_name][index] = wallet.deposit_keys[exchange_name][index] || [];
        wallet.deposit_keys[exchange_name][index].push({ "address": address, "memo": memo });
        _WalletDb2.default._updateWallet();
    };

    return BlockTradesDepositAddressCache;
}();

; // BlockTradesDepositAddressCache

exports.default = BlockTradesDepositAddressCache;