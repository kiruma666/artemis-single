import {JsonRpcBatchProvider} from '../../util/json-rpc-batch-provider';
import {log} from '../../util/logger';

import getBetterUrl, {Options} from './get-better-url';

export type {Options};

const STORAGE_KEY = '__chain_rpc_urls';
const EXPIRY_TIME_MS = 10 * 60 * 1e3; // 10 minutes in milliseconds

export const loadBetterUrlRawData = () => {
    try {
        if (typeof localStorage === 'undefined') return undefined;

        const data = localStorage.getItem(STORAGE_KEY);
        const storedMap = new Map<number, { timestamp: number, url: string }>(data ? JSON.parse(data) : undefined);

        return storedMap;
    } catch (e) {
        console.error(e); // eslint-disable-line no-console
        localStorage.removeItem(STORAGE_KEY);

        return undefined;
    }
};

export const loadBetterUrlMap = () => {
    const emptyMap = new Map<number, { timestamp: number, url: string }>();
    try {
        if (typeof localStorage === 'undefined') return emptyMap;

        const data = localStorage.getItem(STORAGE_KEY);
        const storedMap = new Map<number, { timestamp: number, url: string }>(data ? JSON.parse(data) : undefined);
        const now = Date.now();

        for (const [chainId, {timestamp}] of storedMap.entries()) {
            if (now - timestamp >= EXPIRY_TIME_MS) {
                storedMap.delete(chainId);
            }
        }

        return storedMap;
    } catch (e) {
        console.error(e); // eslint-disable-line no-console
        localStorage.removeItem(STORAGE_KEY);

        return emptyMap;
    }
};

export const saveBetterUrlMap = (betterUrlMap: Map<number, { timestamp: number, url: string }>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(betterUrlMap.entries())));
};

const betterUrlPromiseMap: Map<number, Promise<string>> = new Map();

export const getBetterUrlPromise = (chainId: number, urls: string[], options?: Partial<Options>) => {
    let fetchedPromise = betterUrlPromiseMap.get(chainId);
    if (!fetchedPromise) {
        log(`${chainId} evaluating...`); // eslint-disable-line no-console
        fetchedPromise = getBetterUrl(urls, options);
        betterUrlPromiseMap.set(chainId, fetchedPromise);
    }

    return fetchedPromise;
};

// chainId => {timestamp, url}
export const betterUrlMap = loadBetterUrlMap();

// chainId-url => provider
export const providerPool = new Map<string, JsonRpcBatchProvider>();

export const getBatchProvider = (chainId: number, defaultUrl: string) => {
    const betterUrl = betterUrlMap.get(chainId)?.url;
    const url = betterUrl ?? defaultUrl;

    let provider = providerPool.get(url);
    if (!provider) {
        provider = new JsonRpcBatchProvider(url, chainId);
        providerPool.set(url, provider);
    }

    return provider;
};
