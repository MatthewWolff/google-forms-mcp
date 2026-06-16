# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | Yes                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email **matthew.wolff@wisc.edu** with details
3. Include a description of the vulnerability and steps to reproduce
4. Allow reasonable time for a fix before public disclosure

We aim to acknowledge reports within 72 hours and release a fix within 30 days.

## Security Considerations

This MCP server handles OAuth credentials. Users should:

- Never commit `.env` files or tokens to version control
- Use the minimum required OAuth scopes (the auth script requests only `forms.body`, `forms.responses.readonly`, and `drive.file`)
- Rotate refresh tokens periodically
- Review the tool annotations (`destructiveHint`, `readOnlyHint`) when configuring auto-approval policies

## Scope

The following are in scope for security reports:

- Credential leakage in tool responses or error messages
- Input validation bypasses that could cause unintended API behavior
- Denial of service through resource exhaustion
- Unauthorized data access beyond the OAuth token's scope
