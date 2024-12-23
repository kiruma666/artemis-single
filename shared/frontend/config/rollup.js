import fs from 'fs';
import path from 'path';

import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import {defineConfig} from 'rollup';
import esbuild from 'rollup-plugin-esbuild';
import graphql from 'rollup-plugin-graphql';

import globals from './globals';

function getFullPathWithPrefix(absPrefix) {
    // 经过这里的都是node端的resolve
    // 如果配置了pkg.exports.['.'].node，就使用对应subpath
    const pkgPath = path.resolve(absPrefix, './package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath));
        const nodePath = pkg.exports?.['.']?.node;
        if (nodePath) {
            return path.resolve(absPrefix, nodePath);
        }
    }

    return ['', '.ts', '/index.ts'].flatMap(suffix => {
        const abs = absPrefix + suffix;
        if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;

        return [];
    })[0];
}

console.log('rollup.replace', globals);

export default defineConfig({
    input: './server/index.ts',

    plugins: [
        graphql(),
        json(),
        esbuild({
            // 目前可以 resolve 出来的都是 source code
            // 包括路径有 node_modules 的 @shared/*
            // 所以覆盖掉 exclude 默认值 /node_modules/
            exclude: []
        }),
        replace(globals),
        {
            name: 'ignoreAsset',
            transform(code, id) {
                const isAsset = /\.(svg|png|jpe?g)$/i.test(id);
                if (!isAsset) return null;

                return {
                    code: 'export const ReactComponent = {}; export default "ignore-asset"',
                    map: {
                        mappings: ''
                    }
                };
            }
        },
        {
            name: 'aliasAndResolve',
            resolveId(importee) {
                if (/^(src|server)\//.test(importee)) {
                    return getFullPathWithPrefix(path.resolve(process.cwd(), importee));
                }

                if (/^@(shared|quoll|equilibria|skillet|artmetis|euclid)\//.test(importee)) {
                    return getFullPathWithPrefix(path.resolve(process.cwd(), '../../node_modules', importee));
                }
            }
        }
    ],

    output: {
        file: path.resolve('./build/server.js'),
        format: 'commonjs',
        exports: 'auto'
    }
});
