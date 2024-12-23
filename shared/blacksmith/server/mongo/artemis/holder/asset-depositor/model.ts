/**
 * @Author: sheldon
 * @Date: 2024-02-10 22:27:51
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-03-01 22:06:02
 */

import {Schema, model} from 'mongoose';

const required = true;

const artemisAssetDepositorSchema = new Schema({
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
    user: {
        type: String,
        required
    },
    amount: {
        type: String,
        required
    },
    artMetisAmount: {
        type: String,
        required
    },
    referralId: {
        type: String,
        // required
    }
});

// artemisAssetDepositorSchema.index({transactionHash: 1, logIndex: 1}, {unique: true});

const ArtemisAssetDepositorModel = model('artemis_asset_depositor_event', artemisAssetDepositorSchema);

export default ArtemisAssetDepositorModel;
