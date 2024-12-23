/*
 * @Author: xiaodongyu
 * @Date: 2022-10-17 10:56:26
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-11-03 15:31:26
 */

import {BigNumber, Contract} from 'ethers';
import {ZipFile} from 'yazl';

import Script from 'server/mongo/script';

import {provider, maxBlockDiff, retryableQueryFilter, columnSeparator, lineBreak, filterContract, wrapContractMeta, getBlockRangeFilter, bnCompare, getProviderAndOverridesByBlockTag, wrapCrawl} from '../util';

import vewomModel from './model';
import abi from './VeWom.json';

const {log} = console;

const vewomScript: Script = {
    meta: {
        name: 'vewom',
        address: '0x3DA62816dD31c56D9CdF22C6771ddb892cB5b0Cc',
        creationBlock: 20774963,
        abi,
        description: 'user locked wom for vewom'
    },

    async crawl() {
        await wrapCrawl.call(this, async () => {
            const {address, abi, creationBlock, name} = this.meta;
            const contract = new Contract(address, abi, provider);
            const [latest] = await vewomModel.find().sort({_id: -1}).limit(1).lean();
            await wrapContractMeta.call(this, async (fromBlock, latestBlock) => {
                fromBlock = Math.max(fromBlock, latest?.blockNumber ?? creationBlock);
                while (fromBlock < latestBlock) {
                    const toBlock = Math.min(fromBlock + maxBlockDiff, latestBlock);
                    const [mintLogs, burnLogs] = await Promise.all(['Mint', 'Burn'].map(eventName => retryableQueryFilter({
                        contract,
                        eventName,
                        fromBlock,
                        toBlock
                    })));
                    const docs = [...mintLogs, ...burnLogs].map(({blockNumber, transactionHash, event, args}) => new vewomModel({
                        blockNumber,
                        transactionHash,
                        event,
                        user: args?.beneficiary || args?.account,
                        amount: args?.value.toString()
                    }));
                    log(name, 'from', fromBlock, 'to', toBlock, 'got', docs.length);
                    await vewomModel.bulkSave(docs);
                    fromBlock = toBlock + 1;
                }
            });
        });
    },

    async calculate(args: any) {
        const logs = await vewomModel.find(getBlockRangeFilter(args)).lean();
        const {address, abi} = this.meta;
        const timezoneOffset = new Date().getTimezoneOffset() * 6e4;
        function getDateTimeFromSeconds(seconds: number) {
            return new Date(seconds * 1e3 - timezoneOffset).toISOString();
        }

        async function getUserInfosBatch(holders: string[], idx: number, blockEnd?: number): Promise<any> {
            const [maybeTagableProvider, overrides] = getProviderAndOverridesByBlockTag(blockEnd);
            const contract = new Contract(address, abi, maybeTagableProvider);
            console.log('veWom getUserInfos', {from: idx, total: holders.length, provider: maybeTagableProvider.connection.url});
            try {
                const userInfos = await Promise.all(holders.map(async holder => {
                    const {breedings} = await contract.getUserInfo(holder, overrides);
                    // console.log({holder, breedings});
                    const [womAmount, veWomAmount] = breedings.reduce((acc: BigNumber[], info: any) => {
                        acc[0] = acc[0].add(info.womAmount ?? BigNumber.ZERO);
                        acc[1] = acc[1].add(info.veWomAmount ?? BigNumber.ZERO);

                        return acc;
                    }, [BigNumber.ZERO, BigNumber.ZERO]);

                    return {holder, womAmount, veWomAmount, breedings};
                }));

                return userInfos;
            } catch (err) {
                console.log(holders, idx, err);

                return getUserInfosBatch(holders, idx);
            }
        }

        async function getUserInfos(users: string[], batchSize = 100) {
            // const resp = await veWomContract.getUserInfo(users[1]);
            // console.log(resp);
            // return;
            const userInfos = [];
            for (let i = 0; i < users.length; i += batchSize) {
                userInfos.push(...(await getUserInfosBatch(users.slice(i, i + batchSize), i, args.blockEnd)));
            }

            const holderTitle = ['holder', 'womAmount', 'veWomAmount'].join(columnSeparator);
            const holderContent = userInfos.map(({holder, womAmount, veWomAmount}) => {
                return [holder, womAmount.toDecimal(), veWomAmount.toDecimal()].join(columnSeparator);
            });
            const holderTable = [holderTitle, ...holderContent].join(lineBreak);

            // ref: https://docs.wombat.exchange/docs/understanding-wombat/staking#vewom
            // veWom = lockWom * k * Math.sqrt(lockDays)
            // k = 1 / Math.sqrt(fourYearDays)
            // lockDays = (veWom/(lockWom * k)) ** 2
            // lockDays = (veWom * Math.sqrt(fourYearDays)/lockWom) ** 2
            const fourYearDaysSqrt = BigNumber.fromDecimal(Math.sqrt(4 * 365 + 1).toString());
            const getLockDays = (veWomAmount: BigNumber, womAmount: BigNumber) => {
                const sqrt = veWomAmount.mul(fourYearDaysSqrt).div(womAmount);

                return sqrt.mul(sqrt).changeDecimals(36).toDecimal({precision: 0});
            };

            const holderDetailTitle = ['holder', 'lockDays', 'unlockTime', 'womAmount', 'veWomAmount'].join(columnSeparator);
            const holderDetailContent = userInfos.flatMap(({holder, breedings}) => {
                return breedings.map(({unlockTime, womAmount, veWomAmount}: any) => [holder, getLockDays(veWomAmount, womAmount), getDateTimeFromSeconds(unlockTime), womAmount.toDecimal(), veWomAmount.toDecimal()].join(columnSeparator));
            });
            const holderDetailTable = [holderDetailTitle, ...holderDetailContent].join(lineBreak);

            return [holderTable, holderDetailTable];
        }

        const depositorMap: Record<string, BigNumber> = {};
        logs.forEach(({event, user, amount}) => {
            if (event === 'Mint') {
                if (!depositorMap[user]) {
                    depositorMap[user] = BigNumber.from(amount);
                } else {
                    depositorMap[user] = depositorMap[user].add(amount);
                }

                return;
            }

            // Burn
            depositorMap[user] = depositorMap[user].sub(amount);
        });
        const entries = Object.entries(depositorMap).sort(([, amount1], [, amount2]) => -bnCompare(amount1, amount2));
        const users = (await filterContract(entries.filter(([, amount]) => amount.noneZero()))).map(([user]) => user);
        const [holderTable, holderDetailTable] = await getUserInfos(users);

        const zip = new ZipFile();
        zip.addBuffer(Buffer.from(holderTable), 'vewom-holder.csv');
        zip.addBuffer(Buffer.from(holderDetailTable), 'vewom-holder-detail.csv');
        zip.end();

        return zip.outputStream;
    },

    async crawlAndCalculate(args: any) {
        await this.crawl();

        return this.calculate(args);
    }
};

export default vewomScript;
