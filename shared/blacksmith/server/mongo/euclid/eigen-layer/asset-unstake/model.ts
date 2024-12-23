import {Schema, model} from 'mongoose';

const required = true;

const EigenLayerLRTUnstakingVaultEventSchema = new Schema({
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
    amount: {
        type: String,
        required
    },
    blockTimestamp: {
        type: Number,
        required
    }
});

const EigenLayerLRTUnstakingVaultEventModel = model('eigen_layer_lrt_unstaking_vault_event', EigenLayerLRTUnstakingVaultEventSchema);

export default EigenLayerLRTUnstakingVaultEventModel;
