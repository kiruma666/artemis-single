#!/usr/bin/env zx
/*
 * @Author: xiaodongyu
 * @Date: 2022-10-11 16:06:09
 * @Last Modified by: sheldon
 * @Last Modified time: 2023-07-05 14:40:27
 */

import fs from 'fs';

const lockFile = './.building-lock';

const defaultGitBranch = 'master';
const {
    b, branch, branchName,
    p, project, projectName
} = argv;
const {
    STAGE
} = process.env;
const buildProject = p || project || projectName;

function $withoutEscaping(pieces, ...args) {
    const origQuote = $.quote;
    try {
        $.quote = unescapedCmd => unescapedCmd;
        return $(pieces, args);
    } finally {
        $.quote = origQuote;
    }
}

// check building lock
if (fs.existsSync(lockFile)) {
    await $`cat ${lockFile}`;
    console.log('building in progress, please try again later');
    process.exit(1);
}

await $`echo '${STAGE} ${buildProject}' > ${lockFile}`;

try {
    // checkout git branch
    const gitBranch = b || branch || branchName || defaultGitBranch;
    const gitRemoteUrl = await $`git config --get remote.origin.url`;
    await $`git fetch --prune --tags --progress ${gitRemoteUrl} +refs/heads/*:refs/remotes/origin/*`;
    const commitHash = await $`git rev-parse refs/remotes/origin/${gitBranch}^{commit}`;
    await $`git checkout -f ${commitHash}`;

    const localBranches = await $`git branch`;
    if (new RegExp('\n?\s*' + gitBranch).test(localBranches)) {
        await $`git branch -D ${gitBranch}`;
    }
    await $`git checkout -b ${gitBranch} ${commitHash}`;

    // deps
    await $`yarn config list`;
    await $`yarn --ignore-engines --force`;

    // build
    echo`STAGE=${STAGE}, project=${buildProject}`;
    await $`yarn build-${buildProject}`;

    // checkout the default branch with this script, prevent from script not found error for next build
    await $`git checkout ${defaultGitBranch}`;
    await $`git reset --hard origin/${defaultGitBranch}`;
    if (gitBranch !== defaultGitBranch) {
        await $`git branch -D ${gitBranch}`;
    }

    await $`rm ${lockFile}`;
} catch (err) {
    console.error(err);

    await $`rm ${lockFile}`;
    process.exit(1); // prevent from deploying
}
