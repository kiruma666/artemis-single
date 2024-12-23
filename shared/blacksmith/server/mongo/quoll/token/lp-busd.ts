/*
 * @Author: xiaodongyu
 * @Date: 2023-01-30 21:32:16
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-01 11:43:05
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import {getBlockRangeFilter, tokenSelf, voterProxyAddress} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const lpBusdModel = model('lpBusdTransfer', tokenSchema);
const lpBusdTransferScript = createToken({
    name: 'lpBusdTransferScript',
    address: '0xF319947eCe3823b790dd87b0A509396fE325745a',
    creationBlock: 25235138, // blockNumber at Jan-30-2023 01:26:20 PM +UTC
    description: 'lp-busd token'
}, lpBusdModel);

lpBusdTransferScript.calculate = async args => {
    const logs = await lpBusdModel.find(getBlockRangeFilter(args)).lean();
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

    log('At least 10 LP-BUSD depositors count:', validDepositors.length);

    return validDepositors;
};

export default lpBusdTransferScript;
