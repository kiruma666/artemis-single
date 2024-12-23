/**
 * @Author: sheldon
 * @Date: 2024-02-23 23:28:33
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-10-11 15:27:04
 */

import {job} from 'cron';
import {BigNumber} from 'ethers';
import {Application} from 'express';
import multer from 'multer';

import {tableToRecords} from 'server/mongo/quoll/util';

import {ArtemisAssetDepositorScript, getHolders, getUserInviterMap} from '../asset-depositor';
import groupRankingModel from '../asset-depositor/group-ranking/model';
import {decodeInviterCode} from '../asset-depositor/inviter-decode';
import withdrawInitiatedModel from '../asset-depositor/withdraw-initiated/model';
import ePendleModel from '../e-pendle/model';
import liquiditySwapModel from '../liquidity-swap/model';
import camelotNftPositionModel from '../nft-position/camelot-nft/model';
import lpModel from '../nft-position/lp/model';
import nftModel from '../nft-position/model';
import SheobillArtMetisModel from '../sheobill/art-metis/model';
import SheobillMetisModel from '../sheobill/metis/model';
import vlEqbModel from '../vl-eqb/model';

import artPointsModel from './model';

function sumFromValues(values: any[]) {
    return values.reduce((acc: BigNumber, value: string | BigNumber) => {
        return acc.add(BigNumber.from(value));
    }, BigNumber.from(0));
}

function getUserWeigth(user = BigNumber.from(0), total = BigNumber.from(1)) {
    return +user.toDecimal() / +total.toDecimal();
}

function getIncreaseAmountToTargetWeight(user = BigNumber.ZERO, total = BigNumber.from(1), targetWeight: number) {
    return (targetWeight * +total.toDecimal() - +user.toDecimal()) / (1 - targetWeight);
}

function getUserGroup<T>(user: string, userInviterMap: Record<string, string>, groupRankingMap: Record<string, T>): T | undefined {
    let groupId = user;
    const inviterSet = new Set();
    while (userInviterMap[groupId]) {
        const inviterId = decodeInviterCode(userInviterMap[groupId]);
        if (!inviterId || inviterId === user || inviterSet.has(inviterId)) break;

        // console.log({user, groupId, inviterId});
        inviterSet.add(inviterId);
        groupId = inviterId;
    }

    return groupRankingMap[groupId];
}

function ensure(num?: number) {
    return num ?? 0;
}

export async function calculateArtPoints() {
    const holders = (await getHolders()).map(holder => holder.toLowerCase());
    const userInviterMap = await getUserInviterMap();
    const depositorCSV = await ArtemisAssetDepositorScript.calculate({});
    const depositorRecords = tableToRecords(depositorCSV);
    const tier0DepositorRecords = depositorRecords.filter(record => +record.invitationTier === 0);
    const elEthUserMap = tier0DepositorRecords.reduce((acc, record) => {
        const {user, amount} = record;
        if (!acc[user]) {
            acc[user] = BigNumber.from(0);
        }

        acc[user] = acc[user].add(BigNumber.from(amount));

        return acc;
    }, {} as Record<string, BigNumber>);
    const elEthTotal = sumFromValues(Object.values(elEthUserMap));
    const groupRanking = await groupRankingModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const groupRankingMap = groupRanking?.groups.reduce((acc, group) => {
        acc[group.group] = group;

        return acc;
    }, {} as any);
    const ePendleDailyBalance = await ePendleModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const ePendleUserMap = ePendleDailyBalance?.balances.reduce((acc, balance) => {
        const {holder, eth, ethStaked, ethCompounderStaked, arb, arbStaked, arbBridgeStaked, arbCompounderStaked, op, opStaked, bnb, bnbStaked} = balance;
        acc[holder.toLowerCase()] = sumFromValues([eth, ethStaked, ethCompounderStaked, arb, arbStaked, arbBridgeStaked, arbCompounderStaked, op, opStaked, bnb, bnbStaked]);

        return acc;
    }, {} as Record<string, BigNumber>) ?? {};
    const ePendleTotal = sumFromValues(Object.values(ePendleUserMap));
    const vlEqbDailyBalance = await vlEqbModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const vlEqbUserMap = vlEqbDailyBalance?.balances.reduce((acc, balance) => {
        const {holder, eth, arb, op, bnb} = balance;
        acc[holder.toLowerCase()] = sumFromValues([eth, arb, op, bnb]);

        return acc;
    }, {} as Record<string, BigNumber>) ?? {};
    const vlEqbTotal = sumFromValues(Object.values(vlEqbUserMap));
    const nftDailyPosition = await nftModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const nftUserMap = nftDailyPosition?.positions.reduce((acc, position) => {
        const {holder, liquidity, token0, token1} = position;
        const tokenSum: BigNumber = sumFromValues([token0, token1]);
        acc[holder.toLowerCase()] = tokenSum.isZero() ? BigNumber.from(liquidity).mul(2) : tokenSum;

        return acc;
    }, {} as Record<string, BigNumber>) ?? {};
    const lpDailyPosition = await lpModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const lpUserMap = lpDailyPosition?.positions.reduce((acc, position) => {
        const {holder, token0, token1} = position;
        acc[holder.toLowerCase()] = sumFromValues([token0, token1]);

        return acc;
    }, {} as Record<string, BigNumber>) ?? {};
    const camelotNftDailyPosition = await camelotNftPositionModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const camelotNftUserMap = camelotNftDailyPosition?.positions.reduce((acc, position) => {
        const {holder, camelotNftAmount, poolAmount} = position;
        acc[holder.toLowerCase()] = sumFromValues([camelotNftAmount, poolAmount]).mul(2);

        return acc;
    }, {} as Record<string, BigNumber>) ?? {};
    const swapEvents = await liquiditySwapModel.find().lean();
    const userSwapMap = swapEvents.reduce((acc, swapEvent) => {
        const {transactionFrom, amount0} = swapEvent;
        const holder = transactionFrom?.toLowerCase();
        const amount0BN = BigNumber.from(amount0);
        if (holder && amount0BN.gt(BigNumber.ZERO)) {
            acc[holder] = (acc[holder] || BigNumber.ZERO).add(amount0BN);
        }

        return acc;
    }, {} as Record<string, BigNumber>);
    console.log('artMetis sellers', Object.keys(userSwapMap));

    const withdrawEvents = await withdrawInitiatedModel.find().lean();
    const userWithdrawMap = withdrawEvents.reduce((acc, withdrawEvent) => {
        const {user, artMetisAmount} = withdrawEvent;
        acc[user] = (acc[user] || BigNumber.ZERO).add(BigNumber.from(artMetisAmount));

        return acc;
    }, {} as Record<string, BigNumber>);
    console.log('artMetis withdraw users', Object.keys(userSwapMap));

    const sheobillArtMetisDailyBalance = await SheobillArtMetisModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const sheobillArtMetisUserMap = sheobillArtMetisDailyBalance?.balances.reduce((acc, position) => {
        const {holder, cash} = position;
        acc[holder.toLowerCase()] = BigNumber.from(cash);

        return acc;
    }, {} as Record<string, BigNumber>) ?? {};
    const sheobillMetisDailyBalance = await SheobillMetisModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const sheobillMetisUserMap = sheobillMetisDailyBalance?.balances.reduce((acc, position) => {
        const {holder, cash} = position;
        acc[holder.toLowerCase()] = BigNumber.from(cash);

        return acc;
    }, {} as Record<string, BigNumber>) ?? {};

    const prevArtPoints = await artPointsModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const holderPrevRecordMap = prevArtPoints?.points.reduce((acc, point) => {
        acc[point.user] = point;

        return acc;
    }, {} as Record<string, any>);
    console.log('calculateArtPoints calculate start');
    const points = holders.map(holder => {
        const elEthWeight = getUserWeigth(elEthUserMap[holder], elEthTotal) || 1;
        const vlEqbBoost = Math.min(getUserWeigth(vlEqbUserMap[holder], vlEqbTotal) / elEthWeight, 1);
        // EQB to Buy and Lock 52 weeks for max vlEqbBoost
        let eqbToLock = 0;
        if (elEthWeight < 1 && vlEqbBoost < 1) {
            eqbToLock = getIncreaseAmountToTargetWeight(vlEqbUserMap[holder], vlEqbTotal, elEthWeight) / 52;
        }

        const ePendleBoost = Math.min(getUserWeigth(ePendleUserMap[holder], ePendleTotal) / elEthWeight, 0.5);
        // ePENDLE to Buy for max ePendleBoost
        let ePendleToBuy = 0;
        if (elEthWeight < 1 && ePendleBoost < 0.5) {
            ePendleToBuy = getIncreaseAmountToTargetWeight(ePendleUserMap[holder], ePendleTotal, elEthWeight);
        }

        const userGroup = getUserGroup(holder, userInviterMap, groupRankingMap) as any;
        const groupBoost = userGroup?.currentBoost || 0;
        const boost = 1 + vlEqbBoost + ePendleBoost + groupBoost;
        const swapedArtMetis = userSwapMap[holder] ? +userSwapMap[holder].toDecimal() : 0;
        const withdrawedArtMetis = userWithdrawMap[holder] ? +userWithdrawMap[holder].toDecimal() : 0;
        const depositPoints = +sumFromValues(depositorRecords.filter(record => record.user === holder).map(record => record.artMetisAmount)).toDecimal();
        const dailyBaseStakePoints = Math.max(depositPoints - swapedArtMetis - withdrawedArtMetis, 0);
        const dailyStakePoints = boost * dailyBaseStakePoints;
        const holderPrevRecord = holderPrevRecordMap?.[holder];
        const totalStakePoints = dailyStakePoints + (holderPrevRecord?.totalStakePoints || holderPrevRecord?.artPoints || 0);
        const dailyBaseHerculesPoints = (nftUserMap[holder] ? +nftUserMap[holder].toDecimal() : 0) + (lpUserMap[holder] ? +lpUserMap[holder].toDecimal() : 0) + (camelotNftUserMap[holder] ? +camelotNftUserMap[holder].toDecimal() : 0);
        const dailyHerculesPoints = boost * dailyBaseHerculesPoints;
        const totalHerculesPoints = dailyHerculesPoints + (holderPrevRecord?.totalHerculesPoints || 0);
        const dailyBaseLendingPoints = (sheobillArtMetisUserMap[holder] ? +sheobillArtMetisUserMap[holder].toDecimal() * 0.75 : 0) + (sheobillMetisUserMap[holder] ? +sheobillMetisUserMap[holder].toDecimal() * 0.25 : 0);
        const dailyLendingPoints = boost * dailyBaseLendingPoints;
        const totalLendingPoints = dailyLendingPoints + (holderPrevRecord?.totalLendingPoints || 0);
        const artPoints = totalStakePoints + totalHerculesPoints + totalLendingPoints;

        return {
            user: holder,
            artPoints,
            totalStakePoints,
            totalHerculesPoints,
            totalLendingPoints,
            group: userGroup?.group || '',
            rank: userGroup?.rank || '',
            vlEqbBoost,
            eqbToLock,
            ePendleBoost,
            ePendleToBuy,
            groupBoost,
            depositPoints,
            swapedArtMetis,
            withdrawedArtMetis,
            dailyBaseStakePoints,
            dailyBaseHerculesPoints,
            dailyBaseLendingPoints
        };
    });

    console.log('calculateArtPoints calculate done');

    await artPointsModel.create({points});
    console.log('calculateArtPoints save done');
}

export function mountArtemisHolderArtPoints(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '30 0 * * *',
            onTick: calculateArtPoints,
            start: true
        });

        console.log('calculateArtPoints started');
    }

    const apiPathPrefix = '/api/artemis-holder-art-points';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await calculateArtPoints();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const artPoints = await artPointsModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const userInviterMap = await getUserInviterMap();
        const headers = ['user', 'artPoints', 'totalStakePoints', 'totalHerculesPoints', 'totalLendingPoints', 'referralId', 'group', 'rank', 'myBoost', 'vlEqbBoost', 'eqbToLock', 'ePendleBoost', 'ePendleToBuy', 'groupBoost', 'dailyTotalBasePoints', 'dailyTotalPoints', 'dailyBaseStakePoints', 'dailyStakePoints', 'dailyBaseHerculesPoints', 'dailyHerculesPoints', 'dailyBaseLendingPoints', 'dailyLendingPoints', 'createdAt', 'depositPoints', 'swapedArtMetis', 'withdrawedArtMetis'] as const;
        const csv = artPoints?.flatMap(artPoint => artPoint.points.map(record => {
            const {vlEqbBoost, ePendleBoost, groupBoost, dailyBaseStakePoints, dailyBaseHerculesPoints, dailyBaseLendingPoints} = record;
            const boost = vlEqbBoost + ePendleBoost + groupBoost + 1;
            const dailyTotalBasePoints = ensure(dailyBaseStakePoints) + ensure(dailyBaseHerculesPoints) + ensure(dailyBaseLendingPoints);
            const dailyStakePoints = boost * ensure(dailyBaseStakePoints);
            const dailyHerculesPoints = boost * ensure(dailyBaseHerculesPoints);
            const dailyLendingPoints = boost * ensure(dailyBaseLendingPoints);
            const dailyTotalPoints = dailyStakePoints + dailyHerculesPoints + dailyLendingPoints;
            const extendedRecord = {
                ...record,
                myBoost: boost,
                dailyTotalBasePoints,
                dailyStakePoints,
                dailyHerculesPoints,
                dailyLendingPoints,
                dailyTotalPoints,
                createdAt: artPoint.createdAt.toISOString(),
                referralId: userInviterMap[record.user] || '',
            };

            return headers.map(header => extendedRecord[header]).join(',');
        })).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis-holder-art-points-${dateStart}-${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    }).get(`${apiPathPrefix}/hercules-diff`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart || !dateEnd) return res.json({success: false, message: 'dateStart and dateEnd are required'});
        const startDate = new Date(dateStart as string);
        const endDate = new Date(dateEnd as string);

        const startArtPoints = await artPointsModel.findOne({
            createdAt: {
                $gte: startDate,
            }
        }).lean();
        const startHolderMap = Object.fromEntries(startArtPoints?.points.map(point => [point.user, point]) ?? []);
        const endArtPoints = await artPointsModel.findOne({
            createdAt: {
                $gte: endDate
            }
        }).lean();
        const headers = ['user', 'diff', 'start', 'end'] as const;
        const csv = endArtPoints?.points.map(record => {
            const {user, totalHerculesPoints: end} = record;
            const {totalHerculesPoints: start} = startHolderMap[user] ?? {};
            const diff = end - ensure(start);

            return [user, diff, start, end].join(',');
        }).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis-holder-hercules-points-${dateStart}-${dateEnd}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    }).post(`${apiPathPrefix}/upload`, multer().single('file'), async (req, res) => {
        const {file} = req as any;
        if (!file) return res.json({success: false, message: 'file is required'});

        const csv = file.buffer.toString('utf8');
        const csvRecords = tableToRecords(csv);
        const records = csvRecords.map(record => {
            const {
                user,
                artPoints,
                totalStakePoints,
                totalHerculesPoints,
                rank,
                vlEqbBoost,
                eqbToLock,
                ePendleBoost,
                ePendleToBuy,
                groupBoost,
                depositPoints,
                swapedArtMetis,
                dailyBaseStakePoints,
                dailyBaseHerculesPoints
            } = record;

            return {
                user,
                artPoints,
                totalStakePoints,
                totalHerculesPoints,
                rank,
                vlEqbBoost,
                eqbToLock,
                ePendleBoost,
                ePendleToBuy,
                groupBoost,
                depositPoints,
                swapedArtMetis,
                dailyBaseStakePoints,
                dailyBaseHerculesPoints
            };
        });

        await artPointsModel.create({points: records});
        res.json({success: true});
    }).get(`${apiPathPrefix}/export-daily`, async (req, res) => {
        const {address, limit = 30, offset = 0} = req.query;
        if (!address || typeof address !== 'string') return res.json({success: false, message: 'address is required'});

        const artPoints = await artPointsModel.find().sort({createdAt: -1}).skip(+offset).limit(+limit).lean();
        const userInviterMap = await getUserInviterMap();
        const headers = ['user', 'artPoints', 'totalStakePoints', 'totalHerculesPoints', 'totalLendingPoints', 'referralId', 'group', 'rank', 'myBoost', 'vlEqbBoost', 'eqbToLock', 'ePendleBoost', 'ePendleToBuy', 'groupBoost', 'dailyTotalBasePoints', 'dailyTotalPoints', 'dailyBaseStakePoints', 'dailyStakePoints', 'dailyBaseHerculesPoints', 'dailyHerculesPoints', 'dailyBaseLendingPoints', 'dailyLendingPoints', 'createdAt', 'depositPoints', 'swapedArtMetis', 'withdrawedArtMetis'] as const;
        const csv = artPoints?.flatMap(artPoint => {
            const record = artPoint.points.find(point => point.user.toLowerCase() === address.toLowerCase());
            if (!record) return [];

            const {vlEqbBoost, ePendleBoost, groupBoost, dailyBaseStakePoints = 0, dailyBaseHerculesPoints = 0, dailyBaseLendingPoints = 0} = record;
            const boost = vlEqbBoost + ePendleBoost + groupBoost + 1;
            const dailyTotalBasePoints = ensure(dailyBaseStakePoints) + ensure(dailyBaseHerculesPoints) + ensure(dailyBaseLendingPoints);
            const dailyStakePoints = boost * ensure(dailyBaseStakePoints);
            const dailyHerculesPoints = boost * ensure(dailyBaseHerculesPoints);
            const dailyLendingPoints = boost * ensure(dailyBaseLendingPoints);
            const dailyTotalPoints = dailyStakePoints + dailyHerculesPoints + dailyLendingPoints;
            const extendedRecord = {
                ...record,
                myBoost: boost,
                dailyTotalBasePoints,
                dailyStakePoints,
                dailyHerculesPoints,
                dailyLendingPoints,
                dailyTotalPoints,
                createdAt: artPoint.createdAt.toISOString(),
                referralId: userInviterMap[record.user] || '',
            };

            return headers.map(header => extendedRecord[header]).join(',');
        }).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis-${address}-${offset}-${+offset + +limit}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
