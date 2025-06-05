#!/usr/bin/env node

import path from 'path';
import { analyzePackage } from './scanner-local.mjs';

const packageDir = process.cwd();

console.log(`Analyzing local package at: ${packageDir}`);

const result = await analyzePackage(packageDir);

if (result.passed) {
  console.log('✅ Local package has passed all security checks');
} else {
  console.log('❌ Local package has failed security checks');
  console.log(`Reason: ${result.message}`);
  if (result.details) {
    console.log('\nDetails:');
    console.log(result.details);
  }
}
