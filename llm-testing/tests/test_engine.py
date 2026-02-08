import pytest
import os
import time
from dotenv import load_dotenv
from deepeval import assert_test, log_hyperparameters
from deepeval.test_case import LLMTestCase
from deepeval.metrics import AnswerRelevancyMetric
from src.factory import get_model
from src.normalizer import normalize_report
from src.models import generate_build_result

load_dotenv()
SUT = get_model("SUT")
JUDGE = get_model("JUDGE")

def test_llm_quality_gate():
    # 1. Ingestion & Normalization
    report = normalize_report("data/raw_reports/failure.json")
    prompt = f"Explain this error: {report['failure_msg']}"
    
    # 2. SUT Execution (Student)
    actual_output = SUT.generate(prompt)
    if "Error" in actual_output or "SUT Error" in actual_output:
        pytest.fail(f"SUT Failure: {actual_output}")

    # 3. Setup Metric & Judge
    metric = AnswerRelevancyMetric(threshold=0.6, model=JUDGE)
    test_case = LLMTestCase(input=prompt, actual_output=actual_output)

    print(f"\n⚖️  Evaluating Quality with {JUDGE.get_model_name()}...")

    try:
        # 4. DeepEval Evaluation
        assert_test(test_case, [metric])
    finally:
        # 🔥 FIX: Wait for DeepEval to finish calculating score asynchronously
        time.sleep(0.5)  # 500ms delay to let DeepEval complete score calculation
        
        # 5. Combined Build Result (Packaging everything)
        print("\n📦 Finalizing Build Results...")
        generate_build_result(SUT, JUDGE, [metric])