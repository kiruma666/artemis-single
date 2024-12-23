module.exports = {
    '*.{mjs,js,jsx,ts,tsx}': 'eslint --fix --ignore-pattern zx',
    '*.{ts,tsx}': () => `tsc --project ${__dirname}`,
    '*.png': 'imagemin-lint-staged'
};
