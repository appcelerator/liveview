"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.entryPlugin = void 0;
const path_1 = __importDefault(require("path"));
function entryPlugin(appDir) {
    const ALLOY_ENTRY = path_1.default.resolve(appDir, 'alloy.js');
    return {
        name: 'titanium:alloy:entry',
        resolveId(id) {
            if (id === '/app') {
                return ALLOY_ENTRY;
            }
        },
        transform(code, id) {
            if (id === ALLOY_ENTRY) {
                return `import Alloy from '/alloy';

// Always define globals to make sure they are the correct ones loaded via LiveView
global.Alloy = Alloy;
global._ = _;
global.Backbone = Alloy.Backbone;

${code}

Ti.UI.addEventListener('sessionbegin', function () {
	Alloy.createController('index');
});

if ((typeof Ti.UI.hasSession === 'undefined') || Ti.UI.hasSession) {
	Alloy.createController('index');
}`;
            }
        }
    };
}
exports.entryPlugin = entryPlugin;
