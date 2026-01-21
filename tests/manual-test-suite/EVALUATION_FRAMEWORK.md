# Evaluation Metrics Taxonomy

## Overview
This document defines the comprehensive evaluation metrics with scoring rubrics for the Manual Test Suite.

## Category A: Tool Selection & Intuition

| Metric | Description | Scoring |
|--------|-------------|---------|
| **A1. First-Try Selection** | Did agent pick the correct tool on first attempt? | **Binary**: Y (Correct) / N (Incorrect) |
| **A2. Selection Latency** | How many turns before correct tool was chosen? | **Count**: 1 = ideal |
| **A3. Description Sufficiency** | Did tool descriptions alone guide selection, or was trial-and-error needed? | **1-5 Scale**:<br>1: Pure trial & error<br>3: Some ambiguity<br>5: Clear from description |
| **A4. Parameter Discovery** | Were required/optional params understood without examples? | **Binary**: Y / N |
| **A5. Tool Chaining Intuition** | When multi-tool workflow needed, was sequence natural? | **1-5 Scale**:<br>1: Disjointed/stuck<br>3: Several incorrect attempts<br>5: Fluent sequence |

## Category B: Functional Correctness

| Metric | Description | Scoring |
|--------|-------------|---------|
| **B1. Result Accuracy** | Did tool return factually correct information? | **Binary**: Y / N |
| **B2. Result Completeness** | Was returned info sufficient for the task? | **1-5 Scale**:<br>1: Missing key info<br>3: Partial info<br>5: All required info present |
| **B3. Action Effectiveness** | For mutations (click/fill/navigate), did intended effect occur? | **Binary**: Y / N |
| **B4. Error Quality** | When errors occur, were messages actionable? | **1-5 Scale**:<br>1: Generic/misleading<br>3: Descriptive but vague<br>5: Specific & actionable |
| **B5. Edge Case Handling** | How did tool behave on unusual inputs (empty results, large datasets)? | **1-5 Scale**:<br>1: Crash/Hang<br>3: Graceful failure<br>5: Correct handling |
| **B6. Context Utility** | Was auto-context (DOM diff, suggestions) helpful vs. noise? | **1-5 Scale**:<br>1: Distracting/Harmful<br>3: Neutral<br>5: Critical to success |

## Category C: Efficiency

| Metric | Description | Scoring |
|--------|-------------|---------|
| **C1. Tool Call Count** | How many calls to achieve outcome? | **Count** (lower = better) |
| **C2. Token Consumption** | Approximate tokens used (input + output) | **Count** |
| **C3. Result Density** | Useful info / total output ratio | **Percentage** |
| **C4. Retry Rate** | Calls that had to be retried with different params | **Count** (0 = ideal) |
| **C5. Dead-End Rate** | Tool calls that contributed nothing to outcome | **Count** (0 = ideal) |

## Category D: Cognitive Flow

| Metric | Description | Scoring |
|--------|-------------|---------|
| **D1. Focus Retention** | Did agent stay on task or get distracted by tool output? | **Binary**: Y (Focused) / N (Distracted) |
| **D2. Continuation Quality** | After tool use, was agent's reasoning coherent? | **1-5 Scale**:<br>1: Lost context<br>3: Minor confusion<br>5: Clear reasoning |
| **D3. Information Overload** | Did verbose output cause agent to miss key details? | **1-5 Scale**:<br>1: Missed critical info<br>3: Some struggle<br>5: No overload |
| **D4. Tool-Goal Alignment** | Were tool results immediately applicable to user's goal? | **1-5 Scale**:<br>1: Irrelevant results<br>3: Tangential<br>5: Directly applicable |

## Category E: Reliability

| Metric | Description | Scoring |
|--------|-------------|---------|
| **E1. Cross-Trial Consistency** | Same task, same approach, across N trials? | **Percentage** |
| **E2. Structure Robustness** | Works on varied page structures (SPA, MPA, iframe)? | **Percentage** |
| **E3. State Tolerance** | Handles page state changes mid-workflow? | **Binary**: Y / N |
| **E4. Timeout Resilience** | Graceful behavior on slow responses? | **1-5 Scale**:<br>1: Timeout/Error<br>3: Retry needed<br>5: Handled gracefully |

## Category F: Debugger-Specific

| Metric | Description | Scoring |
|--------|-------------|---------|
| **F1. Breakpoint Accuracy** | Set at intended line, triggers when expected? | **Binary**: Y / N |
| **F2. Variable Inspection** | Can retrieve expected values in scope? | **Binary**: Y / N |
| **F3. Step Navigation** | Step over/into/out behaves as expected? | **Binary**: Y / N |
| **F4. Async Debugging** | Can debug promises/async-await code? | **Binary**: Y / N |
