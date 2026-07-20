import requests
import json
import sys
import getpass
from typing import Optional, Dict

class BlueCatAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.token: Optional[str] = None
        self.session = requests.Session()

    def login(self, username: str, password: str) -> str:
        """Login and get Bearer token (v2 API)"""
        url = f"{self.base_url}/api/v2/sessions"
        payload = {
            "username": username,
            "password": password
        }
        
        response = self.session.post(url, json=payload, verify=True)  # Set verify=False if self-signed cert
        
        if response.status_code != 200:
            raise Exception(f"Login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        self.token = data.get("apiToken") or data.get("token")
        
        if not self.token:
            raise Exception("No token received in login response")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print("✅ Login successful")
        return self.token

    def get_configurations(self) -> list:
        """Get list of configurations (to find collection IDs)"""
        url = f"{self.base_url}/api/v2/configurations"
        resp = self.session.get(url)
        resp.raise_for_status()
        return resp.json()

    def reserve_ip_and_dns(self, network_id: int, ip_address: str, hostname: str, 
                          domain: str = "", mac: str = None, comment: str = ""):
        """
        Reserve IP and create DNS Host Record
        Note: Adjust endpoints based on your BlueCat version
        """
        # 1. Assign / Reserve IP under the network
        ip_url = f"{self.base_url}/api/v2/networks/{network_id}/ipAddresses"  # or use assign endpoint
        
        payload = {
            "address": ip_address,
            "name": hostname,
            "type": "IP4Address",
            "properties": {
                "state": "DHCP_RESERVED",   # or STATIC
                "macAddress": mac,
                "comments": comment
            }
        }
        
        print(f"Reserving IP {ip_address} ...")
        resp = self.session.post(ip_url, json=payload)
        
        if resp.status_code not in (200, 201):
            print(f"Warning: IP assignment returned {resp.status_code}")
            print(resp.text)
        
        # 2. Create DNS Host Record (A record)
        # You need the Zone collection ID first
        print(f"Creating DNS record for {hostname}...")
        # Example - replace with your zone ID
        # zone_id = 12345
        # dns_url = f"{self.base_url}/api/v2/zones/{zone_id}/resourceRecords"
        
        # For simplicity, using a global resourceRecords endpoint (filter later)
        dns_url = f"{self.base_url}/api/v2/resourceRecords"
        
        dns_payload = {
            "type": "HostRecord",
            "name": hostname.split('.')[0] if '.' in hostname else hostname,
            "properties": {
                "absoluteName": f"{hostname}.{domain}" if domain else hostname,
                "addresses": [ip_address],
                "reverseRecord": True
            }
        }
        
        dns_resp = self.session.post(dns_url, json=dns_payload)
        if dns_resp.status_code in (200, 201):
            print("✅ DNS record created successfully")
        else:
            print(f"DNS creation status: {dns_resp.status_code}")
            print(dns_resp.text)


# ====================== USAGE ======================
if __name__ == "__main__":
    BASE_URL = "https://your-bluecat-bam.example.com"
    
    username = input("Enter username: ")
    password = getpass.getpass("Enter password: ")
    
    bc = BlueCatAPI(BASE_URL)
    
    try:
        bc.login(username, password)
        
        # Example: Get configurations to find IDs
        configs = bc.get_configurations()
        print("Configurations found:", len(configs))
        
        # === FILL THESE IN ===
        NETWORK_ID = 123456          # ← Get from /api/v2/networks or configurations
        IP_ADDRESS = "192.168.10.55"
        HOSTNAME = "server01"
        DOMAIN = "example.com"
        MAC = "00:11:22:33:44:55"
        
        bc.reserve_ip_and_dns(
            network_id=NETWORK_ID,
            ip_address=IP_ADDRESS,
            hostname=HOSTNAME,
            domain=DOMAIN,
            mac=MAC,
            comment="Reserved via API"
        )
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
