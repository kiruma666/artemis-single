/**
 * @Author: sheldon
 * @Date: 2024-06-06 23:39:38
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-13 21:54:16
 */

import {Application} from 'express';

import {getMaskedAddress} from '@shared/fe/util/address';

import {
    API_TOP_RANKS_LIMIT,
    INTERNAL_API_PATH_PREFIX
} from 'server/util/constant';

import {pickPublicUserFields, UserModel} from '../user/model';
import {UserInviteCodeModel} from '../user-invite-code/model';

import {UserPointsModel} from './model';
import {syncUserPoints, countUserPoints, getLockPointsBoostRatio} from './service';

const numOfTopRanks = Number(API_TOP_RANKS_LIMIT) || 5;

export function mountUserPoints(app: Application) {
    const apiPath = '/api/user-points';

    app.get(apiPath, async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress) {
            return res.status(400).send('walletAddress is required');
        }

        try {
            const user = await UserModel.findOne({walletAddress});
            if (!user) {
                return res.status(400).send('user not exists');
            }

            const lockPointsBoostRatio = await getLockPointsBoostRatio(user);
            const userPoints = await UserPointsModel.find({userId: user._id}).lean();
            res.json({
                ratio: {
                    lockPointsBoostRatio
                },

                total: userPoints.length,
                list: userPoints,
            });
        } catch (err) {
            console.error('[UserPoints][Get] failed', err);
            res.status(500).send('Error getting user points');
        }
    });

    app.get(`${apiPath}/sync`, async (req, res) => {
        const {walletAddress, source = 'WHITELIST'} = req.query;
        if (!walletAddress || typeof walletAddress !== 'string') {
            res.status(400).json({
                success: false,
                errorMessage: 'Invalid walletAddress'
            });

            return;
        }

        try {
            const sources = typeof source === 'string' ? [source] : source;
            await syncUserPoints(walletAddress, sources as any[]);

            res.json({success: true});

            console.log('[UserPoints][Sync] done: walletAddress=', walletAddress);
        } catch (err: any) {
            console.error('[UserPoints][Sync] failed', err);

            res.status(500).json({
                success: false,
                errorMessage: err?.message || 'Internal error occurred'
            });
        }
    });

    app.get(`${INTERNAL_API_PATH_PREFIX}${apiPath}/count`, async (req, res) => {
        try {
            const result = await countUserPoints();
            res.json(result);
        } catch (err) {
            console.error('[UserPoints][Count] failed', err);
            res.status(500).send('Error counting user points');
        }
    });

    app.get('/api/user-ranks', async (req, res) => {
        const {walletAddress} = req.query;

        try {
            const result = await countUserPoints();

            const totalPoints = result.totalPoints.total;
            const totalGoatListPoints = result.totalPoints.totalWHITELIST;
            const totalInvitationPoints = result.totalPoints.totalINVITE;
            const totalParticipants = result.countUsers;

            const topRanks = result.userPoints.slice(0, numOfTopRanks);
            const topUsers = await UserModel.find({_id: {$in: topRanks.map(item => item.userId)}});

            const user = walletAddress && await UserModel.findOne({walletAddress});
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
                    totalGoatListPoints,
                    totalInvitationPoints,
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
            res.status(500).send('Error getting user ranks');
        }
    });

    app.get('/api/user-invites', async (req, res) => {
        const {walletAddress} = req.query;
        if (!walletAddress) {
            return res.status(400).send('walletAddress is required');
        }

        try {
            const user = await UserModel.findOne({walletAddress});
            if (!user) {
                return res.status(400).send('user not exists');
            }

            const userInvitePoints = await UserPointsModel.find({userId: user._id, source: 'INVITE'});
            const userInviteCodes = await UserInviteCodeModel.find({userId: user._id, inviteCode: {$ne: null}}).distinct('inviteCode');

            const invitedUserIds = await UserModel.find({invitedBy: {$in: userInviteCodes}}).distinct('_id');
            const invitedUsers = await UserModel.find({_id: {$in: invitedUserIds}});
            const invitedUserPoints = await UserPointsModel.find({userId: {$in: invitedUserIds}});

            const invites = invitedUserIds
                .map(userId => {
                    const invitedUser = invitedUsers.find(item => item._id.equals(userId));

                    const maskedAddress = getMaskedAddress(invitedUser?.walletAddress);
                    const points = invitedUserPoints.filter(item => item.userId.equals(userId)).reduce((acc, item) => acc + Number(item.points), 0);
                    const contributedPoints = userInvitePoints.filter(item => item.metadata?.contributorUserId.equals(userId)).reduce((acc, item) => acc + Number(item.points), 0);

                    return {
                        maskedAddress,
                        ...(invitedUser && pickPublicUserFields(invitedUser)),
                        points,
                        contributedPoints,
                        createdAt: invitedUser?.createdAt
                    };
                })
                .sort((a, b) => b.points - a.points);

            res.json({
                totalContributedPoints: userInvitePoints.reduce((acc, item) => acc + Number(item.points), 0),
                total: invites.length,
                list: invites
            });
        } catch (err) {
            console.error('[UserPoints][GetInvites] failed', err);

            res.status(500).send('Error getting user invites');
        }
    });
}
