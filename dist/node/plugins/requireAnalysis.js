"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeFrom = exports.requireAnalysisPlugin = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const magic_string_1 = __importDefault(require("magic-string"));
const vite_1 = require("vite");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
const clientDir = (0, vite_1.normalizePath)(constants_1.CLIENT_DIR);
/**
 * Server-only plugin that lexes, resolves, rewrites and analyzes url requires.
 *
 * - Requires are resolved to ensure they exist on disk
 *
 * - Bare module imports are resolved (by @rollup-plugin/node-resolve) to
 * absolute file paths, e.g.
 *
 *     ```js
 *     require('foo')
 *     ```
 *     is rewritten to
 *     ```js
 *     require('/@fs//project/node_modules/foo/dist/foo.js')
 *     ```
 *
 * Based on Vite's core plugin `importAnalysis`.
 */
function requireAnalysisPlugin() {
    let clientPublicPath;
    let root;
    let base;
    let server;
    return {
        name: 'titanium:require-analysis',
        configureServer(_server) {
            server = _server;
        },
        configResolved(config) {
            const { root: _root, base: _base } = config;
            root = _root;
            base = _base;
            clientPublicPath = path_1.default.posix.join(base, constants_1.CLIENT_PUBLIC_PATH);
        },
        async transform(source, importer) {
            const rewriteStart = Date.now();
            let requires;
            try {
                requires = (0, utils_1.parseRequires)(source);
            }
            catch (e) {
                this.error('Failed to parse source for require analysis because the content ' +
                    'contains invalid JS syntax.', e.idx);
            }
            if (!requires.length) {
                return;
            }
            let needQueryInjectHelper = false;
            let s;
            const str = () => s || (s = new magic_string_1.default(source));
            // vite-only server context
            const { moduleGraph } = server;
            const normalizeUrl = async (url, pos) => {
                const resolved = await this.resolve(url, importer);
                if (!resolved) {
                    this.error(`Failed to resolve require "${url}" from "${path_1.default.relative(process.cwd(), importer)}". Does the file exist?`, pos);
                }
                const isRelative = url.startsWith('.');
                // normalize all requires into resolved URLs
                // e.g. `require('foo')` -> `require('/@fs/.../node_modules/foo/index.js`)
                if (resolved.id.startsWith(root + '/')) {
                    // in root: infer short absolute path from root
                    url = resolved.id.slice(root.length);
                }
                else if (fs_1.default.existsSync((0, utils_1.cleanUrl)(resolved.id))) {
                    // exists but out of root: rewrite to absolute /@fs/ paths
                    url = path_1.default.posix.join(constants_1.FS_PREFIX + resolved.id);
                }
                else {
                    url = resolved.id;
                }
                // if the resolved id is not a valid LiveView import specifier,
                // prefix it to make it valid. Vite will strip this before feeding it
                // back into the transform pipeline
                if (!url.startsWith('.') &&
                    !url.startsWith('/') &&
                    !(0, utils_1.isBuiltinModule)(url)) {
                    url =
                        constants_1.VALID_ID_PREFIX + resolved.id.replace('\0', constants_1.NULL_BYTE_PLACEHOLDER);
                }
                // for relative js/css imports, inherit importer's version query
                // do not do this for unknown type imports, otherwise the appended
                // query can break 3rd party plugin's extension checks.
                if (isRelative && !/[?&]import\b/.test(url)) {
                    const versionMatch = importer.match(constants_1.DEP_VERSION_RE);
                    if (versionMatch) {
                        url = (0, utils_1.injectQuery)(url, versionMatch[1]);
                    }
                }
                // check if the dep has been hmr updated. If yes, we need to attach
                // its last updated timestamp to force the browser to fetch the most
                // up-to-date version of this module.
                try {
                    const depModule = await moduleGraph.ensureEntryFromUrl(url);
                    if (depModule.lastHMRTimestamp > 0) {
                        url = (0, utils_1.injectQuery)(url, `t=${depModule.lastHMRTimestamp}`);
                    }
                }
                catch (e) {
                    // it's possible that the dep fails to resolve (non-existent import)
                    // attach location to the missing import
                    e.pos = pos;
                    throw e;
                }
                return [url, resolved];
            };
            let needDynamicRequireHelper = false;
            const requireContexts = {};
            for (let index = 0; index < requires.length; index++) {
                const { start, end, specifier } = requires[index];
                const rawUrl = source.slice(start, end);
                if (specifier) {
                    // skip client
                    if (specifier === clientPublicPath) {
                        continue;
                    }
                    const [normalizedUrl] = await normalizeUrl(specifier, start);
                    const url = normalizedUrl;
                    if (url !== specifier) {
                        str().overwrite(start, end, `'${url}'`);
                    }
                }
                else if (!importer.startsWith(clientDir)) {
                    const url = rawUrl
                        .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '')
                        .trim();
                    // check @vite-ignore which suppresses dynamic import warning
                    const hasViteIgnore = /\/\*\s*@vite-ignore\s*\*\//.test(rawUrl);
                    if (!hasViteIgnore && !isSupportedDynamicRequire(url)) {
                        // Do we need a warning here? We do not use the build / bundle
                        // feature of Vite, so unsupported dynamic expressions are not
                        // an issue for now.
                        // this.warn(
                        // 	'\n' +
                        // 		chalk.cyan(importerModule.file) +
                        // 		'\n' +
                        // 		generateCodeFrame(source, start) +
                        // 		'\nThe above dynamic require cannot be analyzed by vite.\n' +
                        // 		`See ${chalk.blue(
                        // 			'https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations'
                        // 		)} ` +
                        // 		'for supported dynamic require formats. ' +
                        // 		'If this is intended to be left as-is, you can use the ' +
                        // 		'/* @vite-ignore */ comment inside the require() call to suppress this warning.\n'
                        // );
                    }
                    try {
                        const context = await (0, utils_1.createDynamicRequireContext)(rawUrl, importer, this.resolve.bind(this));
                        if (context) {
                            needQueryInjectHelper = true;
                            needDynamicRequireHelper = true;
                            const { prefix, files } = context;
                            requireContexts[prefix] = files;
                            str().overwrite(start, end, `__dynamicContextRequire('${prefix}', ${url})`);
                        }
                        else {
                            needQueryInjectHelper = true;
                            str().overwrite(start, end, `__vite__injectQuery(${url}, 'import')`);
                        }
                    }
                    catch (e) {
                        this.error(e);
                    }
                }
            }
            if (needQueryInjectHelper) {
                str().prepend(`const { injectQuery: __vite__injectQuery } = require('${clientPublicPath}');`);
            }
            if (needDynamicRequireHelper) {
                str().prepend(`function __dynamicContextRequire(prefix, path) {
	const contextMap = ${JSON.stringify(requireContexts)};
	const context = contextMap[prefix];
	const request = context[path] || path
	return __vite__injectQuery(context[path], 'import');
}`);
            }
            if (s) {
                return s.toString();
            }
            else {
                return source;
            }
        }
    };
}
exports.requireAnalysisPlugin = requireAnalysisPlugin;
function isSupportedDynamicRequire(url) {
    if (!/^['"`]/.test(url) && !url.startsWith('WPATH(')) {
        return false;
    }
    url = url.trim().slice(1, -1);
    // must be more specific if importing from same dir
    if (url.startsWith('./${') && url.indexOf('/') === url.lastIndexOf('/')) {
        return false;
    }
    return true;
}
function timeFrom(start, subtract = 0) {
    const time = Date.now() - start - subtract;
    const timeString = (time + 'ms').padEnd(5, ' ');
    if (time < 10) {
        return chalk_1.default.green(timeString);
    }
    else if (time < 50) {
        return chalk_1.default.yellow(timeString);
    }
    else {
        return chalk_1.default.red(timeString);
    }
}
exports.timeFrom = timeFrom;
