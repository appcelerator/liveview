"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePlugin = void 0;
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
const constants_js_1 = require("../constants.js");
/**
 * Resolve plugin for Titanium specific resolve rules.
 *
 * - Checks for files inside `platform` sub folders
 * - Support bare module and absolute ids as relative to source root
 */
function resolvePlugin(projectDir, projectType, platform) {
    let root;
    return {
        name: 'titanium:resolve',
        // Enforce as pre plugin so it comes before vite's default resolve plugin
        enforce: 'pre',
        configResolved(config) {
            root = config.root;
        },
        async resolveId(id, importer) {
            if (id[0] === '\0' ||
                id.startsWith('virtual:') ||
                // When injected directly in html/client code
                id.startsWith('/virtual:')) {
                return;
            }
            // explicit fs paths that starts with /@fs/*
            if (id.startsWith(constants_js_1.FS_PREFIX)) {
                return;
            }
            // prevent nested full path resolving
            if (id.startsWith(projectDir)) {
                return;
            }
            const platformResolve = async (id, base) => {
                const result = await this.resolve(path_1.default.join(base, id), importer, {
                    skipSelf: true
                });
                if (result) {
                    return result.id;
                }
                const platforms = [platform, utils_1.otherPlatform[platform]];
                for (const platform of platforms) {
                    const platformPath = path_1.default.join(base, platform, id);
                    const result = await this.resolve(platformPath, importer, {
                        skipSelf: true
                    });
                    if (result) {
                        return result.id;
                    }
                }
            };
            id = (0, utils_1.cleanUrl)(id).replace(/^\//, '');
            const dirs = [];
            if (projectType === 'alloy') {
                dirs.push(path_1.default.join(root, 'lib'), path_1.default.join(root, 'assets'));
            }
            else {
                dirs.push(root);
            }
            for (const base of dirs) {
                const result = await platformResolve(id, base);
                if (result) {
                    return result;
                }
            }
        }
    };
}
exports.resolvePlugin = resolvePlugin;
