#!/usr/bin/env node

import fs from 'fs';

const buffer = fs.readFileSync('./package.json');

console.log(buffer.toString());

const [,, ...args] = process.argv;

console.log(`Hello World ${args}`);

