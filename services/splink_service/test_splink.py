"""
Test suite for Splink microservice endpoints
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from fastapi.testclient import TestClient
from services.splink_service.app import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "splink-identity-linkage"
    assert data["version"] == "4.0.17"

def test_link_records():
    payload = {
        "records": [
            {
                "id": "T1",
                "name": "Rahul Sharma",
                "dateOfBirth": "1999-04-12",
                "district": "Pune",
                "phoneNumber": "+91 98765 12340"
            },
            {
                "id": "T2",
                "name": "Rahul K Sharma",
                "dateOfBirth": "1999-04-12",
                "district": "Pune",
                "phoneNumber": "+91 98765 12340"
            },
            {
                "id": "T3",
                "name": "Priya Patel",
                "dateOfBirth": "2001-08-25",
                "district": "Mumbai",
                "phoneNumber": "+91 91234 56789"
            }
        ],
        "threshold": 0.65,
        "autoLinkThreshold": 0.92
    }
    response = client.post("/link-records", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["candidates"]) >= 1
    pair = data["candidates"][0]
    assert pair["traineeIdA"] in ["T1", "T2"]
    assert pair["traineeIdB"] in ["T1", "T2"]
    assert pair["matchProbability"] >= 0.90
    assert "AUTO_LINK" in pair["classification"]
    assert data["clusters"]["T1"] == data["clusters"]["T2"]
    print("Link records test passed successfully! Match probability:", pair["matchProbability"])

if __name__ == "__main__":
    test_health()
    test_link_records()
    print("All python tests passed!")
