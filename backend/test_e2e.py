import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_e2e_flow():
    print("--- 1. Testing POST /analyze/ ---")
    with open("../demo_data/synthetic_hiring_data.csv", "rb") as f:
        file_bytes = f.read()

    # Emulate the form data expected by /analyze
    response = client.post(
        "/analyze/",
        data={
            "target_column": "hired",
            "sensitive_column": "gender",
            "feature_columns": "years_experience,assessment_score,interview_score,college_tier"
        },
        files={"file": ("synthetic_hiring_data.csv", file_bytes, "text/csv")}
    )

    assert response.status_code == 200, response.text
    data = response.json()
    analysis_id = data.get("analysis_id")
    assert analysis_id is not None
    
    print("\n--- 2. Testing POST /mitigate/ (Threshold Tuning) ---")
    res_tt = client.post(
        "/mitigate/",
        json={
            "analysis_id": analysis_id,
            "method": "threshold_tuning"
        }
    )
    assert res_tt.status_code == 200, res_tt.text

    print("\n--- 3. Testing POST /mitigate/ (Feature Removal) ---")
    res_fr = client.post(
        "/mitigate/",
        json={
            "analysis_id": analysis_id,
            "method": "feature_removal",
            "params": {"feature_to_remove": "college_tier"}
        }
    )
    assert res_fr.status_code == 200, res_fr.text

    print("\n--- 4. Testing Errors ---")
    res_err1 = client.post("/mitigate/", json={"analysis_id": "fake", "method": "threshold_tuning"})
    assert res_err1.status_code == 404
    
    res_err2 = client.post("/mitigate/", json={"analysis_id": analysis_id, "method": "magic_wand"})
    assert res_err2.status_code == 400
    
    res_err3 = client.post("/mitigate/", json={"analysis_id": analysis_id, "method": "feature_removal"})
    assert res_err3.status_code == 400
    
    res_err4 = client.post("/mitigate/", json={"analysis_id": analysis_id, "method": "feature_removal", "params": {"feature_to_remove": "not_a_column"}})
    assert res_err4.status_code == 400
    
    print("\n--- 5. Testing POST /report/ (Baseline Only) ---")
    res_rep1 = client.post("/report/", json={"analysis_id": analysis_id, "include_mitigation": False})
    assert res_rep1.status_code == 200, res_rep1.text

    print("\n--- 6. Testing POST /report/ (With Mitigation) ---")
    res_rep2 = client.post("/report/", json={"analysis_id": analysis_id, "include_mitigation": True})
    assert res_rep2.status_code == 200, res_rep2.text
