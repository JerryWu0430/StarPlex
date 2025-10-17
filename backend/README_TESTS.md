# Testing Guide for Startup Sonar API

This document provides comprehensive information about testing the Startup Sonar API project.

## Test Structure

The test suite is organized as follows:

```
backend/
├── test/
│   ├── __init__.py
│   ├── conftest.py                    # Test fixtures and configuration
│   ├── test_perplexity_client.py     # Tests for PerplexityAudienceAnalyzer
│   ├── test_geocoding.py             # Tests for InternationalGeocoder
│   ├── test_geojson_pipeline.py      # Tests for GeoJSONPipeline
│   ├── test_filters.py                # Tests for MapFilters
│   ├── test_api_endpoints.py         # Tests for FastAPI endpoints
│   └── test_integration.py           # Integration tests
├── test_requirements.txt             # Test dependencies
├── pytest.ini                        # Pytest configuration
└── run_tests.py                      # Test runner script
```

## Test Categories

### Unit Tests

- **PerplexityAudienceAnalyzer**: Tests for AI-powered location analysis
- **InternationalGeocoder**: Tests for geocoding functionality
- **GeoJSONPipeline**: Tests for data processing pipeline
- **MapFilters**: Tests for filtering and data access layer

### Integration Tests

- **API Endpoints**: Tests for FastAPI routes and HTTP responses
- **Complete Flow**: End-to-end testing of the entire application

## Running Tests

### Prerequisites

1. Install test dependencies:

```bash
pip install -r test_requirements.txt
```

### Quick Start

Run all tests:

```bash
python run_tests.py
```

Run with coverage:

```bash
python run_tests.py --coverage
```

Run only unit tests:

```bash
python run_tests.py --type unit
```

Run only integration tests:

```bash
python run_tests.py --type integration
```

### Advanced Usage

Skip slow tests:

```bash
python run_tests.py --fast
```

Run in verbose mode:

```bash
python run_tests.py --verbose
```

Install dependencies and run tests:

```bash
python run_tests.py --install-deps --coverage
```

### Direct Pytest Usage

Run all tests:

```bash
pytest
```

Run with coverage:

```bash
pytest --cov=. --cov-report=html
```

Run specific test file:

```bash
pytest test/test_perplexity_client.py
```

Run specific test:

```bash
pytest test/test_perplexity_client.py::TestPerplexityAudienceAnalyzer::test_find_target_locations_success
```

## Test Coverage

The test suite provides comprehensive coverage for:

### Core Functionality

- ✅ Perplexity API integration
- ✅ Geocoding with Nominatim
- ✅ GeoJSON generation
- ✅ Data pipeline processing
- ✅ API endpoint handling

### Error Handling

- ✅ API failures and timeouts
- ✅ Invalid data handling
- ✅ Network errors
- ✅ Malformed responses

### Edge Cases

- ✅ Empty results
- ✅ Unicode characters
- ✅ Special characters
- ✅ Large datasets
- ✅ Invalid parameters

## Test Fixtures

The test suite includes comprehensive fixtures in `conftest.py`:

- **Mock Data**: Sample location data, GeoJSON structures
- **API Responses**: Mock Perplexity and geocoding responses
- **Error Scenarios**: Network errors, API failures, timeouts
- **Test Parameters**: Various startup ideas, target audiences, countries

## Mocking Strategy

Tests use extensive mocking to ensure:

- **Isolation**: Each test runs independently
- **Speed**: No external API calls during testing
- **Reliability**: Consistent test results
- **Coverage**: All code paths are tested

### Key Mocks

- `PerplexityAudienceAnalyzer`: Mocked API responses
- `InternationalGeocoder`: Mocked geocoding results
- `httpx.AsyncClient`: Mocked HTTP requests
- `FastAPI TestClient`: Mocked API endpoints

## Test Data

The test suite includes realistic test data:

### Sample Locations

- Shoreditch, London (UK)
- Williamsburg, Brooklyn (US)
- Islington, London (UK)

### Sample Startup Ideas

- Fitness apps for young professionals
- AI-powered meal planning services
- Sustainable fashion marketplaces
- Mental health support platforms

### Sample Target Audiences

- Health-conscious millennials
- Busy professionals
- Environmentally conscious consumers
- Remote workers and digital nomads

## Continuous Integration

The test suite is designed to work with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    pip install -r test_requirements.txt
    python run_tests.py --coverage
```

## Performance Testing

For performance testing, use the `--fast` flag to skip slow tests:

```bash
python run_tests.py --fast
```

## Debugging Tests

To debug failing tests:

1. Run with verbose output:

```bash
pytest -v -s test/test_perplexity_client.py
```

2. Run a specific test:

```bash
pytest -v -s test/test_perplexity_client.py::TestPerplexityAudienceAnalyzer::test_find_target_locations_success
```

3. Use pytest debugging features:

```bash
pytest --pdb test/test_perplexity_client.py
```

## Test Maintenance

### Adding New Tests

1. Follow the existing naming convention: `test_*.py`
2. Use descriptive test names: `test_function_name_scenario`
3. Include both positive and negative test cases
4. Add appropriate fixtures in `conftest.py`

### Updating Tests

1. Update mocks when API interfaces change
2. Add new test cases for new features
3. Update fixtures when data structures change
4. Maintain test coverage above 90%

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe the scenario
3. **Coverage**: Test both success and failure paths
4. **Mocking**: Mock external dependencies
5. **Data**: Use realistic test data
6. **Performance**: Keep tests fast and reliable

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **Mock Failures**: Check mock configurations
3. **Async Issues**: Use `pytest-asyncio` for async tests
4. **Coverage Issues**: Run with `--cov` flag

### Getting Help

1. Check test output for specific error messages
2. Run individual tests to isolate issues
3. Use pytest debugging features
4. Review test fixtures and mocks

## Test Metrics

The test suite provides:

- **Coverage Reports**: HTML and terminal output
- **Test Results**: Pass/fail status for each test
- **Performance Metrics**: Test execution times
- **Quality Metrics**: Code coverage percentages

Run with coverage to see detailed metrics:

```bash
python run_tests.py --coverage
```

This will generate an HTML coverage report in `htmlcov/index.html`.
