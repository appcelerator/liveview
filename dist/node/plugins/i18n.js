"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.i18nPlugin = void 0;
const path_1 = __importDefault(require("path"));
const vite_1 = require("vite");
const fast_xml_parser_1 = __importDefault(require("fast-xml-parser"));
const I18N_PUBLIC_PATH = '/@liveview/i18n/';
/**
 *
 */
function i18nPlugin(projectDir, projectType) {
    const i18nDir = projectType === 'alloy'
        ? path_1.default.join(projectDir, 'app/i18n')
        : path_1.default.join(projectDir, 'i18n');
    return {
        name: 'titanium:i18n',
        resolveId(id) {
            id = (0, vite_1.normalizePath)(id);
            if (id.startsWith(I18N_PUBLIC_PATH)) {
                return path_1.default.join(i18nDir, id.replace(I18N_PUBLIC_PATH, ''));
            }
        },
        async transform(code, id) {
            id = (0, vite_1.normalizePath)(id);
            if (id.startsWith(i18nDir)) {
                const messages = {};
                const result = fast_xml_parser_1.default.parse(code, {
                    ignoreAttributes: false
                });
                if (result.resources) {
                    let stringNodes = result.resources.string || [];
                    if (!Array.isArray(stringNodes)) {
                        stringNodes = [stringNodes];
                    }
                    for (const node of stringNodes) {
                        const key = node['@_name'];
                        const value = node['#text'];
                        messages[key] = value;
                    }
                    return `module.exports = ${JSON.stringify(messages)}`;
                }
            }
        }
    };
}
exports.i18nPlugin = i18nPlugin;
