import express from 'express';
import session from 'express-session';

import mountHello from '@shared/fe/server/middleware/hello';
import mountSimpleCORS from '@shared/fe/server/middleware/simple-cors';
import mountStatic from '@shared/fe/server/middleware/static';
import '@shared/fe/util/number-extension';

import startTelegramBot from './bot/telegram';
import {mountConfig} from './middleware/config';
import {mountTelegram} from './middleware/telegram';
import {mountTwitter} from './middleware/twitter';
import mountMongo from './mongo';
import {mountAwsS3} from './mongo/aws-s3';
import {mountUser} from './mongo/user';
import {mountUserInviteCode} from './mongo/user-invite-code';
import {mountUserPoints} from './mongo/user-points';
import {
    INTERNAL_API_PATH_PREFIX,
    NODE_ENV,
    SESSION_SECRET
} from './util/constant';

import './cron/user-points';

export default function startApp(isViteDev?: boolean) {
    startTelegramBot();

    const app = express();

    app.use((req, res, next) => {
        // ref: https://developers.google.com/search/docs/crawling-indexing/block-indexing
        res.setHeader('X-Robots-Tag', 'noindex');

        // request logging
        console.log(req.method, req.url);
        next();
    });

    app.use(session({
        secret: SESSION_SECRET ?? 'goat_dev_secret',
        resave: false,
        saveUninitialized: true,
    }));

    app.use(express.json());

    mountHello(app);
    mountSimpleCORS(app, {
        allowedOrigins: [
            // whitelist goat fe
            'https://goat.network',
            'https://club.goat.network',
            'https://club-test.goat.network',
            'https://lock-test.goat.network',
            'https://whitelist.goat.network',
            'https://whitelist-test.goat.network',
            'https://whitelisting-qerp.vercel.app',
            'https://club-pre.goat.network',
            'http://ec2-34-220-151-226.us-west-2.compute.amazonaws.com:3000',
            'http://ec2-35-165-24-26.us-west-2.compute.amazonaws.com:3000',
            'http://localhost:3000',
            'http://localhost:3001'
        ],
        allowedPaths: [
            '/api'
        ]
    });

    mountTwitter(app);
    mountTelegram(app);
    mountAwsS3(app);

    mountConfig(app);
    mountMongo(app);
    mountUser(app);
    mountUserInviteCode(app);
    mountUserPoints(app);

    app.use(['/api', INTERNAL_API_PATH_PREFIX], (req, res) => res.status(404).send('Not Found'));

    if (!isViteDev) {
        mountStatic(app);
    }

    if (NODE_ENV === 'prod') {
        // TODO only run on stage prod
    }

    return app;
}
