import type { ScanOptions } from '@/types/config';

export const createScanConfig = (options: ScanOptions) => {
	return {
		...options,
	};
};

export type { Adapter, ScanOptions } from '@/types/config';
export { CSS_MODULE_LOCAL_IDENT_NAME } from './constant';
export { runCli } from './runCli';
