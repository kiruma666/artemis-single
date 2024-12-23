import createDebug from 'debug';

const debug = createDebug('debug');

// node side, set env.DEBUG to enable log: DEBUG=* node server.js
// browser side, set localStorage.debug to enable log: localStorage.debug=*
export {
    debug as log,
    debug
};

export default createDebug;
