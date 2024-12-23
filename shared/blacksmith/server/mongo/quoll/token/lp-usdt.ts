/*
 * @Author: xiaodongyu
 * @Date: 2023-01-30 21:32:16
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-01 11:44:17
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import {getBlockRangeFilter, tokenSelf, voterProxyAddress} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const lpUsdtModel = model('lpUsdtTransfer', tokenSchema);
const lpUsdtTransferScript = createToken({
    name: 'lpUsdtTransferScript',
    address: '0x4F95fE57BEA74b7F642cF9c097311959B9b988F7',
    creationBlock: 25235138, // blockNumber at Jan-30-2023 01:26:20 PM +UTC
    description: 'lp-usdt token'
}, lpUsdtModel);

lpUsdtTransferScript.calculate = async args => {
    const logs = await lpUsdtModel.find(getBlockRangeFilter(args)).lean();
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

    log('At least 10 LP-USDT depositors count:', validDepositors.length);

    return validDepositors;
};

export default lpUsdtTransferScript;
