/*
 * @Author: xiaodongyu
 * @Date: 2022-10-14 15:13:20
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2023-01-31 11:28:35
 */

import {Schema} from 'mongoose';

const required = true;

const tokenSchema = new Schema({
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
    from: {
        type: String,
        required
    },
    to: {
        type: String,
        required
    },
    value: {
        type: String,
        required
    }
});

tokenSchema.index({transactionHash: 1, logIndex: 1}, {unique: true});

export default tokenSchema;
