/*
 * @Author: xiaodongyu
 * @Date: 2022-11-03 15:10:24
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-11-03 15:30:58
 */

import {BigNumber, Contract} from 'ethers';

import abi from '@quoll/frontend/src/contract/abi/BaseRewardPool.json';
import Address from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import {bnCompare, provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, wrapCrawl} from '../../util';

import qWomStakeModel from './model';

const {log} = console;

const qWomStakeScript: Script = {
    meta: {
        name: 'qWomStake',
        address: Address[56].qWOMReward,
        creationBlock: 21347780,
        abi,
        description: 'calculate how many wom stake by each user'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [latest] = await qWomStakeModel.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const [stakeLogs, withdrawnLogs] = await Promise.all(['Staked', 'Withdrawn'].map(eventName => retryableQueryFilter({
                        contract,
                        eventName,
                        fromBlock,
                        toBlock
                    })));
                    const docs = [...stakeLogs, ...withdrawnLogs].map(({blockNumber, transactionHash, args, event}) => new qWomStakeModel({
                        blockNumber,
                        transactionHash,
                        event,
                        user: args?._user,
                        amount: args?._amount.toString()
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await qWomStakeModel.bulkSave(docs);
                    fromBlock = toBlock + 1;
                }
            });
        });
    },

    async calculate(args: any) {
        const event = args.event ?? 'Staked';
        const logs = await qWomStakeModel.find({...getBlockRangeFilter(args), event}).lean();

        const depositorMap: Record<string, BigNumber> = {};
        logs.forEach(({user, amount}) => {
            if (!depositorMap[user]) {
                depositorMap[user] = BigNumber.from(amount);
            } else {
                depositorMap[user] = depositorMap[user].add(amount);
            }
        });
        const entries = Object.entries(depositorMap).sort(([, amount1], [, amount2]) => -bnCompare(amount1, amount2));
        const header = `user${columnSeparator}amount${lineBreak}`;
        const data = (await filterContract(entries)).map(([user, amount]) => [user, amount.toDecimal()].join(columnSeparator)).join(lineBreak);

        return header + data;
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default qWomStakeScript;
