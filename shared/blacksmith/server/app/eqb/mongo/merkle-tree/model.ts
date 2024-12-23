import {Schema, model} from 'mongoose';

const required = true;

const EqbMerkleTreeRewardSchema = new Schema({
    identifier: { // unique identifier for each merkle tree, such as Google sheetId + sheetName, used to identify the original tree when root changed
        type: String,
        required
    },
    root: {
        type: String,
        required
    },
    leafEncoding: {
        type: String,
        required
    },
    account: {
        type: String,
        required
    },
    amount: {
        type: Schema.Types.Mixed, // String | String[]
        required
    },
    proof: {
        type: [String],
        required
    },
}, {
    timestamps: true
});

export const EqbMerkleTreeRewardModel = model('eqb_merkle_tree_reward', EqbMerkleTreeRewardSchema);
