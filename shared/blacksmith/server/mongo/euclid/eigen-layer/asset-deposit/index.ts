import {job} from 'cron';
import {Contract} from 'ethers';

import {ethProvider, getBlockRangeFilter, maxBlockDiff, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import Model from './model';

const {log} = console;

export const EigenLayerAssetDepositorScript: Script = {
    meta: {
        name: 'EigenLayerAssetDepositor',
        address: '0xacdafce8be2ccbbf2098650cde0b0e7bed60c039',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: '_asset',
                        type: 'address'
                    },
                    {
                        indexed: true,
                        internalType: 'address',
                        name: '_strategy',
                        type: 'address'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: '_amount',
                        type: 'uint256'
                    }
                ],
                name: 'AssetDeposited',
                type: 'event'
            }
        ],
        creationBlock: 19146987, // block number of the transaction that created the contract
        description: 'EigenLayer AssetDepositor Event',
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
                        eventName: 'AssetDeposited',
                        fromBlock,
                        toBlock
                    });

                    for (const {blockNumber, transactionHash, event, args, getBlock} of logs) {
                        const {timestamp: blockTimestamp} = await getBlock();

                        const doc = new Model({
                            blockNumber,
                            transactionHash,
                            event,
                            asset: args?._asset,
                            strategy: args?._strategy,
                            amount: args?._amount.toString(),
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

        const headers = ['Block', 'TxHash', 'Event', 'Asset', 'Strategy', 'Amount', 'Timestamp'];
        const rows = logs
            .reverse()
            .map(({blockNumber, transactionHash, event, asset, strategy, amount, blockTimestamp}) =>
                [blockNumber, transactionHash, event, asset, strategy, amount, new Date(blockTimestamp * 1e3).toISOString()].join(','));

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
        onTick: () => EigenLayerAssetDepositorScript.crawlAndCalculate({}),
        start: true
    });

    console.log('EigenLayer AssetDepositor started');
}
