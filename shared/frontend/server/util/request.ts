/*
 * @Author: xiaodongyu
 * @Date 2021-02-26 11:58:53
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-04-28 17:13:57
 */

import * as http from 'http';
import * as https from 'https';

type Options = http.RequestOptions & {
    body?: string | Buffer;
};
type UrlOrStr = string | URL;

export function request(url: UrlOrStr, options: Options = {}): Promise<any> {
    return new Promise((resolve, reject) => {
        const onError = (error: Error) => reject(error);
        const {body, ...rest} = options;
        const client = /^https/i.test(typeof url === 'string' ? url : url.href) ? https : http;
        const req = client.request(url, rest, res => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('error', onError);
            res.on('end', () => {
                try {
                    body = JSON.parse(body);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error(err);
                } finally {
                    resolve(body);
                }
            });
        });
        req.on('error', onError);
        if (body) req.write(body);
        req.end();
    });
}

export function get(url: UrlOrStr, options: Options = {}): Promise<any> {
    return request(url, options);
}

export function patch(url: UrlOrStr, options: Options = {}): Promise<any> {
    return request(url, {...options, method: 'PATCH'});
}

export function post(url: UrlOrStr, options: Options = {}): Promise<any> {
    return request(url, {...options, method: 'POST'});
}

export function put(url: UrlOrStr, options: Options = {}): Promise<any> {
    return request(url, {...options, method: 'PUT'});
}

export function httpDelete(url: UrlOrStr, options: Options = {}): Promise<any> {
    return request(url, {...options, method: 'DELETE'});
}

export default {
    request,
    get,
    patch,
    post,
    put,
    delete: httpDelete
};
