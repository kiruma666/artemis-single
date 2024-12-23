import {BigNumber} from 'ethers';

import {log} from './logger';

type CacheValue<T> = {
    value: T
    updatedAt: number
    expiredAt: number
}

type CachePool<T> = Record<string, CacheValue<T>>

export const AUTO_FETCH_CACHE_POOL_PREFIX = 'auto-fetch-cache-pool--';

const parseBigNumber = (obj: any): any => {
    if (obj?._isBigNumber) { // eslint-disable-line no-underscore-dangle
        return obj;
    }

    if (obj?.type === 'BigNumber' && obj?.hex) {
        return BigNumber.from(obj.hex);
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; ++i) {
            obj[i] = parseBigNumber(obj[i]);
        }
    }

    if (obj && typeof obj === 'object') {
        for (const key in obj) {
            if (obj[key]?.type === 'BigNumber' && obj[key]?.hex) {
                obj[key] = BigNumber.from(obj[key].hex);
            } else {
                obj[key] = parseBigNumber(obj[key]);
            }
        }
    }

    return obj;
};

type GetCachePoolOptions = {
    mute?: boolean
}

const getCachePool = <T>(cachePool: string, {mute}: GetCachePoolOptions = {}): CachePool<T> => {
    try {
        return JSON.parse(localStorage.getItem(cachePool) ?? '{}');
    } catch (e) {
        if (!mute) {
            console.error(e); // eslint-disable-line no-console
        }

        return {};
    }
};

const saveCachePool = <T>(cachePool: string, pool: CachePool<T>) => {
    try {
        if (Object.keys(pool).length === 0) {
            localStorage.removeItem(cachePool);

            return;
        }

        localStorage.setItem(cachePool, JSON.stringify(pool));
    } catch (e) {
        console.error(e); // eslint-disable-line no-console
    }
};

export const getCacheValue = <T>(cachePool: string, cacheKey: string): T | undefined => {
    const pool = getCachePool<T>(cachePool);

    if (!pool[cacheKey]) {
        return undefined;
    }

    if (pool[cacheKey].expiredAt < Date.now()) {
        delete pool[cacheKey];
        saveCachePool(cachePool, pool);

        return undefined;
    }

    log('[LocalCache] getCacheValue', cachePool, cacheKey);

    return parseBigNumber(pool[cacheKey].value);
};

export type SaveValueOptions = {
    expiryDuration?: number
}

const WEEK = 86400 * 7 * 1e3;

export const saveCacheValue = <T>(
    cachePool: string,
    cacheKey: string,
    value: T,
    {
        expiryDuration = WEEK
    }: SaveValueOptions = {}
) => {
    const pool = getCachePool(cachePool);

    if (!value) {
        delete pool[cacheKey];
    } else {
        pool[cacheKey] = {
            value,
            updatedAt: Date.now(),
            expiredAt: Date.now() + expiryDuration
        };
    }

    saveCachePool(cachePool, pool);
};

export const isCacheValueValid = <T>(cachePool: string, cacheKey: string, newData: T): boolean => {
    const cacheValue = getCacheValue<T>(cachePool, cacheKey);

    if (!cacheValue) {
        return false;
    }

    return JSON.stringify(cacheValue) === JSON.stringify(newData);
};

export const isCacheUpdatedWithin = (cachePool: string, cacheKey: string, duration: number): boolean => {
    const pool = getCachePool(cachePool);

    if (!pool[cacheKey]) {
        return false;
    }

    return pool[cacheKey].updatedAt + duration > Date.now();
};

type EstimatedSize = {
    key: string
    size: number
}

export const getLocalStorageEstimatedSizes = (): EstimatedSize[] => {
    const sizes: EstimatedSize[] = [];

    for (let i = 0; i < localStorage.length; ++i) {
        const key = localStorage.key(i);
        if (key === null || key === undefined) {
            continue;
        }

        const value = localStorage.getItem(key);
        if (value === null || value === undefined) {
            continue;
        }

        sizes.push({
            key,
            size: value.length * 2
        });
    }

    return sizes;
};

export const clearExpiredCache = () => {
    const sizes = getLocalStorageEstimatedSizes();

    let totalCleaned = 0;
    for (const {key, size} of sizes) {
        if (!key.startsWith(AUTO_FETCH_CACHE_POOL_PREFIX)) {
            continue;
        }

        const cachePool = key;
        const pool = getCachePool(cachePool, {mute: true});

        let poolCleaned = 0;
        for (const cacheKey in pool) {
            if (pool[cacheKey].expiredAt < Date.now()) {
                totalCleaned += size;
                poolCleaned += size;
                log('[LocalCache] cleaning', cachePool, cacheKey);
                delete pool[cacheKey];
            }
        }

        if (poolCleaned > 0) {
            log('[LocalCache] pool cleaned', poolCleaned, cachePool);
            saveCachePool(cachePool, pool);
        }
    }

    log('[LocalCache] total cleaned', totalCleaned);
};
