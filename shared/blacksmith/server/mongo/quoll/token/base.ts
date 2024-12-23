/*
 * @Author: xiaodongyu
 * @Date: 2022-10-14 14:26:04
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-15 13:26:02
 */

import {BigNumber, Contract} from 'ethers';
import {Model} from 'mongoose';

import lpAbi from '@quoll/frontend/src/contract/abi/UniswapV2Pair.json';

import Script from 'server/mongo/script';
import ContractMetaModel from 'server/mongo/shared-model/contract-meta';

import {bnCompare, provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, getProviderAndOverridesByBlockTag, wrapCrawl, tokenSelf} from '../util';

const {log} = console;

async function mapLpToWom(entries: any, blockTag: number) {
    const {address} = this.meta;
    let lpToWomRate: BigNumber;
    async function getRate(blockTag?: number): Promise<any> {
        const [provider, overrides] = getProviderAndOverridesByBlockTag(blockTag && +blockTag);
        const contract = new Contract(address, lpAbi, provider);

        try {
            const [
                totalSupply,
                [womTotal]
            ] = await Promise.all([
                contract.totalSupply(overrides),
                contract.getReserves(overrides)
            ]);

            lpToWomRate = womTotal.mul(BigNumber.fromDecimal('1')).div(totalSupply);
            log({totalSupply, womTotal, lpToWomRate});
        } catch (err) {
            console.error(err);
            if (blockTag) {
                log('fetch rate at', blockTag, 'failed, try latest');

                return getRate();
            }
        }
    }

    await getRate(blockTag);

    return entries.map(([user, lpAmount]: any) => [user, lpAmount.mul(lpToWomRate).changeDecimals(36)]);
}

export default function createToken(meta: Omit<Script['meta'], 'abi'>, model: Model<any>, isBwlp?: boolean): Script {
    return {
        meta: {
            ...meta,
            abi: [
                {
                    anonymous: false,
                    inputs: [
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'from',
                            type: 'address'
                        },
                        {
                            indexed: true,
                            internalType: 'address',
                            name: 'to',
                            type: 'address'
                        },
                        {
                            indexed: false,
                            internalType: 'uint256',
                            name: 'value',
                            type: 'uint256'
                        }
                    ],
                    name: 'Transfer',
                    type: 'event'
                }
            ]
        },

        async crawl() {
            await wrapCrawl.call(this, async () => {
                const {address, abi, name, creationBlock, customMaxBlockDiff = maxBlockDiff, filterDoc} = this.meta;
                const contract = new Contract(address, abi, provider);
                const [{blockNumber: savedLatest} = {} as any] = await model.find().sort({_id: -1}).limit(1).lean();
                await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                    fromBlock = Math.max(fromBlock, savedLatest ? savedLatest + 1 : creationBlock);
                    while (fromBlock <= latestBlock) {
                        const toBlock = Math.min(fromBlock + customMaxBlockDiff, latestBlock);
                        const logs = await retryableQueryFilter({
                            contract,
                            eventName: 'Transfer',
                            fromBlock,
                            toBlock
                        });
                        const docs = logs.flatMap(({blockNumber, transactionHash, logIndex, args}, idx) => {
                            const doc = {
                                blockNumber,
                                transactionHash,
                                logIndex: logIndex ?? idx,
                                from: args?.from,
                                to: args?.to,
                                value: args?.value.toString()
                            };
                            if (!filterDoc || filterDoc(doc)) {
                                return new model(doc);
                            }

                            return [];
                        });
                        log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                        await model.bulkSave(docs);
                        fromBlock = toBlock + 1;
                    }
                });
            });
        },

        async fixData(query) {
            const {blockStart} = query ?? {};
            if (!query || !blockStart) {
                throw 'query.blockStart is required';
            }

            const {address, abi, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const fromBlock = +blockStart;
            const toBlock = fromBlock;
            const logs = await retryableQueryFilter({
                contract,
                eventName: 'Transfer',
                fromBlock,
                toBlock
            });
            const docs = logs.map(({blockNumber, transactionHash, logIndex, args}, idx) => new model({
                blockNumber,
                transactionHash,
                logIndex: logIndex || idx,
                from: args?.from,
                to: args?.to,
                value: args?.value.toString()
            }));
            log(name, 'fixData patch block', fromBlock, 'got', docs.length);
            await model.bulkSave(docs);
        },

        async calculate(args: any) {
            const logs = await model.find(getBlockRangeFilter(args)).lean();
            const depositorMap: Record<string, BigNumber> = {};
            logs.forEach(({transactionHash, from, to, value}: any) => {
                if (to !== tokenSelf) {
                    if (!depositorMap[to]) {
                        depositorMap[to] = BigNumber.from(value);
                    } else {
                        depositorMap[to] = depositorMap[to].add(value);
                    }
                }

                if (from !== tokenSelf && depositorMap[from]) {
                    if (depositorMap[from].gte(value)) {
                        depositorMap[from] = depositorMap[from].sub(value);
                    } else {
                        log('invalid transfer', transactionHash, 'from', from, depositorMap[from].toDecimal(), 'to', to, BigNumber.from(value).toDecimal());
                    }
                }
            });
            let entries = Object.entries(depositorMap).sort(([, amount1], [, amount2]) => -bnCompare(amount1, amount2));

            // map lpbalance to wom amount
            if (isBwlp) {
                entries = await mapLpToWom.call(this, entries, args?.blockEnd);
            }

            const header = `user${columnSeparator}amount${lineBreak}`;
            const data = (await filterContract(entries.filter(([, amount]) => amount.noneZero()))).map(([user, amount]) => [user, amount.toDecimal()].join(columnSeparator)).join(lineBreak);

            return header + data;
        },

        async crawlAndCalculate(args: any) {
            await this.crawl();

            return this.calculate(args);
        },

        async clearNextCrawlBlock() {
            await ContractMetaModel.deleteOne({
                address: this.meta.address
            });
        }
    };
}
