"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeModulesPlugin = void 0;
// Null-byte based prefix triggers internal server error
// const PREFIX = '\0titanium:';
const PREFIX = '/@titanium/';
function nativeModulesPlugin(nativeModules) {
    return {
        name: 'titanium:modules',
        resolveId(id) {
            if (nativeModules.includes(id)) {
                return { id: `${PREFIX}${id}`, external: true };
            }
        }
    };
}
exports.nativeModulesPlugin = nativeModulesPlugin;
