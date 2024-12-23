import {Application} from 'express';

import {
    TELE_GROUP_INVITE_LINK,
    RECAPTCHA_KEY
} from 'server/util/constant';

export function mountConfig(app: Application) {
    app.get('/api/config', (req, res) => res.json({
        telegram: {
            inviteLink: TELE_GROUP_INVITE_LINK
        },
        google: {
            recaptchaKey: RECAPTCHA_KEY
        }
    }));
}
