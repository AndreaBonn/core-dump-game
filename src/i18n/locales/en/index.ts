import { menu } from './menu';
import { meta } from './meta';
import { game } from './game';

export const en = { ...menu, ...meta, ...game } as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Messages = Widen<typeof en>;
