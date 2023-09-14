import { Message } from 'discord.js'
import Ahri from '../ahri.js'


interface CommandArguments {
	prefix: string
	args: string[]
}

type TextCommandPermissionLevel = 'admin' | 'anyone'

interface BaseTextCommand {
	name: string
	aliases: string[]
	permissionLevel: TextCommandPermissionLevel
	worksInDMs: boolean
}

export interface DMTextCommand extends BaseTextCommand {
	worksInDMs: true
	execute(app: Ahri, message: Message, commandArgs: CommandArguments): Promise<void>
}

export interface GuildTextCommand extends BaseTextCommand {
	worksInDMs: false
	execute(app: Ahri, message: Message, commandArgs: CommandArguments): Promise<void>
}

export type TextCommand = DMTextCommand | GuildTextCommand
