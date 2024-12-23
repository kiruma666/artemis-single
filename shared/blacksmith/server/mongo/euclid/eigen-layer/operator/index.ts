/**
 * @Author: sheldon
 * @Date: 2024-02-23 23:28:33
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-02-28 22:58:30
 */

import {BigNumber} from 'ethers';
import {Application} from 'express';
import fetch from 'isomorphic-fetch';

type OperatorMetadata = {
    address: string
    name: string
    website: string
    description: string
    logo: string
    twitter: string
}

type OperatorTvlStakerData = {
    address: string
    numStakers: number
    shares: Record<string, string | undefined>
}

type OperatorTvlStakerComputedData = OperatorTvlStakerData & {
    tvlETH?: string
}

type SharesToUnderlyingFactorData = {
    strategy: string
    sharesToUnderlying: string
}

const strategyTokenPriceSymbolMap: Record<string, string | undefined> = {
    '0x1bee69b7dfffa4e2d53c2a2df135c388ad25dcd2': 'rocket-pool-eth',
    '0x93c4b944d05dfe6df7645a86cd2206016c51564d': 'staked-ether',
    '0x54945180db7943c0ed0fee7edab2bd24620256bc': 'coinbase-wrapped-staked-eth',
    '0x57ba429517c3473b6d34ca9acd56c0e735b94c02': 'stakewise-v3-oseth',
    '0x0fe4f44bee93503346a3ac9ee5a26b130a5796d6': 'sweth',
    '0xa4c637e0f704745d182e4d38cab7e7485321d059': 'origin-ether',
    '0x7ca911e83dabf90c90dd3de5411a10f1a6112184': 'wrapped-beacon-eth',
    '0x13760f50a9d7377e4f20cb8cf9e4c26586c658ff': 'ankreth',
    '0x9d7ed45ee2e8fc5482fa2428f15c971e6369011d': 'stader-ethx',
    '0x8ca7a5d6f3acd3a7a8bc468a8cd0fb14b6bd28b6': 'staked-frax-ether',
    '0xae60d8180437b5c34bb956822ac2710972584473': 'liquid-staked-ethereum',
    '0x298afb19a105d59e74658c4c334ff360bade6dd2': 'mantle-staked-ether'
};

async function crawlOperators() {
    const res = await fetch('https://app.eigenlayer.xyz/api/trpc/operator.getAllOperatorsWithMetadata,operator.getAllOperatorTVLNumStakers,tokenStaking.getSharesToUnderlyingFactor,price.getPrices?batch=1&input={}');
    const data = await res.json();

    // api raw data
    const operatorMetadataList = data[0].result.data.json.operatorMetadata as OperatorMetadata[];
    const operatorTvlStakersDataList = data[1].result.data.json.operatorTvlStakerData as OperatorTvlStakerData[];
    const sharesToUnderlyingFactorDataList = data[2].result.data.json as SharesToUnderlyingFactorData[];
    const prices = data[3].result.data.json.tokenPrices as Record<string, any>;

    // computed data
    const strategiesMap = sharesToUnderlyingFactorDataList.reduce((acc, data) => {
        if (data.strategy in acc) {
            throw new Error(`Duplicate strategy: ${data.strategy}`);
        }

        acc[data.strategy.toLocaleLowerCase()] = {
            ...data,
            underlyingToken: strategyTokenPriceSymbolMap[data.strategy.toLocaleLowerCase()],
            underlyingTokenPrice: prices[strategyTokenPriceSymbolMap[data.strategy.toLocaleLowerCase()] ?? '']
        };

        return acc;
    }, {} as Record<string, SharesToUnderlyingFactorData & {underlyingToken?: string; underlyingTokenPrice?: {usd: number; eth: number}}>);

    const operatorTvlStakerDataMap = operatorTvlStakersDataList.reduce((acc, data) => {
        if (data.address.toLocaleLowerCase() in acc) {
            throw new Error(`Duplicate operator address: ${data.address}`);
        }

        const tvlETH_BN = data?.shares
            ? Object.entries(data.shares).reduce((acc, [strategy, share]) => {
                if (share) {
                    const strategyMeta = strategiesMap[strategy.toLocaleLowerCase()];
                    if (strategyMeta && !strategyMeta.underlyingTokenPrice) {
                        console.warn(`Price not found for strategy: ${strategy}`);
                    }

                    const shareBN = strategyMeta
                        ? BigNumber.from(share)
                            .mul(BigNumber.from(strategyMeta.sharesToUnderlying))
                            .mul(BigNumber.fromNumber(strategyMeta.underlyingTokenPrice?.eth) ?? BigNumber.getMultiplier())
                            .div(BigNumber.getMultiplier())
                            .div(BigNumber.getMultiplier())
                        : BigNumber.from(share);

                    return acc.add(shareBN);
                }

                return acc;
            }, BigNumber.from(0))
            : undefined;

        acc[data.address.toLocaleLowerCase()] = {
            ...data,
            tvlETH: tvlETH_BN?.toString(),
            shares: data.shares
        };

        return acc;
    }, {} as Record<string, OperatorTvlStakerComputedData | undefined>);

    // merged data
    const list = operatorMetadataList.map(metadata => {
        const tvlStakerData = operatorTvlStakerDataMap[metadata.address.toLocaleLowerCase()];

        return {
            ...metadata,
            ...tvlStakerData
        };
    });

    list.sort((a, b) => {
        let result = (b.numStakers ?? 0) - (a.numStakers ?? 0);
        if (result === 0) {
            result = (BigNumber.from(b.tvlETH ?? 0)).gt(BigNumber.from(a.tvlETH ?? 0)) ? 1 : -1;
        }

        return result;
    });

    return {
        strategies: strategiesMap,
        list
    };
}

export function mountEigenLayerOperator(app: Application) {
    app.get('/api/eigen-layer/operators', async (req, res) => {
        try {
            const format = req.query.format as string | undefined;
            const result = await crawlOperators();

            if (format === 'csv') {
                const headers = ['Name', 'Address', 'ETH Restaked', 'Num of Stakers', 'Website', 'Twitter', 'Description'];
                const rows = result.list.map(({name, address, tvlETH, numStakers, website, twitter, description}) =>
                    [name, address, tvlETH, numStakers, website, twitter, JSON.stringify(description)].join(','));

                res.setHeader('content-disposition', `attachment;filename="operators-${Date.now()}.csv"`);
                res.send([headers, ...rows].join('\n'));

                return;
            }

            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    });
}
