#!/usr/bin/env python3
"""
Test runner script for the Startup Sonar API project.

This script provides a convenient way to run tests with different configurations.
"""

import subprocess
import sys
import argparse
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, check=True, capture_output=False)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Run tests for Startup Sonar API")
    parser.add_argument(
        "--type", 
        choices=["unit", "integration", "all"], 
        default="all",
        help="Type of tests to run"
    )
    parser.add_argument(
        "--coverage", 
        action="store_true",
        help="Run tests with coverage reporting"
    )
    parser.add_argument(
        "--verbose", 
        action="store_true",
        help="Run tests in verbose mode"
    )
    parser.add_argument(
        "--fast", 
        action="store_true",
        help="Skip slow tests"
    )
    parser.add_argument(
        "--install-deps", 
        action="store_true",
        help="Install test dependencies before running tests"
    )
    
    args = parser.parse_args()
    
    # Change to the backend directory
    backend_dir = Path(__file__).parent
    print(f"Working directory: {backend_dir}")
    
    # Install dependencies if requested
    if args.install_deps:
        print("\nInstalling test dependencies...")
        if not run_command(
            [sys.executable, "-m", "pip", "install", "-r", "test_requirements.txt"],
            "Installing test dependencies"
        ):
            print("Failed to install test dependencies")
            return 1
    
    # Build pytest command
    pytest_cmd = [sys.executable, "-m", "pytest"]
    
    # Add test type filters
    if args.type == "unit":
        pytest_cmd.extend(["-m", "unit"])
    elif args.type == "integration":
        pytest_cmd.extend(["-m", "integration"])
    
    # Add coverage if requested
    if args.coverage:
        pytest_cmd.extend(["--cov=.", "--cov-report=html", "--cov-report=term-missing"])
    
    # Add verbose mode
    if args.verbose:
        pytest_cmd.append("-v")
    
    # Skip slow tests if requested
    if args.fast:
        pytest_cmd.extend(["-m", "not slow"])
    
    # Add test directory
    pytest_cmd.append("test/")
    
    # Run the tests
    success = run_command(pytest_cmd, f"Running {args.type} tests")
    
    if success:
        print(f"\n🎉 All {args.type} tests passed!")
        if args.coverage:
            print("📊 Coverage report generated in htmlcov/index.html")
        return 0
    else:
        print(f"\n💥 Some {args.type} tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
