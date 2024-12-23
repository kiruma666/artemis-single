#!/usr/bin/env zx
/*
 * @Author: xiaodongyu
 * @Date: 2022-10-11 16:06:09
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-05 21:22:34
 */

const defaultGitBranch = 'master';
const {
    b, branch, branchName,
    p, project, projectName
} = argv;
const {
    STAGE = 'test',
    SERVER_USER_HOST
} = process.env;
const buildProject = p || project || projectName;
const gitBranch = b || branch || branchName || defaultGitBranch;

const allowedProjects = ['blacksmith', 'goat'];
if (!allowedProjects.includes(buildProject)) {
    console.error(`Invalid project: ${buildProject}, only ${allowedProjects.join(', ')} is allowed`);
    process.exit(1);
}

const notify = async (message) => {
    const gitUser = await $`git config user.name`;
    const text = `<b>project: ${buildProject}</b>\nstage: ${STAGE}\nbranch: ${gitBranch}\n${message}\n\n@${gitUser}`;

    const notifyCommands = [
        'source ~/.bash_profile',

        `curl -s -X POST -H "Content-Type: application/json" \
            -d '{"text": "${text}", "chat_id": "-1001940787352", "parse_mode": "html"}' \
            https://api.telegram.org/bot$TELE_TOKEN/sendMessage`
    ].join(' && ');

    await $`ssh ${SERVER_USER_HOST} ${notifyCommands}`;
    console.log(); // new line
};

const run = async (func) => {
    try {
        await notify(`${func.name} started`);
        await func();
        await notify(`${func.name} ended`);
    } catch (err) {
        console.error(err);
        await notify(`${func.name} failed`);
        throw err;
    }
};

const build = async () => {
    const buildCommands = [
        // use env
        'source ~/.bash_profile',

        // cd source code repository
        'cd /root/code/quoll',

        // build
        `STAGE=${STAGE} ./shared/frontend/script/zx/build.mjs -p ${buildProject} -b ${gitBranch}`
    ].join(' && ');

    await $`ssh ${SERVER_USER_HOST} "ssh aws-build ${buildCommands}"`;
};

const copy = async () => {
    if (STAGE === 'prod') { // copy from aws-build to aws-prod
        await $`ssh ${SERVER_USER_HOST} "scp -3 aws-build:/root/code/quoll/build.zip aws-bs:/data/apps/"`;
    } else { // copy on aws-build
        await $`ssh ${SERVER_USER_HOST} "ssh aws-build ${'cp -f /root/code/quoll/build.zip /data/apps/'}"`;
    }
};

const deploy = async () => {
    const appName = `${buildProject}_${STAGE}`;
    const deployCommands = [
        // ensure directories exist
        `mkdir -p /data/{apps,logs}/${appName}`,

        // prepare new snapshot
        `mkdir -p /data/apps/${appName}_new`,
        `unzip -q /data/apps/build.zip -d /data/apps/${appName}_new`,

        // replace old snapshot
        `mv /data/apps/${appName} /data/apps/${appName}_old`,
        `mv /data/apps/${appName}_new /data/apps/${appName}`,
        `supervisorctl restart ${appName}`,

        // clean up
        `rm -rf /data/apps/${appName}_old/`,
    ].join(' && ');

    if (STAGE === 'prod') {
        await $`ssh ${SERVER_USER_HOST} "ssh aws-bs ${deployCommands}"`;
    } else {
        await $`ssh ${SERVER_USER_HOST} "ssh aws-build ${deployCommands}"`;
    }
};

await run(build);
await run(copy);
await run(deploy);
