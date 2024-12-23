/*
 * @Author: xiaodongyu
 * @Date: 2022-10-08 15:32:26
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-01-31 11:04:45
 */

import {BigNumber, Contract} from 'ethers';

import Address from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import {bnCompare, provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, wrapCrawl} from '../util';

import qWomDepositedModel from './deposited-model';

const {log} = console;

const qWomConvertScript: Script = {
    meta: {
        name: 'qWomConverter',
        address: Address[56].womDepositor,
        creationBlock: 21113852,
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
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [latest] = await qWomDepositedModel.find().sort({_id: -1}).limit(1).lean();
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
                    const docs = logs.map(({blockNumber, transactionHash, args}) => new qWomDepositedModel({
                        blockNumber,
                        transactionHash,
                        user: args?._user,
                        amount: args?._amount.toString()
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await qWomDepositedModel.bulkSave(docs);
                    fromBlock = toBlock + 1;
                }
            });
        });
    },

    async calculate(args: any) {
        const logs = await qWomDepositedModel.find(getBlockRangeFilter(args)).lean();

        const depositorMap: Record<string, BigNumber> = {};
        logs.forEach(({user, amount}) => {
            if (!depositorMap[user]) {
                depositorMap[user] = BigNumber.from(amount);
            } else {
                depositorMap[user] = depositorMap[user].add(amount);
            }
        });
        if (args.returnMap) return depositorMap;

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

export default qWomConvertScript;
