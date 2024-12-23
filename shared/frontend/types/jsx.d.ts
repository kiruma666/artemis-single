import {ThemeUIStyleObject} from 'theme-ui';

// devDeps 收敛到shared里面，其他fe不会提示 theme-ui相关的，先这么export下
// antd 和 theme-ui 有重复的组件名，disable下
/* eslint-disable import/export */
export * from '@ant-design/icons';
export * from 'antd';
export * from 'theme-ui';
export * from 'ethers';
export * from '@web3-react/core';
export * from 'react-router-dom';

declare global {
    namespace JSX {
        interface IntrinsicAttributes {
            sx?: ThemeUIStyleObject
        }
    }

    namespace React {
        type ClassName = {className?: string};

        // FC with className
        type FCC<P = any> = FunctionComponent<P & ClassName>;
        type FCD<P = any> = FunctionComponent<PropsWithChildren<P>>;
        type FCCD<P = any> = FunctionComponent<PropsWithChildren<P> & ClassName>;

        type FCSVG = FunctionComponent<SVGProps<SVGSVGElement> & { title?: string }>;

        interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
            sx?: ThemeUIStyleObject
        }

        /**
         * @deprecated
         * react@18 FC is without children
         */
        type VFCC<P = any> = VoidFunctionComponent<P & ClassName>;
    }

    const __STAGE__: 'dev' | 'test' | 'prod'; // eslint-disable-line no-underscore-dangle
}

