/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-02-07 14:53:04
 */

import {Schema, model} from 'mongoose';

const required = true;

const schema = new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    logIndex: {
        type: Number,
        required
    },
    user: {
        type: String,
        required
    },
    depositedWom: {
        type: String,
        required
    },
    obtainedQWom: {
        type: String,
        required
    }
});

schema.index({transactionHash: 1, logIndex: 1}, {unique: true});

const womSmartConvertorModel = model('womSmartConvertor', schema);

export default womSmartConvertorModel;
