/*
 * @Author: xiaodongyu
 * @Date: 2022-09-14 15:10:52
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-09-22 17:33:04
 */

import '@shared/fe/util/number-extension.ts';

export const lineBreak = '\n';

export const blockGap = lineBreak.repeat(3);

export const columnSeparator = ' ';

export const getBlockNumberFromProcessArgv = () => {
    const {BlockHeight, BlockNumber, BlockTag} = process.env;
    const blockNumber = BlockHeight || BlockNumber || BlockTag;
    if (blockNumber && /^\d+$/.test(blockNumber)) {
        return +blockNumber;
    }

    return null;
};

export const bnCompare = (bn1, bn2) => {
    if (bn1.lt(bn2)) return -1;

    if (bn1.eq(bn2)) return 0;

    return 1;
};
