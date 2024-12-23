import {checkBlockedIp, getIpMap} from '../util/access-control';

import type {Application} from 'express';

export default function mountAccessControl(app: Application, {serviceName}: {serviceName: string}) {
    const tag = `[${serviceName}]`;

    app.set('trust proxy', true);

    app.use((req, res, next) => {
        if (checkBlockedIp(req.ip, tag)) {
            res.status(403).send('Forbidden');

            return;
        }

        next();
    });

    app.get('/api/restricted/access-control', (req, res) => {
        res.json({
            data: Object.values(getIpMap()).sort((a, b) => a.lastAccessTime - b.lastAccessTime) // sort by lastAccessTime DESC
        });
    });
}
