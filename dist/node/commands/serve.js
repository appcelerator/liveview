"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.validate = exports.config = exports.extendedDesc = exports.desc = exports.title = void 0;
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const hash_sum_1 = __importDefault(require("hash-sum"));
const lodash_merge_1 = __importDefault(require("lodash.merge"));
const lodash_get_1 = __importDefault(require("lodash.get"));
const lodash_set_1 = __importDefault(require("lodash.set"));
const node_titanium_sdk_1 = __importDefault(require("node-titanium-sdk"));
const tiappxml_1 = __importDefault(require("node-titanium-sdk/lib/tiappxml"));
const server_1 = require("../server");
const utils_1 = require("../utils");
exports.title = 'Serve';
exports.desc = 'Serve App through LiveView';
exports.extendedDesc = 'Launches app and serves all content through LiveView';
// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => { };
let buildCommand;
const config = (logger, config, cli) => {
    const platform = cli.argv._[1];
    buildCommand = require(cli.globalContext.commands.build.path);
    const createBuildConfig = buildCommand.config(logger, config, cli);
    return (done) => {
        createBuildConfig((buildConfig) => {
            const platformOption = buildConfig.options.platform;
            if (platform && platformOption.values.includes(platform)) {
                // Remove platform name shortcut and add proper `-p` option to original
                // argv array
                cli.argv._.splice(1, 1);
                cli.argv.$_.push('-p', platform);
            }
            const mergedConfig = (0, lodash_merge_1.default)(buildConfig, {
                options: {
                    'project-dir': {
                        /**
                         * Override project dir callback to make sure this is an app project
                         * and to use serve command when validating correct SDK version.
                         * Otherwise the CLI will spawn the build command if there is a
                         * SDK mismatch.
                         *
                         * @param projectDir
                         */
                        callback: (projectDir) => {
                            if (projectDir === '') {
                                // default tocurrent directory
                                projectDir = buildConfig.options['project-dir'].default;
                            }
                            projectDir = path_1.default.resolve(projectDir);
                            // load the tiapp.xml
                            if (fs_extra_1.default.existsSync(path_1.default.join(projectDir, 'tiapp.xml'))) {
                                let tiapp;
                                try {
                                    tiapp = cli.tiapp = new tiappxml_1.default(path_1.default.join(projectDir, 'tiapp.xml'));
                                }
                                catch (ex) {
                                    logger.error(ex);
                                    process.exit(1);
                                }
                                tiapp.properties || (tiapp.properties = {});
                                // make sure the tiapp.xml is sane
                                node_titanium_sdk_1.default.validateTiappXml(logger, config, tiapp);
                                // check that the Titanium SDK version is correct
                                if (!node_titanium_sdk_1.default.validateCorrectSDK(logger, config, cli, 'serve')) {
                                    throw new cli.GracefulShutdown();
                                }
                                cli.argv.type = 'app';
                            }
                            else {
                                // Not an app dir and serve does not support modules
                                return;
                            }
                            cli.scanHooks(path_1.default.join(projectDir, 'hooks'));
                            return projectDir;
                        }
                    }
                }
            });
            // Remove unsupported flags
            delete mergedConfig.flags['build-only'];
            delete mergedConfig.flags.legacy;
            done(mergedConfig);
        });
    };
};
exports.config = config;
const validate = (logger, config, cli) => {
    return buildCommand.validate(logger, config, cli);
};
exports.validate = validate;
const run = async (logger, config, cli, finished) => {
    const projectDir = cli.argv['project-dir'];
    const host = cli.argv['liveview-ip'] || (0, utils_1.resolveHost)();
    const port = cli.argv['liveview-port'] || 8323;
    let force = cli.argv.force;
    const legacyPlatformName = cli.argv.platform === 'android' ? 'android' : 'iphone';
    const platform = cli.argv.platform.replace(/^(iphone|ipad)$/i, 'ios');
    const cacheDir = path_1.default.join(projectDir, 'build', legacyPlatformName, '.liveview');
    const dataPath = path_1.default.join(cacheDir, '_metadata.json');
    try {
        const buildHash = (0, hash_sum_1.default)({
            tiapp: cli.tiapp,
            target: cli.argv.target,
            server: {
                host,
                port
            },
            env: {
                DEBUG: process.env.DEBUG
            }
        });
        const data = {
            hash: buildHash
        };
        if (!force) {
            let prevData;
            try {
                prevData = fs_extra_1.default.readJSONSync(dataPath);
            }
            catch (e) {
                // ignore error and simply trigger full build
            }
            if (!prevData || prevData.hash !== buildHash) {
                force = true;
            }
        }
        const runBuild = (0, util_1.promisify)(buildCommand.run);
        if (force) {
            logger.info(`${chalk_1.default.green('[LiveView]')} Forcing app rebuild ...`);
            cli.argv.liveview = true;
            await runBuild(logger, config, cli);
            await fs_extra_1.default.outputJSON(dataPath, data);
        }
        else {
            logger.info(`${chalk_1.default.green('[LiveView]')} Starting dev server ...`);
            await (0, server_1.startServer)({
                project: {
                    dir: projectDir,
                    type: determineProjectType(projectDir),
                    platform,
                    tiapp: cli.tiapp
                },
                server: {
                    host,
                    port,
                    force
                }
            });
            resetCliHooks(cli, legacyPlatformName);
            const builder = await getBuilderInstance(logger, config, cli, runBuild);
            const runHook = (name) => {
                return new Promise((resolve, reject) => {
                    cli.emit(name, builder, (e) => {
                        if (e) {
                            return reject(e);
                        }
                        resolve();
                    });
                });
            };
            if (platform === 'android') {
                // emit fake pre-compile hook to prepare Android emulators or device
                // for app launch
                await runHook('build.pre.compile');
            }
            // emit fake post-compile hook to run previously built app.
            await runHook('build.post.compile');
        }
    }
    catch (e) {
        console.error(e);
        return finished(e);
    }
    finished();
};
exports.run = run;
function determineProjectType(projectDir) {
    const pkgPath = path_1.default.join(projectDir, 'package.json');
    if (fs_extra_1.default.existsSync(pkgPath)) {
        const pkg = fs_extra_1.default.readJsonSync(pkgPath);
        const hasWebpackPlugin = Object.keys(pkg.dependencies || {})
            .concat(Object.keys(pkg.devDependencies || {}))
            .some((dep) => dep.startsWith('@titanium-sdk/webpack-plugin'));
        if (hasWebpackPlugin) {
            return 'webpack';
        }
    }
    if (fs_extra_1.default.existsSync(path_1.default.join(projectDir, 'app'))) {
        return 'alloy';
    }
    else {
        return 'classic';
    }
}
/**
 * Utility function to get an initialized builder instance.
 *
 * The platform specific build commands do not export the used `Builder` class
 * so we cannot create one directly. This function hijacks the `run` function that
 * a build command exports and then utilizes the `build.pre.construct` hook to
 * get an instace of the builder class. The build will then be stopped by throwing
 * an error from the hook.
 *
 * Since the `run` function itself has an error handler which calls `process.exit`,
 * we need to be a little hacky and temporarily replace that with a no-op.
 *
 * @param logger Logger instance
 * @param config Titanium config
 * @param cli Titanium CLI instance
 * @param runBuild Promisified build command `run` function
 */
async function getBuilderInstance(logger, config, cli, runBuild) {
    const restoreProcess = stubMethods(process, ['exit']);
    const restoreLogger = stubMethods(logger, ['info', 'error', 'log.end']);
    let builder;
    cli.on('build.pre.construct', (_builder, done) => {
        builder = _builder;
        // Throw error to exit the build command early. We cannot use
        // `done(new Error())` because Android will ignore it
        throw new Error('Stop');
    });
    try {
        await runBuild(logger, config, cli);
    }
    finally {
        restoreLogger();
        restoreProcess();
    }
    if (!builder) {
        throw new Error('Failed to get Builder instance');
    }
    builder.initialize();
    return builder;
}
/**
 * Stubs all given `methods` on the `target` with no-ops.
 *
 * @param target Target object
 * @param methods List of methods to stub
 * @returns Function that restores all original methods on `target`.
 */
function stubMethods(target, methods) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const originalMethods = {};
    for (const key of methods) {
        const original = (0, lodash_get_1.default)(target, key);
        originalMethods[key] = original;
        (0, lodash_set_1.default)(target, key, NOOP);
    }
    return () => {
        Object.keys(originalMethods).forEach((key) => {
            const original = originalMethods[key];
            (0, lodash_set_1.default)(target, key, original);
        });
    };
}
/**
 * Resets all previously registered hooks and then loads the required hooks
 * for installing and launching an app from the platform folder inside the
 * current SDK.
 *
 * @param cli Titanium CLI instance
 */
function resetCliHooks(cli, platform) {
    cli.hooks = {
        scannedPaths: {},
        pre: {},
        post: {},
        ids: {},
        loadedFilenames: [],
        incompatibleFilenames: [],
        erroredFilenames: [],
        errors: {}
    };
    cli.scanHooks(path_1.default.join(cli.sdk.path, platform, 'cli/hooks'));
}
