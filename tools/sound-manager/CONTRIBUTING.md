# Development and release requirements

## Help is part of every change

A feature is complete only when both its implementation and explanation are complete. In the same change, update HELP.md for every new or changed control, setting, command, function and internal behavior. Explain:

1. What it is and the problem it solves.
2. How the user operates it, with an example where useful.
3. How it works behind the scenes, including relevant modules/functions and platform-specific paths.
4. Which streams/devices it affects and which prerequisites apply.
5. What saves across restarts versus temporary, and how to reset or undo it.
6. Limitations, failures, troubleshooting and differences between Windows/Linux.

When functionality changes or is removed, find related help and correct or remove obsolete claims in the same change. Review examples, screenshots, labels and links as well as prose. Do not leave old behavior described as current. Keep historical release notes explicitly historical. Planned functionality belongs in FEATURE_BACKLOG.md, not current help as though implemented.

## Release review

- Review behavior and matching help together; missing, misleading or stale help blocks completion.
- Confirm HELP.md/README.md, backlog status, validation and download-page claims agree.
- Include current help and contribution requirements in binary/source packages.
- Run checks relevant to the change; document platform/hardware verification limits.
- Keep ordinary controls simple. Extensive technical explanations belong in Help with plain-language entry points.

The planned searchable built-in Help window must consume this maintained content, not become a stale second copy. Until it exists, HELP.md is the shipped help reference. Full function-level reference and contextual links remain tracked in H01–H10.
