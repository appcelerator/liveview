"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDynamicRequireContext = exports.VariableDynamicImportError = void 0;
const path_1 = __importDefault(require("path"));
const estree_walker_1 = require("estree-walker");
const acorn = __importStar(require("acorn"));
const globby_1 = __importDefault(require("globby"));
const resolve_1 = __importDefault(require("resolve"));
const nodeResolve = async (id, opts) => {
    return new Promise((resolve) => {
        let pkgRoot;
        (0, resolve_1.default)(id, {
            ...opts,
            packageFilter(pkg, pkgFile) {
                pkgRoot = path_1.default.dirname(pkgFile);
                return pkg;
            }
        }, (err, resolvedId, pkg) => {
            if (resolvedId && pkgRoot) {
                resolve({ id: resolvedId, pkg, pkgRoot });
            }
            resolve(null);
        });
    });
};
class VariableDynamicImportError extends Error {
}
exports.VariableDynamicImportError = VariableDynamicImportError;
async function createDynamicRequireContext(requireExpression, importer, resolve) {
    const glob = dynamicRequireToGlob(requireExpression);
    if (!glob) {
        return null;
    }
    if (glob.startsWith('.') || glob.startsWith('/')) {
        // Ignore relative or absolute dynamic requires as Vite will not
        // try to optimize them and we can safely resolve them on demand.
        return null;
    }
    const moduleId = glob.substr(0, glob.indexOf('/'));
    // NOTE: We cannot use `resolve` here as that may already return
    // the path to the optimized dependency
    const result = await nodeResolve(moduleId, {
        basedir: path_1.default.dirname(importer)
    });
    if (result) {
        const { pkgRoot } = result;
        let relativeGlob = glob.replace(moduleId, '.');
        if (relativeGlob.endsWith('/*')) {
            relativeGlob = relativeGlob.slice(0, -2);
        }
        const files = globby_1.default.sync(relativeGlob, {
            cwd: pkgRoot,
            expandDirectories: {
                files: ['index', '*.js', '*.json', '*.ts'],
                extensions: ['js', 'json', 'ts']
            }
        });
        const paths = {};
        for (const file of files) {
            const withExtension = path_1.default.join(moduleId, file.replace(/^\.\//, ''));
            const withoutExtension = withExtension.replace(/\.[^/.]+$/, '');
            const candidates = [withExtension, withoutExtension];
            if (path_1.default.basename(withoutExtension) === 'index') {
                candidates.push(path_1.default.dirname(withoutExtension));
            }
            for (const id of candidates) {
                const result = await resolve(id, importer);
                if (result) {
                    paths[id] = result.id;
                }
            }
        }
        return {
            prefix: glob.slice(0, glob.indexOf('*')),
            files: paths
        };
    }
    return null;
}
exports.createDynamicRequireContext = createDynamicRequireContext;
function dynamicRequireToGlob(requireExpression) {
    const ast = acorn.parse(requireExpression, { ecmaVersion: 10 });
    let glob = null;
    (0, estree_walker_1.walk)(ast, {
        enter: (node) => {
            if (node.type !== 'ExpressionStatement') {
                return;
            }
            glob = expressionToGlob(node.expression);
            if (!glob.includes('*')) {
                return null;
            }
            glob = glob.replace(/\*\*/g, '*');
            // TODO: Do we need more restrictions?
            if (glob.startsWith('*')) {
                glob = null;
            }
        }
    });
    return glob;
}
function expressionToGlob(node) {
    switch (node.type) {
        case 'TemplateLiteral':
            return templateLiteralToGlob(node);
        case 'CallExpression':
            return callExpressionToGlob(node);
        case 'BinaryExpression':
            return binaryExpressionToGlob(node);
        case 'Literal': {
            return sanitizeString(node.value);
        }
        default:
            return '*';
    }
}
function templateLiteralToGlob(node) {
    let glob = '';
    for (let i = 0; i < node.quasis.length; i += 1) {
        glob += sanitizeString(node.quasis[i].value.raw);
        if (node.expressions[i]) {
            glob += expressionToGlob(node.expressions[i]);
        }
    }
    return glob;
}
function callExpressionToGlob(node) {
    const { callee } = node;
    if (callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'concat') {
        return `${expressionToGlob(callee.object)}${node.arguments
            .map(expressionToGlob)
            .join('')}`;
    }
    return '*';
}
function binaryExpressionToGlob(node) {
    if (node.operator !== '+') {
        throw new VariableDynamicImportError(`${node.operator} operator is not supported.`);
    }
    return `${expressionToGlob(node.left)}${expressionToGlob(node.right)}`;
}
function sanitizeString(str) {
    if (str?.includes('*')) {
        throw new VariableDynamicImportError('A dynamic import cannot contain * characters.');
    }
    return str;
}
