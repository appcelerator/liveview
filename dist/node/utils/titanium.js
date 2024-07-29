"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHost = exports.isBuiltinModule = exports.normalizePlatformName = exports.determineProjectType = exports.otherPlatform = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
exports.otherPlatform = {
    android: 'ios',
    ios: 'android'
};
function determineProjectType(builder) {
    if (builder.useWebpack) {
        return 'webpack';
    }
    else if (fs_1.default.existsSync(path_1.default.join(builder.projectDir, 'app'))) {
        return 'alloy';
    }
    else {
        return 'classic';
    }
}
exports.determineProjectType = determineProjectType;
function normalizePlatformName(platform) {
    if (['iphone', 'ipad'].includes(platform)) {
        return 'ios';
    }
    else if (platform === 'android') {
        return 'android';
    }
    throw new Error(`Unnsuported platform "${platform}"`);
}
exports.normalizePlatformName = normalizePlatformName;
const builtins = [
    'console',
    'path',
    'os',
    'tty',
    'util',
    'assert',
    'events',
    'buffer',
    'string_decoder',
    'fs',
    'stream'
];
/**
 * Check if a string matches the name of a Node.js builtin module shim provided
 * by Titanium.
 */
function isBuiltinModule(id) {
    return builtins.includes(id);
}
exports.isBuiltinModule = isBuiltinModule;
function resolveHost() {
    const interfaces = os_1.default.networkInterfaces();
    for (const name in interfaces) {
        const inter = interfaces[name];
        if (inter === undefined) {
            continue;
        }
        for (const interfaceInfo of inter) {
            if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                return interfaceInfo.address;
            }
        }
    }
    return 'localhost';
}
exports.resolveHost = resolveHost;
