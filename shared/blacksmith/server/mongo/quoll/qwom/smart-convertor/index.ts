/*
 * @Author: xiaodongyu
 * @Date: 2022-10-08 15:32:26
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-15 13:30:47
 */

import {BigNumber, Contract} from 'ethers';

import Address from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import {bnCompare, provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, wrapCrawl} from '../../util';

import model from './model';

const {log} = console;

const womSmartConvertorScript: Script = {
    meta: {
        name: 'womSmartConvertor',
        address: Address[56].smartConvertor,
        creationBlock: 23442528,
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: false,
                        internalType: 'address',
                        name: '_user',
                        type: 'address'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: '_depositedWom',
                        type: 'uint256'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: '_obtainedQWom',
                        type: 'uint256'
                    }
                ],
                name: 'QWomObtained',
                type: 'event'
            }
        ],
        description: 'calculate how many wom converted by each user'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [{blockNumber: savedLatest} = {} as any] = await model.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, savedLatest ? savedLatest + 1 : creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'QWomObtained',
                        fromBlock,
                        toBlock
                    });
                    const docs = logs.map(({blockNumber, transactionHash, logIndex, args}, idx) => new model({
                        blockNumber,
                        transactionHash,
                        logIndex: logIndex ?? idx,
                        user: args?._user,
                        depositedWom: args?._depositedWom.toString(),
                        obtainedQWom: args?._obtainedQWom.toString()
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await model.bulkSave(docs);
                    fromBlock = toBlock + 1;
                }
            });
        });
    },

    async calculate(args: any) {
        const logs = await model.find(getBlockRangeFilter(args)).lean();

        const depositorMap: Record<string, BigNumber> = {};
        logs.forEach(({user, depositedWom: amount}) => {
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

export default womSmartConvertorScript;
