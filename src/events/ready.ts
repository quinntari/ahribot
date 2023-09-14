import { EventHandler } from '../types/Events.js'
import { logger } from '../utils/logger.js'


export default {
	name: 'ready',
	async run () {
		this.acceptingCommands = true

		try {
			const cmds = await this.bot.application?.commands.fetch()

			logger.info(`Logged in as ${this.bot.user.username} (${this.bot.user.id}) and listening for ${cmds?.size || 0} commands! (${cmds?.map(c => c.name).join(', ')})`)
		}
		catch (err) {
			logger.info('Bot ready and accepting commands!')
		}
	}
} as EventHandler<'ready'>
