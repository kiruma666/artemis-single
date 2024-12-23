/**
 * @Author: sheldon
 * @Date: 2024-05-05 22:10:28
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-09 23:11:53
 */

import MainnetOutput from '@euclid/contracts/deployment/mainnetOutput.json';
import {job} from 'cron';
import {Contract} from 'ethers';

import {columnSeparator, ethProvider, getBlockRangeFilter, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import model from './model';

const maxBlockDiff = 1e4;
const {log} = console;

const abi = [
    'event AssetDeposited(address indexed _user, address indexed _asset, uint256 _amount, string _referralId)'
];

export const EuclidOperatorDepositScript: Script = {
    meta: {
        name: 'EuclidOperatorDeposit',
        address: MainnetOutput.operatorDepositPool.address,
        abi,
        creationBlock: 19830524, // block number of the transaction that created the contract
        description: 'Euclid Operator Deposit Event',
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
                        eventName: 'AssetDeposited',
                        fromBlock,
                        toBlock
                    });
                    for (const {blockNumber, transactionHash, event, args} of logs) {
                        const doc = new model({
                            blockNumber,
                            transactionHash,
                            event,
                            user: args?._user?.toLowerCase(),
                            asset: args?._asset?.toLowerCase(),
                            amount: args?._amount.toString(),
                            referralId: args?._referralId ?? ''
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
        const headers = ['user', 'asset', 'amount', 'referralId', 'transactionHash', 'blockNumber'] as const;

        return [headers.join(columnSeparator), ...logs.map(log => headers.map(header => log[header]).join(columnSeparator))].join('\n');
    },

    async crawlAndCalculate(args) {
        await this.crawl();

        return this.calculate(args);
    }
};

if (process.env.STAGE === 'prod') {
    job({
        cronTime: '0 0 * * *',
        onTick: () => EuclidOperatorDepositScript.crawlAndCalculate({}),
        start: true
    });

    console.log('EuclidOperatorDeposit AssetDeposited started');
}
