"use strict";

exports.__esModule = true;

var _es = require("bitsharesjs/es");

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var KeyAuth = function KeyAuth(auth) {
    var _this = this;

    this.id = auth.toJS ? auth.get(0) : auth[0];
    this.weight = auth.toJS ? auth.get(1) : auth[1];

    this.isAvailable = function (auths) {
        return auths.includes ? auths.includes(_this.id) : auths.indexOf(_this) !== -1;
    };
};

var permissionUtils = {

    AccountPermission: function AccountPermission(account, weight, type) {
        var _this2 = this;

        this.id = account.get("id");
        this.weight = weight;
        this.threshold = account.getIn([type, "weight_threshold"]);
        this.accounts = [];
        this.keys = account.getIn([type, "key_auths"]).map(function (auth) {
            return new KeyAuth(auth);
        }).toArray();

        this.isAvailable = function (auths) {
            return auths.includes ? auths.includes(_this2.id) : auths.indexOf(_this2) !== -1;
        };

        this._sumWeights = function (auths) {

            if (!_this2.isNested() && !_this2.isMultiSig()) {
                return _this2.isAvailable(auths) ? _this2.weight : 0;
            } else {
                var sum = _this2.accounts.reduce(function (status, account) {
                    return status + (account._sumWeights(auths) ? account.weight : 0);
                }, 0);

                return Math.floor(sum / _this2.threshold);
            }
        };

        this.getStatus = function (auths, keyAuths) {
            if (!_this2.isNested()) {
                var sum = _this2._sumWeights(auths);
                if (_this2.isMultiSig()) {
                    sum += _this2.sumKeys(keyAuths);
                }
                return sum;
            } else {
                var _sum = _this2.accounts.reduce(function (status, account) {
                    return status + account._sumWeights(auths);
                }, 0);

                if (_this2.keys.length) {
                    _sum += _this2.sumKeys(keyAuths);
                }

                return _sum;
            }
        };

        this.sumKeys = function (keyAuths) {
            var keySum = _this2.keys.reduce(function (s, key) {
                return s + (key.isAvailable(keyAuths) ? key.weight : 0);
            }, 0);
            return keySum;
        };

        this.isNested = function () {
            return _this2.accounts.length > 0;
        };

        this.isMultiSig = function () {
            return _this2.keys.reduce(function (final, key) {
                return final || key.weight < _this2.threshold;
            }, false);
        };

        this.getMissingSigs = function (auths) {
            var missing = [];
            var nested = [];
            if (_this2.isNested()) {
                nested = _this2.accounts.reduce(function (a, account) {
                    return a.concat(account.getMissingSigs(auths));
                }, []);
            } else if (!_this2.isAvailable(auths)) {
                missing.push(_this2.id);
            }

            return missing.concat(nested);
        };

        this.getMissingKeys = function (auths) {
            var missing = [];
            var nested = [];
            if (_this2.keys.length && (_this2.isNested() || _this2.isMultiSig())) {
                _this2.keys.forEach(function (key) {
                    if (!key.isAvailable(auths)) {
                        missing.push(key.id);
                    }
                });
            }

            if (_this2.isNested()) {
                nested = _this2.accounts.reduce(function (a, account) {
                    return a.concat(account.getMissingKeys(auths));
                }, []);
            };

            return missing.concat(nested);
        };
    },

    listToIDs: function listToIDs(accountList) {
        var allAccounts = [];

        accountList.forEach(function (account) {
            if (account) {
                allAccounts.push(account.get ? account.get("id") : account);
            }
        });

        return allAccounts;
    },

    unravel: function unravel(accountPermission, type) {
        var _this3 = this;

        var recursive_count = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

        if (recursive_count < 3) {
            var account = _es.ChainStore.getAccount(accountPermission.id);
            if (account && account.getIn([type, "account_auths"]).size) {
                account.getIn([type, "account_auths"]).forEach(function (auth) {
                    var nestedAccount = _es.ChainStore.getAccount(auth.get(0));
                    if (nestedAccount) {
                        accountPermission.accounts.push(_this3.unravel(new _this3.AccountPermission(nestedAccount, auth.get(1), type), type, recursive_count + 1));
                    }
                });
            }
        }

        return accountPermission;
    },

    unnest: function unnest(accounts, type) {
        var _this4 = this;

        var map = [];
        accounts.forEach(function (id) {
            var fullAccount = _es.ChainStore.getAccount(id);
            var currentPermission = _this4.unravel(new _this4.AccountPermission(fullAccount, null, type), type);
            map.push(currentPermission);
        });

        return map;
    },

    flatten_auths: function flatten_auths(auths) {
        var existingAuths = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _immutable2.default.List();

        if (!auths.size) {
            return existingAuths;
        }

        auths.forEach(function (owner) {
            if (!existingAuths.includes(owner.get(0))) {
                existingAuths = existingAuths.push(owner.get(0));
            }
        });
        return existingAuths;
    }
};

exports.default = permissionUtils;