import { z } from 'zod';

export const isReservedFilename = (name: string) =>
  /^(con|prn|aux|nul|conin\$|conout\$|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(
    name,
  );
export const portablePathKey = (path: string) =>
  path.normalize('NFC').toUpperCase().toLowerCase().normalize('NFC');
export const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine((name) => !isReservedFilename(name), 'Reserved Windows device name');
export const frontmatterSchema = z
  .object({
    name: slugSchema,
    description: z.string().trim().min(1).max(1024),
  })
  .strict();
export const safePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (value) =>
      ![...value].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) &&
      !/[\\:%?#<>"|*]/.test(value) &&
      !value.startsWith('/') &&
      value === value.normalize('NFC') &&
      value
        .split('/')
        .every(
          (part) =>
            part !== '' &&
            part !== '.' &&
            part !== '..' &&
            !part.startsWith('.') &&
            !/[. ]$/.test(part) &&
            !isReservedFilename(part),
        ),
    'Expected a portable relative path without traversal or reserved names',
  );
