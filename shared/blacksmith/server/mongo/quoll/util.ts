/*
 * @Author: xiaodongyu
 * @Date: 2022-09-14 18:44:31
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-01 23:01:14
 */

import axios from 'axios';
import {BigNumber, Contract, Event, providers} from 'ethers';

import '@shared/fe/util/number-extension';

import AddressModel from '../shared-model/address';
import ContractMetaModel from '../shared-model/contract-meta';

const {log} = console;
export const tokenSelf = '0x' + '0'.repeat(40);
// QuollAccountInWombat BSC Mainnet
export const voterProxyAddress = '0xe96c48C5FddC0DC1Df5Cf21d68A3D8b3aba68046';
// export const provider = new providers.JsonRpcProvider('https://bsc-dataseed2.defibit.io/');
export const provider = new providers.JsonRpcProvider('https://bscrpc.com');
export const arbiProvider = new providers.JsonRpcProvider('https://arbitrum-one.publicnode.com');
export const ethProvider = new providers.JsonRpcProvider('https://ethereum.publicnode.com');
export const opProvider = new providers.JsonRpcProvider('https://optimism.publicnode.com');
// QuickNode Archive Mode endpoint https://www.quicknode.com/endpoints
export const tagableProvider = new providers.JsonRpcBatchProvider('https://billowing-magical-sun.bsc.discover.quiknode.pro/e14ef5722b6bcfa8403bd98fbd6288cc50366b75/');
export const batchProvider = new providers.JsonRpcBatchProvider('https://bsc-dataseed2.defibit.io/');
export const arbiBatchProvider = new providers.JsonRpcBatchProvider('https://arbitrum-one.publicnode.com');
export const ethBatchProvider = new providers.JsonRpcBatchProvider('https://ethereum.publicnode.com');
export const opBatchProvider = new providers.JsonRpcBatchProvider('https://optimism.publicnode.com');
const metisRpcUrl = 'https://andromeda.metis.io/?owner=1088';
export const metisProvider = new providers.JsonRpcProvider(metisRpcUrl);
export const metisBatchProvider = new providers.JsonRpcBatchProvider(metisRpcUrl);
export const maxBlockDiff = 1000;

export function getProviderAndOverridesByBlockTag(blockTag?: number) {
    blockTag = (blockTag && +blockTag);
    log({blockTag});
    if (blockTag) {
        return [tagableProvider, {blockTag}] as const;
    }

    return [batchProvider, {}] as const;
}

export async function retryableQueryFilter(arg: {
    contract: Contract
    eventName: string
    fromBlock: number
    toBlock: number
}): Promise<Event[]> {
    const {contract, eventName, fromBlock, toBlock} = arg;
    try {
        return await contract.queryFilter(contract.filters[eventName](), fromBlock, toBlock);
    } catch (err) {
        log(err);

        return retryableQueryFilter(arg);
    }
}

export async function isContract(address: string, provider: providers.JsonRpcProvider = batchProvider) {
    const hasCode = await provider.getCode(address) !== '0x';
    const existed = await AddressModel.findOne({address});
    const newRecord = {
        address,
        isContract: hasCode
    };
    // prevent concurrent insert, so fetch before insert
    if (!existed) {
        try {
            await AddressModel.create(newRecord);
        } catch (err) {
            console.log('insert failed', newRecord, err);
        }
    }

    return hasCode;
}

export async function filterContract(entries: any[], batchSize = 100, provider?: providers.JsonRpcProvider) {
    log('filter start', {len: entries.length, batchSize});
    const addressMap = Object.fromEntries((await AddressModel.find().lean()).map(({address, isContract}) => [address, isContract]));
    // entries key (column[0]) is address
    const filtered = [];
    for (let i = 0; i < entries.length; i += batchSize) {
        filtered.push(...((await Promise.all(entries.slice(i, i + batchSize).map(async row => {
            const address = typeof row === 'string' ? row : row[0];
            let hasCode = addressMap[address];
            if (typeof hasCode !== 'boolean') {
                hasCode = await isContract(address, provider);
                addressMap[address] = hasCode;
                if (hasCode) log('new contract found', address);
            }

            return hasCode ? null : row;
        }))).filter(Boolean)));
    }

    log('filter end', {filtered: filtered.length});

    return filtered;
}

export const lineBreak = '\n';

export const blockGap = lineBreak.repeat(3);

export const columnSeparator = ',';

export const bnCompare = (bn1: BigNumber, bn2: BigNumber) => {
    if (bn1.lt(bn2)) return -1;

    if (bn1.eq(bn2)) return 0;

    return 1;
};

export async function wrapContractMeta(crawlWithBlockRange: (fromBlock: number, latestBlock: number) => Promise<any>, rpcProvider = provider) {
    const {creationBlock, customId} = this.meta;
    const address = customId ?? this.meta.address;
    const contractMeta = address && await ContractMetaModel.findOne({address});
    const latestBlock = await rpcProvider.getBlockNumber();
    let fromBlock = creationBlock;
    if (contractMeta) {
        fromBlock = contractMeta.nextCrawlBlock;
    }

    log({latestBlock, fromBlock});

    await crawlWithBlockRange(fromBlock, latestBlock);
    if (!address) return;

    if (!contractMeta) {
        await ContractMetaModel.create({
            address,
            nextCrawlBlock: latestBlock + 1
        });
    } else {
        await contractMeta.updateOne({
            nextCrawlBlock: latestBlock + 1
        });
    }
}

export function getBlockRangeFilter(args: any = {}) {
    const {blockStart, blockEnd} = args;
    const filter = {} as any;
    if (blockStart || blockEnd) {
        filter.blockNumber = {
            ...(blockStart ? {$gte: blockStart} : {}),
            ...(blockEnd ? {$lte: blockEnd} : {})
        };
    }

    return filter;
}

export async function wrapCrawl(crawlFn: () => Promise<any>) {
    if (this.crawling) {
        await this.crawling;

        return;
    }

    try {
        let crawlEnd: any;
        this.crawling = new Promise(resolve => (crawlEnd = resolve));

        await crawlFn.call(this);

        crawlEnd();
        this.crawling = null;
    } catch (err) {
        log(err);
        this.crawling = null;
    }
}

export const tableToMap = (table: any) => {
    const [, ...content] = table.split(lineBreak);

    return Object.fromEntries(content.map((userAmountLine: string) => {
        const [user, amountStr] = userAmountLine.split(columnSeparator);

        return [user, BigNumber.fromDecimal(amountStr)];
    })) as Record<string, BigNumber>;
};

export const tableToRecords = (table: string) => {
    const [header, ...content] = table.split(lineBreak);
    const columns = header.split(columnSeparator);

    return content.map((line: string) => {
        const values = line.split(columnSeparator);

        return Object.fromEntries(columns.map((column, i) => [column, values[i]]));
    });
};

export async function updateGalxeCredential(holders: string[], credId: string, accessToken?: string) {
    const operation = 'REPLACE';
    const items = holders;

    try {
        // Nodejs using Axios lib
        const axiosRes = await axios.post('https://graphigo.prd.galaxy.eco/query', {
            operationName: 'credentialItems',
            query: `mutation credentialItems($credId: ID!, $operation: Operation!, $items: [String!]!) 
            { 
                credentialItems(input: { 
                    credId: $credId 
                    operation: $operation 
                    items: $items 
                }) 
                { 
                    name 
                } 
            }`,
            variables: {
                // Make sure this is string type as int might cause overflow
                credId: credId,
                operation: operation,
                items: items
            },
        },
        {
            headers: {
                'access-token': accessToken || '6NV2iDCzQv68T2rC5Ti2yi5ndF4Um00q',
            }
        });
        log(axiosRes.data);
    } catch (err) {
        log(err);
    }
}
