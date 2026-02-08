import json

def normalize_report(file_path):
    with open(file_path, "r") as f:
        data = json.load(f)
    return {
        "test_case": data.get("test_name", "Unknown"),
        "failure_msg": data.get("error_message", "No error message found"),
        "context": f"Failed at step: {data.get('step', 'N/A')}"
    }