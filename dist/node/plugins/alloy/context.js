"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlloyContext = exports.initContextPlugin = void 0;
const path_1 = __importDefault(require("path"));
const alloy_compiler_1 = require("alloy-compiler");
const global_paths_1 = __importDefault(require("global-paths"));
const vite_1 = require("vite");
// A mapping of files in an Alloy project that require us to recreate the
// Alloy compiler to properly update all internals
const fullRecompileFiles = ['app/styles/app.tss', 'app/config.json'];
function initContextPlugin(context) {
    return {
        name: 'alloy:context',
        configureServer(_server) {
            context.server = _server;
        }
    };
}
exports.initContextPlugin = initContextPlugin;
class AlloyContext {
    constructor(projectDir, platform) {
        this.projectDir = projectDir;
        this.platform = platform;
        // eslint-disable-next-line n/no-missing-require
        const alloyModuleMain = require.resolve('alloy', {
            paths: [projectDir, ...(0, global_paths_1.default)(projectDir)]
        });
        if (!alloyModuleMain) {
            throw new Error(`Unable to resolve Alloy. Please make sure you have Alloy installed globally, or locally in the current project (${projectDir}).`);
        }
        this.root = path_1.default.dirname(alloyModuleMain);
        this.appDir = path_1.default.join(projectDir, 'app');
    }
    get compiler() {
        if (!this._compiler) {
            this._compiler = this.createCompiler();
        }
        return this._compiler;
    }
    set server(_server) {
        this._server = _server;
        this._server.watcher.on('change', (file) => {
            file = (0, vite_1.normalizePath)(file);
            const relFile = path_1.default.relative(this.projectDir, file);
            if (fullRecompileFiles.includes(relFile)) {
                this._compiler = this.createCompiler();
                // Cached transform results may have stale Alloy state so they need to
                // be invalidated before sending reload message
                this.server.moduleGraph.invalidateAll();
                this.server.ws.send({
                    type: 'full-reload',
                    path: '*'
                });
            }
        });
    }
    get server() {
        return this._server;
    }
    createCompiler() {
        const alloyConfig = {
            platform: this.platform,
            deploytype: 'development'
        };
        return (0, alloy_compiler_1.createCompiler)({
            compileConfig: {
                projectDir: this.projectDir,
                alloyConfig
            }
        });
    }
}
exports.AlloyContext = AlloyContext;
