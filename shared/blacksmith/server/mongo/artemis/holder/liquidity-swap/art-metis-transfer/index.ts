/**
 * @Author: sheldon
 * @Date: 2024-03-26 23:28:34
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-08-03 15:49:20
 */

// import {job} from 'cron';
import {Contract} from 'ethers';

import {metisProvider, getBlockRangeFilter, retryableQueryFilter, wrapContractMeta, wrapCrawl, columnSeparator} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import model from './model';

const {log} = console;

const TokenAbi = [
    'event Transfer(address indexed from, address indexed to, uint256 value)'
];
const maxBlockDiff = 1e5;

export const ArtemisArtMetisTransferScript: Script = {
    meta: {
        name: 'ArtMetisTransfer',
        address: '0x2583A2538272f31e9A15dD12A432B8C96Ab4821d',
        abi: TokenAbi,
        creationBlock: 13735429, // block number of the transaction that created the contract
        description: 'ArtMetis Token Transfer',
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const [latest] = await model.find({address}).sort({_id: -1}).limit(1).lean();
            const contract = new Contract(address, abi, metisProvider);
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock <= latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'Transfer',
                        fromBlock,
                        toBlock
                    });
                    for (const {blockNumber, transactionHash, event, args} of logs) {
                        const doc = new model({
                            blockNumber,
                            transactionHash,
                            event,
                            from: args?.from.toLowerCase(),
                            to: args?.to.toLowerCase(),
                            value: args?.value.toString()
                        });
                        await doc.save();
                    }

                    log(name, 'from', fromBlock, 'to', toBlock, 'got', logs.length);

                    fromBlock = toBlock + 1;
                }
            }, metisProvider);
        });
    },

    async calculate(args) {
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const headers = ['from', 'to', 'value', 'transactionHash', 'blockNumber'] as const;

        return [headers.join(columnSeparator), ...logs.map(log => {
            return headers.map(header => log[header]).join(columnSeparator);
        })].join('\n');
    },

    async crawlAndCalculate(args) {
        await this.crawl();

        return this.calculate(args);
    }
};

// deprecated, use swap event -> swap event tranaction.from instead of swap event + transfer event
/*
if (process.env.STAGE === 'prod') {
    job({
        cronTime: '8 0 * * *',
        onTick: () => ArtemisArtMetisTransferScript.crawlAndCalculate({}),
        start: true
    });

    console.log('ArtemisArtMetisTransferScript job started');
}
*/
