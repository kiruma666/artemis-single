import {findUserByWalletAddressIgnoreCase, isTelegramGroupJoined, isTwitterFollowing} from '../user/model';

import {UserPoints, UserPointsModel, UserPointSource, UserPointStatus} from './model';

enum QuestType {
    FOLLOW_TWITTER = 'FOLLOW_TWITTER',
    JOIN_TELEGRAM_GROUP = 'JOIN_TELEGRAM_GROUP',
}

type QuestConfig = {
    type: QuestType
    points: string
};

const quests: Record<QuestType, QuestConfig> = {
    [QuestType.FOLLOW_TWITTER]: {
        type: QuestType.FOLLOW_TWITTER,
        points: '5000',
    },

    [QuestType.JOIN_TELEGRAM_GROUP]: {
        type: QuestType.JOIN_TELEGRAM_GROUP,
        points: '5000',
    },
};

export const onboardingQuests: QuestConfig[] = [
    QuestType.FOLLOW_TWITTER,
    QuestType.JOIN_TELEGRAM_GROUP
].map(type => quests[type]);

export async function upsertUserPoints(userPoints: Partial<UserPoints>) {
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
    } catch (err) {
        console.error('[UserPoints][Create] failed', err);
    }
}

export async function syncUserPoints(walletAddress: string) {
    try {
        const user = await findUserByWalletAddressIgnoreCase(walletAddress);
        if (!user) {
            console.error('[UserPoints][Sync] user not found', walletAddress);

            return;
        }

        if (isTwitterFollowing(user)) {
            await upsertUserPoints({
                userId: user._id,
                source: UserPointSource.QUEST,
                idempotentKey: `${UserPointSource.QUEST}:${QuestType.FOLLOW_TWITTER}:${user._id}`,
                points: quests[QuestType.FOLLOW_TWITTER].points,
                status: UserPointStatus.PENDING_CLAIM,
                metadata: {
                    questType: QuestType.FOLLOW_TWITTER,
                }
            });
        }

        if (isTelegramGroupJoined(user)) {
            await upsertUserPoints({
                userId: user._id,
                source: UserPointSource.QUEST,
                idempotentKey: `${UserPointSource.QUEST}:${QuestType.JOIN_TELEGRAM_GROUP}:${user._id}`,
                points: quests[QuestType.JOIN_TELEGRAM_GROUP].points,
                status: UserPointStatus.PENDING_CLAIM,
                metadata: {
                    questType: QuestType.JOIN_TELEGRAM_GROUP,
                }
            });
        }
    } catch (err) {
        console.error('[UserPoints][Sync] failed', err);
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
