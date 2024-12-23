/**
 * @Author: sheldon
 * @Date: 2024-02-22 22:02:55
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-02-22 23:04:43
 */

import {Schema, model} from 'mongoose';

const required = true;

const GroupSchema = new Schema({
    rank: {
        type: Number,
        required
    },
    // tree root
    group: {
        type: String,
        required
    },
    totalETH: {
        type: String,
        required
    },
    currentBoost: {
        type: Number,
        required
    }
});

const euclidAssetDepositorGroupRankingSchema = new Schema({
    groups: {
        type: [GroupSchema],
        required
    }
}, {timestamps: true});

export default model('euclid_asset_depositor_group_ranking', euclidAssetDepositorGroupRankingSchema);
