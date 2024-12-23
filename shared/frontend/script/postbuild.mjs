#!/usr/bin/env node
/*eslint-disable no-console*/

import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json')));
delete pkg.devDependencies;
pkg.scripts = {
    start: 'node server'
};
fs.writeFileSync(path.resolve(cwd, 'build/package.json'), JSON.stringify(pkg));

execSync('yarn shared-fe-version');

const buildDir = path.resolve(cwd, 'build');
const zipPath = path.resolve(cwd, 'build.zip');
const monorepoRoot = path.resolve(cwd, '../../');
const cmd = `cd ${buildDir} && npm i && zip -qr ${zipPath} ./* && cp ${zipPath} ${monorepoRoot}`;
console.log(cmd);
execSync(cmd);
console.log('postbuild done');
