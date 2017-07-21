"use strict";

exports.__esModule = true;
// Localstorage
//import ls, {ls_key_exists} from "./localStorageImpl";

//if (null===ls) throw "localStorage is required but isn't available on this platform";

var localStorage = function localStorage(key) {

    var STORAGE_KEY = key;

    return {
        get: function get(key) {
            var dv = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};


            // let rv;
            // try {
            //     if ( ls_key_exists(STORAGE_KEY + key, ls) ) {
            //         rv = JSON.parse(ls.getItem(STORAGE_KEY + key));
            //     }
            //     return rv ? rv : dv;
            // } catch(err) {
            return dv;
            //}
        },
        set: function set(key, object) {
            if (object && object.toJS) {
                object = object.toJS();
            }
            //ls.setItem(STORAGE_KEY + key, JSON.stringify(object));
        },
        remove: function remove(key) {
            //ls.removeItem(STORAGE_KEY + key);
        },
        has: function has(key) {
            return false; //ls_key_exists(STORAGE_KEY + key, ls);
        }
    };
};

exports.default = localStorage;