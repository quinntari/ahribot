import { pino } from 'pino'
import { PrettyOptions } from 'pino-pretty'
import { debug } from '../config.js'


const pinoPrettyOpts: PrettyOptions = {
	colorize: true,
	ignore: 'pid,hostname',
	translateTime: 'yyyy-mm-dd HH:MM:ss'
}

const pinoBase = pino({
	level: process.env.LOG_LEVEL || 'info',
	transport: debug ? {
		target: 'pino-pretty',
		options: pinoPrettyOpts
	} : undefined
})

export const logger = pinoBase
