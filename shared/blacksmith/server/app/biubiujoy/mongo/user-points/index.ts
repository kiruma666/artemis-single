/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:39:38
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-13 21:54:16
 */

import {Application, json} from 'express';

import {
    BIU_API_TOP_RANKS_LIMIT,
    INTERNAL_API_PATH_PREFIX
} from 'server/util/constant';

import {findUserByWalletAddressIgnoreCase, pickPublicUserFields, UserModel} from '../user/model';
import {UserInviteCodeModel} from '../user-invite-code/model';

import {UserPointsModel, UserPointStatus} from './model';
import {countUserPoints, onboardingQuests} from './service';

const numOfTopRanks = Number(BIU_API_TOP_RANKS_LIMIT) || 5;

export function mountBiuUserPoints(app: Application) {
    const apiPath = '/api/biu/user-points';

    app.get(apiPath, async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress) {
            return res.status(400).json({error: 'walletAddress is required'});
        }

        try {
            const user = await findUserByWalletAddressIgnoreCase(walletAddress as string);
            if (!user) {
                return res.status(400).json({error: 'user not exists'});
            }

            const userPoints = await UserPointsModel.find({userId: user._id}).lean();
            res.json({
                total: userPoints.length,
                list: userPoints,
            });
        } catch (err) {
            console.error('[UserPoints][Get] failed', err);
            res.status(500).json({error: 'Error getting user points'});
        }
    });

    app.put(apiPath, json(), async (req, res) => {
        const {walletAddress, ids, status} = req.body;
        if (!walletAddress || !ids || !ids.length || status !== UserPointStatus.CLAIMED) {
            console.error('[UserPoints][Put] Bad request', req.body);

            return res.status(400).json({error: 'Bad request'});
        }

        try {
            const points = await UserPointsModel.find({_id: {$in: ids}});
            const user = await findUserByWalletAddressIgnoreCase(walletAddress);
            if (!points.length || !user || points.some(point => !point.userId.equals(user._id))) {
                console.error('[UserPoints][Put] User mismatch', req.body);

                return res.status(400).json({error: 'Bad request'});
            }

            await Promise.all(points.map(point => {
                point.status = status;

                return point.save();
            }));

            res.status(200).json({success: true});
        } catch (err) {
            console.error('[UserPoints][Put] failed', err);
            res.status(500).json({error: 'Internal Server Error'});
        }
    });

    app.get(`${apiPath}/quests`, async (req, res) => {
        res.json({onboardingQuests});
    });

    app.get(`${INTERNAL_API_PATH_PREFIX}${apiPath}/count`, async (req, res) => {
        try {
            const result = await countUserPoints();
            res.json(result);
        } catch (err) {
            console.error('[UserPoints][Count] failed', err);
            res.status(500).json({error: 'Error counting user points'});
        }
    });

    app.get('/api/biu/user-ranks', async (req, res) => {
        const {walletAddress} = req.query;

        try {
            const result = await countUserPoints();

            const totalPoints = result.totalPoints.total;
            const totalParticipants = result.countUsers;

            const topRanks = result.userPoints.slice(0, numOfTopRanks);
            const topUsers = await UserModel.find({_id: {$in: topRanks.map(item => item.userId)}});

            const user = walletAddress && await findUserByWalletAddressIgnoreCase(walletAddress as string);
            const myRank = user && result.userPoints.find(item => user._id.equals(item.userId));

            const inviteCodes = await UserInviteCodeModel.find({userId: {$in: [
                ...topUsers.map(item => item._id),
                ...(user ? [user._id] : [])
            ]}});
            // inviteCode => inviteCount
            const inviteCounts: Record<string, number> = Object.fromEntries(await Promise.all(
                inviteCodes.map(async ({inviteCode}) => ([
                    inviteCode,
                    await UserModel.countDocuments({invitedBy: inviteCode})
                ]))
            ));

            const countInvites = (userId: string) => inviteCodes
                .filter(item => item.userId.equals(userId))
                .map(item => inviteCounts[item.inviteCode])
                .reduce((acc, count) => acc + count, 0);

            const data = {
                summary: {
                    totalPoints,
                    totalParticipants
                },

                topRanks: topRanks.map((item, index) => {
                    const topUser = topUsers.find(user => user._id.equals(item.userId));

                    return {
                        ranking: index + 1,
                        points: item.points.total,
                        invites: countInvites(item.userId),
                        user: topUser && pickPublicUserFields(topUser)
                    };
                }),

                myRank: user && {
                    ranking: myRank ? result.userPoints.indexOf(myRank) + 1 : result.countUsers + 1,
                    points: myRank ? myRank.points.total : 0,
                    invites: countInvites(user._id.toString()),
                    user: pickPublicUserFields(user)
                }
            };

            res.json(data);
        } catch (err) {
            console.error('[UserPoints][GetRanks] failed', err);
            res.status(500).json({error: 'Error getting user ranks'});
        }
    });
}
