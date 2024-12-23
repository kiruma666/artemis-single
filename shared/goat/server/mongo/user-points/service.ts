import {
    WHITELIST_MAX_AMOUNT,
    WHITELIST_POINTS_RATIO,
    WHITELIST_CONTRIBUTION_RATIO,
    LOCK_POINTS_RATIO
} from 'server/util/constant';
import {getUserLockRecords, getUserWhitelistRecords, LockRecordRealStatus} from 'server/util/whitelist-api';

import {isEligibleForWhitelist, User, UserModel} from '../user/model';
import {UserInviteCodeModel} from '../user-invite-code/model';

import {UserPoints, UserPointsModel} from './model';

const whitelistMaxAmount = Number(WHITELIST_MAX_AMOUNT) || Infinity;
const whitelistPointsRatio = Number(WHITELIST_POINTS_RATIO);
const whitelistContributionRatio = Number(WHITELIST_CONTRIBUTION_RATIO);

const lockPointsRatio = Number(LOCK_POINTS_RATIO);

const DAILY_MS = 86400e3;

export async function upsertUserPoints(userPoints: Partial<UserPoints>, user?: User) {
    try {
        const {userId, source, idempotentKey, points} = userPoints;
        if (!userId || !source || !idempotentKey || !points) {
            console.error('[UserPoints][Upsert] missing required fields', userPoints);

            return;
        }

        const result = await UserPointsModel.updateMany({userId, source, idempotentKey}, userPoints, {upsert: true});
        console.log(`[UserPoints][Upsert] userId=${userId}, source=${source}, points=${points}, matched=${result.matchedCount}, upserted=${result.upsertedCount}`);
        if (result.matchedCount > 1) {
            console.error('[UserPoints][Upsert] matched more than one record', userPoints, result);
        }

        if (source === 'WHITELIST' && user?.invitedBy) {
            if (!whitelistContributionRatio) {
                return;
            }

            // create points for inviter
            const inviter = await UserInviteCodeModel.findOne({inviteCode: user.invitedBy});
            await upsertUserPoints({
                userId: inviter?.userId,
                points: (+points * whitelistContributionRatio).toString(),
                source: 'INVITE',
                idempotentKey: `INVITE:${idempotentKey}`,
                metadata: {
                    contributorUserId: userId,
                    contributorSource: source,
                    contributorIdempotentKey: idempotentKey
                }
            });
        }
    } catch (err) {
        console.error('[UserPoints][Create] failed', err);
    }
}

export async function getLockPointsBoostRatio(user: User) {
    const hasWhitelistPoints = await UserPointsModel.exists({
        userId: user._id,
        source: 'WHITELIST'
    });

    return hasWhitelistPoints ? 2 : 1;
}

async function syncUserWhitelistPoints(user: User) {
    if (!isEligibleForWhitelist(user)) {
        throw new Error('user not eligible for whitelist: walletAddress=' + user.walletAddress);
    }

    if (!whitelistPointsRatio) {
        throw new Error('WHITELIST_POINTS_RATIO not configured');
    }

    const {data: resBody} = await getUserWhitelistRecords(user.walletAddress);
    console.log(`[UserPoints][Sync][WHITELIST] fetched: walletAddress=${user.walletAddress}, fetchedSuccess=${resBody?.success}, records=${resBody?.user?.length}`);

    if (!resBody?.user.length) {
        return;
    }

    await Promise.all(
        resBody.user.map(record => {
            const {amount} = record;
            const points = (Math.min(whitelistMaxAmount, amount) * whitelistPointsRatio).toString();

            return upsertUserPoints({
                userId: user._id,
                points,
                source: 'WHITELIST',
                idempotentKey: `WHITELIST:${record.id}:${record.create_time}`,
                metadata: record
            }, user);
        })
    );
}

async function syncUserLockPoints(user: User) {
    if (!lockPointsRatio) {
        throw new Error('LOCK_POINTS_RATIO not configured');
    }

    const {data: resBody} = await getUserLockRecords(user.walletAddress);
    console.log(`[UserPoints][Sync][LOCK] fetched: walletAddress=${user.walletAddress}, fetchedSuccess=${resBody?.success}, records=${resBody?.data?.length}`);

    if (!resBody?.data.length) {
        return;
    }

    const boostRatio = await getLockPointsBoostRatio(user);
    await Promise.all(
        resBody.data
            .filter(record => record.real_status === LockRecordRealStatus.CONFIRMED)
            .map(record => {
                const {amount, create_time} = record;
                const dailyPoints = (+amount) * lockPointsRatio * boostRatio;

                const createdTimestamp = new Date(create_time).getTime();
                const now = Date.now();
                const numOfDays = Math.floor((now - createdTimestamp) / DAILY_MS); // TODO(pancake) calc by end_block_height

                console.log(`[UserPoints][Sync][LOCK] ${record.id}, create_time=${create_time}, numOfDays=${numOfDays}`);

                return [...new Array(numOfDays)].map((_, idx) => upsertUserPoints({
                    userId: user._id,
                    points: dailyPoints.toString(),
                    source: 'LOCK',
                    idempotentKey: `LOCK:${record.id}:${record.create_time}:${new Date(createdTimestamp + (idx + 1) * DAILY_MS).toISOString()}`,
                    metadata: record
                }, user));
            })
            .flat()
    );
}

export async function syncUserPoints(walletAddress: string, sources: Array<UserPoints['source']>) {
    const user = await UserModel.findOne({walletAddress});
    if (!user) {
        throw new Error('user not exists: walletAddress=' + walletAddress);
    }

    if (sources.includes('WHITELIST')) {
        await syncUserWhitelistPoints(user);
    }

    if (sources.includes('LOCK')) {
        await syncUserLockPoints(user);
    }
}

export async function countUserPoints() {
    const count = await UserPointsModel.countDocuments();

    const allPoints = await UserPointsModel.find().select('userId points source').lean();

    const userIdsBySource: Record<string, Set<string>> = {};
    const totalPointsBySource = allPoints.reduce((acc, item) => {
        acc['count'] = (acc['count'] || 0) + 1;
        acc['total'] = (acc['total'] || 0) + Number(item.points);

        acc[`count${item.source}`] = (acc[`count${item.source}`] || 0) + 1;
        acc[`total${item.source}`] = (acc[`total${item.source}`] || 0) + Number(item.points);

        userIdsBySource[item.source] = userIdsBySource[item.source] || new Set();
        userIdsBySource[item.source].add(item.userId.toString());
        acc[`countUsers${item.source}`] = userIdsBySource[item.source].size;

        return acc;
    }, {} as Record<string, number>);

    const totalPointsByUserAndSource = allPoints
        .reduce((acc, item) => {
            acc[item.userId.toString()] = acc[item.userId.toString()] || {};

            acc[item.userId.toString()]['count'] = (acc[item.userId.toString()]['count'] || 0) + 1;
            acc[item.userId.toString()]['total'] = (acc[item.userId.toString()]['total'] || 0) + Number(item.points);

            acc[item.userId.toString()][`count${item.source}`] = (acc[item.userId.toString()][`count${item.source}`] || 0) + 1;
            acc[item.userId.toString()][`total${item.source}`] = (acc[item.userId.toString()][`total${item.source}`] || 0) + Number(item.points);

            return acc;
        }, {} as Record<string, Record<string, number>>);

    const userPoints = Object.entries(totalPointsByUserAndSource)
        .map(([userId, points]) => ({
            userId,
            points
        }))
        .sort((a, b) => b.points.total - a.points.total);

    return {
        count,
        countUsers: userPoints.length,
        totalPoints: totalPointsBySource,
        userPoints,
    };
}
