import {useCallback, useEffect, useMemo, useState} from 'react';

import {
    getCacheValue as _getCacheValue,
    saveCacheValue as _saveCacheValue,
    isCacheValueValid as _isCacheValueValid,
    isCacheUpdatedWithin as _isCacheUpdatedWithin,
    SaveValueOptions,
    AUTO_FETCH_CACHE_POOL_PREFIX as CACHE_POOL_PREFIX
} from '../util/local-cache';

export type AutoFetchOptions<T> = {
    autoFetch?: boolean
    autoFetchDelay?: number
    autoFetchClearState?: boolean // clear state when dataFetcher changes, use it when staled state should not be used
    autoRefreshDuration?: number
    initialState?: T
    cachePool?: string
    cacheKey?: string
    cacheExpiryDuration?: number
    skipFetchDuration?: number // skip fetch when cache is valid for less than skipFetchSeconds
    retry?: boolean // NOTE: not well implemented yet
}

export type AutoFetchState = {
    pristine?: boolean
    loading?: boolean
    done?: boolean
    error?: Error
}

export type AutoFetchReturn<T> = {
    state?: T
    refresh: () => Promise<void>
    fetcherState: AutoFetchState
}

const getCacheValue = <T>(cachePool: string, cacheKey: string): T | undefined => _getCacheValue<T>(CACHE_POOL_PREFIX + cachePool, cacheKey);
const saveCacheValue = <T>(cachePool: string, cacheKey: string, value: T, options?: SaveValueOptions) => _saveCacheValue<T>(CACHE_POOL_PREFIX + cachePool, cacheKey, value, options);
const isCacheValueValid = <T>(cachePool: string, cacheKey: string, newData: T): boolean => _isCacheValueValid<T>(CACHE_POOL_PREFIX + cachePool, cacheKey, newData);
const isCacheUpdatedWithin = (cachePool: string, cacheKey: string, duration: number): boolean => _isCacheUpdatedWithin(CACHE_POOL_PREFIX + cachePool, cacheKey, duration);

function combine(...fetchingStates: AutoFetchState[]) {
    return {
        pristine: fetchingStates.some(state => state.pristine),
        loading: fetchingStates.some(state => state.loading),
        error: fetchingStates.find(state => state.error)?.error
    };
}

export function useCombinedAutoFetchState(...fetchingStates: AutoFetchState[]) {
    return useMemo(() => combine(...fetchingStates), [fetchingStates]);
}

export function useAutoFetch<T>(
    dataFetcher: () => Promise<T>,
    options?: AutoFetchOptions<T>
): [T | undefined, () => Promise<void>, AutoFetchState] {
    const [state, setState] = useState<T | undefined>(options?.initialState);

    const [pristine, setPristine] = useState(true); // indicate whether the state is pristine
    const [done, setDone] = useState(false); // indicate whether the fetch is successful
    const [loading, setLoading] = useState<AutoFetchState['loading']>();
    const [error, setError] = useState<AutoFetchState['error']>();

    // reset state when dataFetcher changes
    useEffect(() => {
        const usingCache = options?.cachePool && options?.cacheKey;

        if (options?.autoFetchClearState) {
            setState(options?.initialState);
            setPristine(true);
        } else if (usingCache) {
            // last correct cached state is more accurate than staled state, 
            // set state to cached state when using cache
            const cachedState = options?.cachePool && options?.cacheKey
                ? getCacheValue(options.cachePool, options.cacheKey) as T | undefined
                : options?.initialState;
            setState(cachedState);
        }

        setLoading(undefined);
        setError(undefined);
    }, [dataFetcher, options?.autoFetchClearState, options?.cacheKey, options?.cachePool, options?.initialState]);

    // handle aborted status
    const [fetchAbortController, setFetchAbortController] = useState<AbortController>(new AbortController());

    // handle fetch
    const dataConsumer = useCallback((data: T | undefined) => {
        // update cache
        if (options?.cachePool && options?.cacheKey) {
            if (isCacheValueValid(options.cachePool, options.cacheKey, data)) { // cache is valid, no need to update
                return;
            }

            saveCacheValue(options.cachePool, options.cacheKey, data, {expiryDuration: options?.cacheExpiryDuration});
        }

        setState(data);
        setPristine(false); // state is no longer pristine
    }, [options?.cacheExpiryDuration, options?.cacheKey, options?.cachePool]);

    const refresh = useCallback(() => {
        setLoading(true);
        setError(undefined);

        return dataFetcher()
            .then(data => {
                if (fetchAbortController.signal.aborted) {
                    return;
                }

                dataConsumer(data);
                setDone(true);
            })
            .catch(err => {
                // console.error(fetchAbortController.signal.aborted, err, dataFetcher);

                if (fetchAbortController.signal.aborted) {
                    return;
                }

                setError(err);
            })
            .finally(() => {
                if (fetchAbortController.signal.aborted) {
                    return;
                }

                setLoading(false);
            });
    }, [dataFetcher, fetchAbortController, dataConsumer]); // eslint-disable-line react-hooks/exhaustive-deps

    // auto fetch
    useEffect(() => {
        if (options?.autoFetch === false) {
            return;
        }

        if (fetchAbortController.signal.aborted) {
            const newAbortController = new AbortController();
            setFetchAbortController(newAbortController);

            return;
        }

        if (options?.cachePool && options?.cacheKey && options?.skipFetchDuration // skip refresh
            && isCacheUpdatedWithin(options.cachePool, options.cacheKey, options.skipFetchDuration)) {
            return;
        }

        const delay = options?.autoFetchDelay ?? 0;
        const timerId = setTimeout(refresh, delay);

        return () => {
            if (!fetchAbortController.signal.aborted) {
                fetchAbortController.abort();
            }

            clearTimeout(timerId);
            setLoading(false);
            setError(undefined);
        };
    }, [dataConsumer, dataFetcher, fetchAbortController, options?.autoFetch, options?.autoFetchDelay, options?.cacheKey, options?.cachePool, options?.skipFetchDuration, refresh]);

    // auto refresh
    useEffect(() => {
        if (!options?.autoRefreshDuration) {
            return;
        }

        const interval = setInterval(refresh, options.autoRefreshDuration);

        return () => {
            clearInterval(interval);
        };
    }, [options?.autoRefreshDuration, refresh]);

    // auto retry
    useEffect(() => {
        let timerId: any = undefined;

        if (error && options?.retry) {
            timerId = setTimeout(refresh, 2e3);
        }

        return () => {
            if (timerId) {
                clearTimeout(timerId);
            }
        };
    }, [error, options?.retry, refresh]);

    const fetchingState = useMemo(() => ({pristine, loading, done, error}), [done, error, loading, pristine]);

    return [state, refresh, fetchingState];
}

export function useAutoFetchReturn<T>(
    dataFetcher: () => Promise<T>,
    options?: AutoFetchOptions<T>
): AutoFetchReturn<T> {
    const [state, refresh, fetcherState] = useAutoFetch(dataFetcher, options);

    return useMemo(() => ({
        state,
        refresh,
        fetcherState
    }), [fetcherState, refresh, state]);
}
