#!/usr/bin/env node

/**
 * Automated Verification Script for Authentication Features
 * 
 * This script verifies that the code implementation matches the test requirements
 * by checking for required functions, hooks, and patterns.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let passed = 0;
let failed = 0;
let warnings = 0;

function log(message, type = 'info') {
  const prefix = type === 'pass' ? `${colors.green}✅` : 
                 type === 'fail' ? `${colors.red}❌` : 
                 type === 'warn' ? `${colors.yellow}⚠️` : 
                 `${colors.blue}ℹ️`;
  console.log(`${prefix} ${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log(`${description} - File exists`, 'pass');
    passed++;
    return true;
  } else {
    log(`${description} - File missing: ${filePath}`, 'fail');
    failed++;
    return false;
  }
}

function checkFileContains(filePath, patterns, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    log(`${description} - File not found`, 'fail');
    failed++;
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  let allFound = true;

  patterns.forEach(pattern => {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (regex.test(content)) {
      log(`${description} - Found: ${pattern}`, 'pass');
      passed++;
    } else {
      log(`${description} - Missing: ${pattern}`, 'fail');
      failed++;
      allFound = false;
    }
  });

  return allFound;
}

console.log('\n' + '='.repeat(60));
console.log('🔍 Authentication Implementation Verification');
console.log('='.repeat(60) + '\n');

// Part 1: InlineAuthModal Component
console.log('\n📦 Part 1: InlineAuthModal Component');
console.log('-'.repeat(60));

checkFileExists('src/components/InlineAuthModal.tsx', 'InlineAuthModal component');

checkFileContains('src/components/InlineAuthModal.tsx', [
  'isOpen',
  'onClose',
  'onAuthSuccess',
  'initialMode',
  'signIn.*credentials',
  'signIn.*google',
  'handleEmailSignIn',
  'handleEmailSignUp',
  'handleGoogleSignIn',
  'handleEscape|Escape.*key',
  'document.body.style.overflow',
  'setMode',
], 'InlineAuthModal - Required functionality');

checkFileContains('src/components/InlineAuthModal.tsx', [
  'router.refresh',
  'getSession',
], 'InlineAuthModal - Session refresh');

// Part 2: Order Page Integration
console.log('\n📦 Part 2: Order Page Integration');
console.log('-'.repeat(60));

checkFileContains('src/app/order/page.tsx', [
  'InlineAuthModal',
  'showAuthModal',
  'authMode',
  'setShowAuthModal',
  'setAuthMode',
], 'Order Page - Modal integration');

checkFileContains('src/app/order/page.tsx', [
  'Sign In',
  'Create Account',
  'setAuthMode.*signin',
  'setAuthMode.*signup',
], 'Order Page - Auth buttons');

checkFileContains('src/app/order/page.tsx', [
  'if.*user',
  'useEffect',
  '/api/user/profile',
  'setCustomerInfo',
], 'Order Page - Customer info auto-population');

checkFileContains('src/app/order/page.tsx', [
  '!isAuthenticated',
  'setAuthMode.*signin',
  'handlePayment',
], 'Order Page - Payment button behavior');

// Part 3: Admin Authentication
console.log('\n📦 Part 3: Admin Authentication');
console.log('-'.repeat(60));

checkFileExists('src/lib/adminAuth.ts', 'adminAuth utility');

checkFileContains('src/lib/adminAuth.ts', [
  'isAuthenticated',
  'setAuthenticated',
  'logout',
  'getSession',
  'SESSION_DURATION.*24.*60.*60.*1000',
], 'adminAuth - Core functions');

checkFileContains('src/components/admin/AdminGoogleAuth.tsx', [
  'adminAuth',
  'localStorageAuth',
  'setLocalStorageAuth',
  'adminAuth.isAuthenticated',
  'adminAuth.setAuthenticated',
  'adminAuth.logout',
], 'AdminGoogleAuth - localStorage integration');

checkFileContains('src/components/admin/AdminGoogleAuth.tsx', [
  'checkLocalStorageAuth',
  'setInterval.*30000',
], 'AdminGoogleAuth - Periodic check');

checkFileContains('src/components/admin/AdminAuth.tsx', [
  'adminAuth.setAuthenticated',
], 'AdminAuth - Persistence on login');

// Part 4: API Endpoints
console.log('\n📦 Part 4: API Endpoints');
console.log('-'.repeat(60));

checkFileExists('src/app/api/auth/admin-login/route.ts', 'Admin login API');

checkFileContains('src/app/api/auth/admin-login/route.ts', [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'process.env.ADMIN_EMAIL',
  'process.env.ADMIN_PASSWORD',
], 'Admin login API - Environment variables');

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Verification Summary');
console.log('='.repeat(60));
console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
console.log(`${colors.yellow}⚠️  Warnings: ${warnings}${colors.reset}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60) + '\n');

if (failed === 0) {
  console.log(`${colors.green}✅ All automated checks passed!${colors.reset}`);
  console.log('⚠️  Note: Manual testing still required for full validation.\n');
  process.exit(0);
} else {
  console.log(`${colors.red}❌ Some checks failed. Please review the issues above.${colors.reset}\n`);
  process.exit(1);
}

