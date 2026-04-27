#!/bin/sh
# Start SeaweedFS and configure S3 credentials + buckets
set -e

# Start seaweedfs in background
weed server -s3 -dir=/data -s3.port=8333 -master.volumeSizeLimitMB=1024 -filer -master.defaultReplication=000 &
SEAWEED_PID=$!

# Wait for master HTTP endpoint to be ready
echo "Waiting for SeaweedFS master..."
for i in $(seq 1 30); do
  if wget -qO- http://127.0.0.1:9333/cluster/status > /dev/null 2>&1; then
    echo "SeaweedFS master HTTP is ready"
    break
  fi
  sleep 1
done

# Wait a bit more for gRPC services to be fully ready
sleep 3

# Helper: run weed shell command with retry
run_shell_cmd() {
  cmd="$1"
  for attempt in $(seq 1 10); do
    if echo "$cmd" | weed shell -master 127.0.0.1:9333 > /dev/null 2>&1; then
      echo "OK: $cmd"
      return 0
    fi
    echo "Retry $attempt: $cmd"
    sleep 1
  done
  echo "WARN: failed to run: $cmd"
  return 1
}

# Configure S3 credentials (match S3_ACCESS_KEY / S3_SECRET_KEY in .env)
echo "Configuring S3 credentials..."
run_shell_cmd "s3.configure -access_key any -secret_key any -user root -actions Read,Write,List,Tagging -apply" || true

# Create buckets
echo "Creating buckets..."
run_shell_cmd "s3.bucket.create -name occult" || true
run_shell_cmd "s3.bucket.create -name occult-public" || true

echo "SeaweedFS init complete"

# Wait for the main process
wait $SEAWEED_PID
