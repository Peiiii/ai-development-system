#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const key = readFileSync(path.join(os.homedir(), '.config/devweave/showcase-admin-key'), 'utf8').trim();
if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Local dashboard key is missing or invalid');
const url = `https://devweave-lab.nextclaw.io/#key=${encodeURIComponent(key)}`;
const program = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
const result = spawnSync(program, [url], { stdio: 'ignore' });
if (result.status !== 0) throw new Error(`Unable to open dashboard: ${result.error?.message ?? result.status}`);
console.log('Management dashboard opened in your browser.');
