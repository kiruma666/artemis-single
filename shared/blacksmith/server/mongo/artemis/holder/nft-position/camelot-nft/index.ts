/**
 * @Author: sheldon
 * @Date: 2024-03-24 17:12:33
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-07 22:59:32
 */

import {job} from 'cron';
import {Contract, BigNumber} from 'ethers';
import {Application} from 'express';

import {metisBatchProvider} from 'server/mongo/quoll/util';

import {getHolders} from '../../asset-depositor';
import {sendErrorMessage} from '../../vl-eqb';

import camelotNftPositionModel from './model';

// nft & pool: https://andromeda-explorer.metis.io/token/0x75A05DEa768F5a8E90227d900EC82038e4584e9a/instance/466
const CamelotNftAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function getStakingPosition(uint256 tokenId) view returns (uint256 amount, uint256 amountWithMultiplier, uint256 startLockTime, uint256 lockDuration, uint256 lockMultiplier, uint256 rewardDebt, uint256 boostPoints, uint256 totalMultiplier)'
];
const DepositPoolAbi = [
    'function userInfo(address) view returns (uint256 totalDepositAmount, uint256 rewardDebtToken1, uint256 rewardDebtToken2, uint256 pendingRewardsToken1, uint256 pendingRewardsToken2)'
];
const camelotNftAddress = '0x75A05DEa768F5a8E90227d900EC82038e4584e9a';
const depositPoolAddresses = [
    '0xB8Fe19e7227E69Dd6E1e67Da9dE1DF0CEbf6e33B',
    '0xcaf1159Fe2e113e89D55a971168979Aa1740Ad1F',
    '0x9Ce12F0ACF681085B47658c7a70B3bA99B0E34A3'
];

let fetching = false;

async function fetchAndSaveCamelotNftPosition() {
    if (fetching) return;
    fetching = true;
    try {
        const holders = await getHolders();
        // const holders = ['0x78E96db9875d9857021f5072ce826006a3f4d1D1'];

        if (!holders.length) return [];

        const holderMap: Record<string, {liquidity?: string; token0?: string; token1?: string}> = {};

        const batchSize = 100;
        let start = 0;
        const CamelotNft = new Contract(camelotNftAddress, CamelotNftAbi, metisBatchProvider);
        const DepositPools = depositPoolAddresses.map(depositPoolAddress => new Contract(depositPoolAddress, DepositPoolAbi, metisBatchProvider));
        while (start < holders.length) {
            const end = start + batchSize;
            const batchHolders = holders.slice(start, end);
            console.log('Artemis fetchAndSaveHolderCamelotNftPosition', start, end, batchHolders.length);
            try {
                const holderEntries = await Promise.all(batchHolders.map(async holder => {
                    try {
                        const [
                            nftCount,
                            ...userInfos
                        ] = await Promise.all([
                            CamelotNft.balanceOf(holder),
                            ...DepositPools.map(DepositPool => DepositPool.userInfo(holder))
                        ]);
                        const poolAmount = userInfos.reduce((sum, userInfo) => sum.add(userInfo.totalDepositAmount), BigNumber.ZERO).toString();
                        if ((nftCount as BigNumber).isZero()) {
                            return [holder, {poolAmount}];
                        }

                        const nftIds = await Promise.all(Array(nftCount.toNumber()).fill(0).map((zero, index) => CamelotNft.tokenOfOwnerByIndex(holder, index)));
                        const positions = await Promise.all(nftIds.map(tokenId => CamelotNft.getStakingPosition(tokenId)));
                        const camelotNftAmount = positions.reduce((acc, position) => {
                            acc = acc.add(position.amount);

                            return acc;
                        }, BigNumber.ZERO).toString();

                        return [holder, {
                            camelotNftAmount,
                            poolAmount
                        }];
                    } catch (err) {
                        console.log(`fetch ${holder} camelot nft position failed`, err);

                        return [holder, {}];
                    }
                }));

                Object.assign(holderMap, Object.fromEntries(holderEntries));
            } catch (error) {
                sendErrorMessage(`Artemis fetchHolderCamelotNftPosition ${start}-${end} error`, error);
            }

            start = end;
        }

        // console.log(holderMap);
        console.log('Artemis fetchHolderCamelotNftPosition done');
        const records = holders.map(holder => ({
            holder,
            camelotNftAmount: '0',
            poolAmount: '0',
            ...holderMap[holder]
        }));

        try {
            await camelotNftPositionModel.create({positions: records});
            console.log('Artemis saveCamelotNftPosition done');
        } catch (error) {
            sendErrorMessage('Artemis saveCamelotNftPosition error', error);
        }
    } catch (error) {
        sendErrorMessage('Artemis fetchAndSaveCamelotNftPosition error', error);
    } finally {
        fetching = false;
    }
}

export function mountArtemisHolderCamelotNftPosition(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '24 0 * * *',
            onTick: fetchAndSaveCamelotNftPosition,
            start: true
        });

        console.log('Artemis fetchAndSaveCamelotNftPosition started');
    }

    const apiPathPrefix = '/api/artemis-holder-camelot-nft-position';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await fetchAndSaveCamelotNftPosition();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const dailyPositions = await camelotNftPositionModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const headers = ['holder', 'camelotNftAmount', 'poolAmount', 'createdDate', 'createdAt'] as const;
        const csv = dailyPositions.flatMap(dailyPosition => dailyPosition.positions.map(record => headers.map(header => {
            if (header === 'createdDate') return dailyPosition.createdAt.toISOString().split('T')[0];

            if (header === 'createdAt') return dailyPosition[header].toISOString();

            return record[header];
        }).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis_holder_camelot_nft_position_${dateStart}_${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
