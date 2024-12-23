/**
 * @Author: sheldon
 * @Date: 2023-10-29 00:05:05
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-08-03 14:51:52
 */

import {BigNumber, Contract} from 'ethers';

import {ethProvider, getBlockRangeFilter, maxBlockDiff, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import model from './reward-pool-model';

const {log} = console;
const abi = [
    'event Staked(address indexed _user, uint256 _amount)'
];

export const swETHRewardPoolScript1 = createRewardPool('0xFaE4d46eAd6486B37C53b4Ee896423456378cD75');
export const swETHRewardPoolScript2 = createRewardPool('0x2f3664c35a9731659bF568808352950Ea497606C');

async function crawlWithBlockRange(fromBlock: number, latestBlock: number) {
    const {name, address} = this.meta;
    const contract = new Contract(address, abi, ethProvider);
    while (fromBlock <= latestBlock) {
        const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
        const logs = await retryableQueryFilter({
            contract,
            eventName: 'Staked',
            fromBlock,
            toBlock
        });
        for (const {blockNumber, transactionHash, event, args} of logs) {
            const doc = new model({
                address,
                blockNumber,
                transactionHash,
                event,
                user: args?._user,
                amount: args?._amount.toString(),
            });
            await doc.save();
        }

        log(name, 'address', address, 'from', fromBlock, 'to', toBlock, 'got', logs.length);

        fromBlock = toBlock + 1;
    }
}

function createRewardPool(address: string): Script {
    return {
        meta: {
            name: 'EqbRewardPool',
            address,
            abi,
            creationBlock: 18452219, // block number at 2023-10-29 0:18:00
            description: 'Base reward pool for Eqb',
        },

        async fixData(params) {
            if (!params || !params.blockStart) {
                log('Invalid block range, skip fixData', {params});

                return;
            }

            const {blockStart, blockEnd} = params;
            await crawlWithBlockRange(blockStart, blockEnd || blockStart);
        },

        async crawl() {
            await wrapCrawl.call(this, async () => {
                const {creationBlock} = this.meta;
                const [latest] = await model.find({address}).sort({_id: -1}).limit(1).lean();
                await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                    fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                    await crawlWithBlockRange.call(this, fromBlock, latestBlock);
                }, ethProvider);
            });
        },

        async calculate(args) {
            const logs = await model.find({...getBlockRangeFilter(args), address}).lean();
            const threshold = BigNumber.fromDecimal('0.056');
            const depositorMap: Record<string, BigNumber> = {};
            logs.forEach(({user, amount}: any) => {
                if (!depositorMap[user]) {
                    depositorMap[user] = BigNumber.from(amount);
                } else {
                    depositorMap[user] = depositorMap[user].add(amount);
                }
            });

            const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(threshold) ? userAccount : []);

            log(`At least ${threshold.toDecimal()} $PENDLE-LPT staked at ${address} depositors count:`, validDepositors.length);

            return validDepositors;
        },

        async crawlAndCalculate() {
            await this.crawl();

            return this.calculate();
        }
    };
}
