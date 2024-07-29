"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDynamicOptimize = void 0;
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const debug_1 = __importDefault(require("debug"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const vite_1 = require("vite");
const utils_1 = require("../utils");
const scan_1 = require("./scan");
const log = (0, debug_1.default)('titanium:deps');
async function runDynamicOptimize(server, force = server.config.optimizeDeps.force) {
    const config = server.config;
    const { cacheDir, logger, root } = config;
    if (!cacheDir) {
        return;
    }
    // Create our own metadata file so we can detect if we need to re-bundle
    const dataPath = path_1.default.join(cacheDir, '_dyn_metadata.json');
    const mainHash = getDepHash(root, config);
    const data = {
        hash: mainHash,
        browserHash: mainHash,
        optimized: {},
        chunks: {},
        discovered: {},
        depInfoList: []
    };
    if (!force) {
        let prevData;
        try {
            prevData = JSON.parse(fs_extra_1.default.readFileSync(dataPath, 'utf-8'));
        }
        catch (e) { }
        // hash is consistent, no need to re-bundle
        if (prevData && prevData.hash === data.hash) {
            return;
        }
    }
    server._isRunningOptimizer = true;
    const { deps } = await (0, scan_1.scanDynamicRequires)(server);
    const qualifiedIds = Object.keys(deps);
    if (!qualifiedIds.length) {
        await fs_extra_1.default.outputFile(dataPath, JSON.stringify(data, null, 2));
        log('No dynamic dependencies to bundle. Skipping.\n\n\n');
        return;
    }
    const uniqueIds = dedupeDeps(qualifiedIds);
    const total = uniqueIds.length;
    const maxListed = 5;
    const listed = Math.min(total, maxListed);
    const extra = Math.max(0, total - maxListed);
    const depsString = chalk_1.default.yellow(uniqueIds.slice(0, listed).join('\n  ') +
        (extra > 0 ? `\n  (...and ${extra} more)` : ''));
    logger.info(chalk_1.default.greenBright(`Pre-bundling dynamic dependencies:\n  ${depsString}`));
    logger.info('(this will be run only when your dependencies or config have changed)');
    const newDeps = deps;
    const knownOptimized = server._optimizeDepsMetadata.optimized;
    for (const id in knownOptimized) {
        newDeps[id] = knownOptimized[id].src;
    }
    const meta = await (0, vite_1.optimizeDeps)(server.config, true, false);
    if (meta) {
        // In-place update of known optimized deps so the `_registerMissingImport`
        // function on the server knows about our newly discovered dynamic deps.
        // @see https://github.com/vitejs/vite/blob/7231b5a882a2db8dd2d9cb88a0f446edb5e2cf43/packages/vite/src/node/optimizer/registerMissing.ts#L12
        Object.assign(knownOptimized, meta.optimized);
    }
    // `optimizeDeps` will already store all relevant deps info so we can
    // write our metadata file without any additional data
    await fs_extra_1.default.outputFile(dataPath, JSON.stringify(data, null, 2));
    server._isRunningOptimizer = false;
}
exports.runDynamicOptimize = runDynamicOptimize;
function dedupeDeps(ids) {
    const deps = new Set();
    for (const id of ids) {
        const normalizedId = id.replace(/\/index(\.\w+)?$/, '');
        deps.add(normalizedId);
    }
    return Array.from(deps);
}
const lockfileFormats = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
let cachedHash;
function getDepHash(root, config) {
    if (cachedHash) {
        return cachedHash;
    }
    let content = (0, utils_1.lookupFile)(root, lockfileFormats) || '';
    // also take config into account
    // only a subset of config options that can affect dep optimization
    content += JSON.stringify({
        mode: config.mode,
        root: config.root,
        resolve: config.resolve,
        assetsInclude: config.assetsInclude,
        plugins: config.plugins.map((p) => p.name),
        optimizeDeps: {
            include: config.optimizeDeps?.include,
            exclude: config.optimizeDeps?.exclude
        }
    }, (_, value) => {
        if (typeof value === 'function' || value instanceof RegExp) {
            return value.toString();
        }
        return value;
    });
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex').substr(0, 8);
}
