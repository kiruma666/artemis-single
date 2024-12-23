/*
 * @Author: xiaodongyu
 * @Date: 2022-12-08 18:51:55
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-12 23:00:13
 */

import {BigNumber, Contract} from 'ethers';

import abi from '@quoll/frontend/src/contract/abi/BaseRewardPool.json';
import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import wombatBoosterScript from '..';
import {provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, wrapContractMeta, getBlockRangeFilter, wrapCrawl} from '../../util';

import model from './model';

const {log} = console;

const getPoolInfos = async () => {
    const {address: boosterAddr, abi: boosterAbi} = wombatBoosterScript.meta;
    const boosterContract = new Contract(boosterAddr, boosterAbi, provider);
    const poolLength = await boosterContract.poolLength();
    const poolInfos: any[] = [];
    for (let poolid = 0; poolid < poolLength.toNumber(); poolid++) {
        poolInfos.push({
            poolid,
            ...(await boosterContract.poolInfo(poolid))
        });
    }

    return poolInfos;
};

const wombatBoosterRewardPoolScript: Script = {
    meta: {
        name: 'wombatBoosterRewardPool',
        address: '',
        creationBlock: 21347769,
        abi,
        description: 'quoll wombat booster reward pool RewardAdded events'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const poolInfos = await getPoolInfos();
            const {abi, creationBlock, name} = this.meta;
            const [latest] = await model.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    for (const {poolid, rewardPool} of poolInfos) {
                        const contract = new Contract(rewardPool, abi, provider);
                        const logs = await retryableQueryFilter({
                            contract,
                            eventName: 'RewardAdded',
                            fromBlock,
                            toBlock
                        });
                        for (const {blockNumber, transactionHash, event, args} of logs) {
                            const doc = new model({
                                blockNumber,
                                transactionHash,
                                event,
                                poolid,
                                args: {
                                    rewardToken: args?._rewardToken,
                                    reward: args?._reward?.toString()
                                }
                            });
                            await doc.save();
                        }

                        log(name, 'poolid', poolid, 'from', fromBlock, 'to', toBlock, 'got', logs.length);
                    }

                    fromBlock = toBlock + 1;
                }
            });
        });
    },

    async calculate(args: any) {
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const poolInfos = await getPoolInfos();
        const rewardPoolAddrNameMap = Object.entries(AddressMap[56]).reduce((map, [key, val]) => {
            const {baseRewardPool} = val as any;
            if (baseRewardPool) {
                map[baseRewardPool] = key;
            }

            return map;
        }, {} as any);
        const pidInfoMap = poolInfos.reduce((map, info) => {
            map[info.poolid] = info;
            info.name = rewardPoolAddrNameMap[info.rewardPool];

            return map;
        }, {});
        const rewardMap: Record<number, Record<string, BigNumber>> = {};
        logs.forEach(({poolid, args}) => {
            const {rewardToken, reward} = args;
            if (!rewardMap[poolid]) {
                rewardMap[poolid] = {};
            }

            if (!rewardMap[poolid][rewardToken]) {
                rewardMap[poolid][rewardToken] = BigNumber.from(reward);
            } else {
                rewardMap[poolid][rewardToken] = rewardMap[poolid][rewardToken].add(BigNumber.from(reward));
            }
        });

        const header = ['name', 'poolid', 'rewardToken', 'rewardAmount', 'rewardAmountDecimal'].join(columnSeparator);
        const content = Object.entries(rewardMap).flatMap(([poolid, poolRewardMap]) => {
            return Object.entries(poolRewardMap).map(([rewardToken, amount]) => {
                const {name} = pidInfoMap[poolid];

                return [name, poolid, rewardToken, amount.toString(), amount.toDecimal()].join(columnSeparator);
            });
        });

        return [header, ...content].join(lineBreak);
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default wombatBoosterRewardPoolScript;
