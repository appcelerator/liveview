import path from 'path';
import { Plugin, ResolvedConfig, normalizePath } from 'vite';

import { CLIENT_ENTRY, ENV_ENTRY } from '../constants.js';
import { cleanUrl, isObject, resolveHostname } from '../utils/vite.js';

const process_env_NODE_ENV_RE =
	/(\bglobal(This)?\.)?\bprocess\.env\.NODE_ENV\b/;

// ids in transform are normalized to unix style
const normalizedClientEntry = normalizePath(CLIENT_ENTRY);
const normalizedEnvEntry = normalizePath(ENV_ENTRY);

/**
 * Titanium specific replacment for the default Vite client injects plugins.
 *
 * @see https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/clientInjections.ts
 */
export function clientInjectionsPlugin(): Plugin {
	let config: ResolvedConfig;
	let injectConfigValues: (code: string) => string;

	return {
		name: 'titanium:client-inject',

		configResolved(resolved) {
			config = resolved;

			// replace the default vite client injections plugin
			const plugins = resolved.plugins as Plugin[];
			const titaniumPlugin = plugins.find(
				({ name }) => name === 'titanium:client-inject'
			);
			if (!titaniumPlugin) {
				throw new Error('Unable to find titanium:client-inject');
			}
			const vitePluginIndex = plugins.findIndex(
				({ name }) => name === 'vite:client-inject'
			);
			plugins.splice(vitePluginIndex, 1, titaniumPlugin);
		},

		async buildStart() {
			const resolvedServerHostname = (await resolveHostname(config.server.host))
				.name;
			const resolvedServerPort = config.server.port!;
			const devBase = config.base;

			const serverHost = `${resolvedServerHostname}:${resolvedServerPort}${devBase}`;

			let hmrConfig = config.server.hmr;
			hmrConfig = isObject(hmrConfig) ? hmrConfig : undefined;
			const host = hmrConfig?.host || null;
			const protocol = hmrConfig?.protocol || null;
			const timeout = hmrConfig?.timeout || 30000;
			const overlay = hmrConfig?.overlay !== false;
			const isHmrServerSpecified = !!hmrConfig?.server;
			const hmrConfigName = path.basename(
				config.configFile || 'vite.config.js'
			);

			// hmr.clientPort -> hmr.port
			// -> (24678 if middleware mode and HMR server is not specified) -> new URL(import.meta.url).port
			let port = hmrConfig?.clientPort || hmrConfig?.port || null;
			if (config.server.middlewareMode && !isHmrServerSpecified) {
				port ||= 24678;
			}

			let directTarget = hmrConfig?.host || resolvedServerHostname;
			directTarget += `:${hmrConfig?.port || resolvedServerPort}`;
			directTarget += devBase;

			let hmrBase = devBase;
			if (hmrConfig?.path) {
				hmrBase = path.posix.join(hmrBase, hmrConfig.path);
			}

			const serializedDefines = serializeDefine(config.define || {});

			const modeReplacement = escapeReplacement(config.mode);
			const baseReplacement = escapeReplacement(devBase);
			const definesReplacement = () => serializedDefines;
			const serverHostReplacement = escapeReplacement(serverHost);
			const hmrProtocolReplacement = escapeReplacement(protocol);
			const hmrHostnameReplacement = escapeReplacement(host);
			const hmrPortReplacement = escapeReplacement(port);
			const hmrDirectTargetReplacement = escapeReplacement(directTarget);
			const hmrBaseReplacement = escapeReplacement(hmrBase);
			const hmrTimeoutReplacement = escapeReplacement(timeout);
			const hmrEnableOverlayReplacement = escapeReplacement(overlay);
			const hmrConfigNameReplacement = escapeReplacement(hmrConfigName);

			injectConfigValues = (code: string) => {
				return code
					.replace(`__MODE__`, modeReplacement)
					.replace(/__BASE__/g, baseReplacement)
					.replace(`__DEFINES__`, definesReplacement)
					.replace(`__SERVER_HOST__`, serverHostReplacement)
					.replace(`__HMR_PROTOCOL__`, hmrProtocolReplacement)
					.replace(`__HMR_HOSTNAME__`, hmrHostnameReplacement)
					.replace(`__HMR_PORT__`, hmrPortReplacement)
					.replace(`__HMR_DIRECT_TARGET__`, hmrDirectTargetReplacement)
					.replace(`__HMR_BASE__`, hmrBaseReplacement)
					.replace(`__HMR_TIMEOUT__`, hmrTimeoutReplacement)
					.replace(`__HMR_ENABLE_OVERLAY__`, hmrEnableOverlayReplacement)
					.replace(`__HMR_CONFIG_NAME__`, hmrConfigNameReplacement);
			};
		},

		transform(code, id, options) {
			const file = cleanUrl(id); //
			if (file === normalizedClientEntry || file === normalizedEnvEntry) {
				return injectConfigValues(code);
			} else if (!options?.ssr && code.includes('process.env.NODE_ENV')) {
				// replace process.env.NODE_ENV instead of defining a global
				// for it to avoid shimming a `process` object during dev,
				// avoiding inconsistencies between dev and build
				return code.replace(
					process_env_NODE_ENV_RE,
					config.define?.['process.env.NODE_ENV'] ||
						JSON.stringify(process.env.NODE_ENV || config.mode)
				);
			}
		}
	};
}

function escapeReplacement(value: string | number | boolean | null) {
	const jsonValue = JSON.stringify(value);
	return () => jsonValue;
}

function serializeDefine(define: Record<string, any>): string {
	let res = `{`;
	for (const key in define) {
		const val = define[key];
		res += `${JSON.stringify(key)}: ${
			typeof val === 'string' ? `(${val})` : JSON.stringify(val)
		}, `;
	}
	return res + `}`;
}
