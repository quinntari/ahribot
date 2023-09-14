import { ClientEvents } from 'discord.js'
import Ahri from '../ahri.js'


export interface EventHandler<T extends keyof ClientEvents = keyof ClientEvents> {
	name: T
	run: (this: Ahri, ...args: ClientEvents[T]) => Promise<void>
}
