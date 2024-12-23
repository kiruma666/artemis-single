/**
 * @Author: sheldon
 * @Date: 2024-02-07 00:25:32
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-10-11 15:25:12
 */

import {job} from 'cron';
import {Contract} from 'ethers';
import {Application} from 'express';

import {ChainBatchProviderMap, getAllEqbAddressByContractKey} from 'server/eqb-helper';

import {getHolders} from '../asset-depositor';
import {sendErrorMessage} from '../vl-eqb';

import ePendleBalanceModel from './model';

const balanceAbi = [
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

let fetching = false;

async function fetchAndSaveHolderEPendleBalance() {
    if (fetching) return;
    fetching = true;
    try {
        const holders = await getHolders();
        if (!holders) return [];

        const ePendleAddressMap = getAllEqbAddressByContractKey('ePendle');
        const ePendleRewardAddressMap = getAllEqbAddressByContractKey('ePendleReward');
        const ePendleBridgeRewardAddressMap = getAllEqbAddressByContractKey('ePendleBridgeReward');
        const ePendleCompounderAddressMap = getAllEqbAddressByContractKey('vaultEPendle');
        const initialChainHolderMap = {
            eth: {} as any,
            arb: {} as any,
            op: {} as any,
            bnb: {} as any
        };
        const addressMapChainHolderEntries = [
            [ePendleAddressMap, JSON.parse(JSON.stringify(initialChainHolderMap)), 'ePendle'],
            [ePendleRewardAddressMap, JSON.parse(JSON.stringify(initialChainHolderMap)), 'ePendleReward'],
            [ePendleBridgeRewardAddressMap, JSON.parse(JSON.stringify(initialChainHolderMap)), 'ePendleBridgeReward'],
            [ePendleCompounderAddressMap, JSON.parse(JSON.stringify(initialChainHolderMap)), 'ePendleCompounder']
        ] as const;

        const batchSize = 100;
        let start = 0;
        while (start < holders.length) {
            const end = start + batchSize;
            const batchHolders = holders.slice(start, end);
            console.log(`Artemis fetchHolderEPendleBalance ${start}-${end}`);
            for (const [addressMap, chainHolderMap, key] of addressMapChainHolderEntries) {
                await Promise.all(Object.entries(addressMap).map(async ([chain, address]) => {
                    try {
                        const contract = new Contract(address, balanceAbi, (ChainBatchProviderMap as any)[chain]);
                        const holderEntries = await Promise.all(batchHolders.map(async holder => {
                            try {
                                const balance = await contract.balanceOf(holder);

                                return [holder, balance.toString()];
                            } catch (err) {
                                console.log(`Artemis fetchHolderEPendleBalance ${holder} ${chain} error`, err);

                                return [holder, '0'];
                            }
                        }));

                        Object.assign((chainHolderMap as any)[chain], Object.fromEntries(holderEntries));
                    } catch (error) {
                        sendErrorMessage(`Artemis fetchHolderEPendleBalance ${chain} ${key} error`, error);
                    }
                }));
            }

            start = end;
        }

        const keyedChainHolderMap = Object.fromEntries(addressMapChainHolderEntries.map(([, chainHolderMap, key]) => [key, chainHolderMap]));

        console.log('Artemis fetchHolderEPendleBalance done');
        const records = holders.map(holder => ({
            holder,
            eth: keyedChainHolderMap.ePendle.eth[holder] || '0',
            ethStaked: keyedChainHolderMap.ePendleReward.eth[holder] || '0',
            ethCompounderStaked: keyedChainHolderMap.ePendleCompounder.eth[holder] || '0',
            arb: keyedChainHolderMap.ePendle.arb[holder] || '0',
            arbStaked: keyedChainHolderMap.ePendleReward.arb[holder] || '0',
            // TODO remove arbBridgeStaked, which is ePENDLE v1
            arbBridgeStaked: keyedChainHolderMap.ePendleBridgeReward.arb[holder] || '0',
            arbCompounderStaked: keyedChainHolderMap.ePendleCompounder.arb[holder] || '0',
            op: keyedChainHolderMap.ePendle.op[holder] || '0',
            opStaked: keyedChainHolderMap.ePendleReward.op[holder] || '0',
            bnb: keyedChainHolderMap.ePendle.bnb[holder] || '0',
            bnbStaked: keyedChainHolderMap.ePendleReward.bnb[holder] || '0'
        }));

        try {
            await ePendleBalanceModel.create({balances: records});
            console.log('Artemis saveHolderEPendleBalance done');
        } catch (error) {
            sendErrorMessage('Artemis saveHolderEPendleBalance error', error);
        }
    } catch (error) {
        sendErrorMessage('Artemis fetchAndSaveHolderEPendleBalance error', error);
    } finally {
        fetching = false;
    }
}

export function mountArtemisHolderEPendleBalance(app: Application) {
    if (process.env.STAGE === 'prod') {
        job({
            cronTime: '10 0 * * *',
            onTick: fetchAndSaveHolderEPendleBalance,
            start: true
        });

        console.log('Artemis fetchAndSaveHolderEPendleBalance started');
    }

    const apiPathPrefix = '/api/artemis-holder-e-pendle-balance';
    app.get(`${apiPathPrefix}/trigger`, async (req, res) => {
        await fetchAndSaveHolderEPendleBalance();
        res.json({success: true});
    }).get(`${apiPathPrefix}/download`, async (req, res) => {
        const {dateStart, dateEnd} = req.query;
        if (!dateStart) return res.json({success: false, message: 'dateStart is required, dateEnd is exclusive and default dateStart+1'});
        const startDate = new Date(dateStart as string);
        const endDate = dateEnd ? new Date(dateEnd as string) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const dailyBalances = await ePendleBalanceModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).lean();
        const headers = ['holder', 'eth', 'ethStaked', 'ethCompounderStaked', 'arb', 'arbStaked', 'arbBridge', 'arbBridgeStaked', 'op', 'opStaked', 'bnb', 'bnbStaked', 'createdDate', 'createdAt'] as const;
        const csv = dailyBalances.flatMap(dailyBalance => dailyBalance.balances.map(record => headers.map(header => {
            if (header === 'createdDate') return dailyBalance.createdAt.toISOString().split('T')[0];

            if (header === 'createdAt') return dailyBalance[header].toISOString();

            return record[header];
        }).join(','))).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=artemis-holder-e-pendle-balance-${dateStart}-${endDate.toISOString().split('T')[0]}.csv`);
        res.send(headers.join(',') + '\n' + csv);
    });
}
