/**
 * @Author: sheldon
 * @Date: 2024-02-22 22:02:55
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-01 22:35:13
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
    totalMetis: {
        type: String,
        required
    },
    currentBoost: {
        type: Number,
        required
    }
});

const artemisAssetDepositorGroupRankingSchema = new Schema({
    groups: {
        type: [GroupSchema],
        required
    }
}, {timestamps: true});

export default model('artemis_asset_depositor_group_ranking', artemisAssetDepositorGroupRankingSchema);
