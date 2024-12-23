import {Schema, model} from 'mongoose';

const required = true;

const VoteProposalSchema = new Schema({
    proposal: {
        type: String,
        required
    },
    config: {
        type: Schema.Types.Mixed,
        required
    },
    allChoiceNames: {
        type: [String],
        required
    },
    strategies: {
        type: [{
            name: {
                type: String,
                required
            },
            network: {
                type: String,
                required
            },
        }],
        required
    },
}, {
    timestamps: true
});

const UserVoteRewardSchema = new Schema({
    proposal: {
        type: String,
        required
    },
    voter: {
        type: String,
        required
    },
    vp: {
        type: Number,
        required
    },
    vp_by_strategy: {
        type: [Number],
        required
    },
    choice: {
        type: Schema.Types.Mixed,
        required
    },
    rewards: {
        type: [{
            option: {
                type: Number,
                required
            },
            amount: {
                type: String,
                required
            },
        }],
        required
    }
}, {
    timestamps: true
});

export const VoteProposalModel = model('eqb_vote_proposal', VoteProposalSchema);
export const UserVoteRewardModel = model('eqb_user_vote_reward', UserVoteRewardSchema);
