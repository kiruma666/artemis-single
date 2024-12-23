/*
 * @Author: kaiwang 
 * @Date: 2023-02-13 14:33:16 
 * @Last Modified by: kaiwang
 * @Last Modified time: 2023-02-13 15:33:50
 */

import {Contract, Event} from 'ethers';

import Script from 'server/mongo/script';

import {getBlockRangeFilter, maxBlockDiff, provider, retryableQueryFilter, wrapContractMeta, wrapCrawl} from '../../util';

import abi from './abi.json';
import model from './model';

const {log} = console;

const ADDRESS = '0xe96c48C5FddC0DC1Df5Cf21d68A3D8b3aba68046';

const bribeManagerCastVoteScript: Script = {
    meta: {
        name: 'bribeManagerCastVote',
        address: ADDRESS,
        customId: 'bribeManagerCastVote' + ADDRESS,
        creationBlock: 25147769,
        abi,
        description: 'bribe manager cast vote event'
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
            });
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

export default bribeManagerCastVoteScript;
