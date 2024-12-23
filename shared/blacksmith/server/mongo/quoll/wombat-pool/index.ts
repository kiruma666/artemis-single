/*
 * @Author: xiaodongyu
 * @Date: 2022-10-17 10:56:26
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-11-03 15:31:34
 */

import {BigNumber, Contract} from 'ethers';

import Script from 'server/mongo/script';

import {provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, batchProvider, wrapCrawl} from '../util';

import wombatDepositModel from './deposit-model';
import abi from './wombat-strategy.json';

const {log} = console;
const Deposit = 'Deposit';
const DepositFor = 'DepositFor';

const wombatPoolScript: Script = {
    meta: {
        name: 'wombatPool',
        address: '0xe2c07d20af0fb50cae6cdd615ca44abaaa31f9c8',
        creationBlock: 20774470,
        abi,
        description: 'user deposited amount in each wombat pool'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [latest] = await wombatDepositModel.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const [depositLogs, depositForLogs] = await Promise.all([Deposit, DepositFor].map(eventName => retryableQueryFilter({
                        contract,
                        eventName,
                        fromBlock,
                        toBlock
                    })));
                    const docs = [...depositLogs, ...depositForLogs].map(({blockNumber, transactionHash, event, args}) => new wombatDepositModel({
                        blockNumber,
                        transactionHash,
                        event,
                        user: args?.user,
                        amount: args?.amount.toString(),
                        pid: args?.pid
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await wombatDepositModel.bulkSave(docs);
                    fromBlock = toBlock + 1;
                }
            });
        });
    },

    async calculate(args: any) {
        const logs = await wombatDepositModel.find(getBlockRangeFilter(args)).lean();

        const {address, abi} = this.meta;
        const contract = new Contract(address, abi, batchProvider);
        const pids = Array(10).fill(0).map((zero, idx) => idx);
        async function getUserInfo(holders: string[], idx: number): Promise<any> {
            console.log('wombatPool userInfo start from: ', idx, ', total: ', holders.length);
            try {
                const userInfos = await Promise.all(holders.flatMap(holder => pids.map(async pid => {
                    const {amount} = await contract.userInfo(pid, holder);

                    return [holder, amount];
                })));

                const userInfoMap: Record<string, BigNumber[]> = userInfos.reduce((map, [holder, amount]) => {
                    if (!map[holder]) {
                        map[holder] = [];
                    }

                    map[holder].push(amount);

                    return map;
                }, {} as any);

                return userInfoMap;
            } catch (err) {
                console.log(holders, idx, err);

                return getUserInfo(holders, idx);
            }
        }

        const userSet = new Set();
        logs.forEach(log => userSet.add(log.user));
        const users = await filterContract(Array.from(userSet));
        const batchSize = 50;
        const userInfos: Record<string, BigNumber[]> = {};
        for (let i = 0; i < users.length; i += batchSize) {
            Object.assign(userInfos, await getUserInfo(users.slice(i, i + batchSize), i));
        }

        const header = ['user', 'BUSD', 'USDT', 'WBNB', 'BNBx', 'aBNBc', 'stkBNB', 'USDC', 'DAI', 'BUSD-side', 'HAY'].join(columnSeparator) + lineBreak;

        return header + Object.entries(userInfos).map(([user, poolDeposits]) => [user, ...poolDeposits.map(bn => bn.toDecimal())].join(columnSeparator)).join(lineBreak);
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default wombatPoolScript;
