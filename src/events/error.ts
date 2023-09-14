import { EventHandler } from '../types/Events.js'
import { logger } from '../utils/logger.js'


export default {
	name: 'error',
	async run (error) {
		logger.error(`Error: ${error.message}`)
	}
} as EventHandler<'error'>
