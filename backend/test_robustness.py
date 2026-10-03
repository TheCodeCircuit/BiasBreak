import os
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_robustness():
    csv_path = Path(__file__).parent.parent / "demo_data" / "synthetic_hiring_data.csv"
    with open(csv_path, "rb") as f:
        csv_bytes = f.read()

    # Test 1
    res1 = client.post(
        "/analyze/",
        data={
            "target_column": "hired",
            "sensitive_column": "region",
            "feature_columns": "years_experience,assessment_score"
        },
        files={"file": ("data.csv", csv_bytes, "text/csv")}
    )
    assert res1.status_code == 200

    # Test 2
    res2 = client.post(
        "/analyze/",
        data={
            "target_column": "trash_target",
            "sensitive_column": "gender",
            "feature_columns": "years_experience,assessment_score"
        },
        files={"file": ("data.csv", csv_bytes, "text/csv")}
    )
    assert res2.status_code == 400

    # Test 3
    res3 = client.post(
        "/analyze/",
        data={
            "target_column": "hired",
            "sensitive_column": "trash_sensitive",
            "feature_columns": "years_experience,assessment_score"
        },
        files={"file": ("data.csv", csv_bytes, "text/csv")}
    )
    assert res3.status_code == 400

    # Test 4
    res4 = client.post(
        "/analyze/",
        data={
            "target_column": "hired",
            "sensitive_column": "gender",
            "feature_columns": "fake_feature,years_experience"
        },
        files={"file": ("data.csv", csv_bytes, "text/csv")}
    )
    assert res4.status_code == 400

    # Test 5
    res5 = client.post(
        "/analyze/",
        data={
            "target_column": "assessment_score",
            "sensitive_column": "gender",
            "feature_columns": "years_experience"
        },
        files={"file": ("data.csv", csv_bytes, "text/csv")}
    )
    assert res5.status_code == 400

    # Test 6
    res6 = client.post(
        "/analyze/",
        data={
            "target_column": "hired"
            # Missing fields
        },
        files={"file": ("data.csv", csv_bytes, "text/csv")}
    )
    assert res6.status_code == 400 # 400 because validation fails before form parsing or in fastAPI

    # Test 7
    res7 = client.post(
        "/analyze/",
        data={
            "target_column": "hired",
            "sensitive_column": "gender",
            "feature_columns": "years_experience"
        },
        files={"file": ("data.txt", b"hello text file", "text/plain")}
    )
    assert res7.status_code == 400

if __name__ == "__main__":
    import pytest
    pytest.main([__file__])
