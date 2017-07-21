"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BaseStore = function () {
    function BaseStore() {
        _classCallCheck(this, BaseStore);
    }

    BaseStore.prototype._export = function _export() {
        var _this = this;

        var publicMethods = {};

        for (var _len = arguments.length, methods = Array(_len), _key = 0; _key < _len; _key++) {
            methods[_key] = arguments[_key];
        }

        methods.forEach(function (method) {
            if (!_this[method]) throw new Error("BaseStore._export: method '" + method + "' not found in " + _this.__proto__._storeName);
            _this[method] = _this[method].bind(_this);
            publicMethods[method] = _this[method];
        });
        this.exportPublicMethods(publicMethods);
    };

    return BaseStore;
}();

exports.default = BaseStore;