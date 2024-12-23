/*
 * @Author: xiaodongyu
 * @Date: 2022-09-02 11:52:42
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-09-02 12:23:58
 */

import {useEffect, useState} from 'react';

import {clearExpiredCache} from '../util/local-cache';

export default function useLocalStorage<T>(storageKey: string) {
    const [storageValue, setStorageState] = useState<T>(() => {
        const cached = localStorage.getItem(storageKey);

        return cached && JSON.parse(cached);
    });

    const setStorage = (nextValue: T) => {
        localStorage.setItem(storageKey, JSON.stringify(nextValue));
        setStorageState(nextValue);
    };

    return [storageValue, setStorage] as const;
}

export const useAutoClearExpiredCacheEffect = (delay = 2e3) => {
    const [started, setStarted] = useState(false);

    useEffect(() => {
        if (started) {
            return;
        }

        const timer = setTimeout(() => {
            setStarted(true);
            clearExpiredCache();
        }, delay);

        return () => {
            if (!started) {
                clearTimeout(timer);
            }
        };
    }, [delay, started]);
};
