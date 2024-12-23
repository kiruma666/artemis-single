/**
 * @Author: sheldon
 * @Date: 2024-02-07 07:24:18
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-24 17:11:59
 */

import {model, Schema} from 'mongoose';

const required = true;

const nftPositionSchema = new Schema({
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
const nftDailyPostionSchema = new Schema({
    positions: {
        type: [nftPositionSchema],
        required
    }
}, {
    timestamps: true
});

const nftPositionModel = model('artemis_holder_nft_position', nftDailyPostionSchema);

export default nftPositionModel;
