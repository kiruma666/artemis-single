import {Schema, model} from 'mongoose';

const required = true;

const EigenLayerAssetDepositorEventSchema = new Schema({
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
    asset: {
        type: String,
        required
    },
    strategy: {
        type: String,
        required
    },
    amount: {
        type: String,
        required
    },
    blockTimestamp: {
        type: Number,
        required
    }
});

const EigenLayerAssetDepositorEventModel = model('eigen_layer_asset_depositor_event', EigenLayerAssetDepositorEventSchema);

export default EigenLayerAssetDepositorEventModel;
