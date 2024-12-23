/**
 * @Author: sheldon
 * @Date: 2024-02-07 07:58:11
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-10-11 15:08:22
 */

import arbiOutput from '@equilibria/contracts/deployment/arbiOutput.json';
// import bnbOutput from '@equilibria/contracts/deployment/bscOutput.json';
import mainnetOutput from '@equilibria/contracts/deployment/mainnetOutput.json';
import opOutput from '@equilibria/contracts/deployment/optimismOutput.json';

import {arbiBatchProvider, arbiProvider, batchProvider, ethBatchProvider, ethProvider, opBatchProvider, opProvider, provider} from './mongo/quoll/util';

(arbiOutput as any).vaultEPendle = arbiOutput.vaultEPendleArbi;

const ChainOutputMap = {
    eth: mainnetOutput,
    arb: arbiOutput,
    op: opOutput,
    // bnb: bnbOutput
};

export const ChainProviderMap = {
    eth: ethProvider,
    arb: arbiProvider,
    op: opProvider,
    bnb: provider
};

export const ChainBatchProviderMap = {
    eth: ethBatchProvider,
    arb: arbiBatchProvider,
    op: opBatchProvider,
    bnb: batchProvider
};

export function getAllEqbAddressByContractKey(contractKey: string) {
    return Object.fromEntries(Object.entries(ChainOutputMap).flatMap(([chain, output]) => {
        const {address} = (output as any)[contractKey] ?? {};
        if (!address) {
            return [];
        }

        return [[chain, address]];
    }));
}
