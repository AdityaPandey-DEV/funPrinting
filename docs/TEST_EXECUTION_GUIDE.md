# Test Execution Guide for Authentication Features

## Quick Start

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Clear Browser State**
   - Open DevTools (F12)
   - Go to Application tab → Storage → Clear site data
   - Or manually clear localStorage

3. **Open Test Browser**
   - Chrome/Edge recommended
   - Open DevTools (Console, Network, Application tabs)

---

## Automated Code Verification

Run this script to verify code implementation:

```bash
node scripts/verify-auth-implementation.js
```

---

## Manual Test Execution Checklist

### Part 1: Inline Authentication Modal

#### ✅ Test 1.1: Modal Display
- [ ] Navigate to `/order` (not authenticated)
- [ ] Warning message with buttons appears
- [ ] Click "Sign In" → Modal opens (sign-in tab)
- [ ] Click "Create Account" → Modal opens (sign-up tab)
- [ ] Click X button → Modal closes
- [ ] Press Escape → Modal closes
- [ ] Body scroll disabled when modal open
- [ ] Body scroll restored when modal closed

**Status**: ⏳ Pending Manual Test

#### ✅ Test 1.2: Sign-In Flow
- [ ] Fill order details (files, options, customer info)
- [ ] Click "Sign In" button
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Loading state shows "Signing in..."
- [ ] Modal closes automatically
- [ ] Order data preserved (verify all fields)
- [ ] Customer info auto-populated
- [ ] Can proceed to payment

**Status**: ⏳ Pending Manual Test

**Edge Cases**:
- [ ] Invalid credentials → Error shown
- [ ] Unverified email → Verification message
- [ ] Network error → Error message
- [ ] Empty fields → Validation error

#### ✅ Test 1.3: Sign-Up Flow
- [ ] Fill order details
- [ ] Click "Create Account"
- [ ] Fill sign-up form completely
- [ ] Submit form
- [ ] Success message appears
- [ ] Form clears after 3 seconds
- [ ] Tab switches to "Sign In" after 3 seconds
- [ ] Order data preserved

**Status**: ⏳ Pending Manual Test

**Edge Cases**:
- [ ] Password mismatch → Error
- [ ] Password < 6 chars → Error
- [ ] Duplicate email → Error
- [ ] Invalid email format → Error

#### ✅ Test 1.4: Google OAuth
- [ ] Fill order details
- [ ] Open auth modal
- [ ] Click "Continue with Google"
- [ ] Complete OAuth flow
- [ ] Returns to order page (not sign-in page)
- [ ] Order data preserved
- [ ] Customer info auto-populated

**Status**: ⏳ Pending Manual Test

#### ✅ Test 1.5: State Preservation
Test each scenario:
- [ ] File uploads preserved
- [ ] Printing options preserved
- [ ] Customer info preserved (may update from profile)
- [ ] Delivery options preserved
- [ ] Expected date preserved
- [ ] Page colors preserved

**Status**: ⏳ Pending Manual Test

#### ✅ Test 1.6: Customer Info Auto-Population
- [ ] Enter customer info manually
- [ ] Authenticate via modal
- [ ] Verify name from profile
- [ ] Verify email from profile
- [ ] Verify phone from profile (if available)
- [ ] Verify default pickup location (if available)

**Status**: ⏳ Pending Manual Test

#### ✅ Test 1.7: Payment Button
- [ ] Not authenticated → Button shows "Sign In to Place Order"
- [ ] Click button → Modal opens (not redirect)
- [ ] Authenticate → Button enables
- [ ] Button text changes to "Pay ₹X.XX"
- [ ] Payment flow works

**Status**: ⏳ Pending Manual Test

---

### Part 2: Admin Authentication Persistence

#### ✅ Test 2.1: Admin Password Login
- [ ] Navigate to `/admin`
- [ ] Click "Sign in with Password"
- [ ] Enter admin email/password from `.env`
- [ ] Submit form
- [ ] Authentication succeeds
- [ ] Check localStorage:
  - [ ] `adminAuthenticated: "true"`
  - [ ] `adminLoginTime: <timestamp>`

**Status**: ⏳ Pending Manual Test

#### ✅ Test 2.2: Persistence Across Pages
- [ ] Login as admin (password)
- [ ] Navigate to `/admin/orders` → Still authenticated
- [ ] Navigate to `/admin/templates` → Still authenticated
- [ ] Navigate to `/admin/pricing` → Still authenticated
- [ ] Navigate to `/order` → Still authenticated
- [ ] Navigate back to `/admin` → Still authenticated

**Status**: ⏳ Pending Manual Test

#### ✅ Test 2.3: Session Expiration
- [ ] Login as admin
- [ ] In DevTools Console, run:
  ```javascript
  localStorage.setItem('adminLoginTime', (Date.now() - 25*60*60*1000).toString());
  ```
- [ ] Navigate to another admin page
- [ ] Login prompt appears
- [ ] localStorage cleared

**Status**: ⏳ Pending Manual Test

#### ✅ Test 2.4: Periodic Check
- [ ] Login as admin
- [ ] Open Console
- [ ] Wait 30 seconds
- [ ] Verify periodic check runs (check logs)
- [ ] In another tab, clear localStorage
- [ ] Wait max 30 seconds
- [ ] Verify logged out in original tab

**Status**: ⏳ Pending Manual Test

#### ✅ Test 2.5: Admin Logout
- [ ] Login as admin
- [ ] Click logout
- [ ] Verify localStorage cleared:
  - [ ] `adminAuthenticated` removed
  - [ ] `adminLoginTime` removed
- [ ] Redirects to home
- [ ] Navigate to admin page → Login prompt

**Status**: ⏳ Pending Manual Test

#### ✅ Test 2.6: Google OAuth vs Password
- [ ] Login with Google OAuth → Works
- [ ] Logout
- [ ] Login with password → Works
- [ ] Both persist correctly

**Status**: ⏳ Pending Manual Test

---

### Part 3: Integration Tests

#### ✅ Test 3.1: Order → Admin Flow
- [ ] As user: Go to order page
- [ ] Fill order details
- [ ] Authenticate via modal
- [ ] Complete order
- [ ] Logout
- [ ] Login as admin (password)
- [ ] Navigate to admin orders
- [ ] Can see the order

**Status**: ⏳ Pending Manual Test

#### ✅ Test 3.2: Multiple Tabs
- [ ] Tab 1: Open order page (not authenticated)
- [ ] Fill order details
- [ ] Tab 2: Open order page
- [ ] Tab 1: Authenticate
- [ ] Tab 2: Verify authenticated (after refresh/check)
- [ ] Admin: Login in Tab 1, verify Tab 2 recognizes

**Status**: ⏳ Pending Manual Test

#### ✅ Test 3.3: Browser Refresh
- [ ] Fill order page with data
- [ ] Authenticate via modal
- [ ] Refresh browser (F5)
- [ ] Order data lost (expected)
- [ ] Authentication persists
- [ ] Admin: Login, refresh, still authenticated

**Status**: ⏳ Pending Manual Test

---

### Part 4: Error Handling

#### ✅ Test 4.1: Network Errors
- [ ] Open order page
- [ ] Open auth modal
- [ ] DevTools → Network → Offline
- [ ] Try to sign in
- [ ] Error message appears
- [ ] Re-enable network
- [ ] Can retry successfully
- [ ] Order data preserved

**Status**: ⏳ Pending Manual Test

#### ✅ Test 4.2: API Errors
- [ ] Test with invalid endpoint (mock)
- [ ] Test with server error (500)
- [ ] Test with rate limiting
- [ ] Appropriate error messages shown

**Status**: ⏳ Pending Manual Test

#### ✅ Test 4.3: Concurrent Authentication
- [ ] Open order page in two tabs
- [ ] Start auth in Tab 1
- [ ] Start auth in Tab 2
- [ ] Complete auth in Tab 1
- [ ] Tab 2 handles state correctly

**Status**: ⏳ Pending Manual Test

---

### Part 5: Performance & UX

#### ✅ Test 5.1: Modal Animation
- [ ] Open modal multiple times
- [ ] Switch tabs quickly
- [ ] Test mobile viewport
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Smooth animations
- [ ] Responsive on mobile

**Status**: ⏳ Pending Manual Test

#### ✅ Test 5.2: Loading States
- [ ] Slow network (DevTools → Slow 3G)
- [ ] Loading indicators show
- [ ] Buttons disabled during loading
- [ ] No double submissions

**Status**: ⏳ Pending Manual Test

---

## Test Results Summary

### Inline Auth Modal
- Modal Display: ⏳ Pending
- Sign-In Flow: ⏳ Pending
- Sign-Up Flow: ⏳ Pending
- Google OAuth: ⏳ Pending
- State Preservation: ⏳ Pending
- Customer Info Auto-Pop: ⏳ Pending
- Payment Button: ⏳ Pending

### Admin Auth Persistence
- Password Login: ⏳ Pending
- Cross-Page Persistence: ⏳ Pending
- Session Expiration: ⏳ Pending
- Periodic Check: ⏳ Pending
- Logout: ⏳ Pending
- OAuth vs Password: ⏳ Pending

### Integration
- Order → Admin Flow: ⏳ Pending
- Multiple Tabs: ⏳ Pending
- Browser Refresh: ⏳ Pending

### Error Handling
- Network Errors: ⏳ Pending
- API Errors: ⏳ Pending
- Concurrent Auth: ⏳ Pending

### Performance
- Modal Animation: ⏳ Pending
- Loading States: ⏳ Pending

---

## Notes

- Update status as: ✅ Pass, ❌ Fail, ⏳ Pending, ⚠️ Partial
- Document any issues found
- Screenshots helpful for failures
- Test on Chrome, Firefox, Safari if possible

