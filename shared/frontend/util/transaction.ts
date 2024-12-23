/*
 * @Author: sheldon
 * @Date: 2023-01-29 14:26:35
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-06-06 18:03:01
 */

import {BigNumber, Contract, PayableOverrides} from 'ethers';

export const oneAndHalf = (value: BigNumber): BigNumber => value.add(value.div(2));
export const oneAndQuarter = (value: BigNumber): BigNumber => value.add(value.div(4));

export async function populateGasLimit({
    contract,
    method,
    args = [],
    overrides = {},
    getGasLimit = oneAndHalf,
    unsignedTx
}: {
    contract: Contract,
    method: string,
    args?: any[],
    overrides?: PayableOverrides,
    getGasLimit?: (estimatedGas: BigNumber) => BigNumber,
    unsignedTx?: boolean
}): Promise<any> {
    const populatedOverrides = {...overrides};
    try {
        const estimatedGas: BigNumber = await contract.estimateGas[method](...args, overrides);
        populatedOverrides.gasLimit = getGasLimit(estimatedGas);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log('populateGasLimit error', err);
    }

    if (unsignedTx) {
        return contract.populateTransaction[method](...args, populatedOverrides);
    }

    return contract[method](...args, populatedOverrides);
}
