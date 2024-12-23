/*
 * @Author: xiaodongyu
 * @Date: 2022-10-13 10:59:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-12-12 23:15:23
 */

import {Schema, model} from 'mongoose';

const required = true;

const poolSchema = new Schema({
    blockNumber: {
        type: Number,
        required
    },
    transactionHash: {
        type: String,
        required
    },
    event: {
        type: String,
        default: '',
    },
    poolid: {
        type: Number,
        required
    },
    args: {
        type: Schema.Types.Mixed,
        required
    }
});

poolSchema.index({'transactionHash': 1, 'poolid': 1, 'event': 1, 'args.user': 1, 'args.rewardToken': 1}, {unique: true});

const wombatBoosterRewardPoolPaidModel = model('wombatBoosterRewardPoolPaid', poolSchema);

export default wombatBoosterRewardPoolPaidModel;
