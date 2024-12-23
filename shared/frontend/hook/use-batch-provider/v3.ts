import {useCallback, useEffect, useMemo, useState} from 'react';

import {JsonRpcBatchProvider} from '../../util/json-rpc-batch-provider';
import {getCacheValue, saveCacheValue} from '../../util/local-cache';
import {useAutoFetch} from '../use-fetch';

const STORAGE_KEY = '__chain_rpc_urls_v3';

// urls => Promise<JsonRpcBatchProvider[]>
const rankingPromiseMap = new Map<string[], Promise<JsonRpcBatchProvider[] | undefined | void>>();

// all providers
const providersMap = new Map<string[], JsonRpcBatchProvider[]>();

// url => JsonRpcBatchProvider
const defaultProviderMap = new Map<string, JsonRpcBatchProvider>();

const getCacheBestUrl = (chainId: number) => getCacheValue<string>(STORAGE_KEY, `${chainId}`);
const saveCacheBestUrl = (chainId: number, url: string) => saveCacheValue<string>(STORAGE_KEY, `${chainId}`, url);

// assuming urls are the same for the same chainId
const useRankedProviders = (chainId: number, urls: string[]) => {
    const providers = useMemo(
        () => {
            let providers = providersMap.get(urls);
            if (!providers) {
                providers = urls.map(url => new JsonRpcBatchProvider({
                    url,
                    timeout: 5e3,
                    throttleLimit: 2,
                }, chainId));

                providersMap.set(urls, providers);
            }

            return providers;
        },
        [chainId, urls]
    );

    const rank = useCallback(
        () => {
            if (providers.length === 1) {
                // No needs ranking
                return Promise.resolve(providers);
            }

            let promise = rankingPromiseMap.get(urls);
            if (!promise) {
                console.log('ranking for', chainId); // eslint-disable-line no-console

                promise = Promise
                    .allSettled(providers.map(async provider => {
                        const start = Date.now();
                        await provider.getBlockNumber();
                        const end = Date.now();

                        return {
                            provider,
                            latency: end - start,
                        };
                    }))
                    .then(results => {
                        results.sort((a, b) => {
                            const aLatency = a.status === 'fulfilled' ? a.value.latency : Infinity;
                            const bLatency = b.status === 'fulfilled' ? b.value.latency : Infinity;

                            return aLatency - bLatency;
                        });

                        if (results[0].status === 'fulfilled') {
                            saveCacheBestUrl(chainId, results[0].value.provider.connection.url);
                            console.log('ranking succeeded', chainId, results[0].value.latency); // eslint-disable-line no-console
                        } else {
                            console.log('ranking failed', chainId); // eslint-disable-line no-console
                        }

                        return results
                            .filter(result => result.status === 'fulfilled')
                            .map(result => result.status === 'fulfilled' ? result.value.provider : undefined)
                            .map(provider => provider as JsonRpcBatchProvider);
                    })
                    .catch(console.error) // eslint-disable-line no-console
                    .finally(() => {
                        rankingPromiseMap.delete(urls); // clear cache for next auto ranking
                    });

                rankingPromiseMap.set(urls, promise);
            }

            return promise;
        },
        [chainId, providers, urls]
    );

    return useAutoFetch(rank, {autoFetchDelay: 500, autoRefreshDuration: 60e3});
};

// TODO(pancake): try using web worker for this: https://github.com/quoll-finance/quoll/pull/51
// but need to fix import.meta compatibility issue first
export default function useBatchProvider(chainId: number, urls: string[]) {
    const defaultUrl = useMemo(() => {
        const cacheUrl = getCacheBestUrl(chainId);
        if (cacheUrl && urls.includes(cacheUrl)) {
            return cacheUrl;
        }

        return urls[0];
    }, [chainId, urls]);

    const defaultProvider = useMemo(
        () => {
            let provider = defaultProviderMap.get(defaultUrl);
            if (!provider) {
                provider = new JsonRpcBatchProvider({
                    url: defaultUrl,
                    timeout: 10e3,
                    throttleLimit: 2,
                }, chainId);

                defaultProviderMap.set(defaultUrl, provider);
            }

            return provider;
        },
        [chainId, defaultUrl]
    );

    // current provider
    const [provider, setProvider] = useState(defaultProvider);

    const [rankedProviders] = useRankedProviders(chainId, urls);
    useEffect(() => {
        if (!rankedProviders || !rankedProviders.length) {
            return;
        }

        if (!rankedProviders
            .filter(x => x)
            .slice(0, Math.ceil(rankedProviders.length / 3)) // top 30%
            .find(backupProvider => backupProvider?.connection.url === defaultUrl)) {
            setProvider(rankedProviders[0] as JsonRpcBatchProvider);

            console.log(`switching to ${rankedProviders[0]?.connection.url}`); // eslint-disable-line no-console

            return;
        }
    }, [defaultUrl, rankedProviders]);

    return provider;
}
