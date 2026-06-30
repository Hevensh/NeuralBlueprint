import type { AppLanguage } from '../i18n/labels';
import type { DesktopFile } from './desktopTypes';

export function getDesktopFileDisplayName(
  file: DesktopFile,
  language: AppLanguage,
) {
  return file.localizedNames?.[language] ?? file.name;
}
