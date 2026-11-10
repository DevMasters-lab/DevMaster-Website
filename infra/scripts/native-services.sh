#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
run_dir="$repo_root/.runtime"
redis_bin="${REDIS_BIN:-$run_dir/redis-7.4.12/src}"
clam_dir="${CLAM_DIR:-$run_dir/clamav}"
mkdir -p "$run_dir/redis" "$run_dir/mailpit"
case "${1:-start}" in
 start)
  # PostgreSQL is supplied by the workstation. Never initialize or stop that server.
  if ! "$redis_bin/redis-cli" -p 56379 ping >/dev/null 2>&1; then "$redis_bin/redis-server" --bind 127.0.0.1 --port 56379 --protected-mode yes --appendonly yes --dir "$run_dir/redis" --daemonize yes --pidfile "$run_dir/redis/redis.pid" --logfile "$run_dir/redis/redis.log"; fi
  if ! curl -fsS http://127.0.0.1:58025/readyz >/dev/null 2>&1; then nohup "$run_dir/mailpit/mailpit" --listen 127.0.0.1:58025 --smtp 127.0.0.1:51025 --database "$run_dir/mailpit/mail.db" --disable-version-check > "$run_dir/mailpit.log" 2>&1 & echo $! > "$run_dir/mailpit.pid"; fi
  if [ ! -f "$run_dir/clamd.pid" ] || ! kill -0 "$(cat "$run_dir/clamd.pid")" 2>/dev/null; then CVD_CERTS_DIR="$clam_dir/etc/certs" nohup "$clam_dir/sbin/clamd" --config-file="$run_dir/clamd.conf" > "$run_dir/clamd-console.log" 2>&1 & echo $! > "$run_dir/clamd-launch.pid"; fi
  if ! python3 -c 'import socket; s=socket.create_connection(("127.0.0.1",58333),1); s.close()' 2>/dev/null; then nohup python3 "$repo_root/infra/scripts/native-storage.py" > "$run_dir/seaweedfs.log" 2>&1 & echo $! > "$run_dir/seaweedfs.pid"; fi
  cd "$repo_root/backend"
  ready=0
  for attempt in {1..30}; do
   if PHP_INI_SCAN_DIR=":$repo_root/infra/php" php artisan devmasters:doctor --write-storage --no-interaction > "$run_dir/health.log" 2>&1; then ready=1; break; fi
   sleep 1
  done
  cat "$run_dir/health.log"
  [ "$ready" = 1 ]
  ;;
 stop)
  for name in mailpit clamd seaweedfs; do
   pid_file="$run_dir/$name.pid"
   if [ -f "$pid_file" ]; then
    service_pid="$(cat "$pid_file")"
    service_command="$(ps -p "$service_pid" -o command= 2>/dev/null || true)"
    case "$service_command" in *"$run_dir/"*) kill "$service_pid" 2>/dev/null || true;; esac
   fi
  done
  if [ -f "$run_dir/redis/redis.pid" ]; then
   redis_pid="$(cat "$run_dir/redis/redis.pid")"
   redis_command="$(ps -p "$redis_pid" -o command= 2>/dev/null || true)"
   case "$redis_command" in *redis-server*56379*) kill "$redis_pid" 2>/dev/null || true;; esac
  fi
  printf 'Workspace-owned services stopped. Workstation PostgreSQL was left running.\n'
  ;;
 *) printf 'Usage: %s start|stop\n' "$0"; exit 2;;
esac
