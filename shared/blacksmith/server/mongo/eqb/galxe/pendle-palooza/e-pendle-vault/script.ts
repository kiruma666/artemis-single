/**
 * @Author: sheldon
 * @Date: 2023-11-14 23:28:17
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-08-03 14:49:03
 */

import arbOutput from '@equilibria/contracts/deployment/arbiOutput.json';
import {BigNumber, Contract, providers} from 'ethers';

import {arbiProvider, getBlockRangeFilter, maxBlockDiff, retryableQueryFilter, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import {PendlePaloozaThreshold} from '../constant';

import model from './model';

const {log} = console;

export const arbEPendleVault = createEPendleVault(arbOutput.ePendleVault.address, arbiProvider, 150152011);

function createEPendleVault(address: string, provider: providers.JsonRpcProvider, creationBlock: number): Script {
    return {
        meta: {
            name: 'EqbEPendleVault',
            address,
            abi: [
                'event Converted(address _user, uint256 _amount, uint256 ePendleAmount, uint256 _ePendleCertificateAmount)'
            ],
            creationBlock, // block number at 2023-11-14 00:00:00 UTC+0, time before galxe PENDLE palooza campaign
            description: 'ePendle Vault of Eqb, convert PENDLE to ePENDLE on side chain',
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
                            eventName: 'Converted',
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
                }, provider);
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
}
