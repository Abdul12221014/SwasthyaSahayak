# 🔧 Supabase Migration Guide - Fix RPC Functions

## Issue
The RPC functions `match_health_documents` and `hybrid_search_health_documents` are not found in Supabase, causing vector search to fail.

## Solution
Apply the migration file `002_pgvector_kb.sql` in Supabase Dashboard.

## Step-by-Step Instructions

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Migration**
   - Open the file: `src/backend/db/migrations/002_pgvector_kb.sql`
   - Copy the entire content
   - Paste into SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Migration**
   - Check for any errors in the output
   - Verify functions are created:
     ```sql
     SELECT routine_name 
     FROM information_schema.routines 
     WHERE routine_schema = 'public' 
     AND routine_name IN ('match_health_documents', 'hybrid_search_health_documents');
     ```

### Method 2: Using Supabase CLI (Alternative)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## What the Migration Creates

1. **pgvector Extension**
   - Enables vector operations in PostgreSQL

2. **health_documents Table** (if not exists)
   - Table structure for storing documents with embeddings

3. **Indexes**
   - Indexes for efficient retrieval (source, language, category, full-text, vector)

4. **kb_meta Table**
   - Metadata table for tracking KB state

5. **RPC Functions**
   - `match_health_documents()` - Vector similarity search
   - `hybrid_search_health_documents()` - Hybrid search (vector + text)

6. **Triggers**
   - Update timestamp trigger for health_documents

## Verification

After running the migration, test it:

```bash
# Test via backend API
curl http://localhost:3001/api/test-supabase | python3 -m json.tool
```

You should see:
- ✅ RPC: match_health_documents - PASS
- ✅ RPC: hybrid_search_health_documents - PASS
- ✅ KB Metadata - PASS

## Troubleshooting

### Error: "extension vector does not exist"
**Solution:** Enable pgvector extension in Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "permission denied"
**Solution:** Ensure you're using the service role key, not the anon key.

### Error: "function already exists"
**Solution:** This is fine - the migration uses `CREATE OR REPLACE FUNCTION`.

### Functions still not found after migration
**Solution:**
1. Check if migration ran successfully
2. Verify you're connected to the correct database
3. Check Supabase logs for errors
4. Try refreshing the schema cache

## Next Steps

After migration is applied:
1. ✅ RPC functions will be available
2. ⚠️  Documents still need embeddings (re-ingest with Colab script)
3. ✅ Vector search will work once documents have embeddings

## Migration File Location

- **File:** `src/backend/db/migrations/002_pgvector_kb.sql`
- **Size:** ~5KB
- **Lines:** 175 lines

## Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Verify database connection
3. Check migration file syntax
4. Contact Supabase support if needed

