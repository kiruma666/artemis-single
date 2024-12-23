/*
 * @Author: xiaodongyu
 * @Date: 2022-10-26 13:35:13
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-11-03 15:31:41
 */

import {Contract} from 'ethers';
import {ZipFile} from 'yazl';

import tokenAbi from '@quoll/frontend/src/contract/abi/IERC20.json';

import Script from 'server/mongo/script';

import {provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, bnCompare, batchProvider, wrapCrawl} from '../../util';

import abi from './abi.json';
import model from './model';

const {log} = console;

const wombexBoosterScript: Script = {
    meta: {
        name: 'wombexBooster',
        address: '0xE62c4454d1dd6B727eB7952888B31a74969086B8',
        creationBlock: 22230819,
        abi,
        description: 'wombex booster'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [latest] = await model.find().sort({_id: -1}).limit(1).lean();
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
                    const docs = logs.map(({blockNumber, transactionHash, event, args}) => new model({
                        blockNumber,
                        transactionHash,
                        event,
                        user: args?.user,
                        poolid: args?.poolid.toNumber(),
                        amount: args?.amount.toString()
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
        const {address, abi} = this.meta;
        const contract = new Contract(address, abi, provider);
        const poolLength = (await contract.poolLength()).toNumber();
        async function getUserBalance(holders: string[], contract: Contract, idx: number): Promise<any> {
            console.log('wombexBooster balance start from: ', idx, ', total: ', holders.length);
            try {
                const userInfos = await Promise.all(holders.map(async holder => {
                    const balance = await contract.balanceOf(holder);

                    return [holder, balance];
                }));

                return userInfos;
            } catch (err) {
                console.log(holders, idx, err);

                return getUserBalance(holders, contract, idx);
            }
        }

        const zip = new ZipFile();
        for (let i = 0; i < poolLength; i++) {
            const {shutdown, crvRewards} = await contract.poolInfo(i);
            if (!shutdown) {
                const users = await filterContract(Array.from(new Set(logs.flatMap(log => {
                    if (log.poolid === i) {
                        return log.user;
                    }

                    return [];
                }))));
                const tokenContract = new Contract(crvRewards, tokenAbi, batchProvider);
                const userBalances = [];
                const batchSize = 50;
                for (let i = 0; i < users.length; i += batchSize) {
                    userBalances.push(...await getUserBalance(users.slice(i, i + batchSize), tokenContract, i));
                }

                userBalances.sort((a, b) => -bnCompare(a[1], b[1]));
                const content = userBalances.map(([user, balance]) => [user, balance.toDecimal()].join(columnSeparator)).join(lineBreak);
                zip.addBuffer(Buffer.from(content), [i, crvRewards].join('-') + '.csv');
            }
        }

        zip.end();

        return zip.outputStream;
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default wombexBoosterScript;
