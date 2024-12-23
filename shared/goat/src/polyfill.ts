import {Buffer} from 'buffer';
import '@shared/fe/util/number-extension';
import '@shared/fe/util/promise';

// @walletconnect/* polyfill
(window as any).global = window;
(window as any).Buffer = Buffer;
