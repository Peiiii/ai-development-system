#!/usr/bin/env node
import { add, list, done } from '../src/store.mjs';

const [command, ...args] = process.argv.slice(2);

try {
  if (command === 'help' || !command) {
    console.log('Usage: task-inbox <add TITLE | list | done ID | help>');
  } else if (command === 'add') {
    console.log(JSON.stringify(await add(args.join(' '))));
  } else if (command === 'list') {
    console.log(JSON.stringify(await list()));
  } else if (command === 'done') {
    console.log(JSON.stringify(await done(args[0])));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
