"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configPlugin = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const compilerUtils_1 = require("alloy-compiler/lib/compilerUtils");
const ALLOY_CONFIG = '/alloy/CFG';
function configPlugin(ctx) {
    return {
        name: 'titanium:alloy:config',
        resolveId(id) {
            if (id === ALLOY_CONFIG) {
                return id;
            }
        },
        load(id) {
            if (id === ALLOY_CONFIG) {
                const { alloyConfig, theme } = ctx.compiler.config;
                const { home: appDir } = ctx.compiler.config.dir;
                const config = {};
                const appConfigFile = path_1.default.join(appDir, 'config.json');
                if (fs_1.default.existsSync(appConfigFile)) {
                    (0, compilerUtils_1.parseConfig)(appConfigFile, alloyConfig, config);
                    if (theme) {
                        const themeConfigFile = path_1.default.join(appDir, 'themes', theme, 'config.json');
                        if (fs_1.default.existsSync(themeConfigFile)) {
                            (0, compilerUtils_1.parseConfig)(themeConfigFile, alloyConfig, config);
                        }
                    }
                }
                return `module.exports = ${JSON.stringify(config)}`;
            }
        }
    };
}
exports.configPlugin = configPlugin;
