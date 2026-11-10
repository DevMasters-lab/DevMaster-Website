#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$repo_root/backend"
# The native test writes synthetic files only to the configured, separate test DB.
RUN_NATIVE_INTEGRATION=1 PHP_INI_SCAN_DIR=":$repo_root/infra/php" php artisan test --compact --filter=NativeStorageBackupTest
