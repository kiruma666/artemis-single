/**
 * @Author: sheldon
 * @Date: 2024-02-07 00:25:32
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-26 22:01:36
 */

import {job} from 'cron';
import {Contract} from 'ethers';
import {Application} from 'express';

import {sendMessage} from '@shared/fe/server/util/tele-bot';

import {ChainBatchProviderMap, getAllEqbAddressByContractKey} from 'server/eqb-helper';

import {getHolders} from '../asset-depositor';

import vlEqbBalanceModel from './model';

const vlEqbAbi = [
    {
        inputs: [
            {
                internalType: 'address',
                name: '_user',
                type: 'address'
            }
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    }
];

export function sendErrorMessage(bizTag: string, error?: any) {
    console.log(bizTag, error);
    sendMessage([
        'BlackSmith',
        bizTag,
        error?.code,
        error?.message
    ].filter(Boolean).join(' '), {channel: 'dev'});
}

let fetching = false;

async function fetchAndSaveHolderVlEqbBalance() {
    if (fetching) return;
    fetching = true;
    try {
        const holders = await getHolders();
        if (!holders.length) return [];

        const vlEqbAddressMap = getAllEqbAddressByContractKey('vlEqb');
        const chainHolderMap = {
            eth: {} as any,
            arb: {} as any,
            op: {} as any,
            bnb: {} as any
        };

        const batchSize = 100;
        let start = 0;
        while (start < holders.length) {
            const end = start + batchSize;
            const batchHolders = holders.slice(start, end);
            console.log('Artemis fetchAndSaveHolderVlEqbBalance', start, end, batchHolders.length);
            await Promise.all(Object.entries(vlEqbAddressMap).map(async ([chain, address]) => {
                try {
                    const vlEqbContract = new Contract(address, vlEqbAbi, (ChainBatchProviderMap as any)[chain]);
                    const holderEntries = await Promise.all(batchHolders.map(async holder => {
                        try {
                            const balance = await vlEqbContract.balanceOf(holder);

                            return [holder, balance.toString()];
                        } catch (err) {
                            console.log(`Artemis fetchHolderVlEqbBalance ${holder} ${chain} error`, err);

                            return [holder, '0'];
                        }
                    }));

                    Object.assign((chainHolderMap as any)[chain], Object.fromEntries(holderEntries));
                } catch (error) {
                    sendErrorMessage(`Artemis fetchHolderVlEqbBalance ${chain} error`, error);
                }
            }));

            start = end;
        }

        console.log('Artemis fetchHolderVlEqbBalance done');
        const records = holders.map(holder => ({
            holder,
            eth: chainHolderMap.eth[holder] || '0',
            arb: chainHolderMap.arb[holder] || '0',
            op: chainHolderMap.op[holder] || '0',
            bnb: chainHolderMap.bnb[holder] || '0'
        }));

        try {
            await vlEqbBalanceModel.create({balances: records});
            console.log('Artemis saveHolderVlEqbBalance done');
        } catch (error) {
            sendErrorMessage('Artemis saveHolderVlEqbBalance error', error);
        }
    } catch (error) {
        sendErrorMessage('Artemis fetchAndSaveHolderVlEqbBalance error', error);
    } finally {
        fetching = false;
    }
}

export function mountArtemisHolderVlEqbBalance(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '20 0 * * *',
            onTick: fetchAndSaveHolderVlEqbBalance,
            start: true
        });

        console.log('Artemis fetchAndSaveHolderVlEqbBalance started');
    }

    const apiPathPrefix = '/api/artemis-holder-vl-eqb-balance';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await fetchAndSaveHolderVlEqbBalance();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const dailyBalances = await vlEqbBalanceModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const headers = ['holder', 'eth', 'arb', 'op', 'bnb', 'createdDate', 'createdAt'] as const;
        const csv = dailyBalances.flatMap(dailyBalance => dailyBalance.balances.map(record => headers.map(header => {
            if (header === 'createdDate') return dailyBalance.createdAt.toISOString().split('T')[0];

            if (header === 'createdAt') return dailyBalance[header].toISOString();

            return record[header];
        }).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis_holder_vl_eqb_balance_${dateStart}_${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
