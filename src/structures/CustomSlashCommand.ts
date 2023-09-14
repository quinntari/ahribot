import { SlashCommand, SlashCommandOptions, SlashCreator } from 'slash-create'
import Ahri from '../ahri.js'


type CommandCategory = 'info' | 'other' | 'music'

interface BaseCommandOptions {
	guildModsOnly: boolean

	/**
	 * Description to display in help command
	 */
	longDescription: string

	/**
	 * Whether to not defer for this command, this should only be set to true if the
	 * command is pinging users/roles. When an interaction is deferred, the next response edits the
	 * original message, which prevents any pings from actually pinging.
	 */
	noDefer?: boolean

	category: CommandCategory
}

interface DMCommandOptions extends BaseCommandOptions {
	worksInDMs: true

	// guildModsOnly MUST be false for DM commands
	guildModsOnly: false
}

interface GuildCommandOptions extends BaseCommandOptions {
	worksInDMs: false
}

type CommandOptions<T extends string> = (DMCommandOptions | GuildCommandOptions) & { name: T }
type CustomSlashCommandOptions<T extends string> = Omit<SlashCommandOptions, 'throttling' | 'permissions'> & CommandOptions<T>

class CustomSlashCommand<T extends string = string> extends SlashCommand {
	app: Ahri
	customOptions: CommandOptions<T>

	constructor (
		creator: SlashCreator,
		app: Ahri,
		// omitting throttling and permissions because I run the commands
		// through my own custom command handler and they won't be supported
		slashOptions: CustomSlashCommandOptions<T>
	) {
		if (!slashOptions.guildIDs?.length) {
			slashOptions.guildIDs = undefined
		}

		super(creator, slashOptions)

		this.app = app
		this.customOptions = slashOptions
	}
}

export default CustomSlashCommand
