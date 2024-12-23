/**
 * @Author: sheldon
 * @Date: 2024-06-22 17:26:35
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-22 17:51:34
 */

import {job} from 'cron';
import {Contract} from 'ethers';

import {ethProvider, getBlockRangeFilter, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import model from './model';

const {log} = console;
const maxBlockDiff = 1e4;

export const EuclidAssetWithdrawalScript: Script = {
    meta: {
        name: 'EuclidAssetWithdrawal',
        address: '0x9a6DcE8221bfbc0AA48405784Ec78a23A613d6b1',
        abi: [
            'event AssetWithdrawalQueued(address indexed withdrawer, address asset, uint256 elETHUnstaked)'
        ],
        creationBlock: 19931004, // block number of the transaction that created the contract
        description: 'Euclid Asset Withdrawal',
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const [latest] = await model.find({address}).sort({_id: -1}).limit(1).lean();
            const contract = new Contract(address, abi, ethProvider);
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock <= latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'AssetWithdrawalQueued',
                        fromBlock,
                        toBlock
                    });
                    for (const {blockNumber, transactionHash, event, args} of logs) {
                        const doc = new model({
                            blockNumber,
                            transactionHash,
                            event,
                            user: args?.withdrawer,
                            asset: args?.asset,
                            elETHUnstaked: args?.elETHUnstaked.toString()
                        });
                        await doc.save();
                    }

                    log(name, 'from', fromBlock, 'to', toBlock, 'got', logs.length);

                    fromBlock = toBlock + 1;
                }
            }, ethProvider);
        });
    },

    async calculate(args) {
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const headers = ['user', 'asset', 'elETHUnstaked', 'transactionHash', 'blockNumber'] as const;

        return [headers.join(','), ...logs.map(log => headers.map(header => log[header] ?? '').join(','))].join('\n');
    },

    async crawlAndCalculate(args) {
        await this.crawl();

        return this.calculate(args);
    }
};

if (process.env.STAGE === 'prod') {
    job({
        cronTime: '5 0 * * *',
        onTick: () => EuclidAssetWithdrawalScript.crawlAndCalculate({}),
        start: true
    });

    console.log('EuclidAssetWithdrawal AssetWithdrawalQueued started');
}

