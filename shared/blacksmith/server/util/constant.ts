export const {
    STAGE,

    BIU_AWS_REGION,
    BIU_AWS_BUCKET,
    BIU_AWS_ACCESS_KEY,
    BIU_AWS_SECRET_ACCESS_KEY,

    BIU_TELE_TOKEN,
    BIU_TELE_GROUP_ID,
    BIU_TELE_GROUP_INVITE_LINK,
    BIU_TELE_USER_PENDING_SECONDS = '3600', // default 1 hour

    BIU_X_CLIENT_ID,
    BIU_X_CLIENT_SECRET,
    BIU_X_TARGET_USER_ID,

    BIU_SESSION_SECRET,
    BIU_WEB_ORIGIN,
    BIU_API_ORIGIN,
    BIU_API_LATEST_USERS_LIMIT,
    BIU_API_TOP_RANKS_LIMIT,

    EQB_TRADING_BOT_TELE_TOKEN,
} = process.env;

export const INTERNAL_API_PATH_PREFIX = '/internal';
