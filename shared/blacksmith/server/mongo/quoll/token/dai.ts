/*
 * @Author: xiaodongyu
 * @Date: 2023-01-30 21:24:41
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-09 16:59:13
 */

import {BigNumber} from 'ethers';
import {model} from 'mongoose';

import AddressMap from '@quoll/frontend/src/contract/address-stake-lp.json';

import {getBlockRangeFilter, tokenSelf} from '../util';
import createToken from './base';
import tokenSchema from './scheme';

const {log} = console;
const {zap} = AddressMap['56'];
const daiModel = model('daiTransfer', tokenSchema);
const daiTransferScript = createToken({
    name: 'daiTransferScript',
    address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    creationBlock: 25235138, // blockNumber at Jan-30-2023 01:26:20 PM +UTC
    description: 'dai token',
    customMaxBlockDiff: 50,
    filterDoc(doc) {
        return doc.to === zap;
    }
}, daiModel);

daiTransferScript.calculate = async args => {
    const logs = await daiModel.find(getBlockRangeFilter(args)).lean();
    const ten = BigNumber.fromDecimal('10');
    const depositorMap: Record<string, BigNumber> = {};
    logs.forEach(({from, to, value}: any) => {
        if (from !== tokenSelf && to === zap) {
            if (!depositorMap[from]) {
                depositorMap[from] = BigNumber.from(value);
            } else {
                depositorMap[from] = depositorMap[from].add(value);
            }
        }
    });

    const validDepositors = Object.entries(depositorMap).flatMap(([userAccount, amount]) => amount.gte(ten) ? userAccount : []);

    log('At least 10 dai depositors count:', validDepositors.length);

    return validDepositors;
};

export default daiTransferScript;
