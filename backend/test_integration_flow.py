from fastapi.testclient import TestClient
from app.main import app

import io

client = TestClient(app)

def test_integration_flow():
    csv_data = "hired,gender,years_experience,interview_score,technical_score\n1,M,5,80,90\n0,F,2,60,70\n1,F,6,85,88\n0,M,1,50,60\n1,M,4,75,85\n0,F,3,65,75\n"
    f = io.BytesIO(csv_data.encode("utf-8"))
    f.name = "demo_dataset.csv"

    files = {"file": ("demo_dataset.csv", f, "text/csv")}
    data = {
        "target_column": "hired",
        "sensitive_column": "gender",
        "feature_columns": "years_experience,interview_score,technical_score"
    }
    res = client.post("/analyze/", files=files, data=data)

    assert res.status_code == 200, res.text
    analyze_data = res.json()
    analysis_id = analyze_data["analysis_id"]

    res2 = client.post("/mitigate/", json={
        "analysis_id": analysis_id,
        "method": "threshold_tuning"
    })
    
    assert res2.status_code == 200, res2.text
    mitigate_data = res2.json()
    assert mitigate_data["comparison"] is not None

    res3 = client.post("/report/", json={
        "analysis_id": analysis_id,
        "include_mitigation": True
    })

    assert res3.status_code == 200, res3.text
    report_data = res3.json()
    assert report_data["report"] is not None

if __name__ == "__main__":
    import pytest
    pytest.main([__file__])
