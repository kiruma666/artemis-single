/**
 * @Author: sheldon
 * @Date: 2024-04-28 22:09:56
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-04-28 23:24:27
 */

import {job} from 'cron';
import {BigNumber, Contract} from 'ethers';
import {Application} from 'express';

import {getMultiplier} from '@shared/fe/util/number-extension';

import {metisBatchProvider} from 'server/mongo/quoll/util';

import {getHolders} from '../../asset-depositor';
import {sendErrorMessage} from '../../vl-eqb';

import ShoebillArtMetisBalanceModel from './model';

export const SheobillTokenAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function getCash() view returns (uint256)'
];
export const SheobillTokenMultiplier = getMultiplier(8);
const SheobillArtMetisAddress = '0x2B6647f63f6Fab5c73e96FBf974f4ed2AB8a4308';

let fetching = false;

async function fetchAndSaveHolderSheobillArtMetisBalance() {
    if (fetching) return;
    fetching = true;
    try {
        const holders = await getHolders();
        if (!holders.length) return [];

        const SheobillArtMetis = new Contract(SheobillArtMetisAddress, SheobillTokenAbi, metisBatchProvider);
        const balances = [];
        const batchSize = 100;
        let start = 0;
        const [
            totalSupply,
            totalCash
        ] = await Promise.all([
            SheobillArtMetis.totalSupply(),
            SheobillArtMetis.getCash()
        ]);
        const exchangeRate = (totalCash as BigNumber).mul(SheobillTokenMultiplier).div(totalSupply);
        while (start < holders.length) {
            const end = start + batchSize;
            const batchHolders = holders.slice(start, end);
            console.log('Artemis fetchAndSaveHolderSheobillArtMetisBalance', start, end, batchHolders.length);
            try {
                const holderInfos = await Promise.all(batchHolders.map(async holder => {
                    try {
                        const balance: BigNumber = await SheobillArtMetis.balanceOf(holder);

                        return {
                            holder,
                            balance: balance.toString(),
                            cash: balance.mul(exchangeRate).div(SheobillTokenMultiplier)
                        };
                    } catch (err) {
                        console.log(`Artemis fetchHolderSheobillArtMetisBalance ${holder} error`, err);

                        return {
                            holder,
                            balance: '0',
                            cash: 0
                        };
                    }
                }));

                balances.push(...holderInfos);
            } catch (error) {
                sendErrorMessage('Artemis fetchHolderSheobillArtMetisBalance error', error);
            }

            start = end;
        }

        console.log('Artemis fetchHolderSheobillArtMetisBalance done');
        try {
            await ShoebillArtMetisBalanceModel.create({
                balances,
                totalSupply: totalSupply.toString(),
                totalCash: totalCash.toString()
            });
            console.log('Artemis saveHolderSheobillArtMetisBalance done');
        } catch (error) {
            sendErrorMessage('Artemis saveHolderSheobillArtMetisBalance error', error);
        }
    } catch (error) {
        sendErrorMessage('Artemis fetchAndSaveHolderSheobillArtMetisBalance error', error);
    } finally {
        fetching = false;
    }
}

export function mountArtemisHolderSheobillArtMetisBalance(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '12 0 * * *',
            onTick: fetchAndSaveHolderSheobillArtMetisBalance,
            start: true
        });

        console.log('Artemis fetchAndSaveHolderSheobillArtMetisBalance started');
    }

    const apiPathPrefix = '/api/artemis-holder-sheobill-art-metis-balance';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await fetchAndSaveHolderSheobillArtMetisBalance();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const dailyBalances = await ShoebillArtMetisBalanceModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const headers = ['holder', 'balance', 'cash', 'createdDate', 'createdAt'] as const;
        const csv = dailyBalances.flatMap(dailyBalance => dailyBalance.balances.map(record => headers.map(header => {
            if (header === 'createdDate') return dailyBalance.createdAt.toISOString().split('T')[0];

            if (header === 'createdAt') return dailyBalance[header].toISOString();

            return record[header];
        }).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis_holder_sheobill_art_metis_balance_${dateStart}_${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
