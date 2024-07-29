"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corePlugin = void 0;
const path_1 = __importDefault(require("path"));
const utils_1 = require("../../utils");
const DEFAULT_BACKBONE_VERSION = '0.9.2';
function corePlugin(ctx, platform) {
    const { root: alloyRoot } = ctx;
    const ALLOY_MAIN = path_1.default.join(alloyRoot, 'template/lib/alloy.js');
    const ALLOY_WIDGET = path_1.default.join(alloyRoot, 'lib/alloy/widget.js');
    const ALLOY_UTILS_ROOT = path_1.default.dirname(require.resolve('alloy-utils'));
    return {
        name: 'titanium:alloy:core',
        config(config) {
            const { appDir, root: alloyRoot, compiler } = ctx;
            const compileConfig = compiler.config;
            const backboneVersion = compileConfig.backbone
                ? compileConfig.backbone
                : DEFAULT_BACKBONE_VERSION;
            if (!config.resolve) {
                config.resolve = {};
            }
            config.resolve.alias = [
                ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : []),
                {
                    find: /^\/?alloy$/,
                    replacement: ALLOY_MAIN
                },
                {
                    find: /^\/?alloy\/backbone$/,
                    replacement: path_1.default.join(alloyRoot, 'lib/alloy/backbone', backboneVersion, 'backbone.js')
                },
                {
                    find: /^\/?alloy\/constants$/,
                    replacement: path_1.default.join(ALLOY_UTILS_ROOT, 'constants.js')
                },
                {
                    find: /^\/?alloy\/models/,
                    replacement: path_1.default.join(appDir, 'models')
                },
                {
                    find: /^\/?alloy\/styles/,
                    replacement: path_1.default.join(appDir, 'styles')
                },
                {
                    find: /^\/?alloy\/widgets/,
                    replacement: path_1.default.join(appDir, 'widgets')
                },
                {
                    find: /^\/?alloy\/(animation|dialogs|measurement|moment|sha1|social|string)/,
                    replacement: path_1.default.resolve(alloyRoot, 'builtins/$1')
                },
                {
                    find: /^\/?alloy\/(sync|underscore|widget|controllers\/BaseController)/,
                    replacement: path_1.default.resolve(alloyRoot, 'lib/alloy/$1')
                },
                {
                    find: /^alloy.bootstrap$/,
                    replacement: path_1.default.join(alloyRoot, 'template/alloy.bootstrap.js')
                }
            ];
            config.define = {
                ...config.define,
                ALLOY_VERSION: JSON.stringify('1.0.0'),
                ENV_DEV: true,
                ENV_DEVELOPMENT: true,
                ENV_TEST: false,
                ENV_PROD: false,
                ENV_PRODUCTION: false,
                OS_MOBILEWEB: false,
                DIST_ADHOC: false,
                DIST_STORE: false
            };
            if (!config.optimizeDeps) {
                config.optimizeDeps = {};
            }
            config.optimizeDeps.entries = [
                ...(config.optimizeDeps.entries ?? []),
                `controllers/!(${utils_1.otherPlatform[platform]})/**/*.@(j|t)s`,
                `lib/!(${utils_1.otherPlatform[platform]})/**/*.@(j|t)s`
            ];
            config.optimizeDeps.exclude = [
                ...(config.optimizeDeps.exclude ?? []),
                'alloy.bootstrap'
            ];
            config.server = {
                ...config.server,
                fs: {
                    ...config.server?.fs,
                    allow: [
                        ...(config.server?.fs?.allow ?? []),
                        alloyRoot,
                        ALLOY_UTILS_ROOT
                    ]
                }
            };
        },
        resolveId(id, importer) {
            if (id === 'jquery' && importer?.includes('/backbone.js')) {
                // backbone includes an unused require to `jquery` that needs to be
                // marked as external so vite does not try to handle it
                return { id, external: true };
            }
        },
        transform(code, id) {
            if (id === ALLOY_MAIN || id === ALLOY_WIDGET) {
                return (code
                    // remove ucfirst in model/collection requires
                    .replace(/models\/'\s\+\sucfirst\(name\)/g, "models/' + name")
                    // remove double slash in controller requires
                    .replace(/(controllers\/' \+ \(?)(name)/, "$1$2.replace(/^\\//, '')"));
            }
        }
    };
}
exports.corePlugin = corePlugin;
