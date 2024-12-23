#!/usr/bin/env zx
/*
 * @Author: xiaodongyu
 * @Date: 2022-11-07 13:05:21
 * @Last Modified by: xiaodongyu
 * @Last Modified time: 2022-11-07 13:56:05
 */

const branchProcessOutput = await $`git rev-parse --abbrev-ref HEAD`;
const commitProcessOutput = await $`git log --oneline -1`;
// Beijing timezone
const date = new Date(Date.now() + 8 * 60 * 60 * 1e3).toISOString().replace('T', ' ');

const content = JSON.stringify({
    branch: branchProcessOutput.stdout.trim(),
    commit: commitProcessOutput.stdout.trim(),
    date
}, null, 4);

$`echo ${content} > ./build/public/version.json`;
