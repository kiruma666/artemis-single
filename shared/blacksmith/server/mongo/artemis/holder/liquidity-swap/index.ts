/**
 * @Author: sheldon
 * @Date: 2024-03-25 13:44:36
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-08-03 16:17:36
 */

import {job} from 'cron';
import {Contract} from 'ethers';

import {metisProvider, getBlockRangeFilter, retryableQueryFilter, wrapContractMeta, wrapCrawl, columnSeparator} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import model from './model';

const {log} = console;

const AlgebraPoolAbi = [
    'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 price, uint128 liquidity, int24 tick)'
];
const maxBlockDiff = 1e5;

export const ArtemisLiquiditySwapScript: Script = {
    meta: {
        name: 'ArtemisLiquiditySwap',
        address: '0xfd1F58C4c05d8Ed5040eE9bA7eDb5Cc5bf53930E',
        abi: AlgebraPoolAbi,
        creationBlock: 15566072, // block number of the transaction that created the contract
        description: 'Artemis Liquidty Swap',
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
                        eventName: 'Swap',
                        fromBlock,
                        toBlock
                    });
                    for (const {blockNumber, transactionHash, event, args} of logs) {
                        const transaction = await metisProvider.getTransaction(transactionHash);
                        const doc = new model({
                            blockNumber,
                            transactionHash,
                            transactionFrom: transaction.from.toLowerCase(),
                            event,
                            sender: args?.sender.toLowerCase(),
                            recipient: args?.recipient.toLowerCase(),
                            amount0: args?.amount0.toString(),
                            amount1: args?.amount1.toString(),
                            price: args?.price.toString(),
                            liquidity: args?.liquidity.toString(),
                            tick: args?.tick.toString()
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
        const headers = ['sender', 'recipient', 'amount0', 'amount1', 'liquidity', 'transactionHash', 'blockNumber'] as const;

        return [headers.join(columnSeparator), ...logs.map(log => {
            return headers.map(header => log[header]).join(columnSeparator);
        })].join('\n');
    },

    async crawlAndCalculate(args) {
        await this.crawl();

        return this.calculate(args);
    },

    async fixData() {
        const {name} = this.meta;
        const docs = await model.find({});
        let count = 0;
        for (const doc of docs) {
            const {transactionHash, transactionFrom} = doc;
            if (transactionHash && !transactionFrom) {
                const {from} = await metisProvider.getTransaction(transactionHash);
                doc.transactionFrom = from.toLowerCase();
                await doc.save();
                count++;
                log(name, 'fix', count, ':', transactionHash, 'from', from);
            }
        }

        return `fixed ${count}`;
    }
};

if (process.env.STAGE === 'prod') {
    job({
        cronTime: '5 0 * * *',
        onTick: () => ArtemisLiquiditySwapScript.crawlAndCalculate({}),
        start: true
    });

    console.log('ArtemisLiquiditySwap AssetDeposited started');
}

