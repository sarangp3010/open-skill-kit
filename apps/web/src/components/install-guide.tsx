import { useState } from 'react';
import {
  platforms,
  getInstallInstructions,
  type InstallScope,
  type PlatformId,
} from '@uas/platform-adapters';
import type { IndexSkill } from '@/lib/catalog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/card';

export function InstallGuide({ skill }: { skill: IndexSkill }) {
  const [platform, setPlatform] = useState<PlatformId>('codex');
  const [scope, setScope] = useState<InstallScope>('project');
  const [message, setMessage] = useState('');
  const instructions = getInstallInstructions(skill, platform, scope);
  async function copy(command: string) {
    try {
      await navigator.clipboard.writeText(command);
      setMessage('Command copied.');
    } catch {
      setMessage('Clipboard unavailable. Select and copy the command below.');
    }
  }
  return (
    <section
      aria-labelledby="install-title"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 id="install-title" className="font-semibold">
        Install for your assistant
      </h2>
      <label
        htmlFor="install-platform"
        className="mt-4 mb-1 block text-xs text-muted-foreground"
      >
        Platform
      </label>
      <Select
        id="install-platform"
        className="w-full"
        value={platform}
        onChange={(event) => {
          setPlatform(event.target.value as PlatformId);
          setMessage('');
        }}
      >
        {platforms.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </Select>
      <label
        htmlFor="install-scope"
        className="mt-3 mb-1 block text-xs text-muted-foreground"
      >
        Installation scope
      </label>
      <Select
        id="install-scope"
        className="w-full"
        value={scope}
        onChange={(event) => {
          setScope(event.target.value as InstallScope);
          setMessage('');
        }}
      >
        <option value="project">This project</option>
        <option value="global">All my local projects</option>
      </Select>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Destination:{' '}
        <code className="break-all text-foreground">
          {instructions.directory}
        </code>
      </p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        From a local checkout, run <code>pnpm install --frozen-lockfile</code>{' '}
        and <code>pnpm build:npm</code> first. The CLI is not published to npm
        yet.{' '}
        {scope === 'project' &&
          'Replace ../your-project with your target project directory.'}
      </p>
      {skill.status !== 'published' && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          This {skill.status} package is not a published release. Inspect the
          preview and supporting files before explicitly opting in with
          --allow-draft.
        </p>
      )}
      <pre
        tabIndex={0}
        aria-label="Installation command"
        className="mt-4 whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs leading-5"
      >
        <code>{instructions.command}</code>
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => copy(instructions.preview)}
        >
          Copy preview command
        </Button>
        <Button size="sm" onClick={() => copy(instructions.command)}>
          Copy install command
        </Button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-xs text-muted-foreground">
        {message}
      </p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {instructions.adapter.note} Directory support was checked in official
        documentation on November 10, 2026; assistant execution has not been
        tested.
      </p>
      <a
        href={instructions.adapter.docs}
        target="_blank"
        rel="noreferrer"
        className="text-link mt-3 text-xs"
      >
        Official {instructions.adapter.title} guide
      </a>
      <a
        href="https://github.com/sarangp3010/open-skill-kit"
        target="_blank"
        rel="noreferrer"
        className="text-link mt-3 block text-xs"
      >
        Get the source checkout
      </a>
    </section>
  );
}
