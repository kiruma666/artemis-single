import {useEffect, useMemo, useState} from 'react';

import {JsonRpcBatchProvider} from '../../util/json-rpc-batch-provider';

import {betterUrlMap, getBetterUrlPromise, providerPool, saveBetterUrlMap} from './v2-lib';

const queryRounds = 2;

// TODO(pancake): try using web worker for this: https://github.com/quoll-finance/quoll/pull/51
// but need to fix import.meta compatibility issue first
export default function useBatchProvider(chainId: number, urls: string[]) {
    const cachedUrl = betterUrlMap.get(chainId)?.url;
    const defaultUrl = cachedUrl && urls.includes(cachedUrl) ? cachedUrl : urls[0];
    const [url, setUrl] = useState(defaultUrl);

    useEffect(() => {
        // if (betterUrlMap.get(chainId)?.url) {
        //     return;
        // }

        // always update betterUrlMap, getBetterUrlPromise will prevent duplicated calls
        // Web Workers are not supported. Run getBetterUrl in the main thread.
        getBetterUrlPromise(chainId, urls, {queryRounds}).then(betterUrl => {
            if (betterUrl && betterUrl !== url) {
                setUrl(betterUrl);
                betterUrlMap.set(chainId, {timestamp: Date.now(), url: betterUrl});
                saveBetterUrlMap(betterUrlMap);
            }
        });
    }, [chainId, url, urls]);

    return useMemo(() => {
        if (!url) {
            throw new Error('rpcUrl is empty');
        }

        // prevent url mismatch, url won't change immediately after chainId changes
        const usingUrl = urls.includes(url) ? url : defaultUrl;
        const key = `${chainId}-${usingUrl}`;

        let provider = providerPool.get(key);
        if (!provider) {
            provider = new JsonRpcBatchProvider(usingUrl, chainId);
            providerPool.set(key, provider);
        }

        return provider;
    }, [chainId, defaultUrl, url, urls]);
}
