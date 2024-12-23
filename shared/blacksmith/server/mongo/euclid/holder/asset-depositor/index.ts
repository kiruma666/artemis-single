/**
 * @Author: sheldon
 * @Date: 2024-02-10 22:18:34
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-05-08 22:03:56
 */

import {job} from 'cron';
import {BigNumber, Contract} from 'ethers';

import {ethProvider, getBlockRangeFilter, retryableQueryFilter, tableToRecords, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import {decodeInviterCode} from './inviter-decode';
import model from './model';

const {log} = console;
const maxBlockDiff = 1e4;

export async function getUserInviterMap() {
    // descending order of blockNumber, use the oldest referralId as the inviter
    const logs = await model.find().sort({blockNumber: 'desc'}).lean();
    const userInviterMap: Record<string, string> = {};
    for (const log of logs) {
        const {user, referralId} = log;
        const inviterAddress = decodeInviterCode(referralId?.trim() ?? '');
        if (referralId && inviterAddress && inviterAddress.length === 42) {
            userInviterMap[user.toLowerCase()] = referralId.trim();
        }
    }

    return userInviterMap;
}

export async function getHolders() {
    const depositorCSV = await EuclidAssetDepositorScript.calculate({});
    const depositorRecords = tableToRecords(depositorCSV);
    const depositors = Array.from(new Set(depositorRecords.map(({user}) => user)));
    console.log('euclid asset depositors', depositors.length);

    return depositors.map(holder => holder.toLowerCase());
}

export const EuclidAssetDepositorScript: Script = {
    meta: {
        name: 'EuclidAssetDepositor',
        address: '0x26803cB8Bd2916EB58c3610caB50077A96D29947',
        abi: [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        internalType: 'address',
                        name: '_user',
                        type: 'address'
                    },
                    {
                        indexed: true,
                        internalType: 'address',
                        name: '_asset',
                        type: 'address'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: '_amount',
                        type: 'uint256'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: '_elETHAmount',
                        type: 'uint256'
                    },
                    {
                        indexed: false,
                        internalType: 'string',
                        name: '_referralId',
                        type: 'string'
                    }
                ],
                name: 'AssetDeposited',
                type: 'event'
            }
        ],
        creationBlock: 19146977, // block number of the transaction that created the contract
        description: 'Euclid Asset Depositor',
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const [latest] = await model.find({address}).sort({_id: -1}).limit(1).lean();
            const contract = new Contract(address, abi, ethProvider);
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock <= latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff / 2, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'AssetDeposited',
                        fromBlock,
                        toBlock
                    });
                    for (const {blockNumber, transactionHash, event, args} of logs) {
                        const doc = new model({
                            blockNumber,
                            transactionHash,
                            event,
                            user: args?._user,
                            asset: args?._asset,
                            amount: args?._amount.toString(),
                            elETHAmount: args?._elETHAmount.toString(),
                            referralId: args?._referralId ?? ''
                        });
                        await doc.save();
                    }

                    log(name, 'from', fromBlock, 'to', toBlock, 'got', logs.length);

                    fromBlock = toBlock + 1;
                }
            }, ethProvider);
        });
    },

    async calculate(args) {
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const headers = ['user', 'asset', 'amount', 'elETHAmount', 'referralId', 'decodedReferralId', 'invitationTier', 'transactionHash', 'blockNumber'] as const;
        const userInviterMap = await getUserInviterMap();

        return [headers.join(','), ...logs.flatMap(log => {
            const {user, elETHAmount} = log;
            const referralId = log.referralId?.trim();
            const decodedReferralId = referralId && decodeInviterCode(referralId.toLowerCase());
            const decodedReferralId2 = decodedReferralId && decodeInviterCode(userInviterMap[decodedReferralId.toLowerCase()]);
            const tier0 = headers.map(header => {
                if (header === 'user') {
                    return user.toLowerCase();
                }

                if (header === 'referralId') {
                    return referralId;
                }

                if (header === 'decodedReferralId') {
                    return referralId && decodeInviterCode(referralId);
                }

                if (header === 'invitationTier') {
                    return 0;
                }

                return log[header];
            });
            const rst = [tier0.join(',')];
            if (decodedReferralId && decodedReferralId !== user.toLowerCase()) {
                const tier1 = headers.map(header => {
                    if (header === 'user') {
                        return decodedReferralId.toLowerCase();
                    }

                    if (header === 'referralId') {
                        return userInviterMap[decodedReferralId.toLowerCase()] || '';
                    }

                    if (header === 'decodedReferralId') {
                        return decodedReferralId2 || '';
                    }

                    if (header === 'invitationTier') {
                        return 1;
                    }

                    if (header === 'elETHAmount') {
                        return BigNumber.from(elETHAmount).div(5).toString();
                    }

                    return log[header];
                });
                rst.push(tier1.join(','));
            }

            if (rst.length === 2 && decodedReferralId2 && decodedReferralId2 !== user.toLowerCase() && decodedReferralId2 !== decodedReferralId.toLowerCase()) {
                const tier2 = headers.map(header => {
                    if (header === 'user') {
                        return decodedReferralId2.toLowerCase();
                    }

                    if (header === 'referralId') {
                        return '';
                    }

                    if (header === 'decodedReferralId') {
                        return '';
                    }

                    if (header === 'invitationTier') {
                        return 2;
                    }

                    if (header === 'elETHAmount') {
                        return BigNumber.from(elETHAmount).div(10).toString();
                    }

                    return log[header];
                });
                rst.push(tier2.join(','));
            }

            return rst;
        })].join('\n');
    },

    async crawlAndCalculate(args) {
        await this.crawl();

        return this.calculate(args);
    }
};

if (process.env.STAGE === 'prod') {
    job({
        cronTime: '0 0 * * *',
        onTick: () => EuclidAssetDepositorScript.crawlAndCalculate({}),
        start: true
    });

    console.log('EuclidAssetDepositor AssetDeposited started');
}

