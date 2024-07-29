"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldExternalizeDep = exports.scanDynamicRequires = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const esbuild_1 = require("esbuild");
const fast_glob_1 = __importDefault(require("fast-glob"));
const magic_string_1 = __importDefault(require("magic-string"));
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const debug = (0, debug_1.default)('titanium:deps');
async function scanDynamicRequires({ config, pluginContainer }) {
    const s = Date.now();
    const explicitEntryPatterns = config.optimizeDeps?.entries || [];
    let entries = await globEntries(explicitEntryPatterns, config);
    entries = entries.filter((entry) => constants_1.JS_TYPES_RE.test(entry) && fs_1.default.existsSync(entry));
    if (!entries.length) {
        debug('No entry files detected');
        return { deps: {}, missing: {} };
    }
    else {
        debug(`Crawling dynamic dependencies using entries:\n  ${entries.join('\n  ')}`);
    }
    const deps = {};
    const missing = {};
    const plugin = esbuildScanPlugin(config, pluginContainer, deps, missing, entries);
    await Promise.all(entries.map((entry) => (0, esbuild_1.build)({
        write: false,
        entryPoints: [entry],
        bundle: true,
        platform: 'node',
        logLevel: 'error',
        plugins: [plugin]
    })));
    debug(`Scan completed in ${Date.now() - s}ms:`, deps);
    return {
        deps,
        missing
    };
}
exports.scanDynamicRequires = scanDynamicRequires;
function globEntries(pattern, config) {
    return (0, fast_glob_1.default)(pattern, {
        cwd: config.root,
        ignore: [
            '**/node_modules/**',
            `**/${config.build.outDir}/**`,
            '**/__tests__/**'
        ],
        absolute: true
    });
}
function esbuildScanPlugin(config, container, depImports, missing, entries) {
    const seen = new Map();
    const resolve = async (id, importer) => {
        const key = id + (importer && path_1.default.dirname(importer));
        if (seen.has(key)) {
            return seen.get(key);
        }
        const resolved = await container.resolveId(id, importer && (0, utils_1.normalizePath)(importer));
        const res = resolved?.id;
        seen.set(key, res);
        return res;
    };
    const include = config.optimizeDeps?.include;
    const exclude = config.optimizeDeps?.exclude;
    const externalUnlessEntry = ({ path }) => ({
        path,
        external: !entries.includes(path)
    });
    return {
        name: 'titanium:dyn-dep-scan',
        setup(build) {
            // bare imports: record and externalize ----------------------------------
            build.onResolve({
                // avoid matching windows volume
                filter: /^[\w@][^:]/
            }, async ({ path: id, importer }) => {
                if (exclude?.some((e) => e === id || id.startsWith(e + '/'))) {
                    return externalUnlessEntry({ path: id });
                }
                if (depImports[id]) {
                    return externalUnlessEntry({ path: id });
                }
                const resolved = await resolve(id, importer);
                if (resolved) {
                    if (shouldExternalizeDep(resolved, id)) {
                        return externalUnlessEntry({ path: id });
                    }
                    if (resolved.includes('node_modules') || include?.includes(id)) {
                        // dependency or forced included, externalize and stop crawling
                        if (constants_1.OPTIMIZABLE_ENTRY_RE.test(resolved)) {
                            depImports[id] = resolved;
                        }
                        return externalUnlessEntry({ path: id });
                    }
                    else {
                        // linked package, keep crawling
                        return {
                            path: path_1.default.resolve(resolved)
                        };
                    }
                }
                else {
                    missing[id] = (0, utils_1.normalizePath)(importer);
                }
            });
            // catch all -------------------------------------------------------------
            build.onResolve({
                filter: /.*/
            }, async ({ path: id, importer }) => {
                // use vite resolver to support urls and omitted extensions
                const resolved = await resolve(id, importer);
                if (resolved) {
                    if (shouldExternalizeDep(resolved, id)) {
                        return externalUnlessEntry({ path: id });
                    }
                    return { path: path_1.default.resolve((0, utils_1.cleanUrl)(resolved)) };
                }
                else {
                    // resolve failed... probably unsupported type
                    return externalUnlessEntry({ path: id });
                }
            });
            // for jsx/tsx, we need to access the content and check for
            // presence of dynamic requires, since it results in dependency relationships
            // but isn't crawled by esbuild.
            // @see
            build.onLoad({ filter: constants_1.JS_TYPES_RE }, async ({ path: id }) => {
                let ext = path_1.default.extname(id).slice(1);
                if (ext === 'mjs') {
                    ext = 'js';
                }
                let contents = fs_1.default.readFileSync(id, 'utf-8');
                if (ext.endsWith('x') && config.esbuild && config.esbuild.jsxInject) {
                    contents = config.esbuild.jsxInject + '\n' + contents;
                }
                if (contents.includes('require')) {
                    const resolveId = container.resolveId.bind(container);
                    contents = await transformDynamicRequire(contents, id, resolveId, ext);
                    return {
                        loader: ext,
                        contents
                    };
                }
                return {
                    loader: ext,
                    contents
                };
            });
        }
    };
}
async function transformDynamicRequire(source, importer, resolve, loader) {
    if (loader !== 'js') {
        source = (await (0, esbuild_1.transform)(source, { loader, target: 'node10' })).code;
    }
    const requires = (0, utils_1.parseRequires)(source, importer);
    const s = new magic_string_1.default(source);
    for (let index = 0; index < requires.length; index++) {
        const { start, end, specifier } = requires[index];
        if (specifier) {
            continue;
        }
        const url = source.slice(start, end);
        const context = await (0, utils_1.createDynamicRequireContext)(url, importer, resolve);
        if (context === null ||
            context.prefix.startsWith('.') ||
            context.prefix.startsWith('/')) {
            continue;
        }
        index++;
        const requireString = Object.keys(context.files)
            .filter((id) => constants_1.OPTIMIZABLE_ENTRY_RE.test(context.files[id]))
            .map((id, fileIndex) => `const __dyn_${index}_${fileIndex} = require('${id}');`)
            .join('\n');
        s.prepend(requireString);
    }
    return s.toString();
}
function shouldExternalizeDep(resolvedId, rawId) {
    // not a valid file path
    if (!path_1.default.isAbsolute(resolvedId)) {
        return true;
    }
    // virtual id
    if (resolvedId === rawId || resolvedId.includes('\0')) {
        return true;
    }
    // resolved is not a scannable type
    if (!constants_1.JS_TYPES_RE.test(resolvedId)) {
        return true;
    }
    return false;
}
exports.shouldExternalizeDep = shouldExternalizeDep;
