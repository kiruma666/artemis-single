/**
 * @Author: sheldon
 * @Date: 2024-02-22 23:06:02
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-04-04 15:02:28
 */
import {job} from 'cron';
import {BigNumber} from 'ethers';
import {Application} from 'express';

import {tableToRecords} from 'server/mongo/quoll/util';

import {EuclidAssetDepositorScript, getUserInviterMap} from '..';

import groupRankingModel from './model';

const CurrentBoostArr = [0.5, 0.2, 0.1, 0.05, 0.05, 0.05];

export async function calculateGroupRanking() {
    const userInviterMap = await getUserInviterMap();
    const depositorCSV = await EuclidAssetDepositorScript.calculate({});
    const depositorRecords = tableToRecords(depositorCSV);

    // only root user (who has no referral) can be the group
    const groupIdList = Array.from(new Set(depositorRecords.map(record => record.user).filter(user => !userInviterMap[user])));
    const groups: any[] = groupIdList.map(groupId => {
        const totalETH = depositorRecords.filter(record => record.user === groupId).reduce((acc, record) => {
            return acc.add(BigNumber.from(record.amount));
        }, BigNumber.from(0)).toString();

        return {
            group: groupId,
            totalETH: totalETH.toString()
        };
    });
    groups.sort((a, b) => BigNumber.from(b.totalETH).gte(BigNumber.from(a.totalETH)) ? 1 : -1);
    groups.forEach((group, index) => {
        group.rank = index + 1;
        group.currentBoost = CurrentBoostArr[index] || 0;
    });
    console.log('calculateGroupRanking calculate done');

    await groupRankingModel.create({groups});
    console.log('calculateGroupRanking save done');
}

export function mountEuclidHolderGroupRanking(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '5 0 * * 0',
            onTick: calculateGroupRanking,
            start: true
        });

        console.log('calculateGroupRanking started');
    }

    const apiPathPrefix = '/api/euclid-holder-group-ranking';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await calculateGroupRanking();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const groupRanking = await groupRankingModel.findOne({}, {}, {
            sort: {
                createdAt: 'desc'
            }
        }).lean();
        const headers = ['rank', 'group', 'totalETH', 'currentBoost', 'createdAt'] as const;
        const csv = groupRanking?.groups.map(record => headers.map(header => {
            if (header === 'createdAt') return groupRanking.createdAt.toISOString();

            return record[header];
        }).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=euclid-holder-group-ranking-${groupRanking?.createdAt.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
