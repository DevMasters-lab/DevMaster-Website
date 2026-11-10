#!/usr/bin/env python3
"""Run the native DevMasters application processes with one foreground supervisor."""
import argparse
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
import urllib.request

# Keep process identity verifiable even when invoked with a relative script path.
if not Path(sys.argv[0]).is_absolute():
    os.execv(sys.executable, [sys.executable, str(Path(__file__).resolve()), *sys.argv[1:]])

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / '.runtime'
RUNTIME.mkdir(exist_ok=True)
MANIFEST = RUNTIME / 'native-app.json'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['start', 'status', 'stop'])
args = parser.parse_args()

def active(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False

if args.action in ('status', 'stop'):
    data = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    pid = data.get('supervisor_pid', 0)
    if not pid or not active(pid):
        print('Native application supervisor is not running.')
        sys.exit(1 if args.action == 'status' else 0)
    if args.action == 'stop':
        command = subprocess.check_output(['ps', '-p', str(pid), '-o', 'command='], text=True)
        if str(Path(__file__).resolve()) not in command:
            raise SystemExit('PID no longer belongs to this supervisor; no process was stopped.')
        os.kill(pid, signal.SIGTERM)
        print('Stop requested for this application supervisor.')
    else:
        print(json.dumps({**data, 'running': True}, indent=2))
    sys.exit(0)

if MANIFEST.exists():
    old = json.loads(MANIFEST.read_text()).get('supervisor_pid', 0)
    if old and active(old):
        raise SystemExit('A native application supervisor is already running.')
for port in (3000, 8081):
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise SystemExit(f'Port {port} is occupied. Existing services were left untouched.')

environment = os.environ.copy()
environment['PHP_INI_SCAN_DIR'] = environment.get('PHP_INI_SCAN_DIR', '') + ':' + str(ROOT / 'infra/php')
commands = {
    'api': (ROOT / 'backend', ['php', 'artisan', 'serve', '--host=127.0.0.1', '--port=8081']),
    'frontend': (ROOT / 'frontend', ['node', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000']),
    'queue': (ROOT / 'backend', ['php', 'artisan', 'queue:work', '--sleep=3', '--tries=5', '--timeout=180']),
    'scheduler': (ROOT / 'backend', ['php', 'artisan', 'schedule:work']),
}
with socket.socket() as storage_probe:
    if storage_probe.connect_ex(('127.0.0.1', 58333)) != 0:
        commands = {'storage': (ROOT, [sys.executable, str(ROOT / 'infra/scripts/native-storage.py')]), **commands}
processes = {}
logs = []
stopping = False

def stop(signum=None, frame=None):
    global stopping
    stopping = True

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    for name, (cwd, command) in commands.items():
        log = open(RUNTIME / f'{name}.log', 'a', buffering=1)
        logs.append(log)
        processes[name] = subprocess.Popen(command, cwd=cwd, env=environment, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    MANIFEST.write_text(json.dumps({'supervisor_pid': os.getpid(), 'processes': {name: process.pid for name, process in processes.items()}}, indent=2))
    os.chmod(MANIFEST, 0o600)
    deadline = time.monotonic() + 60
    pending = {'api': 'http://127.0.0.1:8081/up', 'frontend': 'http://127.0.0.1:3000'}
    while pending and time.monotonic() < deadline:
        for name, url in list(pending.items()):
            if processes[name].poll() is not None:
                raise RuntimeError(f'{name} exited before readiness. See .runtime/{name}.log.')
            try:
                with urllib.request.urlopen(url, timeout=2) as response:
                    if response.status == 200:
                        del pending[name]
            except (OSError, TimeoutError):
                pass
        if pending:
            time.sleep(1)
    if pending:
        raise RuntimeError('Readiness timed out: ' + ', '.join(pending))
    health_log = RUNTIME / 'health.log'
    healthy = False
    with open(health_log, 'w') as check_log:
        for attempt in range(15):
            check = subprocess.run(['php', 'artisan', 'devmasters:doctor', '--write-storage', '--no-interaction'], cwd=ROOT / 'backend', env=environment, stdout=check_log, stderr=subprocess.STDOUT, timeout=20)
            if check.returncode == 0:
                healthy = True
                break
            if any(process.poll() is not None for process in processes.values()):
                break
            time.sleep(1)
    if not healthy:
        raise RuntimeError('A native dependency is unavailable. Check .runtime/health.log.')
    print('Native application and storage are ready. Website: http://localhost:3000', flush=True)
    while not stopping:
        for name, process in processes.items():
            if process.poll() is not None:
                raise RuntimeError(f'{name} exited. Check .runtime/{name}.log. All application processes will stop together.')
        time.sleep(1)
finally:
    for process in processes.values():
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
    for process in processes.values():
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
    for log in logs:
        log.close()
    MANIFEST.unlink(missing_ok=True)
