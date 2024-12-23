/**
 * @Author: sheldon
 * @Date: 2024-02-10 22:18:34
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-25 23:26:15
 */

import {job} from 'cron';
import {BigNumber, Contract} from 'ethers';

import {metisProvider, getBlockRangeFilter, retryableQueryFilter, tableToRecords, wrapContractMeta, wrapCrawl} from 'server/mongo/quoll/util';
import Script from 'server/mongo/script';

import {decodeInviterCode} from './inviter-decode';
import model from './model';

const {log} = console;
const maxBlockDiff = 1e5;

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
    const depositorCSV = await ArtemisAssetDepositorScript.calculate({});
    const depositorRecords = tableToRecords(depositorCSV);
    const depositors = Array.from(new Set(depositorRecords.map(({user}) => user)));
    console.log('artemis depositors', depositors.length);

    return depositors.map(holder => holder.toLowerCase());
}

export const ArtemisAssetDepositorScript: Script = {
    meta: {
        name: 'ArtemisAssetDepositor',
        address: '0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E',
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
                        indexed: false,
                        internalType: 'uint256',
                        name: '_amount',
                        type: 'uint256'
                    },
                    {
                        indexed: false,
                        internalType: 'uint256',
                        name: '_artMetisAmount',
                        type: 'uint256'
                    },
                    {
                        indexed: false,
                        internalType: 'string',
                        name: '_referralId',
                        type: 'string'
                    }
                ],
                name: 'MetisDeposited',
                type: 'event'
            }
        ],
        creationBlock:
13735488, // block number of the transaction that created the contract
        description: 'Artemis Asset Depositor',
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const [latest] = await model.find({address}).sort({_id: -1}).limit(1).lean();
            const contract = new Contract(address, abi, metisProvider);
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock <= latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const logs = await retryableQueryFilter({
                        contract,
                        eventName: 'MetisDeposited',
                        fromBlock,
                        toBlock
                    });
                    for (const {blockNumber, transactionHash, event, args} of logs) {
                        const doc = new model({
                            blockNumber,
                            transactionHash,
                            event,
                            user: args?._user,
                            amount: args?._amount.toString(),
                            artMetisAmount: args?._artMetisAmount.toString(),
                            referralId: args?._referralId ?? ''
                        });
                        await doc.save();
                    }

                    log(name, 'from', fromBlock, 'to', toBlock, 'got', logs.length);

                    fromBlock = toBlock + 1;
                }
            }, metisProvider);
        });
    },

    async calculate(args) {
        const logs = await model.find(getBlockRangeFilter(args)).lean();
        const headers = ['user', 'amount', 'artMetisAmount', 'referralId', 'decodedReferralId', 'invitationTier', 'transactionHash', 'blockNumber'] as const;
        const userInviterMap = await getUserInviterMap();

        return [headers.join(','), ...logs.flatMap(log => {
            const {user, artMetisAmount} = log;
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

                    if (header === 'artMetisAmount') {
                        return BigNumber.from(artMetisAmount).div(5).toString();
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

                    if (header === 'artMetisAmount') {
                        return BigNumber.from(artMetisAmount).div(10).toString();
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
        onTick: () => ArtemisAssetDepositorScript.crawlAndCalculate({}),
        start: true
    });

    console.log('ArtemisAssetDepositor AssetDeposited started');
}

