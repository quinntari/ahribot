import { ActivityType, Partials } from 'discord.js'
import { botToken } from './config.js'
import Ahri from './ahri.js'
import { logger } from './utils/logger.js'


if (!botToken) {
	throw new Error('No bot token defined in .env')
}

const app = new Ahri({
	intents: [
		'Guilds',
		'GuildVoiceStates',
		'DirectMessages',
		'GuildMessages',
		'GuildMembers'
		// 'MessageContent'
	],
	partials: [
		Partials.Channel
	],
	allowedMentions: {
		repliedUser: false,
		parse: ['users']
	},
	presence: {
		activities: [{
			name: 'League of Legends',
			type: ActivityType.Playing
		}]
	}
})

app.launch()

process.on('SIGTERM', () => {
	logger.info('Stopping')
	process.exit(0)
})

process.on('unhandledRejection', (reason, promise) => {
	logger.error(reason as any)
})
