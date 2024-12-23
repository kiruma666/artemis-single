import {resolve} from 'path';

import express, {Express} from 'express';

export default function mountStatic(app: Express) {
    const cwd = process.cwd();

    // pass through index.html fallback
    app.use(express.static(resolve(cwd, 'public'), {index: false}));

    // turn off etag for html
    app.use((req, res) => res.sendFile(resolve(cwd, 'public/index.html'), {etag: false}));
}
