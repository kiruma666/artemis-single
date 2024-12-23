import {Theme, ThemeUIStyleObject} from 'theme-ui';

import colors from './colors';

const baseContainer: ThemeUIStyleObject = {
    margin: '0 auto',
    width: ['94%', '94%', '86%', '70%'],
    maxWidth: 1200
};

const theme: Theme = {
    useBorderBox: true,

    // [mobile, laptop or destop, extra large]
    // iphone max: 476, ipad max: 1024, macbook: 1440
    breakpoints: ['480px', '1025px', '1441px'],

    space: [0, 4, 8, 16, 32, 64, 128, 256, 512],

    fonts: {
        body: [
            'system-ui',
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Helvetica Neue',
            'sans-serif'
        ].join(', '),
        heading: 'inherit',
        monospace: 'Menlo, monospace'
    },

    fontSizes: [12, 14, 16, 18, 20, 22, 24, 36, 48],

    fontWeights: {
        body: 400,

        heading: 600,
        light: 200,
        medium: 500,
        bold: 600
    },

    lineHeights: {
        body: 1.5,
        heading: 1.25
    },

    borders: [0, '1px solid', '2px solid'],

    colors,

    layout: {
        container: baseContainer,

    },

    styles: {
        root: {
            bg: 'bg',
            color: 'textPrimary'
        }
    }
};

export default theme;
