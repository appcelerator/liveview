"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hyperloopPlugin = void 0;
const path_1 = __importDefault(require("path"));
const fast_glob_1 = __importDefault(require("fast-glob"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const PREFIX = '\0hyperloop:';
async function hyperloopPlugin(projectDir, platform) {
    const hyperloopBuildDir = path_1.default.join(projectDir, 'build/hyperloop', platform);
    const hyperloopResourcesDir = platform === 'android'
        ? path_1.default.join(hyperloopBuildDir, 'Resources/hyperloop')
        : path_1.default.join(hyperloopBuildDir, 'js');
    let hyperloopModules = new Map();
    if (platform === 'android') {
        const files = await (0, fast_glob_1.default)('*.js', { cwd: hyperloopResourcesDir });
        files.forEach((file) => {
            const className = path_1.default.basename(file, '.js');
            if (className.startsWith('hyperloop.bootstrap')) {
                return;
            }
            hyperloopModules.set(className.replace(/\$/g, '.'), className);
        });
    }
    else {
        const metadataFile = path_1.default.join(hyperloopBuildDir, 'metadata-framework-availability.json');
        const metadata = await fs_extra_1.default.readJSON(metadataFile);
        hyperloopModules = new Map(Object.keys(metadata).map((name) => [name, name.toLowerCase()]));
    }
    hyperloopModules.set('Titanium', 'titanium');
    return {
        name: 'titanium:hyperloop',
        async resolveId(id, importer) {
            if (id.startsWith('/hyperloop/')) {
                return `${PREFIX}${id.slice(11)}.js`;
            }
            if (id.startsWith('/')) {
                return;
            }
            if (id.startsWith('.')) {
                if (importer?.startsWith(PREFIX)) {
                    const result = await this.resolve(id, path_1.default.join(hyperloopResourcesDir, importer.slice(PREFIX.length)), {
                        skipSelf: true
                    });
                    if (result) {
                        return `${PREFIX}${result.id.slice(hyperloopResourcesDir.length + 1)}`;
                    }
                }
                return;
            }
            let [pkg, type] = id.split('/');
            if (platform === 'android' && !type) {
                if (pkg.endsWith('.*')) {
                    pkg = pkg.replace('.*', '');
                }
                if (hyperloopModules.has(pkg)) {
                    const resourcePath = path_1.default.join(hyperloopResourcesDir, `${hyperloopModules.get(pkg)}.js`);
                    if (await fs_extra_1.default.pathExists(resourcePath)) {
                        return `${PREFIX}${hyperloopModules.get(pkg)}.js`;
                    }
                }
            }
            else if (hyperloopModules.has(pkg)) {
                type = type?.toLowerCase();
                if (type === undefined) {
                    type = pkg.toLowerCase();
                }
                const resourcePath = path_1.default.join(hyperloopResourcesDir, `${pkg}/${type}.js`);
                if ((await fs_extra_1.default.pathExists(resourcePath)) || pkg === 'Titanium') {
                    return `${PREFIX}${pkg}/${type}.js`;
                }
            }
        },
        async load(id) {
            if (id.startsWith(PREFIX)) {
                return await fs_extra_1.default.readFile(path_1.default.join(hyperloopResourcesDir, id.slice(PREFIX.length)), 'utf-8');
            }
        }
    };
}
exports.hyperloopPlugin = hyperloopPlugin;
