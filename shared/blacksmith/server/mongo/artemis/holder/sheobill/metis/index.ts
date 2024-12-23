/**
 * @Author: sheldon
 * @Date: 2024-04-28 22:09:56
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-04-28 23:28:02
 */

import {job} from 'cron';
import {BigNumber, Contract} from 'ethers';
import {Application} from 'express';

import {metisBatchProvider} from 'server/mongo/quoll/util';

import {getHolders} from '../../asset-depositor';
import {sendErrorMessage} from '../../vl-eqb';
import {SheobillTokenAbi, SheobillTokenMultiplier} from '../art-metis';

import ShoebillMetisBalanceModel from './model';

const SheobillMetisAddress = '0x386adCa3c7D5C90523287933B05919aFcC2883dE';

let fetching = false;

async function fetchAndSaveHolderSheobillMetisBalance() {
    if (fetching) return;
    fetching = true;
    try {
        const holders = await getHolders();
        if (!holders.length) return [];

        const SheobillMetis = new Contract(SheobillMetisAddress, SheobillTokenAbi, metisBatchProvider);
        const balances = [];
        const batchSize = 100;
        let start = 0;
        const [
            totalSupply,
            totalCash
        ] = await Promise.all([
            SheobillMetis.totalSupply(),
            SheobillMetis.getCash()
        ]);
        const exchangeRate = (totalCash as BigNumber).mul(SheobillTokenMultiplier).div(totalSupply);
        while (start < holders.length) {
            const end = start + batchSize;
            const batchHolders = holders.slice(start, end);
            console.log('Artemis fetchAndSaveHolderSheobillMetisBalance', start, end, batchHolders.length);
            try {
                const holderInfos = await Promise.all(batchHolders.map(async holder => {
                    try {
                        const balance: BigNumber = await SheobillMetis.balanceOf(holder);

                        return {
                            holder,
                            balance: balance.toString(),
                            cash: balance.mul(exchangeRate).div(SheobillTokenMultiplier)
                        };
                    } catch (err) {
                        console.log(`Artemis fetchHolderSheobillMetisBalance ${holder} error`, err);

                        return {
                            holder,
                            balance: '0',
                            cash: 0
                        };
                    }
                }));

                balances.push(...holderInfos);
            } catch (error) {
                sendErrorMessage('Artemis fetchHolderSheobillMetisBalance error', error);
            }

            start = end;
        }

        console.log('Artemis fetchHolderSheobillMetisBalance done');
        try {
            await ShoebillMetisBalanceModel.create({
                balances,
                totalSupply: totalSupply.toString(),
                totalCash: totalCash.toString()
            });
            console.log('Artemis saveHolderSheobillMetisBalance done');
        } catch (error) {
            sendErrorMessage('Artemis saveHolderSheobillMetisBalance error', error);
        }
    } catch (error) {
        sendErrorMessage('Artemis fetchAndSaveHolderSheobillMetisBalance error', error);
    } finally {
        fetching = false;
    }
}

export function mountArtemisHolderSheobillMetisBalance(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '17 0 * * *',
            onTick: fetchAndSaveHolderSheobillMetisBalance,
            start: true
        });

        console.log('Artemis fetchAndSaveHolderSheobillMetisBalance started');
    }

    const apiPathPrefix = '/api/artemis-holder-sheobill-metis-balance';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await fetchAndSaveHolderSheobillMetisBalance();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const dailyBalances = await ShoebillMetisBalanceModel.find({
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
        res.setHeader('Content-Disposition', `attachment; filename=artemis_holder_sheobill_metis_balance_${dateStart}_${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
