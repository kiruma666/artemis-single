import path from 'path';

import svgr from '@svgr/rollup';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import mongoose from 'mongoose';
import {watch} from 'rollup';
import {defineConfig} from 'vite';
import vitePluginImport from 'vite-plugin-importer';

import globals from './globals';
import serverConfig from './rollup';

const {transform: transformSvg} = svgr({
    babel: false,
    jsxRuntime: 'automatic',
    // override default include, allow import svg from sibling workspaces
    include: /\.svg$/
});
const reactPlugins = react({
    jsxImportSource: 'theme-ui'
});

const cwd = process.cwd();
export default defineConfig(({mode}) => {
    const isDev = mode === 'development';

    console.log('vitejs.define', globals);

    return {
        build: {
            assetsInlineLimit: 10240, // 10kb
            chunkSizeWarningLimit: 2000 // override default 500
        },
        define: globals,
        optimizeDeps: {
            exclude: ['@ethersproject/providers'],
            include: ['js-sha3', 'hash.js', 'bn.js', 'bech32']
        },
        resolve: {
            alias: {
                src: path.resolve(cwd, 'src'),
                server: path.resolve(cwd, 'server')
            }
        },
        server: {
            open: true,
        },
        esbuild: {
            target: isDev ? undefined : 'es6',
            logOverride: {
                // ref: https://github.com/vitejs/vite/pull/8674
                'this-is-undefined-in-esm': 'silent'
            }
        },
        plugins: [
            legacy({
                targets: ['defaults', 'not IE 11']
            }),
            {
                name: 'rollup-plugin-custom-svgr',
                async transform(data, id) {
                    if (/\.svg$/.test(id)) {
                        const {code} = await transformSvg(data, id);

                        return reactPlugins[0].transform(code, id + '?.jsx');
                    }
                }
            },
            reactPlugins,
            vitePluginImport({
                libraryName: 'antd',
                libraryDirectory: 'es',
                style: true
            }),
            {
                name: 'vite-plugin-start-app',
                apply: 'serve',
                async configureServer({middlewares}) {
                    let serverApp;
                    middlewares.use((req, res, next) => {
                        if (!serverApp) {
                            next();

                            return;
                        }

                        serverApp(req, res, next);
                    });
                    const serverWatcher = watch({
                        ...serverConfig,
                        input: './server/app.ts'
                    });
                    serverWatcher.on('event', ({code, ...rest}) => {
                        if (code === 'ERROR') {
                            console.log({code, ...rest}); // eslint-disable-line no-console
                        }

                        if (code === 'END') {
                            const {file: serverPath} = serverConfig.output;
                            delete require.cache[serverPath];
                            // cleanup side effects
                            mongoose.modelNames().forEach(modelName => mongoose.deleteModel(modelName));
                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                            serverApp = require(serverPath)(true);
                        }
                    });
                }
            }
        ]
    };
});
