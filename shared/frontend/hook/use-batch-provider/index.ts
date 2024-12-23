import {useEffect, useMemo, useState} from 'react';

import {JsonRpcBatchProvider} from '../../util/json-rpc-batch-provider';

import getBetterUrl, {betterUrlMap, Options} from './get-better-url';

const betterUrlPromiseMap: Map<string[], Promise<string>> = new Map();

export default function useBatchProvider(defaultUrl: string, urls?: string[], options?: Partial<Options>) {
    const [url, setUrl] = useState((urls && betterUrlMap.get(urls)) ?? defaultUrl);
    const batchProvider = useMemo(() => new JsonRpcBatchProvider(url), [url]);

    useEffect(() => {
        if (urls) {
            let fetchedPromise = betterUrlPromiseMap.get(urls);
            if (!fetchedPromise) {
                fetchedPromise = getBetterUrl(urls, options);
                betterUrlPromiseMap.set(urls, fetchedPromise);
            }

            fetchedPromise.then(() => {
                const betterUrl = betterUrlMap.get(urls);
                if (betterUrl && url !== betterUrl) {
                    setUrl(betterUrl);
                }
            });
        }
    }, [urls]);

    return batchProvider;
}
