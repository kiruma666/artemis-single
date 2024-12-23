/**
 * @Author: sheldon
 * @Date: 2023-05-18 21:56:55
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-05-27 22:44:04
 */

import {Application, Request} from 'express';
import {createProxyMiddleware, Filter, Options} from 'http-proxy-middleware';

import {increaseViolationCount} from '../util/access-control';
import {sendMessage} from '../util/tele-bot';

const whitelistedVendorHosts = [
    'equilibria.fi',
    'pancakeswap.com',
    'pendle.finance',
    'secrettune.xyz' // pendle test env
];

const getVendorHost = (req: Request) => {
    // /vendor-proxy/{host}/{api_path}
    const vendorHost = req.originalUrl.split('/')[2];

    return `https://${vendorHost}`;
};

const getVendorPath = (pathname: string, req: Request) => {
    // without leading slash works
    return req.originalUrl.split('/').slice(3).join('/');
};

export function mountVendorProxy(app: Application) {
    const filter: Filter = (pathname, req) => {
        const vendorHost = getVendorHost(req);

        // domain or subdomain
        const isWhitelisted = whitelistedVendorHosts.includes(vendorHost)
            || whitelistedVendorHosts.some(host => vendorHost.endsWith(`.${host}`));

        if (!isWhitelisted) {
            increaseViolationCount(req.ip);
            sendMessage(`[Vendor Proxy] ${req.ip} is trying access ${vendorHost}`, {
                channel: 'dev',
                group: 'Vendor Proxy'
            });
        }

        return isWhitelisted;
    };

    const options: Options = {
        changeOrigin: true,
        logProvider: () => console,
        router: req => getVendorHost(req),
        pathRewrite: (pathname, req) => getVendorPath(pathname, req),
    };

    app.use('/vendor-proxy', createProxyMiddleware(filter, options));
}
