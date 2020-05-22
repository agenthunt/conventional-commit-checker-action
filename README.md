# Conventional Commit Checker GitHub Action

This action is a [conventional commit](https://www.conventionalcommits.org/en/v1.0.0-beta.4/#summary) validator

- validates PR title with conventional commit title
- validates PR description (first comment ) with conventional commit body and footer
- The regex can be overridden with github action inputs

## Inputs

### `pr-title-regex`

**Optional** Regex to match PR title. Default `"^(.+)(?:(([^)s]+)))?: (.+)"`.

### `pr-body-regex`

**Optional** Regex to match PR body. Default `"(.*\n)+(.*)"`.

## Example usage

```yaml
name: CI

on:
  pull_request:
    branches: [master]
    types: [opened, edited, synchronize]

jobs:
  check-for-cc:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: check-for-cc
        id: check-for-cc
        uses: agenthunt/conventional-commit-checker-action@v1.0.0
```

## NOTE

Unfortunately, it is not possible to customize the GitHub Squash and Merge description message. To really benefit from this action, please copy the PR body into the GitHub Squash and Merge description textarea.
