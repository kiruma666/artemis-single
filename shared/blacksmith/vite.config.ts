import darkTheme from '@ant-design/dark-theme';
import {defineConfig, mergeConfig} from 'vite';

import getSharedViteConfig from '../../shared/frontend/config/vite';
import colors from './src/theme/colors';

const {textPrimary, textSecondary, link, linkHover} = colors;

export default defineConfig((...args) => {
    const projectViteConfig = {
        css: {
            preprocessorOptions: {
                less: {
                    javascriptEnabled: true,
                    modifyVars: {
                        ...darkTheme,
                        '@text-color': textPrimary,
                        '@text-color-secondary': textSecondary,
                        '@heading-color': textPrimary,
                        '@body-background': 'transparent',
                        'link-color': link,
                        'link-hover-color': linkHover,
                        'link-active-color': linkHover
                    }
                }
            }
        },
        server: {
            port: 3008
        }
    };

    return mergeConfig(getSharedViteConfig(...args), projectViteConfig);
});
