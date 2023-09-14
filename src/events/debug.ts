import { EventHandler } from '../types/Events.js'
import { logger } from '../utils/logger.js'


export default {
	name: 'debug',
	async run (message) {
		logger.debug(message)
	}
} as EventHandler<'debug'>
