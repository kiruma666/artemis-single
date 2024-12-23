import type {Application} from 'express';

export default function(app: Application) {
    app.use('/api/hello', (req, res) => {
        res.json({hello: 'world'});
    });
}
