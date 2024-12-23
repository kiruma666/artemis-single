import {Web3Provider} from '@ethersproject/providers';
import {Web3ReactProvider} from '@web3-react/core';
import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, useLocation} from 'react-router-dom';
import {ThemeProvider} from 'theme-ui';

import './polyfill';

import CustomRoute from './route';
import theme from './theme';
import './index.css';

const getLibrary = (provider: any) => {
    const library = new Web3Provider(provider);
    library.pollingInterval = 12e3;

    return library;
};

const ScrollToTop: React.FC = () => {
    const {pathname, hash} = useLocation();
    useEffect(() => {
        if (hash) {
            try {
                document.querySelector(hash)?.scrollIntoView({block: 'center'});

                return;
            } catch (e) {
                window.scrollTo(0, 0);
            }
        }

        window.scrollTo(0, 0);
    }, [pathname, hash]);

    return null;
};

ReactDOM.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <BrowserRouter>
                <ScrollToTop />
                <Web3ReactProvider getLibrary={getLibrary}>
                    <CustomRoute />
                </Web3ReactProvider>
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
);
