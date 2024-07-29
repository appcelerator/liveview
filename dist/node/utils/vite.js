"use strict";
/**
 * Most of these are copied from Vite as they are not exported directly and there
 * is no reliable deep import URL since Vite's dist build is split into chunks with
 * random hashes.
 *
 * @see https://github.com/vitejs/vite/blob/61ea32056048e902ca69d88e1b0a2d21660dae2a/packages/vite/src/node/utils.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayEqual = exports.stripBase = exports.resolveHostname = exports.diffDnsOrderChange = exports.getLocalhostAddressIfDiffersFromDNS = exports.generateCodeFrame = exports.numberToPos = exports.posToNumber = exports.lookupFile = exports.injectQuery = exports.isImportRequest = exports.isJSRequest = exports.cleanUrl = exports.isObject = exports.withTrailingSlash = exports.normalizePath = exports.slash = void 0;
const dns_1 = require("dns");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const url_1 = require("url");
const constants_js_1 = require("../constants.js");
function slash(p) {
    return p.replace(/\\/g, '/');
}
exports.slash = slash;
const isWindows = os_1.default.platform() === 'win32';
function normalizePath(id) {
    return path_1.default.posix.normalize(isWindows ? slash(id) : id);
}
exports.normalizePath = normalizePath;
function withTrailingSlash(path) {
    if (path[path.length - 1] !== '/') {
        return `${path}/`;
    }
    return path;
}
exports.withTrailingSlash = withTrailingSlash;
function isObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}
exports.isObject = isObject;
const queryRE = /\?.*$/;
const hashRE = /#.*$/;
const cleanUrl = (url) => url.replace(hashRE, '').replace(queryRE, '');
exports.cleanUrl = cleanUrl;
const knownJsSrcRE = /\.((j|t)sx?|mjs)($|\?)/;
const isJSRequest = (url) => {
    if (knownJsSrcRE.test(url)) {
        return true;
    }
    url = (0, exports.cleanUrl)(url);
    if (!path_1.default.extname(url) && !url.endsWith('/')) {
        return true;
    }
    return false;
};
exports.isJSRequest = isJSRequest;
const importQueryRE = /(\?|&)import(?:&|$)/;
const isImportRequest = (url) => importQueryRE.test(url);
exports.isImportRequest = isImportRequest;
function injectQuery(url, queryToInject) {
    // encode percents for consistent behavior with pathToFileURL
    // see #2614 for details
    let resolvedUrl = new url_1.URL(url.replace(/%/g, '%25'), 'relative:///');
    if (resolvedUrl.protocol !== 'relative:') {
        resolvedUrl = (0, url_1.pathToFileURL)(url);
    }
    let { pathname } = resolvedUrl;
    const { protocol, search, hash } = resolvedUrl;
    if (protocol === 'file:') {
        pathname = pathname.slice(1);
    }
    pathname = decodeURIComponent(pathname);
    return `${pathname}?${queryToInject}${search ? '&' + search.slice(1) : ''}${hash || ''}`;
}
exports.injectQuery = injectQuery;
function lookupFile(dir, formats, pathOnly = false) {
    for (const format of formats) {
        const fullPath = path_1.default.join(dir, format);
        if (fs_1.default.existsSync(fullPath) && fs_1.default.statSync(fullPath).isFile()) {
            return pathOnly ? fullPath : fs_1.default.readFileSync(fullPath, 'utf-8');
        }
    }
    const parentDir = path_1.default.dirname(dir);
    if (parentDir !== dir) {
        return lookupFile(parentDir, formats, pathOnly);
    }
}
exports.lookupFile = lookupFile;
const splitRE = /\r?\n/;
const range = 2;
function posToNumber(source, pos) {
    if (typeof pos === 'number') {
        return pos;
    }
    const lines = source.split(splitRE);
    const { line, column } = pos;
    let start = 0;
    for (let i = 0; i < line - 1; i++) {
        start += lines[i].length + 1;
    }
    return start + column;
}
exports.posToNumber = posToNumber;
function numberToPos(source, offset) {
    if (typeof offset !== 'number') {
        return offset;
    }
    if (offset > source.length) {
        throw new Error('offset is longer than source length!');
    }
    const lines = source.split(splitRE);
    let counted = 0;
    let line = 0;
    let column = 0;
    for (; line < lines.length; line++) {
        const lineLength = lines[line].length + 1;
        if (counted + lineLength >= offset) {
            column = offset - counted + 1;
            break;
        }
        counted += lineLength;
    }
    return { line: line + 1, column };
}
exports.numberToPos = numberToPos;
function generateCodeFrame(source, start = 0, end) {
    start = posToNumber(source, start);
    end = end || start;
    const lines = source.split(splitRE);
    let count = 0;
    const res = [];
    for (let i = 0; i < lines.length; i++) {
        count += lines[i].length + 1;
        if (count >= start) {
            for (let j = i - range; j <= i + range || end > count; j++) {
                if (j < 0 || j >= lines.length) {
                    continue;
                }
                const line = j + 1;
                res.push(`${line}${' '.repeat(Math.max(3 - String(line).length, 0))}|  ${lines[j]}`);
                const lineLength = lines[j].length;
                if (j === i) {
                    // push underline
                    const pad = start - (count - lineLength) + 1;
                    const length = Math.max(1, end > count ? lineLength - pad : end - start);
                    res.push('   |  ' + ' '.repeat(pad) + '^'.repeat(length));
                }
                else if (j > i) {
                    if (end > count) {
                        const length = Math.max(Math.min(end - count, lineLength), 1);
                        res.push('   |  ' + '^'.repeat(length));
                    }
                    count += lineLength + 1;
                }
            }
            break;
        }
    }
    return res.join('\n');
}
exports.generateCodeFrame = generateCodeFrame;
/**
 * Returns resolved localhost address when `dns.lookup` result differs from DNS
 *
 * `dns.lookup` result is same when defaultResultOrder is `verbatim`.
 * Even if defaultResultOrder is `ipv4first`, `dns.lookup` result maybe same.
 * For example, when IPv6 is not supported on that machine/network.
 */
async function getLocalhostAddressIfDiffersFromDNS() {
    const [nodeResult, dnsResult] = await Promise.all([
        dns_1.promises.lookup('localhost'),
        dns_1.promises.lookup('localhost', { verbatim: true })
    ]);
    const isSame = nodeResult.family === dnsResult.family &&
        nodeResult.address === dnsResult.address;
    return isSame ? undefined : nodeResult.address;
}
exports.getLocalhostAddressIfDiffersFromDNS = getLocalhostAddressIfDiffersFromDNS;
function diffDnsOrderChange(oldUrls, newUrls) {
    return !(oldUrls === newUrls ||
        (oldUrls &&
            newUrls &&
            arrayEqual(oldUrls.local, newUrls.local) &&
            arrayEqual(oldUrls.network, newUrls.network)));
}
exports.diffDnsOrderChange = diffDnsOrderChange;
async function resolveHostname(optionsHost) {
    let host;
    if (optionsHost === undefined || optionsHost === false) {
        // Use a secure default
        host = 'localhost';
    }
    else if (optionsHost === true) {
        // If passed --host in the CLI without arguments
        host = undefined; // undefined typically means 0.0.0.0 or :: (listen on all IPs)
    }
    else {
        host = optionsHost;
    }
    // Set host name to localhost when possible
    let name = host === undefined || constants_js_1.wildcardHosts.has(host) ? 'localhost' : host;
    if (host === 'localhost') {
        // See #8647 for more details.
        const localhostAddr = await getLocalhostAddressIfDiffersFromDNS();
        if (localhostAddr) {
            name = localhostAddr;
        }
    }
    return { host, name };
}
exports.resolveHostname = resolveHostname;
function stripBase(path, base) {
    if (path === base) {
        return '/';
    }
    const devBase = withTrailingSlash(base);
    return path.startsWith(devBase) ? path.slice(devBase.length - 1) : path;
}
exports.stripBase = stripBase;
function arrayEqual(a, b) {
    if (a === b)
        return true;
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
}
exports.arrayEqual = arrayEqual;
