import {Application, json} from 'express';
import md5 from 'md5';

import {isValidWalletAddress} from '@shared/fe/util/address';

import {VoteProposalModel, UserVoteRewardModel} from './model';

async function updateVoteReward(params: any) {
    const {proposalInfos = [], userRewards = [], isFullUpdate = false} = params;
    console.log(`[EQB][VoteReward] updating vote reward, proposalInfos: ${proposalInfos.length}, userRewards: ${userRewards.length}`);

    const now = new Date();

    for (const proposalInfo of proposalInfos) {
        console.log(`[EQB][VoteReward] updating proposal info ${proposalInfo.proposal}`);
        const proposalUpsertResult = await VoteProposalModel.updateOne({proposal: proposalInfo.proposal}, proposalInfo, {upsert: true});
        console.log(`[EQB][VoteReward] updated proposal info ${proposalInfo.proposal}`, proposalUpsertResult);

        const proposalUserRewards = userRewards.filter((userReward: any) => userReward.proposal === proposalInfo.proposal);
        console.log(`[EQB][VoteReward] updating proposal userRewards ${proposalInfo.proposal}, count: ${proposalUserRewards.length}`);
        const bulkUpdateUserRewardsOps = proposalUserRewards.map((userReward: any) => {
            userReward.voter = userReward.voter.toLowerCase();

            return {
                updateOne: {
                    filter: {proposal: userReward.proposal, voter: userReward.voter},
                    update: userReward,
                    upsert: true,
                },
            };
        });
        const userRewardsUpsertResult = await UserVoteRewardModel.bulkWrite(bulkUpdateUserRewardsOps);
        console.log(`[EQB][VoteReward] updated proposal userRewards ${proposalInfo.proposal}`, userRewardsUpsertResult);

        console.log(`[EQB][VoteReward] deleting outdated userRewards ${proposalInfo.proposal}`);
        const userRewardsDeleteResult = await UserVoteRewardModel.deleteMany({proposal: proposalInfo.proposal, updatedAt: {$lt: now}});
        console.log(`[EQB][VoteReward] deleted outdated userRewards ${proposalInfo.proposal}`, userRewardsDeleteResult);
    }

    if (isFullUpdate) {
        console.log('[EQB][VoteReward] full update, deleting outdated data');
        const proposalDeleteResult = await VoteProposalModel.deleteMany({updatedAt: {$lt: now}});
        const userRewardsDeleteResult = await UserVoteRewardModel.deleteMany({updatedAt: {$lt: now}});
        console.log('[EQB][VoteReward] full update, deleted outdated data', {proposalDeleteResult, userRewardsDeleteResult});
    }

    console.log('[EQB][VoteReward] updating vote reward done.');
}

export function mountEqbVoteReward(app: Application) {
    let voteRewardUpdateLock: string | null = null;
    let voteRewardUpdatePromise: Promise<void> | null = null;
    app.post('/su/api/eqb/vote-reward', json({limit: '10MB'}), async (req, res) => {
        const hash = md5(JSON.stringify(req.body));
        if (voteRewardUpdateLock) {
            if (voteRewardUpdateLock !== hash) {
                console.log('[EQB][VoteReward] write is locked', {voteRewardUpdateLock, hash});

                return res.status(500).json({message: 'write is locked'});
            }

            if (voteRewardUpdatePromise) {
                console.log('[EQB][VoteReward] write is already in progress', {voteRewardUpdateLock, hash});

                voteRewardUpdatePromise
                    .then(() => res.json({success: true}))
                    .catch(err => res.status(500).json({message: (err as any).message}));

                return;
            }

            console.log('[EQB][VoteReward] write is locked but promise is missing', {voteRewardUpdateLock, hash});

            return res.status(500).json({message: 'wrong server status'});
        }

        voteRewardUpdateLock = hash;
        voteRewardUpdatePromise = updateVoteReward(req.body);

        voteRewardUpdatePromise
            .then(() => res.json({success: true}))
            .catch(err => {
                console.error('[EQB][VoteReward] write error', err);
                res.status(500).json({message: (err as any).message});
            })
            .finally(() => {
                voteRewardUpdateLock = null;
                voteRewardUpdatePromise = null;
            });
    });

    app.get('/api/eqb/vote-proposal', async (req, res) => {
        try {
            const proposalInfos = await VoteProposalModel.find({}, '-_id -__v -strategies._id').lean();
            res.status(200).json({proposalInfos});
        } catch (err) {
            console.error('[EQB][VoteProposal] error', err);
            res.status(500).json({message: (err as any).message});
        }
    });

    app.get('/api/eqb/vote-reward', async (req, res) => {
        try {
            const voter = req.query.voter as string;
            if (!voter) {
                return res.status(400).json({message: 'voter is required'});
            }

            if (typeof voter !== 'string' || !isValidWalletAddress(voter)) {
                return res.status(400).json({message: 'invalid voter address'});
            }

            const userRewards = await UserVoteRewardModel.find({voter: voter.toLowerCase()}, '-_id -__v -rewards._id').lean();
            res.status(200).json({userRewards});
        } catch (err) {
            console.error('[EQB][VoteReward] read error', err);
            res.status(500).json({message: (err as any).message});
        }
    });
}
