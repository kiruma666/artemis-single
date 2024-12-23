/*
 * @Author: xiaodongyu
 * @Date: 2022-10-26 13:35:13
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-03 17:04:59
 */

import {BigNumber, Contract} from 'ethers';
import {ZipFile} from 'yazl';

import baseRewardPoolAbi from '@quoll/frontend/src/contract/abi/BaseRewardPool.json';
import abi from '@quoll/frontend/src/contract/abi/WombatBooster.json';
import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import {provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, wrapContractMeta, getBlockRangeFilter, bnCompare, wrapCrawl, tagableProvider, batchProvider} from '../util';

import model from './model';

const {log} = console;

const wombatBoosterScript: Script = {
    meta: {
        name: 'wombatBooster',
        address: AddressMap[56].wombatBooster,
        creationBlock: 21347769,
        abi,
        description: 'quoll wombat booster'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [latest] = await model.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'Deposited',
                        fromBlock,
                        toBlock
                    });
                    const docs = logs.map(({blockNumber, transactionHash, event, args}) => new model({
                        blockNumber,
                        transactionHash,
                        event,
                        user: args?._user,
                        poolid: args?._poolid.toNumber(),
                        amount: args?._amount.toString()
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await model.bulkSave(docs);
                    fromBlock = toBlock;
                }
            });

            await this.fixData();
        });
    },

    async fixData() {
        const logs = await model.find({transactionFrom: {$in: [null, '']}});
        for (let log of logs) {
            const {transactionHash} = log;
            const maxTry = 5;
            let transaction;
            let i = 0;
            while (!transaction && i < maxTry) {
                try {
                    transaction = await provider.getTransaction(transactionHash);
                    i++;
                } catch (err) {
                    console.log('fetch transaction failed, tried', i + 1, transactionHash);
                }
            }

            if (transaction) {
                log.transactionFrom = transaction.from;
                log = await log.save();
                console.log('transaction', transactionHash, 'from updated:', log.transactionFrom);
            } else {
                console.log('fetch transaction failed finally', transactionHash);
            }
        }
    },

    async calculate(args: any) {
        const {blockEnd} = args;
        const overrides = blockEnd ? {
            blockTag: +blockEnd
        } : {};
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const {address, abi} = this.meta;
        const contract = new Contract(address, abi, provider);
        const poolLength = (await contract.poolLength()).toNumber();
        const poolInfoMap: Record<string, any> = {};
        for (let pid = 0; pid < poolLength; pid++) {
            const {lptoken, rewardPool} = await contract.poolInfo(pid);
            poolInfoMap[rewardPool] = {lptoken, pid};
        }

        const mainnetPoolKeys = [
            // 'BUSD',
            // 'USDC',
            // 'USDT',
            // 'DAI',
            'sideBUSD',
            'HAY',
            'WBNB',
            'BNBx',
            'stkBNB',
            'aBNBc'
        ];
        const zip = new ZipFile();
        for (const key of mainnetPoolKeys) {
            const {baseRewardPool} = (AddressMap[56] as any)[key];
            const rewardContract = new Contract(baseRewardPool, baseRewardPoolAbi, blockEnd ? tagableProvider : batchProvider);
            const {pid, lptoken} = poolInfoMap[baseRewardPool];
            console.log({key, lptoken, baseRewardPool});
            const poolLogs = logs.filter(log => log.poolid === pid);
            const users = Array.from(new Set(poolLogs.map(log => log.transactionFrom)));
            console.log('found pid:', pid, ', totalLogs:', poolLogs.length, ', users: ', users.length);
            const userBalance: Record<string, BigNumber> = {};
            if (blockEnd) {
                let i = 0;
                while (i < users.length) {
                    const user = users[i];
                    if (user) {
                        try {
                            const balance = await rewardContract.balanceOf(user, overrides);
                            userBalance[user] = balance;
                            console.log(i, user, balance.toDecimal());
                            i++;
                        } catch (err) {
                            console.log('fetch balance failed', i, user, err);
                        }
                    } else {
                        i++;
                        console.log('fetch balance skiped empty user:', i, user);
                    }
                }
            } else {
                try {
                    await Promise.all(users.map(async (user, i) => {
                        const balance = await rewardContract.balanceOf(user, overrides);
                        userBalance[user] = balance;
                        console.log(i, user, balance.toDecimal());
                    }));
                } catch (error) {
                    console.log(error);
                    // sleep 2 seconds
                    await new Promise(resolve => setTimeout(resolve, 2e3));
                }
            }

            const content = Object.entries(userBalance).sort((a, b) => -bnCompare(a[1], b[1])).map(([user, balance]) => [user, balance.toString(), balance.toDecimal()].join(columnSeparator)).join(lineBreak);
            zip.addBuffer(Buffer.from(content), [key, lptoken].join('-') + '.csv');
        }

        zip.end();

        return zip.outputStream;
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default wombatBoosterScript;
