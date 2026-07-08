# Contributing to Argument Replay Engine

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## How to Contribute

### Reporting Bugs

1. Check existing [issues](https://github.com/sudharshan994/argument-analysis/issues) to avoid duplicates
2. Use a clear, descriptive title
3. Include steps to reproduce the bug
4. Note your environment (OS, Node.js version, browser)

### Suggesting Features

1. Open an [issue](https://github.com/sudharshan994/argument-analysis/issues) with the `enhancement` label
2. Describe the feature and its use case
3. Explain why it would benefit users

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear commit messages
4. Run quality checks:
   ```bash
   npm run lint
   npm run build
   ```
5. Push and open a Pull Request

## Development Setup

See the [README](README.md#-getting-started) for setup instructions.

## Code Style

- Follow ESLint configuration in the project
- Use meaningful variable and function names
- Comment complex logic
- Keep components focused and reusable

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add new insight metric for question density`
- `fix: resolve D3 graph node overlap issue`
- `docs: update API reference with examples`
- `style: format parser module`

## Questions?

Open an issue or reach out to the maintainer.
