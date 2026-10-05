import type { Messages } from '@/i18n/locales/en';
import { menu } from './menu';
import { meta } from './meta';
import { game } from './game';

export const it: Messages = { ...menu, ...meta, ...game };
