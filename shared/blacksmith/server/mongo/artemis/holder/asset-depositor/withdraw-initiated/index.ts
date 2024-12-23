/**
 * @Author: sheldon
 * @Date: 2024-07-10 00:20:17
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-07-10 00:46:04
 */

import {job} from 'cron';
import {Contract} from 'ethers';

import {metisProvider, getBlockRangeFilter, retryableQueryFilter, wrapContractMeta, wrapCrawl, columnSeparator} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import model from './model';

const {log} = console;

const AMTWithdrawalManagerAbi = [
    'event WithdrawRequestInitiated(address indexed _user, uint256 _nonce, uint256 _artMetisAmount, uint256 _expectedAmount)'
];
const maxBlockDiff = 1e5;

export const ArtemisWithdrawInitiatedScript: Script = {
    meta: {
        name: 'ArtemisWithdrawInitiated',
        address: '0x13E029B6631c0540126c2cdf1675316C971bEB94',
        abi: AMTWithdrawalManagerAbi,
        creationBlock: 17512701, // block number of the transaction that created the contract
        description: 'Artemis Withdraw Request Initiated',
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
                        eventName: 'WithdrawRequestInitiated',
                        fromBlock,
                        toBlock
                    });
                    for (const {blockNumber, transactionHash, event, args} of logs) {
                        const doc = new model({
                            blockNumber,
                            transactionHash,
                            event,
                            user: args?._user.toLowerCase(),
                            nonce: args?._nonce.toString(),
                            artMetisAmount: args?._artMetisAmount.toString(),
                            expectedAmount: args?._expectedAmount.toString()
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
        const headers = ['user', 'nonce', 'artMetisAmount', 'expectedAmount', 'transactionHash', 'blockNumber'] as const;

        return [headers.join(columnSeparator), ...logs.map(log => {
            return headers.map(header => log[header]).join(columnSeparator);
        })].join('\n');
    },

    async crawlAndCalculate(args) {
        await this.crawl();

        return this.calculate(args);
    }
};

if (process.env.STAGE === 'prod') {
    job({
        cronTime: '5 0 * * *',
        onTick: () => ArtemisWithdrawInitiatedScript.crawlAndCalculate({}),
        start: true
    });

    console.log('Artemis WithdrawRequestInitiated started');
}

