"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelPlugin = void 0;
const path_1 = __importDefault(require("path"));
const modelRE = /(?:[/\\]widgets[/\\][^/\\]+)?[/\\]models[/\\](.*)/;
function modelPlugin(ctx) {
    return {
        name: 'titanium:alloy:model',
        async resolveId(id, importer) {
            if (modelRE.test(id)) {
                const result = await this.resolve(path_1.default.join(ctx.appDir, id.replace(/\/alloy\//, '')), importer, { skipSelf: true });
                if (result) {
                    return result.id;
                }
            }
        },
        transform(code, id) {
            if (modelRE.test(id)) {
                const { code: modelCode } = ctx.compiler.compileModel({
                    file: id,
                    content: code
                });
                return modelCode;
            }
        }
    };
}
exports.modelPlugin = modelPlugin;
