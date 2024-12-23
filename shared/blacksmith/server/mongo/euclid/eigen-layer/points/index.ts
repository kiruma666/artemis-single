/**
 * @Author: sheldon
 * @Date: 2024-02-23 23:28:33
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-02-28 22:58:30
 */

import {BigNumber} from 'ethers';
import {Application} from 'express';

import EigenLayerAssetDepositorModel from '../asset-deposit/model';
import EigenLayerLRTUnstakingVaultEventModel from '../asset-unstake/model';

// Ref: https://docs.eigenlayer.xyz/eigenlayer/restaking-guides/restaking-user-guide/restaked-points

const hoursOffset = 24;

type Validator = {
    index: number
    activatedAt: string
}

const validatorAmountBN = BigNumber.from('32'.padEnd(20, '0'));

const validators: Validator[] = [
    {
        index: 1197298, // https://beaconcha.in/validator/1197298
        activatedAt: '2024-02-08T21:14:47.000Z'
    },
    {
        index: 1235551, // https://beaconcha.in/validator/1235551
        activatedAt: '2024-02-21T16:22:59.000Z'
    },
    {
        index: 1381864, // https://beaconcha.in/validator/1381864
        activatedAt: '2024-04-29T22:37:23.000Z'
    }
    // TODO(pancake) add exitedAt
];

async function calculateEigenLayerPoints() {
    // calculate native restaked points
    const NSTs = validators.map(({index, activatedAt}) => {
        const hours = Math.floor((Date.now() - new Date(activatedAt).getTime()) / 3600 / 1e3);
        const hoursBN = BigNumber.from(hours);
        const pointsBN = hoursBN.mul(validatorAmountBN); // 32 ETH per validator

        return {
            index,
            activatedAt,
            points: +pointsBN.toDecimal(),
        };
    });

    const totalNSTRestakedPoints = NSTs.reduce((acc, {points}) => acc + points, 0);

    // calculate LSTs points
    const stakeLogs = await EigenLayerAssetDepositorModel.find({event: 'AssetDeposited'}).lean();

    const lstMap = stakeLogs.reduce((acc, {asset, amount, blockTimestamp}) => {
        const hours = Math.floor((Date.now() - blockTimestamp * 1e3) / 3600 / 1e3);
        const hoursBN = BigNumber.from(Math.max(0, hours - hoursOffset)); // minus offset to mitigate restake delay
        const stakedAmountBN = BigNumber.from(amount);
        const stakedPointsBN = stakedAmountBN.mul(hoursBN); // ETH * hours

        const assetRecord = acc[asset] || {asset, stakedAmountBN: BigNumber.from(0), stakedPointsBN: BigNumber.from(0)};
        acc[asset] = assetRecord;
        assetRecord.stakedAmountBN = assetRecord.stakedAmountBN.add(stakedAmountBN);
        assetRecord.stakedPointsBN = assetRecord.stakedPointsBN.add(stakedPointsBN);

        return acc;
    }, {} as Record<string, {asset: string; stakedAmountBN: BigNumber; stakedPointsBN: BigNumber; unstakedAmountBN?: BigNumber; unstakedPointsBN?: BigNumber}>);

    const unstakeLogs = await EigenLayerLRTUnstakingVaultEventModel.find({event: 'SharesUnstakingAdded'}).lean();
    unstakeLogs.forEach(({asset, amount, blockTimestamp}) => {
        const assetRecord = lstMap[asset];
        if (!assetRecord) {
            throw new Error(`Asset ${asset} not found in AssetDeposited events`);
        }

        const hours = Math.floor((Date.now() - blockTimestamp * 1e3) / 3600 / 1e3);
        const hoursBN = BigNumber.from(hours);
        const unstakedAmountBN = BigNumber.from(amount);
        const unstakedPointsBN = unstakedAmountBN.mul(hoursBN); // ETH * hours

        assetRecord.unstakedAmountBN = (assetRecord.unstakedAmountBN || BigNumber.ZERO).add(unstakedAmountBN);
        assetRecord.unstakedPointsBN = (assetRecord.unstakedPointsBN || BigNumber.ZERO).add(unstakedPointsBN);
    });

    const LSTs = Object.values(lstMap).map(({stakedAmountBN, stakedPointsBN, unstakedAmountBN, unstakedPointsBN, ...attrs}) => ({
        ...attrs,
        stakedAmount: stakedAmountBN.toString(),
        unstakedAmount: unstakedAmountBN?.toString(),
        amount: stakedAmountBN.sub(unstakedAmountBN ?? BigNumber.ZERO).toString(),
        stakePoints: +stakedPointsBN.toDecimal(),
        unstakePoints: Number(unstakedPointsBN?.toDecimal()) || undefined,
        points: +stakedPointsBN.sub(unstakedPointsBN ?? BigNumber.ZERO).toDecimal(),
    }));

    const totalLSTRestakedPoints = LSTs.reduce((acc, {points}) => acc + points, 0);

    return {
        totalRestakedPoints: totalNSTRestakedPoints + totalLSTRestakedPoints,
        totalNSTRestakedPoints,
        totalLSTRestakedPoints,
        NSTs,
        LSTs,
    };
}

export function mountEigenLayerPoints(app: Application) {
    app.get('/api/eigen-layer/points', async (req, res) => {
        try {
            const result = await calculateEigenLayerPoints();
            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).send('Internal Server Error');
        }
    });
}
