/*
 * @Author: xiaodongyu
 * @Date: 2023-01-30 21:32:16
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-01 11:43:28
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import {getBlockRangeFilter, tokenSelf, voterProxyAddress} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const lpDaiModel = model('lpDaiTransfer', tokenSchema);
const lpDaiTransferScript = createToken({
    name: 'lpDaiTransferScript',
    address: '0x9D0a463D5dcB82008e86bF506eb048708a15dd84',
    creationBlock: 25235138, // blockNumber at Jan-30-2023 01:26:20 PM +UTC
    description: 'lp-dai token'
}, lpDaiModel);

lpDaiTransferScript.calculate = async args => {
    const logs = await lpDaiModel.find(getBlockRangeFilter(args)).lean();
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

    log('At least 10 LP-DAI depositors count:', validDepositors.length);

    return validDepositors;
};

export default lpDaiTransferScript;
