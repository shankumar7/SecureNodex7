# DNS & Hosts Guidance for Multi-Host Deployment

## 1. Overview
SecureNodeX uses mTLS and TLS with SAN (Subject Alternative Names) verified domain names across services.
In a local LAN / VLAN environment, add the following static mappings to `/etc/hosts` on all machines (or configure in local DNS / Pi-hole / Dnsmasq).

## 2. Host Mappings (`/etc/hosts`)

```text
# SecureNodeX Cluster Hosts (Example 192.168.1.0/24 Subnet)
192.168.1.11    api.snx.lan ca.snx.lan dashboard.snx.lan control.snx.lan
192.168.1.12    chain-1.snx.lan storage-l2.snx.lan
192.168.1.13    chain-2.snx.lan storage-l3.snx.lan
192.168.1.14    chain-3.snx.lan storage-l4.snx.lan
192.168.1.15    chain-4.snx.lan chain.snx.lan
192.168.1.21    broker.snx.lan gateway.snx.lan storage-pi1.snx.lan
192.168.1.22    storage-pi2.snx.lan observer.snx.lan
```

## 3. Certificate SAN Verification
All issued leaf certificates must contain matching DNS SANs and IP SANs:
- **API Server:** `DNS:api.snx.lan, IP:192.168.1.11, IP:127.0.0.1`
- **CA Server:** `DNS:ca.snx.lan, IP:192.168.1.11, IP:127.0.0.1`
- **MQTT Broker:** `DNS:broker.snx.lan, IP:192.168.1.21, IP:127.0.0.1`
- **Storage Nodes:** `DNS:storage-*.snx.lan, IP:127.0.0.1`

## 4. Raspberry Pi ARM64 Guidance
For Raspberry Pi 4 / 5:
1. Ensure Ubuntu Server 24.04 ARM64 or Debian Bookworm is installed.
2. Verify Docker and Docker Compose v2 are installed:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER
   ```
3. Set time synchronization with Chrony:
   ```bash
   sudo apt-get install -y chrony && sudo systemctl restart chrony
   ```
4. Deploy the storage and gateway compose stacks using `deploy/docker-compose.storage.yml` and `deploy/docker-compose.gateway.yml`.
