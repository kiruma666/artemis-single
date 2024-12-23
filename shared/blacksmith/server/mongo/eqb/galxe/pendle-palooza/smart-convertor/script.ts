/**
 * @Author: sheldon
 * @Date: 2023-11-14 23:28:52
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-15 21:58:59
 */

import ethOutput from '@equilibria/contracts/deployment/mainnetOutput.json';
import {BigNumber, Contract} from 'ethers';

import {ethProvider, getBlockRangeFilter, maxBlockDiff, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import {PendlePaloozaThreshold} from '../constant';

import model from './model';
import SmartConvertorMeta from './SmartConvertor.json';

const {log} = console;
const {address} = ethOutput.smartConvertor;

export const SmartConvertorScript: Script = {
    meta: {
        name: 'EqbSmartConvertor',
        address,
        abi: SmartConvertorMeta.abi,
        creationBlock: 18566419, // block number at 2023-11-14 00:00:00 UTC+0, time before galxe PENDLE palooza campaign
        description: 'SmartConvertor of Eqb, convert PENDLE to ePENDLE on ethereum',
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {abi, creationBlock, name} = this.meta;
            const [latest] = await model.find({address}).sort({_id: -1}).limit(1).lean();
            const contract = new Contract(address, abi, ethProvider);
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock <= latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'EPendleObtained',
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
                            amount: args?._depositedPendle.toString(),
                        });
                        await doc.save();
                    }

                    log(name, 'address', address, 'from', fromBlock, 'to', toBlock, 'got', logs.length);

                    fromBlock = toBlock + 1;
                }
            }, ethProvider);
        });
    },

    async calculate(args) {
        const logs = await model.find({...getBlockRangeFilter(args), address}).lean();
        const depositorMap: Record<string, BigNumber> = {};
        logs.forEach(({user, amount}: any) => {
            if (!depositorMap[user]) {
                depositorMap[user] = BigNumber.from(amount);
            } else {
                depositorMap[user] = depositorMap[user].add(amount);
            }
        });

        const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(PendlePaloozaThreshold) ? userAccount : []);

        log(`Convert at least ${PendlePaloozaThreshold.toDecimal()} PENDLE at ${address} depositors count:`, validDepositors.length);

        return validDepositors;
    },

    async crawlAndCalculate() {
        await this.crawl();

        return this.calculate();
    }
};
