/*
 * @Author: xiaodongyu
 * @Date: 2023-01-30 21:32:16
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-01 11:43:57
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import {getBlockRangeFilter, tokenSelf, voterProxyAddress} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const lpUsdcModel = model('lpUsdcTransfer', tokenSchema);
const lpUsdcTransferScript = createToken({
    name: 'lpUsdcTransferScript',
    address: '0xb43Ee2863370a56D3b7743EDCd8407259100b8e2',
    creationBlock: 25235138, // blockNumber at Jan-30-2023 01:26:20 PM +UTC
    description: 'lp-usdc token'
}, lpUsdcModel);

lpUsdcTransferScript.calculate = async args => {
    const logs = await lpUsdcModel.find(getBlockRangeFilter(args)).lean();
    const ten = BigNumber.fromDecimal('10');
    const depositorMap: Record<string, BigNumber> = {};
    logs.forEach(({from, to, value}: any) => {
        if (from !== tokenSelf && to === voterProxyAddress) {
            if (!depositorMap[from]) {
                depositorMap[from] = BigNumber.from(value);
            } else {
                depositorMap[from] = depositorMap[from].add(value);
            }
        }
    });

    const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(ten) ? userAccount : []);

    log('At least 10 LP-USDC depositors count:', validDepositors.length);

    return validDepositors;
};

export default lpUsdcTransferScript;
