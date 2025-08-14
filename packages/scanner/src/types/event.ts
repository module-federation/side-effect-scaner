import type { Location, NullableProperties } from './common';

export interface EventListenerOccurrence {
	file: string;
	type: string;
	event: string;
	element: string;
	loc: NullableProperties<Location>;
	code: string;
}
