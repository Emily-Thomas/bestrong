# Troubleshooting: InBody Scans Stuck in Pending Status

## Quick Diagnosis

If InBody scans are stuck in `pending` status, follow these steps:

### Step 1: Check if the fix is deployed

```bash
# In your local repo
git log --oneline -1
# Should show: "fix jobs for inbody" or a later commit
```

If not deployed yet, deploy to Vercel:
```bash
git push origin main
```

### Step 2: Use the Debug Endpoint

Access the debug endpoint to see the current state:

**Production URL:**
```
https://your-domain.vercel.app/api/debug/inbody-status
```

This will show:
- Number of pending scans and their details
- Environment configuration (OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN)
- Recent scans with their statuses
- Diagnostic recommendations

### Step 3: Manually Trigger Processing

If scans are pending, manually trigger processing:

**Production URL:**
```
https://your-domain.vercel.app/api/debug/process-pending-scans
```

This will:
- Find all pending scans
- Process them immediately
- Return detailed results for each scan

### Step 4: Check Vercel Logs

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments" → Select latest deployment → "Functions"
4. Look for `/api/cron/process-jobs` logs
5. Check for errors like:
   - `OPENAI_API_KEY environment variable is not set`
   - `BLOB_READ_WRITE_TOKEN is required for file uploads`
   - Network errors
   - Timeout errors

## Common Issues and Solutions

### Issue 1: OPENAI_API_KEY Not Set

**Symptom:** Scans stay pending, logs show "OPENAI_API_KEY environment variable is not set"

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `OPENAI_API_KEY` with your OpenAI API key
3. Redeploy the project

### Issue 2: BLOB_READ_WRITE_TOKEN Not Set

**Symptom:** Scans create successfully but processing fails with "BLOB_READ_WRITE_TOKEN is required"

**Solution:**
1. Go to Vercel Dashboard → Storage → Blob
2. Create a Blob store if you haven't already
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Go to Settings → Environment Variables
5. Add `BLOB_READ_WRITE_TOKEN` 
6. Redeploy the project

### Issue 3: Cron Job Not Running

**Symptom:** No logs from cron job, scans never process

**Solution:**
1. Check if you're on Vercel Pro plan (cron requires Pro)
2. Check Vercel Dashboard → Cron → Verify the cron is enabled
3. Manually trigger: `https://your-domain.vercel.app/api/cron/process-jobs`
4. Check logs for errors

### Issue 4: Files Not Accessible in Blob Storage

**Symptom:** Processing fails with "Failed to fetch file from blob storage"

**Solution:**
1. Check if the file was uploaded correctly
2. Verify BLOB_READ_WRITE_TOKEN is correct
3. Check file permissions in Vercel Blob dashboard
4. Try re-uploading the scan

### Issue 5: OpenAI API Errors

**Symptom:** Processing fails with OpenAI-related errors

**Possible causes:**
- API key is invalid or expired
- API rate limits exceeded
- Model not available (GPT-4 Vision access)
- Network connectivity issues

**Solution:**
1. Verify API key is valid: https://platform.openai.com/api-keys
2. Check API usage: https://platform.openai.com/usage
3. Ensure you have GPT-4 Vision access
4. Check Vercel function logs for specific error messages

### Issue 6: Timeout Issues

**Symptom:** Processing starts but times out before completion

**Solution:**
The cron job has a 5-minute timeout (300 seconds). If processing takes longer:
1. Check if you're processing too many scans at once (limit is 10 per run)
2. Reduce image file sizes if possible
3. Consider increasing `maxDuration` in `api/cron/process-jobs.ts` (Pro plan allows up to 900s)

### Issue 7: Deployment Not Triggering

**Symptom:** Code is committed but changes aren't live

**Solution:**
1. Check Vercel Dashboard → Deployments
2. Verify latest deployment succeeded
3. If deployment failed, check build logs
4. Manually trigger deployment: `vercel --prod`

## Manual Processing (Emergency Fix)

If the cron job isn't working, you can manually process scans:

### Option 1: Via Debug Endpoint (Easiest)
```
GET https://your-domain.vercel.app/api/debug/process-pending-scans
```

### Option 2: Via Local Script
```bash
# Run locally (requires database access)
cd backend
npm run process-jobs
```

### Option 3: Via Vercel CLI
```bash
# Deploy and immediately trigger cron
vercel --prod
curl https://your-domain.vercel.app/api/cron/process-jobs
```

## Monitoring

### Check Pending Scans Count

```sql
-- Run in your database
SELECT COUNT(*) as pending_count, 
       MAX(created_at) as oldest_pending,
       MIN(created_at) as newest_pending
FROM inbody_scans 
WHERE extraction_status = 'pending';
```

### Check Failed Scans

```sql
-- See scans that failed extraction
SELECT id, client_id, created_at, 
       SUBSTRING(extraction_raw_response, 1, 200) as error_preview
FROM inbody_scans 
WHERE extraction_status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Processing Success Rate

```sql
-- See overall success rate
SELECT 
    extraction_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM inbody_scans
GROUP BY extraction_status;
```

## Verification After Fix

After applying a fix, verify it's working:

1. **Upload a test scan** via the UI
2. **Wait 2-3 minutes** for the cron job to run
3. **Check the scan status** - it should change from `pending` to `completed`
4. **Check Vercel logs** - should see "Successfully processed InBody scan X"
5. **Use debug endpoint** - pending count should decrease

## Prevention

To prevent scans from getting stuck:

1. **Monitor regularly** - Check `/api/debug/inbody-status` daily
2. **Set up alerts** - Create alerts in Vercel for function errors
3. **Test after deployment** - Always upload a test scan after deploying
4. **Check environment variables** - Verify all required env vars are set
5. **Review logs** - Check cron logs weekly for any errors

## Debug Checklist

Use this checklist when scans are stuck:

- [ ] Verify code is deployed (check git log and Vercel deployments)
- [ ] Check debug endpoint: `/api/debug/inbody-status`
- [ ] Verify OPENAI_API_KEY is set in Vercel
- [ ] Verify BLOB_READ_WRITE_TOKEN is set in Vercel
- [ ] Check Vercel cron is enabled and running
- [ ] Check Vercel function logs for errors
- [ ] Try manual processing: `/api/debug/process-pending-scans`
- [ ] Check OpenAI API status: https://status.openai.com
- [ ] Verify database connectivity
- [ ] Check file accessibility in Blob storage

## Getting Help

If scans are still stuck after trying everything:

1. **Collect information:**
   - Output from `/api/debug/inbody-status`
   - Recent Vercel function logs
   - Database query results (pending scans count)
   - Error messages from manual processing

2. **Check specific scan details:**
   ```sql
   SELECT * FROM inbody_scans WHERE id = <scan_id>;
   ```

3. **Try processing a specific scan:**
   - Note the scan ID from the database
   - Check if the file exists in Blob storage
   - Try downloading the file manually
   - Check if it's a valid PNG image

## Files Modified for This Fix

The following files were updated to add InBody scan processing:

- `backend/src/services/inbody-scan.service.ts` - Added `getPendingInBodyScans()`
- `backend/src/routes/inbody-scan.routes.ts` - Added `processInBodyScan()`
- `api/cron/process-jobs.ts` - Added InBody scan processing
- `backend/scripts/process-jobs.ts` - Added InBody scan processing
- `api/debug/inbody-status.ts` - New debug endpoint
- `api/debug/process-pending-scans.ts` - New manual processing endpoint

All changes were committed in: `fix jobs for inbody` (commit 16ad1e5)
