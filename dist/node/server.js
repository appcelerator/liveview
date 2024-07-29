"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const path_1 = __importDefault(require("path"));
const vite_1 = require("vite");
const optimizer_1 = require("./optimizer");
const plugins_1 = require("./plugins");
const constants_js_1 = require("./constants.js");
async function startServer({ project, server }) {
    const { dir: projectDir, type: projectType, platform, tiapp } = project;
    const isAlloy = projectType === 'alloy';
    const root = path_1.default.join(projectDir, isAlloy ? 'app' : 'Resources');
    const appEntry = isAlloy ? 'alloy.js' : 'app.js';
    const nativeModules = [
        ...new Set(tiapp.modules.map((m) => m.id))
    ];
    const define = {
        OS_ANDROID: JSON.stringify(platform === 'android'),
        OS_IOS: JSON.stringify(platform === 'ios')
    };
    const viteSever = await (0, vite_1.createServer)({
        clearScreen: false,
        root,
        build: {
            modulePreload: false,
            rollupOptions: {
                input: appEntry
            }
        },
        plugins: await (0, plugins_1.resolvePlugins)({
            projectDir,
            type: projectType,
            platform,
            nativeModules
        }),
        define,
        resolve: {
            alias: [
                {
                    find: /^\/?@vite\/env/,
                    replacement: path_1.default.posix.join(constants_js_1.FS_PREFIX, (0, vite_1.normalizePath)(constants_js_1.ENV_ENTRY))
                },
                {
                    find: /^\/?@vite\/client/,
                    replacement: path_1.default.posix.join(constants_js_1.FS_PREFIX, (0, vite_1.normalizePath)(constants_js_1.CLIENT_ENTRY))
                }
            ]
        },
        cacheDir: path_1.default.join(projectDir, 'build/.vite'),
        optimizeDeps: {
            exclude: [...nativeModules],
            esbuildOptions: {
                define
            }
        },
        server: {
            ...server,
            hmr: true,
            fs: {
                allow: [projectDir, constants_js_1.CLIENT_DIR]
            }
        },
        appType: 'custom',
        json: {
            stringify: true
        }
    });
    await viteSever.listen();
    await (0, optimizer_1.runDynamicOptimize)(viteSever);
    return viteSever;
}
exports.startServer = startServer;
