/*
 * @Author: xiaodongyu
 * @Date: 2022-10-08 15:32:26
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-04-12 18:37:54
 */

import {BigNumber, Contract} from 'ethers';

import Address from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import {bnCompare, arbiProvider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, wrapCrawl, arbiBatchProvider} from '../../util';

import {ArbiCampaignRewardPoolV2Script} from './campaign-reward-pool-v2';
import {ArbiWomDepositorDepositedModel} from './model';

const {log} = console;

export const ArbiWomConvertScript: Script = {
    meta: {
        name: 'ArbiWomDepositor',
        address: Address[42161].womDepositor,
        creationBlock: 75473615,
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: '_user',
                        type: 'address'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: '_amount',
                        type: 'uint256'
                    }
                ],
                name: 'Deposited',
                type: 'event'
            }
        ],
        description: 'calculate how many wom converted by each user'
    },

    async crawl() {
        await ArbiCampaignRewardPoolV2Script.crawl();
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, arbiProvider);
            const [latest] = await ArbiWomDepositorDepositedModel.find({contract: {$in: ['', address]}}).sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'Deposited',
                        fromBlock,
                        toBlock
                    });
                    const docs = logs.map(({blockNumber, transactionHash, args}) => new ArbiWomDepositorDepositedModel({
                        blockNumber,
                        transactionHash,
                        user: args?._user,
                        amount: (args?._amount as BigNumber)._hex
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await ArbiWomDepositorDepositedModel.bulkSave(docs);
                    fromBlock = toBlock + 1;
                }
            }, arbiProvider);
        });
    },

    async calculate(args: any) {
        const logs = await ArbiWomDepositorDepositedModel.find(getBlockRangeFilter(args)).lean();

        const depositorMap: Record<string, BigNumber> = {};
        logs.forEach(({user, amount}) => {
            if (!depositorMap[user]) {
                depositorMap[user] = BigNumber.from(amount);
            } else {
                depositorMap[user] = depositorMap[user].add(amount);
            }
        });

        const minConvert = BigNumber.fromDecimal('500');
        const womConvertors = Object.entries(depositorMap).flatMap(([user, amount]) => {
            if (amount.gte(minConvert)) return user;

            return [];
        });

        log('wom convertors:', womConvertors.length);

        if (args.returnMap) return depositorMap;

        const entries = Object.entries(depositorMap).sort(([, amount1], [, amount2]) => -bnCompare(amount1, amount2));
        const header = `user${columnSeparator}amount${lineBreak}`;
        const data = (await filterContract(entries, 100, arbiBatchProvider)).map(([user, amount]) => [user, amount.toDecimal()].join(columnSeparator)).join(lineBreak);

        return header + data;
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};
