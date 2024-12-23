/**
 * @Author: sheldon
 * @Date: 2024-06-05 21:10:35
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-05 21:10:40
 */

import {Application} from 'express';

import connectMongo from './connect';

export default function mountMongo(app: Application) {
    app.use(connectMongo());
}
