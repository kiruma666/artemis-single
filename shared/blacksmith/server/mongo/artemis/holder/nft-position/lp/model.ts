/**
 * @Author: sheldon
 * @Date: 2024-02-07 07:24:18
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-27 21:49:29
 */

import {model, Schema} from 'mongoose';

const required = true;

const lpPositionSchema = new Schema({
    holder: {
        type: String,
        required
    },
    liquidity: {
        type: String,
        required
    },
    token0: {
        type: String,
        required
    },
    token1: {
        type: String,
        required
    }
});
const lpDailyPostionSchema = new Schema({
    positions: {
        type: [lpPositionSchema],
        required
    }
}, {
    timestamps: true
});

const lpPositionModel = model('artemis_holder_lp_position', lpDailyPostionSchema);

export default lpPositionModel;
