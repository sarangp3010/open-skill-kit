import { strToU8, zipSync, type Zippable } from 'fflate';
import { validateSkill } from '@uas/skill-validator';
import type { DiscoverySkill } from './catalog';
export function createSkillZip(skill: DiscoverySkill) {
  const validation = validateSkill(skill.files, skill.id, {
    profile: 'catalog',
  });
  if (!validation.valid)
    throw new Error('The skill package failed safety validation.');
  const archive: Zippable = {};
  for (const path of Object.keys(skill.files).sort())
    archive[`${skill.slug}/${path}`] = [
      strToU8(skill.files[path]),
      { mtime: new Date(2020, 0, 1) },
    ];
  return zipSync(archive);
}
export function saveSkillZip(skill: DiscoverySkill) {
  const buffer = Uint8Array.from(createSkillZip(skill)).buffer;
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/zip' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${skill.slug}.zip`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
