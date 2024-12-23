/**
 * @Author: sheldon
 * @Date: 2023-10-29 00:05:05
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-11-15 21:59:23
 */

import SkilletDeploymentBscOutput from '@skillet/contracts/deployment/bscOutput.json';
import {BigNumber, Contract} from 'ethers';

import {provider, getBlockRangeFilter, maxBlockDiff, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import CakeCampaignMeta from './CakeCampaign.json';
import model from './model';

const {log} = console;

export const campaignScript0 = createCakeCampaign(SkilletDeploymentBscOutput['cakeCampaign-0'].address);
export const campaignScript1 = createCakeCampaign(SkilletDeploymentBscOutput['cakeCampaign-1'].address);
export const campaignScript2 = createCakeCampaign(SkilletDeploymentBscOutput['cakeCampaign-2'].address);

function createCakeCampaign(address: string): Script {
    return {
        meta: {
            name: 'SkilletCakeCampaignScript',
            address,
            abi: CakeCampaignMeta.abi,
            creationBlock: 33363163, // cakeCampaign-0 creation block
            description: 'Cake Campaign of Skillet',
        },

        async crawl() {
            await wrapCrawl.call(this, async () => {
                const {abi, creationBlock, name} = this.meta;
                const [latest] = await model.find({address}).sort({_id: -1}).limit(1).lean();
                const contract = new Contract(address, abi, provider);
                await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                    fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                    while (fromBlock <= latestBlock) {
                        const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                        const logs = await retryableQueryFilter({
                            contract,
                            eventName: 'Staked',
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
                                amount: args?._amount.toString(),
                            });
                            await doc.save();
                        }

                        log(name, 'address', address, 'from', fromBlock, 'to', toBlock, 'got', logs.length);

                        fromBlock = toBlock + 1;
                    }
                });
            });
        },

        async calculate(args) {
            const logs = await model.find({...getBlockRangeFilter(args), address}).lean();
            const threshold = BigNumber.fromDecimal('5');
            const depositorMap: Record<string, BigNumber> = {};
            logs.forEach(({user, amount}: any) => {
                if (!depositorMap[user]) {
                    depositorMap[user] = BigNumber.from(amount);
                } else {
                    depositorMap[user] = depositorMap[user].add(amount);
                }
            });

            const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(threshold) ? userAccount : []);

            log(`At least ${threshold.toDecimal()} CAKE staked at ${address} depositors count:`, validDepositors.length);

            return validDepositors;
        },

        async crawlAndCalculate() {
            await this.crawl();

            return this.calculate();
        }
    };
}
