#!/usr/bin/env python3
"""Start private, loopback-only S3 storage using ignored workstation credentials."""
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parents[2]
service = root / '.runtime/seaweedfs'
credentials = json.loads((service / 'credentials.json').read_text())
environment = os.environ.copy()
environment.update(AWS_ACCESS_KEY_ID=credentials['access_key'], AWS_SECRET_ACCESS_KEY=credentials['secret_key'], S3_BUCKET='devmasters-private', WEED_ADMIN_PASSWORD=credentials['admin_password'])
arguments = [str(service / 'weed'), 'mini', f'-dir={service / "data"}', '-ip=127.0.0.1', '-ip.bind=127.0.0.1', '-s3.port=58333', '-master.port=59333', '-filer.port=58888', '-volume.port=58080', '-master.port.grpc=59334', '-filer.port.grpc=58889', '-volume.port.grpc=58081', '-admin.port=58535', '-admin.port.legacy=0', '-s3.port.iceberg=0', '-s3.port.lance=0', '-webdav=false']
pid_file = root / '.runtime/seaweedfs.pid'
pid_file.write_text(str(os.getpid()))
os.chmod(pid_file, 0o600)
os.execve(arguments[0], arguments, environment)
