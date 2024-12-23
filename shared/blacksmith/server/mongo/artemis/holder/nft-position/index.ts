/**
 * @Author: sheldon
 * @Date: 2024-03-24 17:12:33
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-07 23:01:26
 */

import {job} from 'cron';
import {Contract, BigNumber} from 'ethers';
import {Application} from 'express';

import {metisBatchProvider} from 'server/mongo/quoll/util';

import {getHolders} from '../asset-depositor';
import {sendErrorMessage} from '../vl-eqb';

import {artMetisAddress} from './lp';
import nftPositionModel from './model';

// ref: https://api.arbiscan.io/api?module=contract&action=getabi&address=0xc36442b4a4522e871399cd717abdd847ab11fe88&format=raw
const NonfungiblePositionManagerAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
    'function decreaseLiquidity(tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline) param) payable returns (uint256 amount0, uint256 amount1)'
];

let fetching = false;

async function fetchAndSaveHolderNftPosition() {
    if (fetching) return;
    fetching = true;
    try {
        const holders = await getHolders();
        // const holders = ['0xebAe9733e68752acc9a74D290aa9E8E64fE6Bbb4'];

        if (!holders.length) return [];

        const holderMap: Record<string, {liquidity?: string; token0?: string; token1?: string}> = {};

        const batchSize = 100;
        let start = 0;
        while (start < holders.length) {
            const end = start + batchSize;
            const batchHolders = holders.slice(start, end);
            console.log('Artemis fetchAndSaveHolderNftPosition', start, end, batchHolders.length);
            try {
                const positionManager = new Contract('0x3C93AEf118F8c2183B32dCa29Aa6220F2b2A1593', NonfungiblePositionManagerAbi, metisBatchProvider);
                const holderEntries = await Promise.all(batchHolders.map(async holder => {
                    try {
                        const nftCount: BigNumber = await positionManager.balanceOf(holder);
                        if (nftCount.isZero()) {
                            return [holder, {}];
                        }

                        const nftIds = await Promise.all(Array(nftCount.toNumber()).fill(0).map((zero, index) => positionManager.tokenOfOwnerByIndex(holder, index)));
                        // console.log({nftCount, nftIds});
                        const positions = await Promise.all(nftIds.map(tokenId => positionManager.positions(tokenId)));
                        const artMetisPositions = positions.flatMap((position, index) => {
                            const {liquidity, token0} = position;
                            // console.log(index, nftIds[index], token0.toLowerCase(), token0.toLowerCase() === artMetisAddress);
                            if (liquidity.isZero() || token0.toLowerCase() !== artMetisAddress) {
                                return [];
                            }

                            return {tokenId: nftIds[index], ...position};
                        });
                        let decreaseLiquidityResults: any[] = [];
                        try {
                            const deadline = Math.ceil(Date.now() / 1e3) + 1e2;

                            decreaseLiquidityResults = await Promise.all(artMetisPositions.map(position => positionManager.callStatic.decreaseLiquidity({
                                tokenId: position.tokenId,
                                liquidity: position.liquidity,
                                amount0Min: 0,
                                amount1Min: 0,
                                deadline
                            })));
                        } catch (err) {
                            console.log(`Artemis nft position callStatic.decreaseLiquidity failed, holder: ${holder}, positions: `, artMetisPositions, err);
                        }

                        // console.log(decreaseLiquidityResults);
                        const [liquidityBN, token0BN, token1BN] = artMetisPositions.reduce((acc, position, index) => {
                            acc[0] = acc[0].add(position.liquidity);
                            acc[1] = acc[1].add(decreaseLiquidityResults[index]?.amount0 ?? BigNumber.ZERO);
                            acc[2] = acc[2].add(decreaseLiquidityResults[index]?.amount1 ?? BigNumber.ZERO);

                            return acc;
                        }, Array(3).fill(BigNumber.ZERO));
                        // console.log({liquidityBN, token0BN, token1BN});

                        return [holder, {
                            liquidity: liquidityBN.toString(),
                            token0: token0BN.toString(),
                            token1: token1BN.toString()
                        }];
                    } catch (err) {
                        console.log(`fetch ${holder} nft position failed`, err);

                        return [holder, {}];
                    }
                }));

                Object.assign(holderMap, Object.fromEntries(holderEntries));
            } catch (error) {
                sendErrorMessage(`Artemis fetchHolderNftPosition ${start}-${end} error`, error);
            }

            start = end;
        }

        // console.log(holderMap);
        console.log('Artemis fetchHolderNftPosition done');
        const records = holders.map(holder => ({
            holder,
            liquidity: '0',
            token0: '0',
            token1: '0',
            ...holderMap[holder]
        }));

        try {
            await nftPositionModel.create({positions: records});
            console.log('Artemis saveHolderNftPosition done');
        } catch (error) {
            sendErrorMessage('Artemis saveHolderNftPosition error', error);
        }
    } catch (error) {
        sendErrorMessage('Artemis fetchAndSaveHolderNftPosition error', error);
    } finally {
        fetching = false;
    }
}

export function mountArtemisHolderNftPosition(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '22 0 * * *',
            onTick: fetchAndSaveHolderNftPosition,
            start: true
        });

        console.log('Artemis fetchAndSaveHolderNftPosition started');
    }

    const apiPathPrefix = '/api/artemis-holder-nft-position';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await fetchAndSaveHolderNftPosition();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const dailyPositions = await nftPositionModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const headers = ['holder', 'liquidity', 'token0', 'token1', 'createdDate', 'createdAt'] as const;
        const csv = dailyPositions.flatMap(dailyPosition => dailyPosition.positions.map(record => headers.map(header => {
            if (header === 'createdDate') return dailyPosition.createdAt.toISOString().split('T')[0];

            if (header === 'createdAt') return dailyPosition[header].toISOString();

            return record[header];
        }).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis_holder_nft_position_${dateStart}_${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
