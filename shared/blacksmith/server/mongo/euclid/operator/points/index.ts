/**
 * @Author: sheldon
 * @Date: 2024-05-05 22:33:49
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-09 23:16:26
 */

import {job} from 'cron';
import {BigNumber} from 'ethers';
import {Application} from 'express';
import fetch from 'isomorphic-fetch';
import multer from 'multer';

import {tableToRecords} from 'server/mongo/quoll/util';

import {EuclidOperatorDepositScript} from '../deposit';

import model from './model';

export async function calculateOperatorPoints() {
    const operatorDepositEventCSV = await EuclidOperatorDepositScript.calculate({});
    const operatorDepositEvents = tableToRecords(operatorDepositEventCSV);
    const operatorDepositEventMap: Record<string, any[]> = operatorDepositEvents.reduce((map, event) => {
        const {user} = event;
        map[user] = map[user] || [];
        map[user].push(event);

        return map;
    }, {} as any);
    const prevOperatorPoints = await model.findOne({}, {}, {
        sort: {
            createdAt: 'desc'
        }
    }).lean();
    const prevOperatorPointsMap = prevOperatorPoints?.points.reduce((acc, point) => {
        acc[point.user] = point.ePoints;

        return acc;
    }, {} as Record<string, number>);
    let assetPriceMap = Object.fromEntries(prevOperatorPoints?.prices.map(assetEthPrice => [assetEthPrice.asset, assetEthPrice.price]) ?? []);
    try {
        const chainInfoMap = await (await fetch('https://euclidfinance.io/api/chain-info')).json();
        assetPriceMap = Object.fromEntries(Object.entries(chainInfoMap['1'].assetMap).map(([asset, info]) => [asset.toLowerCase(), (info as any)?.price || 1]));
    } catch (err) {
        console.log('calculateOperatorPoints fetch assetPriceMap failed', err);
    }

    const pointsWithoutShare = Object.entries(operatorDepositEventMap).map(([holder, events]) => {
        const dailyPoints = events.reduce((sum, {asset, amount}) => {
            const amountNum = +BigNumber.from(amount).toDecimal();
            sum += amountNum * (assetPriceMap[asset] ?? 1);

            return sum;
        }, 0);
        const ePoints = dailyPoints + (prevOperatorPointsMap?.[holder] || 0);

        return {
            user: holder,
            ePoints,
            dailyPoints
        };
    });

    const totalPoints = pointsWithoutShare.reduce((sum, holderPoints) => {
        sum += holderPoints.ePoints;

        return sum;
    }, 0);

    const points = pointsWithoutShare.map(holderPoints => ({
        ...holderPoints,
        myShare: holderPoints.ePoints / totalPoints
    }));

    console.log('calculateOperatorPoints calculate done');

    await model.create({
        points,
        prices: Object.entries(assetPriceMap).map(([asset, price]) => ({asset, price}))
    });
    console.log('calculateOperatorPoints save done');
}

export function mountEuclidOperatorPoints(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '30 0 * * *',
            onTick: calculateOperatorPoints,
            start: true
        });

        console.log('calculateOperatorPoints started');
    }

    const apiPathPrefix = '/api/euclid-operator-points';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await calculateOperatorPoints();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const ePoints = await model.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const headers = ['address', 'ePoints', 'myShare', 'dailyPoints', 'createdAt'] as const;
        const csv = ePoints?.flatMap(ePoint => ePoint.points.map(record => headers.map(header => {
            if (header === 'address') return record.user;

            if (header === 'createdAt') return ePoint.createdAt.toISOString();

            return record[header];
        }).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=euclid-operator-points-${dateStart}-${endDate.toISOString().split('T')[0]}.csv`);
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
                myShare,
                dailyPoints
            } = record;

            return {
                user,
                ePoints,
                myShare,
                dailyPoints
            };
        });

        const prevOperatorPoints = await model.findOne({}, {}, {
            sort: {
                createdAt: 'desc'
            }
        }).lean();
        await model.create({points: records, prices: prevOperatorPoints?.prices});
        res.json({success: true});
    }).get(`${apiPathPrefix}/export-daily`, async (req, res) => {
        const {address, limit = 30, offset = 0} = req.query;
        if (!address || typeof address !== 'string') return res.json({success: false, message: 'address is required'});

        const ePoints = await model.find().sort({createdAt: -1}).skip(+offset).limit(+limit).lean();
        const headers = ['address', 'ePoints', 'myShare', 'dailyPoints', 'createdAt'] as const;
        const csv = ePoints?.flatMap(ePoint => {
            const record = ePoint.points.find(point => point.user.toLowerCase() === address.toLowerCase());
            if (!record) return [];

            return headers.map(header => {
                if (header === 'address') return record.user;

                if (header === 'createdAt') return ePoint.createdAt.toISOString();

                return record[header];
            }).join(',');
        }).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=euclid-operator-${address}-${offset}-${+offset + +limit}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
