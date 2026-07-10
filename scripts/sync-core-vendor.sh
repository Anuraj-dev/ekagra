#!/usr/bin/env bash
# Vendors @ekagra/core into supabase/functions so the Deno edge runtime
# (which cannot import outside supabase/functions) can use it.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p supabase/functions/_vendor/core
cp packages/core/src/index.ts packages/core/src/api.ts supabase/functions/_vendor/core/
sed -i "s%from './index'%from './index.ts'%" supabase/functions/_vendor/core/api.ts
sed -i "s%from './api'%from './api.ts'%" supabase/functions/_vendor/core/index.ts
