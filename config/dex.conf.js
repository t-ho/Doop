// MC's development rig
module.exports = {
	port: process.env.PORT || 80,
	url: 'http://dex',
	email: {
		enabled: true,
		method: 'mailgun',
		toAdmin: 'matt@mfdc.biz',
	},
	access: {
		lockdown: false,
	},
	instances: {
		domain: 'dex',
	},
	rollbar: {
		enabled: true,
		apiKey: '2a9949299c8d4c0f8f9fcf0524b51eb1',
	},
};
