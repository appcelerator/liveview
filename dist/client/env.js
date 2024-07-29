const context = (() => {
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    else {
        // eslint-disable-next-line no-new-func
        return Function('return this')();
    }
})();
// assign defines
const defines = __DEFINES__;
Object.keys(defines).forEach((key) => {
    const segments = key.split('.');
    let target = context;
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (i === segments.length - 1) {
            target[segment] = defines[key];
        }
        else {
            target = target[segment] || (target[segment] = {});
        }
    }
});
//# sourceMappingURL=env.js.map
