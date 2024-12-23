module.exports = {
    '*.{mjs,js,jsx,ts,tsx}': 'eslint --fix',
    '*.{ts,tsx}': () => `tsc --project ${__dirname}`,
    '*.png': 'imagemin-lint-staged'
};
