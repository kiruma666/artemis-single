import {JsonRpcProvider} from '@ethersproject/providers';

import {log} from '../../util/logger';

export type Options = {
    queryRounds: number,
    averageBlockTime: number,
    // add chainId try skip provider detect network
    chainId?: number
}
const defaultOptions: Options = {
    queryRounds: 5,
    averageBlockTime: 2 // secondsPerBlock, evmos takes about 1.8 seconds
};

// cache low latency rpcUrl, useHook like a root provider...
export const betterUrlMap: Map<string[], string> = new Map();
const errorLatency = 1e6; // 100s
const timeoutLatency = 1e4; // 10s

function getLatency(provider: JsonRpcProvider): Promise<number[]> {
    return new Promise(resolve => {
        const start = Date.now();

        provider.getBlockNumber().then(blockNumber => {
            resolve([Date.now() - start, blockNumber]);
        }).catch(() => {
            resolve([errorLatency]);
        });

        setTimeout(() => {
            resolve([timeoutLatency]);
        }, timeoutLatency / 2);
    });
}

export default async function getBetterUrl(urls: string[], options?: Partial<Options>) {
    const {queryRounds, averageBlockTime, chainId} = {...defaultOptions, ...options};
    const providers = urls.map(url => new JsonRpcProvider(url, chainId));

    // [latency, blockNumber][]
    const ret: Array<number[]> = [];
    let i = 0;
    while (i++ < queryRounds) {
        const latencies = await Promise.all(providers.map(provider => getLatency(provider)));
        const latestBlockNumber = Math.max(...latencies.map(([, bn = 0]) => bn));
        ret.push(latencies.map(([networkLatency, bn = 0]) => {
            // treats no blockNumber same as timeout
            const blockSyncLatency = bn ? (latestBlockNumber - bn) * averageBlockTime * 1e3 : timeoutLatency;

            return networkLatency + blockSyncLatency;
        }));
    }

    const totalLatencies = ret.reduce((acc: number[], cur: number[], idx) => {
        if (idx === 0) return cur;

        cur.forEach((latency: number, idx) => {
            acc[idx] += latency;
        });

        return acc;
    });

    let targetIndex = 0;
    totalLatencies.forEach((totalLatency, idx) => {
        if (idx === 0) {
            return;
        }

        if (totalLatency < totalLatencies[targetIndex]) {
            targetIndex = idx;
        }
    });

    const betterUrl = urls[targetIndex];
    betterUrlMap.set(urls, betterUrl);

    log('betterUrl', {betterUrl, urls, totalLatencies});

    return betterUrl;
}
