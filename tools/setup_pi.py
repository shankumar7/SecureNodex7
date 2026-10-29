#!/usr/bin/env python3
import sys
import time
import pexpect

HOST = "192.168.1.20"
USER = "shankumar"
PASSWORD = "sunny485"

def run_ssh_cmd(cmd, timeout=30):
    ssh_cmd = f"ssh -o StrictHostKeyChecking=no {USER}@{HOST} {cmd}"
    print(f"--> Executing on Pi: {cmd}")
    child = pexpect.spawn(ssh_cmd, encoding="utf-8", timeout=timeout)
    while True:
        idx = child.expect([r"[Pp]assword:", pexpect.EOF, pexpect.TIMEOUT])
        if idx == 0:
            child.sendline(PASSWORD)
        elif idx == 1:
            break
        elif idx == 2:
            print(f"Command timed out: {child.before}")
            break
    print(child.before)
    child.close()
    return child.exitstatus

# 1. Authorize Mac SSH key on Pi
print("Step 1: Setting up authorized_keys on Pi...")
with open("/Users/shankumar/.ssh/id_rsa.pub") as f:
    pubkey = f.read().strip()

auth_cmd = f"\"mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '{pubkey}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys\""
run_ssh_cmd(auth_cmd)

# 2. SCP storage folder
print("Step 2: Copying storage directory to Pi...")
scp_cmd = f"scp -r -o StrictHostKeyChecking=no storage {USER}@{HOST}:~/storage"
child = pexpect.spawn(scp_cmd, encoding="utf-8", timeout=60)
while True:
    idx = child.expect([r"[Pp]assword:", pexpect.EOF, pexpect.TIMEOUT])
    if idx == 0:
        child.sendline(PASSWORD)
    elif idx == 1:
        break
    elif idx == 2:
        print("SCP timed out")
        break
child.close()
print("SCP complete.")

# 3. Install packages & run daemon
print("Step 3: Installing dependencies on Pi...")
install_cmd = "\"pip3 install fastapi 'uvicorn[standard]' httpx pydantic pydantic-settings prometheus-client cryptography --break-system-packages 2>/dev/null || pip3 install fastapi 'uvicorn[standard]' httpx pydantic pydantic-settings prometheus-client cryptography\""
run_ssh_cmd(install_cmd, timeout=120)

# 4. Start storage daemon in background via nohup
print("Step 4: Launching storage-pi daemon...")
start_cmd = "\"pkill -f 'storage.app.main:app' || true; nohup python3 -m uvicorn storage.app.main:app --host 0.0.0.0 --port 7443 > ~/storage.log 2>&1 &\""
run_ssh_cmd(start_cmd, timeout=15)

time.sleep(2)
print("Step 5: Verifying storage daemon is alive...")
run_ssh_cmd("\"curl -s http://localhost:7443/v1/health\"")
