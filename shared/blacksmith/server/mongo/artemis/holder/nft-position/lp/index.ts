/**
 * @Author: sheldon
 * @Date: 2024-03-24 17:12:33
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-29 00:12:45
 */

import {job} from 'cron';
import {Contract, BigNumber} from 'ethers';
import {Application} from 'express';

import {metisBatchProvider} from 'server/mongo/quoll/util';

import {getHolders} from '../../asset-depositor';
import {sendErrorMessage} from '../../vl-eqb';

import lpPositionModel from './model';

// ref: https://explorer.metis.io/token/0x252d0af80D46652a74b062Be56C1Cc38324D3eA4/contract/readProxyContract
const TokenAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function totalSupply() view returns (uint256)'
];
const lpAddress = '0x252d0af80D46652a74b062Be56C1Cc38324D3eA4';
export const poolAddress = '0xfd1F58C4c05d8Ed5040eE9bA7eDb5Cc5bf53930E'.toLowerCase();
export const artMetisAddress = '0x2583A2538272f31e9A15dD12A432B8C96Ab4821d'.toLowerCase();
export const wmetisAddress = '0x75cb093E4D61d2A2e65D8e0BBb01DE8d89b53481'.toLowerCase();

let fetching = false;

async function fetchAndSaveHolderLpPosition() {
    if (fetching) return;
    fetching = true;
    try {
        const holders = await getHolders();
        // const holders = ['0x6bA83D664C9FEdfaeFc05246dbCA9cfaFF4ccC6D'];

        if (!holders.length) return [];

        const holderMap: Record<string, {liquidity?: string, token0?: string, token1?: string}> = {};

        const batchSize = 100;
        let start = 0;
        while (start < holders.length) {
            const end = start + batchSize;
            const batchHolders = holders.slice(start, end);
            console.log('Artemis fetchAndSaveHolderLpPosition', start, end, batchHolders.length);
            try {
                const [
                    lpToken,
                    artMetisToken,
                    wmetisToken
                ] = [lpAddress, artMetisAddress, wmetisAddress].map(tokenAddress => new Contract(tokenAddress, TokenAbi, metisBatchProvider));
                const [
                    lpTotalSupply,
                    poolArtMetisBalance,
                    poolWmetisBalance
                ] = await Promise.all([
                    lpToken.totalSupply(),
                    artMetisToken.balanceOf(poolAddress),
                    wmetisToken.balanceOf(poolAddress)
                ]);
                const holderEntries = await Promise.all(batchHolders.map(async holder => {
                    try {
                        const holderLpBalance: BigNumber = await lpToken.balanceOf(holder);
                        if (holderLpBalance.isZero()) {
                            return [holder, {}];
                        }

                        const decimals = 1e18.toString();
                        const holderShare = holderLpBalance.mul(decimals).div(lpTotalSupply);

                        return [holder, {
                            liquidity: holderLpBalance.toString(),
                            token0: poolArtMetisBalance.mul(holderShare).div(decimals).toString(),
                            token1: poolWmetisBalance.mul(holderShare).div(decimals).toString()
                        }];
                    } catch (err) {
                        console.log(`fetch ${holder} lp position failed`, err);

                        return [holder, {}];
                    }
                }));

                Object.assign(holderMap, Object.fromEntries(holderEntries));
            } catch (error) {
                sendErrorMessage(`Artemis fetchHolderLpPosition ${start}-${end} error`, error);
            }

            start = end;
        }

        // console.log(holderMap);
        console.log('Artemis fetchHolderLpPosition done');
        const records = holders.map(holder => ({
            holder,
            liquidity: '0',
            token0: '0',
            token1: '0',
            ...holderMap[holder]
        }));

        try {
            await lpPositionModel.create({positions: records});
            console.log('Artemis saveHolderLpPosition done');
        } catch (error) {
            sendErrorMessage('Artemis saveHolderLpPosition error', error);
        }
    } catch (error) {
        sendErrorMessage('Artemis fetchAndSaveHolderLpPosition error', error);
    } finally {
        fetching = false;
    }
}

export function mountArtemisHolderLpPosition(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '15 0 * * *',
            onTick: fetchAndSaveHolderLpPosition,
            start: true
        });

        console.log('Artemis fetchAndSaveHolderLpPosition started');
    }

    const apiPathPrefix = '/api/artemis-holder-lp-position';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await fetchAndSaveHolderLpPosition();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const dailyPositions = await lpPositionModel.find({
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
        res.setHeader('Content-Disposition', `attachment; filename=artemis_holder_lp_position_${dateStart}_${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
