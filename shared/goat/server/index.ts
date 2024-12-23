import startServer from '@shared/fe/server/util/start-server';

import startApp from 'server/app';

startServer(startApp(), 3010);
