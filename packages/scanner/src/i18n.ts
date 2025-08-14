// 新增：从 CLI 参数读取
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

const lang = process.env.LANG
	? process.env.LANG
	: new Intl.DateTimeFormat().resolvedOptions().locale.startsWith('zh')
		? 'zh'
		: 'en';

i18next.use(Backend).init({
	initImmediate: false,
	// Add: read from CLI parameters
	lng: lang, // Changed to read from CLI parameters
	fallbackLng: 'en',
	ns: ['translation'],
	defaultNS: 'translation',
	backend: {
		loadPath: path.resolve(__dirname, 'locales/{{lng}}/{{ns}}.json'),
	},
});

export default i18next;
