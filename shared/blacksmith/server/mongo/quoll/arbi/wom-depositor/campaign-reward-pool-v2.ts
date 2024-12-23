/*
 * @Author: xiaodongyu
 * @Date: 2022-10-08 15:32:26
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-04-08 21:08:47
 */

import {BigNumber, Contract} from 'ethers';

import Abi from '@quoll/frontend/src/contract/abi/CampaignRewardPoolV2.json';
import Address from '@quoll/frontend/src/contract/address-stake-lp.json';

import Script from 'server/mongo/script';

import {arbiProvider, maxBlockDiff, retryableQueryFilter, wrapContractMeta, wrapCrawl} from '../../util';

import {ArbiWomDepositorDepositedModel} from './model';

const {log} = console;

export const ArbiCampaignRewardPoolV2Script: Script = {
    meta: {
        name: 'ArbiCampaignRewardPoolV2',
        address: Address[42161].campaignRewardPoolV2,
        creationBlock: 77952054,
        abi: Abi,
        description: 'calculate how many wom converted by each user'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, arbiProvider);
            const [latest] = await ArbiWomDepositorDepositedModel.find({contract: address}).sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'Staked',
                        fromBlock,
                        toBlock
                    });
                    const docs = logs.map(({blockNumber, transactionHash, args}) => new ArbiWomDepositorDepositedModel({
                        blockNumber,
                        transactionHash,
                        contract: address,
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

    async calculate() {
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};
