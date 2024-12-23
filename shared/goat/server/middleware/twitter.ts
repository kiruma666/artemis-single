import {Application} from 'express';
import {TwitterApi} from 'twitter-api-v2';

import {getMaskedAddress} from '@shared/fe/util/address';

import {UserModel} from 'server/mongo/user/model';
import {TwitterOAuthSuccessAction} from 'server/types/session';
import {
    STAGE,
    TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET,
    TWITTER_TARGET_USER_ID,
    API_ORIGIN
} from 'server/util/constant';

const scope = [
    'tweet.read',
    'users.read',
    'follows.write'
];

export function mountTwitter(app: Application) {
    if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET || !TWITTER_TARGET_USER_ID || !API_ORIGIN) {
        if (!['prod', 'test'].includes(STAGE ?? '')) {
            console.log('[Twitter] Missing env keys, skip mounting');

            return;
        }

        throw new Error('[Twitter] Missing env keys');
    }

    const goatTwitterClient = new TwitterApi({
        clientId: TWITTER_CLIENT_ID,
        clientSecret: TWITTER_CLIENT_SECRET,
    });

    const twitterCallbackPath = '/api/twitter/callback';
    const twitterFollowPath = '/api/twitter/follow';
    const twitterMePath = '/api/twitter/me';

    app.get('/api/twitter/oauth', async (req, res) => {
        const {walletAddress, action} = req.query;
        if (!walletAddress || typeof walletAddress !== 'string') {
            return res.status(400).send('Invalid walletAddress');
        }

        const callbackLink = `${API_ORIGIN}${twitterCallbackPath}`;
        console.log('[Twitter][OAuth] callbackLink', callbackLink);

        try {
            const {url, codeVerifier, state} = await goatTwitterClient.generateOAuth2AuthLink(callbackLink, {scope});
            req.session.walletAddress = walletAddress;
            req.session.twitterOAuthSuccessAction = action as TwitterOAuthSuccessAction;
            req.session.twitterCodeVerifier = codeVerifier;
            req.session.twitterState = state;

            console.log('[Twitter][OAuth] authLink', url);
            res.redirect(url);
        } catch (error) {
            console.error('[Twitter][OAuth] failed', error);
            res.status(500).send('Error generating OAuth2 link');
        }
    });

    app.get(twitterCallbackPath, async (req, res) => {
        const {state, code} = req.query as {state: string; code: string};
        const {twitterCodeVerifier: codeVerifier, twitterState: sessionState} = req.session;
        console.log('[Twitter][Callback] tokens', {state, sessionState, code, codeVerifier});

        if (!state || !code) {
            return res.status(400).send('You denied the app');
        }

        if (!codeVerifier || !sessionState) {
            return res.status(400).send('Your session expired');
        }

        if (state !== sessionState) {
            return res.status(400).send('Session tokens did not match');
        }

        try {
            const redirectUri = `${API_ORIGIN}${twitterCallbackPath}`;
            const {accessToken} = await goatTwitterClient.loginWithOAuth2({code, codeVerifier, redirectUri});
            req.session.twitterAccessToken = accessToken;

            console.log('[Twitter][Callback] loginWithOAuth2 success', {accessToken});
            if (req.session.twitterOAuthSuccessAction === 'follow') {
                res.redirect(twitterFollowPath);

                return;
            }

            res.redirect(twitterMePath);
        } catch (error) {
            console.error('[Twitter][Callback] loginWithOAuth2 failed', error);
            res.status(500).send('Error login with OAuth2');
        }
    });

    app.get(twitterFollowPath, async (req, res) => {
        if (!TWITTER_TARGET_USER_ID) {
            return;
        }

        const {twitterAccessToken, walletAddress} = req.session;
        if (!twitterAccessToken) {
            return res.status(400).send('Twitter OAuth not completed');
        }

        if (!walletAddress) {
            return res.status(400).send('Wallet address not present in session');
        }

        try {
            const client = new TwitterApi(twitterAccessToken);
            const {data: user} = await client.v2.me();
            const result = await client.v2.follow(user.id, TWITTER_TARGET_USER_ID);
            if (!result.data.following) {
                console.log(`[Twitter][Follow] Failed to follow, user ${user.username}`);
                res.send(result);

                return;
            }

            console.log(`[Twitter][Follow] Checking if user ${user.username} is already bound`);
            let dbUser = await UserModel.findOne({'twitter.userId': user.id});
            if (dbUser) {
                console.log(`[Twitter][Follow] User ${user.username} is already bound to wallet address ${dbUser.walletAddress}`);
                res.status(400).send(`You have already verified your wallet address: ${getMaskedAddress(dbUser.walletAddress)}`);

                return;
            }

            console.log(`[Twitter][Follow] Verifying wallet address: ${walletAddress}`);
            dbUser = await UserModel.findOne({walletAddress});
            if (!dbUser) {
                console.log(`[Twitter][Follow] Wallet address not found: ${walletAddress}`);
                res.status(400).send('Please connect your wallet on our website first');

                return;
            }

            dbUser.twitter = {
                userId: user.id,
                username: user.username,
                following: true
            };

            await dbUser.save();
            console.log(`[Twitter][Follow] User ${user.username} verified twitter, wallet address ${walletAddress}`);

            const {data: targetTwitterUser} = await client.v2.user(TWITTER_TARGET_USER_ID);
            const targetTwitterUrl = `https://x.com/${targetTwitterUser.username}`;
            res.redirect(targetTwitterUrl);
        } catch (error) {
            console.error('[Twitter][Follow] failed', error);
            res.status(500).send(STAGE === 'prod' ? 'Error following user' : error);
        }
    });

    app.get(twitterMePath, async (req, res) => {
        const {twitterAccessToken} = req.session;
        if (!twitterAccessToken) {
            return res.status(400).send('Twitter OAuth not completed');
        }

        try {
            const client = new TwitterApi(twitterAccessToken);
            const {data: user} = await client.v2.me();
            res.send(user);
        } catch (error) {
            console.error('[Twitter][Me] failed', error);
            res.status(500).send('Error getting user info');
        }
    });
}
