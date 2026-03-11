# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in termplex, please report it responsibly. **Do not open a public issue.**

### How to Report

1. **Email**: Send details to `support@chapa.thecreativetoken.com`
2. **GitHub**: Use [GitHub's private vulnerability reporting](https://github.com/juan294/termplex/security/advisories/new)

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Status update within 7 days
- We aim to release a fix within 14 days of confirmed vulnerabilities

## Security Considerations for Users

- **Shell command execution**: Termplex executes shell commands (editor, sidebar, server) inside tmux panes. Only configure commands you trust.
- **Config files**: Stored at `~/.config/termplex/`. These are plain text key=value files with no sensitive data.
- **Auto-install**: Termplex may offer to install missing commands (claude, lazygit, tmux) via package managers. You are always prompted before installation.

## Security Considerations for Contributors

- Never commit tokens, credentials, or secrets
- Do not add dependencies — this project maintains zero runtime dependencies
- Be cautious with user input handling in CLI argument parsing and path resolution
- Ensure any shell commands executed via `execSync` are properly sanitized

## Disclosure Policy

We follow coordinated disclosure. After a fix is released, we will:

1. Publish a GitHub Security Advisory
2. Release a patched version to npm
3. Credit the reporter (unless they prefer anonymity)
