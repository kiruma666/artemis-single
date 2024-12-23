/**
 * @Author: sheldon
 * @Date: 2024-02-22 22:02:55
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-07-10 23:48:41
 */

import {Schema, model} from 'mongoose';

const required = true;

const ArtPointsSchema = new Schema({
    user: {
        type: String,
        required
    },
    artPoints: {
        type: Number,
        required
    },
    totalStakePoints: {
        type: Number,
        required
    },
    totalHerculesPoints: {
        type: Number,
        required
    },
    totalLendingPoints: {
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
    eqbToLock: {
        type: Number,
        required
    },
    ePendleBoost: {
        type: Number,
        required
    },
    ePendleToBuy: {
        type: Number,
        required
    },
    groupBoost: {
        type: Number,
        required
    },
    depositPoints: {
        type: Number,
        required
    },
    swapedArtMetis: {
        type: Number,
        required
    },
    withdrawedArtMetis: {
        type: Number,
        required
    },
    dailyBaseStakePoints: {
        type: Number,
        required
    },
    dailyBaseHerculesPoints: {
        type: Number,
        required
    },
    dailyBaseLendingPoints: {
        type: Number,
        required
    }
});

const artemisAssetDepositorArtPointsSchema = new Schema({
    points: {
        type: [ArtPointsSchema],
        required
    }
}, {timestamps: true});

export default model('artemis_asset_depositor_art_points', artemisAssetDepositorArtPointsSchema);
