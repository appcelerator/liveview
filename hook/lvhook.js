var debug = require('debug')('liveview:clihook'),
	path = require('path'),
	http = require('http'),
	join = path.join,
	fs = require('fs'),
	spawn = require('child_process').spawn;

// inject shelljs to the global scope
/* globals cp, tempdir */
require('shelljs/global');

// export min cli version
exports.cliVersion = '>=3.0.25';

/**
 * initialize cli hook
 * @param  {Object} logger The Titanium CLI logger
 * @param  {Object} config Titanium CLI build config
 * @param  {Object} cli    Titanium CLI builder
 * @return {undefined}        [description]
 */
exports.init = function (logger, config, cli) {

	/**
	 * [doConfig description]
	 * @param  {Object} data     [description]
	 * @param  {Function} finished [description]
	 */
	function doConfig(data, finished) {
		var sdkVersion,
			r;
		debug('Runningbuild.[PLATFORM].config hook');
		sdkVersion = (cli.sdk && cli.sdk.name) || (cli.manifest && cli.manifest.version);
		r = ((simpVer(cli.version) < 321) ? data.result : (sdkVersion && simpVer(sdkVersion) < 321) ? data.result[0] : data.result[1]) || {};
		r.flags || (r.flags = {});
		r.flags.liveview = {
			default: false,
			desc: 'enables LiveView'
		};

		r.options || (r.options = {});
		r.options['liveview-ip'] = {
			default: null,
			desc: 'LiveView Server IP address'
		};

		r.options['liveview-fport'] = {
			default: null,
			desc: 'LiveView file server port'
		};

		r.options['liveview-eport'] = {
			default: null,
			desc: 'LiveView event server port'
		};

		finished(null, data);
	}

	cli.addHook('build.android.config', doConfig);
	cli.addHook('build.ios.config', doConfig);
	cli.addHook('build.windows.config', doConfig);

	/**
	 * Replace and rename original app.js file to execute liveview.js first
	 * @param  {Object} data     [description]
	 * @param  {Function} finished Callback function
	 * @returns {undefined}
	 */
	function copyResource(data, finished) {
		var RESOURCES_DIR,
			srcFile;

		debug('Running pre:build.' + cli.argv.platform + '.copyResource hook');

		if (cli.argv.liveview) {
			RESOURCES_DIR = join(this.projectDir, 'Resources');

			srcFile = data.args[0];
			if (join(RESOURCES_DIR, 'app.js') === srcFile
				|| (new RegExp('^' + RESOURCES_DIR.replace(/\\/g, '/') + '(/(android|ipad|ios|iphone|windows))?/app.js$').test(srcFile.replace(/\\/g, '/')))) {
				data.args[0] = join(tempdir(), 'liveview.js');
			}
		}

		// backwards compatibility
		if (simpVer(cli.version) < 321) {
			return finished(data);
		}

		finished(null, data);
	}

	/**
	 * [writeBuildManifest description]
	 * @param  {Object} data     [description]
	 * @param  {Function} finished Callback function
	 * @returns {undefined}
	 */
	function writeBuildManifest(data, finished) {
		var tempAppJS;

		debug('Running pre:build.' + cli.argv.platform + '.writeBuildManifest hook');

		if (cli.argv.liveview) {
			data.args[0].liveview = true;

			tempAppJS = path.resolve(cli.argv['project-dir'], 'Resources', '.liveviewapp.js');
			fs.existsSync(tempAppJS) && fs.unlinkSync(tempAppJS);
		}

		// backwards compatibility
		if (simpVer(cli.version) < 321) {
			return finished(data);
		}

		finished(null, data);
	}

	cli.addHook('build.ios.copyResource', { pre: copyResource });
	cli.addHook('build.ios.writeBuildManifest', { pre: writeBuildManifest });

	cli.addHook('build.android.copyResource', { pre: copyResource });
	cli.addHook('build.android.writeBuildManifest', { pre: writeBuildManifest });

	cli.addHook('build.windows.copyResource', { pre: copyResource });
	cli.addHook('build.windows.writeBuildManifest', { pre: writeBuildManifest });

	/**
	 * Copy LiveView.js to Resources folder and Inject Server Address
	 */
	cli.addHook('build.pre.compile', {
		priority: 3000,
		/**
		 * [description]
		 * @param  {Object} build    [description]
		 * @param  {Function} finished [description]
		 */
		post: function (build, finished) {
			var resourceDir,
				liveviewJS,
				ipAddr,
				fileServerPort,
				eventServerPort;

			if (cli.argv.liveview) {
				debug('Running post:build.pre.compile hook');
				resourceDir = path.resolve(cli.argv['project-dir'], 'Resources');
				liveviewJS = join(tempdir(), 'liveview.js');
				cp('-f', join(__dirname, '../build/liveview.js'), liveviewJS);
				cp('-f', join(resourceDir, 'app.js'), join(resourceDir, '.liveviewapp.js'));

				ipAddr = cli.argv['liveview-ip'] || getNetworkIp();
				fileServerPort = cli.argv['liveview-fport'] || 8324;
				eventServerPort = cli.argv['liveview-eport'] || 8323;

				if (ipAddr) {
					fs.writeFileSync(liveviewJS,
						fs.readFileSync(liveviewJS)
							.toString()
							.replace(/FSERVER_HOST/g, ipAddr)
							.replace(/FSERVER_PORT/g, fileServerPort)
							.replace(/ESERVER_PORT/g, eventServerPort)
							.replace(/TCP_HOST/g, ipAddr)
					);
				} else {
					logger.error('Unable to detect IP address');
				}
				finished();
			} else {
				finished();
			}
		}
	});

	/**
	 * Start event/file server
	 */
	cli.addHook('build.post.compile', function (build, finished) {
		var domain;
		// kill running server via fserver http api
		debug('invoke kill');

		domain = require('domain').create();
		domain.on('error', function (err) {
			debug(err);
		});

		domain.run(function () {
			http
				.get('http://localhost:8324/kill', function () {})
				.on('error', function () {})
				.on('data', function () {})
				.on('close', function () {
					startServer(finished);
				});
		});
	});

	/**
	 * [startServer description]
	 * @param  {Function} finished [description]
	 */
	function startServer(finished) {
		var ipAddr,
			fileServerPort,
			eventServerPort,
			binDIR,
			cmdOpts,
			child;

		if (cli.argv.liveview) {
			ipAddr = cli.argv['liveview-ip'];
			fileServerPort = cli.argv['liveview-fport'];
			eventServerPort = cli.argv['liveview-eport'];

			debug('Running post:build.post.compile hook');
			binDIR = join(__dirname, '../bin/liveview-server');
			cmdOpts = [
				binDIR,
				'start',
				'--project-dir', cli.argv['project-dir'],
				'--platform', cli.argv.platform
			];

			if (!cli.argv.colors) {
				cmdOpts.push('--no-colors');
			}

			ipAddr && cmdOpts.push('--liveview-ip', ipAddr);
			fileServerPort && cmdOpts.push('--liveview-fport', fileServerPort);
			eventServerPort && cmdOpts.push('--liveview-eport', eventServerPort);

			debug('Spawning detached process with command:', cmdOpts);
			child = spawn(process.execPath, cmdOpts, {
				detached: true
			});

			child.on('error', function (err) {
				console.error('\n %s\n', err);
			});

			child.stdout.pipe(process.stdout);
		}
		finished();
	}
};

/**
 * getNetworkIp
 * get users local network ip address
 *
 * @return {string}
 */
function getNetworkIp() {
	var n = require('os').networkInterfaces(),
		k,
		inter,
		j;
	for (k in n) {
		inter = n[k];
		for (j in inter) {
			if (inter[j].family === 'IPv4' && !inter[j].internal) {
				return inter[j].address;
			}
		}
	}
}

/**
 * output version as integer. Takes all input up to first '-', removes periods, tries to parse as integer
 * @param  {string} version version string with - separators
 * @return {number} First segment of version (split by '-'), with '.'s removed, parsed as an integer
 */
function simpVer(version) {
	return parseInt(version.split('-')[0].replace(/\./g, ''));
}
