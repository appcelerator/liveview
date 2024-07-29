"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.esbuildPlugin = void 0;
const pluginutils_1 = require("@rollup/pluginutils");
const esbuild_1 = require("esbuild");
const vite_1 = require("vite");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const clientDir = (0, vite_1.normalizePath)(constants_1.CLIENT_DIR);
function esbuildPlugin() {
    const filter = (0, pluginutils_1.createFilter)([/\.(m?j|t)sx?/], 'node_modules/!(alloy)');
    return {
        name: 'titanium:esbuild',
        /**
         * Make sure this plugin runs last so vite can still apply all core plugins
         * on ES code.
         */
        configResolved(resolved) {
            const plugins = resolved.plugins;
            const index = plugins.findIndex(({ name }) => name === 'titanium:esbuild');
            const [titaniumPlugin] = plugins.splice(index, 1);
            plugins.push(titaniumPlugin);
        },
        /**
         * Transforms all code to CJS so Titanium can use it.
         */
        async transform(code, id) {
            id = id.replace('\0', '');
            if (filter((0, utils_1.cleanUrl)(id))) {
                const options = {
                    target: 'node10',
                    format: 'cjs'
                };
                if (!id.includes('build/.vite') && !id.startsWith(clientDir)) {
                    // Enable source maps except for optimized deps from Vite or the
                    // client as they contain references to virtual modules or non-existent
                    // files that cannot be resolved
                    options.sourcemap = true;
                    options.sourcefile = id;
                }
                const result = await (0, esbuild_1.transform)(code, options);
                return options.sourcemap
                    ? {
                        ...result,
                        map: JSON.parse(result.map)
                    }
                    : result;
            }
        }
    };
}
exports.esbuildPlugin = esbuildPlugin;
