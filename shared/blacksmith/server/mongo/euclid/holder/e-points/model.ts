/**
 * @Author: sheldon
 * @Date: 2024-02-22 22:02:55
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-22 18:10:56
 */

import {Schema, model} from 'mongoose';

const required = true;

const EPointSchema = new Schema({
    user: {
        type: String,
        required
    },
    ePoints: {
        type: Number,
        required
    },
    group: {
        type: String
    },
    rank: {
        type: Number
    },
    vlEqbBoost: {
        type: Number,
        required
    },
    ePendleBoost: {
        type: Number,
        required
    },
    groupBoost: {
        type: Number,
        required
    },
    dailyBaseEPoints: {
        type: Number,
        required
    },
    stakedAmount: {
        type: Number
    },
    unStakedAmount: {
        type: Number
    }
});

const euclidAssetDepositorEPointsSchema = new Schema({
    points: {
        type: [EPointSchema],
        required
    }
}, {timestamps: true});

export default model('euclid_asset_depositor_e_points', euclidAssetDepositorEPointsSchema);
