# open-skill-kit

Browse and copy portable Markdown skill packages from the open-source [open-skill-kit repository](https://github.com/sarangp3010/open-skill-kit).

**Pre-release:** this package has not been published to npm, and the repository has no published skills yet. The registry commands below describe usage after a reviewed release. Installing the npm package installs the CLI and bundled files; it does not run AI tasks or automatically activate skills in every assistant.

## Usage after publication

```sh
npx open-skill-kit list
npx open-skill-kit list learning
npx open-skill-kit show <skill-id-or-slug>
npx open-skill-kit add <skill-id-or-slug> --dry-run
npx open-skill-kit add <skill-id-or-slug>
```

Replace `<skill-id-or-slug>` with an actual identifier from `list`. No flagship skill is available yet.

Alternatively, install the CLI once:

```sh
npm install --global open-skill-kit
open-skill-kit list
```

`add` copies the full package into `./.open-skill-kit/skills/<slug>/`. Use `--dir <directory>` to choose a different destination, including a directory supported by your assistant after consulting its current official installation instructions. Generic copying is not a promise of native compatibility. Existing folders and symbolic links are rejected. There is no force, global assistant configuration, or script execution option.

Only human-approved packages marked published are bundled. Drafts, planned skills and test fixtures are excluded. The CLI reads bundled data locally; it does not fetch remote skill content, send prompts or keys anywhere, or require an AI API. npm/npx itself may use the network to obtain the CLI package. Inspect the skill instructions, examples, boundaries, license and provenance before use. Availability of external links and model behavior are not verified by installation.

Requires Node.js 22.13+ on the 22.x line, 24.x, or 26+. MIT licensed. See the repository for contribution and security policies.
