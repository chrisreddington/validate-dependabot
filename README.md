# Dependabot Validator Action

This action validates that your repository has Dependabot configured for all
supported package ecosystems based on the programming languages used in your
repository.

## What it does

- Detects programming languages used in your repository
- Maps languages to their corresponding package ecosystems
- Validates that your `dependabot.yml` includes configurations for all relevant
  package ecosystems
- Fails if required ecosystems are missing from your Dependabot configuration

## Supported Ecosystems

| Package Manager | Languages              |
| --------------- | ---------------------- |
| npm             | JavaScript, TypeScript |
| pip             | Python                 |
| maven           | Java                   |
| nuget           | C#, F#                 |
| bundler         | Ruby                   |
| composer        | PHP                    |
| cargo           | Rust                   |
| gomod           | Go                     |
| mix             | Elixir                 |
| gradle          | Java, Kotlin           |

## Usage

Add this action to your workflow:

```yaml
name: Validate Dependabot Config
on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Dependabot Configuration
        uses: chrisreddington/validate-dependabot@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Required Inputs

| Input        | Description                        | Required | Default |
| ------------ | ---------------------------------- | -------- | ------- |
| github-token | GitHub token for repository access | No      | Defaults to the automatically generated token. You may override this if you require additional permissions beyond the default token.     |

### Example dependabot.yml

Create a .github/dependabot.yml file in your repository with configurations for
your package ecosystems:

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'

  - package-ecosystem: 'pip'
    directory: '/'
    schedule:
      interval: 'weekly'
```

## Troubleshooting

The action may fail with the following messages:

1. No .github/dependabot.yml file found

   - Create a dependabot.yml file in your .github directory
   - Ensure the file has correct YAML syntax

2. Missing Dependabot configuration for ecosystems: X, Y, Z
   - Add configurations for the listed ecosystems to your dependabot.yml
   - Each ecosystem needs its own update block in the configuration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
