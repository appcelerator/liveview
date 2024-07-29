"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePlugins = void 0;
const clientInjections_1 = require("./clientInjections");
const alloy_1 = require("./alloy");
const esbuild_1 = require("./esbuild");
const nativeModules_1 = require("./nativeModules");
const hyperloop_1 = require("./hyperloop");
const i18n_1 = require("./i18n");
const nodeBuiltins_1 = require("./nodeBuiltins");
const requireAnalysis_1 = require("./requireAnalysis");
const resolve_1 = require("./resolve");
async function resolvePlugins({ projectDir, type, platform, nativeModules }) {
    const normalPlugins = [
        (0, clientInjections_1.clientInjectionsPlugin)(),
        (0, nativeModules_1.nativeModulesPlugin)(nativeModules),
        (0, nodeBuiltins_1.nodeBuiltinsPlugin)(),
        (0, resolve_1.resolvePlugin)(projectDir, type, platform),
        (0, i18n_1.i18nPlugin)(projectDir, type)
    ];
    if (nativeModules.includes('hyperloop')) {
        normalPlugins.push(await (0, hyperloop_1.hyperloopPlugin)(projectDir, platform));
    }
    const postPlugins = [(0, requireAnalysis_1.requireAnalysisPlugin)(), (0, esbuild_1.esbuildPlugin)()];
    const projectPlugins = type === 'alloy' ? (0, alloy_1.resolveAlloyPlugins)(projectDir, platform) : [];
    return [...normalPlugins, ...projectPlugins, ...postPlugins];
}
exports.resolvePlugins = resolvePlugins;
