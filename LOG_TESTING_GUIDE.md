# Log Testing Guide - Finding Missing FatherName

## Quick Test Steps

### 1. Test Template Creation
1. Go to `/templates/create`
2. Upload a DOCX file with placeholders: `{{FatherName}}`, `{{Name}}`, `{{RollNo}}`
3. Check **Vercel Server Logs** for:
   ```
   [CREATE] Extracted placeholders: ["FatherName", "Name", "RollNo"]
   [CREATE] FormSchema keys to save: ["FatherName", "Name", "RollNo"]
   [CREATE] Saving to database: placeholders=[3], formSchema=[3]
   ```

### 2. Test Template Fill Page
1. Go to `/templates/fill/[template-id]`
2. Open **Browser Console** (F12 → Console tab)
3. Look for `[RENDER]` logs:
   ```
   [RENDER] Received template from API
   [RENDER] Template formSchema length: 3
   [RENDER] FormSchema keys: ["FatherName", "Name", "RollNo"]
   [RENDER] Rendering formSchema fields
   [RENDER] FormSchema keys to render: ["FatherName", "Name", "RollNo"]
   [RENDER] Rendering field: FatherName (label: FatherName)
   [RENDER] Rendering field: Name (label: Name)
   [RENDER] Rendering field: RollNo (label: RollNo)
   ```

### 3. Test Form Submission
1. Fill out the form (including FatherName if it appears)
2. Click "Generate Document"
3. Check **Browser Console** for `[SUBMIT]` logs:
   ```
   [SUBMIT] Form data keys: ["FatherName", "Name", "RollNo"]
   [SUBMIT] Form data: {FatherName: "...", Name: "...", RollNo: "..."}
   [SUBMIT] Missing fields in formData: []
   ```
4. Check **Vercel Server Logs** for `[GENERATE-FILL]` logs:
   ```
   [GENERATE-FILL] Received formData keys: ["FatherName", "Name", "RollNo"]
   [GENERATE-FILL] Template formSchema keys: ["FatherName", "Name", "RollNo"]
   [GENERATE-FILL] Missing fields in formData: []
   ```

## What Each Log Means

### [CREATE] Logs (Template Creation)
- **Location**: Vercel Server Logs
- **When**: When you create a new template
- **Shows**: What placeholders are extracted and saved

### [RETRIEVE] Logs (Template Fetching)
- **Location**: Vercel Server Logs
- **When**: When the fill page loads
- **Shows**: What formSchema is retrieved from database

### [RENDER] Logs (Form Rendering)
- **Location**: Browser Console
- **When**: When the fill page loads
- **Shows**: What formSchema is received and what fields are rendered

### [SUBMIT] Logs (Form Submission)
- **Location**: Browser Console
- **When**: When you click "Generate Document"
- **Shows**: What formData is being sent

### [GENERATE-FILL] Logs (Document Generation)
- **Location**: Vercel Server Logs
- **When**: When the form is submitted
- **Shows**: What formData is received and what's missing

## Expected vs Actual

### ✅ Expected (All 3 placeholders)
```
[CREATE] Extracted placeholders: ["FatherName", "Name", "RollNo"]
[RETRIEVE] FormSchema keys: ["FatherName", "Name", "RollNo"]
[RENDER] FormSchema keys: ["FatherName", "Name", "RollNo"]
[SUBMIT] Form data keys: ["FatherName", "Name", "RollNo"]
```

### ❌ Actual (Missing FatherName)
```
[CREATE] Extracted placeholders: ["FatherName", "Name", "RollNo"]  ← Has it
[RETRIEVE] FormSchema keys: ["Name", "RollNo"]  ← Lost here?
[RENDER] FormSchema keys: ["Name", "RollNo"]  ← Or here?
[SUBMIT] Form data keys: ["Name", "RollNo"]  ← Or here?
```

## Where to Check Logs

### Browser Console
1. Open Developer Tools (F12)
2. Go to "Console" tab
3. Look for logs starting with `[RENDER]` or `[SUBMIT]`

### Vercel Logs
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by time or search for `[CREATE]`, `[RETRIEVE]`, `[GENERATE-FILL]`

## Screenshots to Take

1. **Browser Console** showing `[RENDER]` logs
2. **Browser Console** showing `[SUBMIT]` logs
3. **Vercel Logs** showing `[RETRIEVE]` logs
4. **Vercel Logs** showing `[GENERATE-FILL]` logs

These will help identify exactly where "FatherName" is being lost!

