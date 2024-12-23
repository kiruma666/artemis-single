/**
 * @Author: sheldon
 * @Date: 2024-02-23 23:28:33
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-10-12 09:46:28
 */

import {job} from 'cron';
import {BigNumber} from 'ethers';
import {Application} from 'express';
import multer from 'multer';

import {tableToRecords} from 'server/mongo/quoll/util';

import {EuclidAssetDepositorScript, getHolders, getUserInviterMap} from '../asset-depositor';
import groupRankingModel from '../asset-depositor/group-ranking/model';
import {decodeInviterCode} from '../asset-depositor/inviter-decode';
import withdrawalModel from '../asset-depositor/withdrawal/model';
import ePendleModel from '../e-pendle/model';
import vlEqbModel from '../vl-eqb/model';

import ePointsModel from './model';

function sumFromValues(values: any[]) {
    return values.reduce((acc: BigNumber, value: string | BigNumber) => {
        return acc.add(BigNumber.from(value));
    }, BigNumber.from(0));
}

function getUserWeigth(user = BigNumber.from(0), total = BigNumber.from(1)) {
    return +user.toDecimal() / +total.toDecimal();
}

function getUserGroup<T>(user: string, userInviterMap: Record<string, string>, groupRankingMap: Record<string, T>): T | undefined {
    let groupId = user;
    const inviterSet = new Set();
    while (userInviterMap[groupId]) {
        const inviterId = decodeInviterCode(userInviterMap[groupId]);
        if (!inviterId || inviterId === user || inviterSet.has(inviterId)) break;

        inviterSet.add(inviterId);
        groupId = inviterId;
    }

    return groupRankingMap[groupId];
}

export async function calculateEPoints() {
    const holders = (await getHolders()).map(holder => holder.toLowerCase());
    const userInviterMap = await getUserInviterMap();
    const depositorCSV = await EuclidAssetDepositorScript.calculate({});
    const depositorRecords = tableToRecords(depositorCSV);
    const tier0DepositorRecords = depositorRecords.filter(record => +record.invitationTier === 0);
    const elEthUserMap = tier0DepositorRecords.reduce((acc, record) => {
        const {user, elETHAmount} = record;
        if (!acc[user]) {
            acc[user] = BigNumber.from(0);
        }

        acc[user] = acc[user].add(BigNumber.from(elETHAmount));

        return acc;
    }, {} as Record<string, BigNumber>);
    const withdrawalRecords = await withdrawalModel.find().lean();
    const elEthWithdrawalMap = withdrawalRecords.reduce((acc, record) => {
        const {user, elETHUnstaked} = record;
        const lowerUser = user.toLowerCase();
        if (!acc[lowerUser]) {
            acc[lowerUser] = BigNumber.from(0);
        }

        acc[lowerUser] = acc[lowerUser].add(BigNumber.from(elETHUnstaked));

        return acc;
    }, {} as Record<string, BigNumber>);
    const elEthTotal = sumFromValues(Object.values(elEthUserMap)).sub(sumFromValues(Object.values(elEthWithdrawalMap)));
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

    const prevEPoints = await ePointsModel.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const prevEPointsMap = prevEPoints?.points.reduce((acc, point) => {
        acc[point.user] = point.ePoints;

        return acc;
    }, {} as Record<string, number>);
    const points = holders.map(holder => {
        const elEthWeight = getUserWeigth(elEthUserMap[holder]?.sub(elEthWithdrawalMap[holder] ?? 0), elEthTotal) || 1;
        const vlEqbBoost = Math.min(getUserWeigth(vlEqbUserMap[holder], vlEqbTotal) / elEthWeight, 1);
        const ePendleBoost = Math.min(getUserWeigth(ePendleUserMap[holder], ePendleTotal) / elEthWeight, 0.5);
        const userGroup = getUserGroup(holder, userInviterMap, groupRankingMap) as any;
        const groupBoost = userGroup?.currentBoost || 0;
        const stakedAmount = +sumFromValues(depositorRecords.filter(record => record.user === holder).map(record => record.elETHAmount)).toDecimal();
        const unStakedAmount = +(elEthWithdrawalMap[holder]?.toDecimal() ?? 0);
        const dailyBaseEPoints = Math.max(stakedAmount - unStakedAmount, 0);
        const boost = 1 + vlEqbBoost + ePendleBoost + groupBoost;
        const dailyEPoints = dailyBaseEPoints * boost;
        const ePoints = dailyEPoints + (prevEPointsMap?.[holder] || 0);

        return {
            user: holder,
            ePoints,
            group: userGroup?.group || '',
            rank: userGroup?.rank || '',
            vlEqbBoost,
            ePendleBoost,
            groupBoost,
            dailyBaseEPoints,
            stakedAmount,
            unStakedAmount
        };
    });

    console.log('calculateEPoints calculate done');

    await ePointsModel.create({points});
    console.log('calculateEPoints save done');
}

export function mountEuclidHolderEPoints(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '30 0 * * *',
            onTick: calculateEPoints,
            start: true
        });

        console.log('calculateEPoints started');
    }

    const apiPathPrefix = '/api/euclid-holder-e-points';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await calculateEPoints();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const ePoints = await ePointsModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const userInviterMap = await getUserInviterMap();
        const headers = ['user', 'ePoints', 'referralId', 'group', 'rank', 'myBoost', 'vlEqbBoost', 'ePendleBoost', 'groupBoost', 'dailyBaseEPoints', 'dailyEPoints', 'createdAt', 'stakedAmount', 'unStakedAmount'] as const;
        const csv = ePoints?.flatMap(ePoint => ePoint.points.map(record => headers.map(header => {
            const {vlEqbBoost, ePendleBoost, groupBoost, dailyBaseEPoints} = record;
            const boost = vlEqbBoost + ePendleBoost + groupBoost + 1;
            if (header === 'myBoost') return boost;

            if (header === 'dailyEPoints') return boost * dailyBaseEPoints;

            if (header === 'createdAt') return ePoint.createdAt.toISOString();

            if (header === 'referralId') return userInviterMap[record.user] || '';

            return record[header];
        }).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=euclid-holder-e-points-${dateStart}-${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    }).post(`${apiPathPrefix}/upload`, multer().single('file'), async (req, res) => {
        const {file} = req as any;
        if (!file) return res.json({success: false, message: 'file is required'});

        const csv = file.buffer.toString('utf8');
        const csvRecords = tableToRecords(csv);
        const records = csvRecords.map(record => {
            const {
                user,
                ePoints,
                rank,
                vlEqbBoost,
                ePendleBoost,
                groupBoost,
                dailyBaseEPoints
            } = record;

            return {
                user,
                ePoints,
                rank,
                vlEqbBoost,
                ePendleBoost,
                groupBoost,
                dailyBaseEPoints
            };
        });

        await ePointsModel.create({points: records});
        res.json({success: true});
    }).get(`${apiPathPrefix}/export-daily`, async (req, res) => {
        const {address, limit = 30, offset = 0} = req.query;
        if (!address || typeof address !== 'string') return res.json({success: false, message: 'address is required'});

        const ePoints = await ePointsModel.find().sort({createdAt: -1}).skip(+offset).limit(+limit).lean();
        const userInviterMap = await getUserInviterMap();
        const headers = ['user', 'ePoints', 'referralId', 'group', 'rank', 'myBoost', 'vlEqbBoost', 'ePendleBoost', 'groupBoost', 'dailyBaseEPoints', 'dailyEPoints', 'createdAt', 'stakedAmount', 'unStakedAmount'] as const;
        const csv = ePoints?.flatMap(ePoint => {
            const record = ePoint.points.find(point => point.user.toLowerCase() === address.toLowerCase());
            if (!record) return [];

            return headers.map(header => {
                const {vlEqbBoost, ePendleBoost, groupBoost, dailyBaseEPoints} = record;
                const boost = vlEqbBoost + ePendleBoost + groupBoost + 1;
                if (header === 'myBoost') return boost;

                if (header === 'dailyEPoints') return boost * dailyBaseEPoints;

                if (header === 'createdAt') return ePoint.createdAt.toISOString();

                if (header === 'referralId') return userInviterMap[record.user] || '';

                return record[header];
            }).join(',');
        }).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=euclid-${address}-${offset}-${+offset + +limit}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
