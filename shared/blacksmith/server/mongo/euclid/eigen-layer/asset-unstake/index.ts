import {job} from 'cron';
import {Contract} from 'ethers';

import {ethProvider, getBlockRangeFilter, maxBlockDiff, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import Model from './model';

const {log} = console;

export const EigenLayerLRTUnstakingVaultScript: Script = {
    meta: {
        name: 'LRTUnstakingVault',
        address: '0x22e85c2d22f580bfbd1ee94c3bd3d5f4584145d5',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: false,
                        internalType: 'address',
                        name: 'asset',
                        type: 'address'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: 'amount',
                        type: 'uint256'
                    }
                ],
                name: 'SharesUnstakingAdded',
                type: 'event'
            }
        ],
        creationBlock: 19930982, // block number of the transaction that created the contract
        description: 'EigenLayer LRTUnstakingVault Event',
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {name, address, abi, creationBlock} = this.meta;
            const [latest] = await Model.find({address}).sort({_id: -1}).limit(1).lean();

            const contract = new Contract(address, abi, ethProvider);
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock <= latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'SharesUnstakingAdded',
                        fromBlock,
                        toBlock
                    });

                    for (const {blockNumber, transactionHash, event, args, getBlock} of logs) {
                        const {timestamp: blockTimestamp} = await getBlock();

                        const doc = new Model({
                            blockNumber,
                            transactionHash,
                            event,
                            asset: args?.asset,
                            amount: args?.amount.toString(),
                            blockTimestamp
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
        const logs = await Model.find(getBlockRangeFilter(args)).lean();

        const headers = ['Block', 'TxHash', 'Event', 'Asset', 'Amount', 'Timestamp'];
        const rows = logs
            .reverse()
            .map(({blockNumber, transactionHash, event, asset, amount, blockTimestamp}) =>
                [blockNumber, transactionHash, event, asset, amount, new Date(blockTimestamp * 1e3).toISOString()].join(','));

        return [headers, ...rows].join('\n');
    },

    async crawlAndCalculate(args) {
        await this.crawl();

        return this.calculate(args);
    }
};

if (['prod', 'test'].includes(process.env.STAGE ?? '')) {
    job({
        cronTime: '0 0 * * *',
        onTick: () => EigenLayerLRTUnstakingVaultScript.crawlAndCalculate({}),
        start: true
    });

    console.log('EigenLayer LRTUnstakingVault started');
}
