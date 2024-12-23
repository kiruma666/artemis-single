/*
 * @Author: xiaodongyu
 * @Date: 2022-10-26 13:35:13
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-06 18:11:54
 */

import {Contract} from 'ethers';

import abi from '@quoll/frontend/src/contract/abi/WombatBooster.json';
import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import {provider, maxBlockDiff, retryableQueryFilter, wrapContractMeta, getBlockRangeFilter, wrapCrawl} from '../../util';

import model from './model';

const {log} = console;

const wombatBoosterWomClaimedScript: Script = {
    meta: {
        name: 'wombatBoosterWomClaimed',
        address: AddressMap[56].wombatBooster,
        customId: 'wombatBoosterWomClaimed' + AddressMap[56].wombatBooster,
        creationBlock: 21347769,
        abi,
        description: 'quoll wombat booster WomClamied Event'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [latest] = await model.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'WomClaimed',
                        fromBlock,
                        toBlock
                    });
                    const docs = logs.map(({blockNumber, transactionHash, event, args}) => new model({
                        blockNumber,
                        transactionHash,
                        event,
                        pid: args?._pid.toNumber(),
                        amount: args?._amount.toString()
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await model.bulkSave(docs);
                    fromBlock = toBlock;
                }
            });
        });
    },

    async calculate(args: any) {
        const blockNumber = await provider.getBlockNumber();
        const blocksPerHour = 1200;
        const {hours = 24} = args;
        args = {
            blockStart: blockNumber - (+hours) * blocksPerHour,
            ...args
        };
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const pidSet = new Set();
        logs.forEach(log => {
            pidSet.add(log.pid);
        });

        return JSON.stringify(Array.from(pidSet));
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default wombatBoosterWomClaimedScript;
