"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeBuiltinsPlugin = void 0;
const utils_1 = require("../utils");
/**
 * Resolves built-in Node core modules provided by Titanium
 */
function nodeBuiltinsPlugin() {
    return {
        name: 'titanium:node-builtins',
        // Enforce as pre plugin so it comes before vite's default resolve plugin
        // which tries to replace Node core modules with empty browser shims
        enforce: 'pre',
        async resolveId(id) {
            return (0, utils_1.isBuiltinModule)(id) && id;
        }
    };
}
exports.nodeBuiltinsPlugin = nodeBuiltinsPlugin;
