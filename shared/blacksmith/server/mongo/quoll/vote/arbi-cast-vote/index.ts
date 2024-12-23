/*
 * @Author: kaiwang 
 * @Date: 2023-02-13 14:33:16 
 * @Last Modified by: kaiwang
 * @Last Modified time: 2023-04-12 11:25:24
 */

import {Contract, Event} from 'ethers';

import Script from 'server/mongo/script';

import {getBlockRangeFilter, maxBlockDiff, arbiProvider, retryableQueryFilter, wrapContractMeta, wrapCrawl} from '../../util';

import abi from './abi.json';
import model from './model';

const {log} = console;

const ADDRESS = '0x277Cd4b508aFbb75d182870409bBf610AFab5c7b';

const arbiBribeManagerCastVoteScript: Script = {
    meta: {
        name: 'arbiBribeManagerCastVote',
        address: ADDRESS,
        customId: 'arbiBribeManagerCastVote' + ADDRESS,
        creationBlock: 79352054,
        abi,
        description: 'arbi bribe manager cast vote event'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, arbiProvider);
            const [latest] = await model.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    const logs: Event[] = await retryableQueryFilter({
                        contract,
                        eventName: 'Voted',
                        fromBlock,
                        toBlock
                    });

                    const docs = logs.map(({blockNumber, transactionHash, event, logIndex}, index) => new model({
                        blockNumber,
                        transactionHash,
                        logIndex: logIndex ?? index,
                        event
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await model.bulkSave(docs);
                    fromBlock = toBlock + 1;
                }
            }, arbiProvider);
        });
    },

    async calculate(args: any) {
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const lastestTriggerBlockNum = Math.max(...logs.map(({blockNumber}) => blockNumber));
        log('lastestTriggerBlockNum', lastestTriggerBlockNum);

        return lastestTriggerBlockNum?.toString();
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default arbiBribeManagerCastVoteScript;
