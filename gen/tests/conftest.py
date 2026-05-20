# gen/tests/conftest.py
def pytest_configure(config):
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (run with --runslow)"
    )
