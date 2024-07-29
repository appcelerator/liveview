"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAlloyPlugins = void 0;
const path_1 = __importDefault(require("path"));
const plugin_node_resolve_1 = require("@rollup/plugin-node-resolve");
const constants_1 = require("../../constants");
const context_1 = require("./context");
const component_1 = require("./component");
const core_1 = require("./core");
const config_1 = require("./config");
const entry_1 = require("./entry");
const model_1 = require("./model");
const widget_1 = require("./widget");
function resolveAlloyPlugins(projectDir, platform) {
    const appDir = path_1.default.join(projectDir, 'app');
    const context = new context_1.AlloyContext(projectDir, platform);
    return [
        (0, context_1.initContextPlugin)(context),
        (0, core_1.corePlugin)(context, platform),
        (0, config_1.configPlugin)(context),
        (0, entry_1.entryPlugin)(appDir),
        /**
         * Alloy supports installing Node modules under `app/lib`, which cannot be
         * resolved by the default node resolve algorithim that Vite uses when the
         * import comes from `app/controllers`. Perform an additional Node style
         * resolve jailed to `app/lib` to handle those edge cases.
         */
        (0, plugin_node_resolve_1.nodeResolve)({
            rootDir: path_1.default.join(context.appDir, 'lib'),
            jail: path_1.default.join(context.appDir, 'lib'),
            preferBuiltins: true,
            dedupe(importee) {
                // Enable dedupe for all bare imports to force resolve from `rootDir`
                return constants_1.bareImportRE.test(importee);
            }
        }),
        (0, component_1.componentPlugin)(context),
        (0, model_1.modelPlugin)(context),
        (0, widget_1.widgetPlugin)(appDir)
    ];
}
exports.resolveAlloyPlugins = resolveAlloyPlugins;
