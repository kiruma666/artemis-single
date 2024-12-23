/*
 * @Author: xiaodongyu
 * @Date 2022-09-29 22:34:56
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-11-04 18:25:10
 */

export default {
    // dev test prod
    __STAGE__: JSON.stringify(process.env.STAGE ?? 'dev')
};
