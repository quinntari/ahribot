import Discord, { Guild, GuildMember, User, GatewayDispatchEvents } from 'discord.js'
import { SlashCreator, GatewayServer, CommandContext, InteractionRequestData, InteractionResponseFlags, InteractionResponseType, MessageOptions } from 'slash-create'
import { Player, Track, GuildQueue } from 'discord-player'
import ytdl from '@distube/ytdl-core'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'
import { TextCommand } from './types/Commands.js'
import ComponentCollector from './utils/ComponentCollector.js'
import { clientId, botToken, icons, youtubeCookie } from './config.js'
import CustomSlashCommand from './structures/CustomSlashCommand.js'
import { logger } from './utils/logger.js'
import { EventHandler } from './types/Events.js'

import { QueueMetadata } from './slash-commands/play.js'


export default class Ahri {
	bot: Discord.Client<true>
	commands: TextCommand[]
	slashCreator: SlashCreator
	componentCollector: ComponentCollector
	acceptingCommands: boolean
	musicPlayer: Player
	guildVolumes: Map<string, number>
	trackHistory: Track[]

	constructor (options: Discord.ClientOptions) {
		if (!clientId) {
			throw new Error('BOT_CLIENT_ID not defined in .env file')
		}
		else if (!botToken) {
			throw new Error('No bot token defined in .env')
		}

		this.bot = new Discord.Client(options)
		this.commands = []
		this.slashCreator = new SlashCreator({
			applicationID: clientId,
			token: botToken,
			handleCommandsManually: true,
			allowedMentions: {
				roles: false,
				users: true,
				everyone: false
			}
		})
		this.componentCollector = new ComponentCollector(this)
		this.acceptingCommands = false
		this.musicPlayer = new Player(this.bot, {
			ytdlOptions: {
				requestOptions: {
					headers: {
						Cookie: youtubeCookie
					}
				}
			}
		})
		this.guildVolumes = new Map()
		this.trackHistory = []
	}

	async launch (): Promise<void> {
		const botEventFiles = fs.readdirSync(fileURLToPath(new URL('events', import.meta.url))).filter(file => file.endsWith('.js') || file.endsWith('.ts'))

		this.commands = await this.loadCommands()

		this.slashCreator.withServer(
			new GatewayServer(
				handler => this.bot.ws.on(GatewayDispatchEvents.InteractionCreate, handler)
			)
		)

		await this.loadSlashCommmands()

		// discord-player set up
		await this.musicPlayer.extractors.loadDefault()

		this.musicPlayer.events.on('error', (queue, err) => {
			((queue.metadata as QueueMetadata).channel).send({
				content: `${icons.confused} there was an error trying to play the track...`
			})

			logger.error(`${queue.guild.name} (${queue.guild.id}) Queue error: ${err}`)
		})
		this.musicPlayer.events.on('playerError', (queue, err) => {
			logger.error(`${queue.guild.name} (${queue.guild.id}) Connection error: ${err}`)
		})


		this.slashCreator.on('commandInteraction', (i, res, webserverMode) => {
			if (!this.acceptingCommands) {
				return res({
					status: 200,
					body: {
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: `${icons.owo} The bot is currently restarting. Try using this command again in a minute or two...`,
							flags: InteractionResponseFlags.EPHEMERAL
						}
					}
				})
			}

			const command = this._getCommandFromInteraction(i)

			if (!command) {
				return res({
					status: 200,
					body: {
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: `${icons.owo} That command was recently removed.`,
							flags: InteractionResponseFlags.EPHEMERAL
						}
					}
				})
			}

			const ctx = new CommandContext(this.slashCreator, i, res, webserverMode, command.deferEphemeral)

			return this._handleSlashCommand(command, ctx)
		})

		this.slashCreator.on('debug', msg => {
			logger.debug(msg)
		})

		// load bot gateway events
		for (const event of botEventFiles) {
			let eventHandler = await import(`./events/${event}`) as EventHandler | { default: EventHandler }

			if ('default' in eventHandler) {
				eventHandler = eventHandler.default
			}

			if (eventHandler.name === 'ready') {
				// using .once here because the ready event is called every time the bot reconnects and we may have functions
				// inside the ready event that we want called only once.
				this.bot.once(eventHandler.name, eventHandler.run.bind(this))
			}
			else {
				this.bot.on(eventHandler.name, eventHandler.run.bind(this))
			}
		}

		logger.info('[APP] Listening for events')
		await this.bot.login(botToken)
	}

	async loadCommands (): Promise<TextCommand[]> {
		const commandFiles = fs.readdirSync(fileURLToPath(new URL('text-commands', import.meta.url)))
		const commandsArr: TextCommand[] = []

		for (const file of commandFiles) {
			const fileInfo = await import(`./text-commands/${file}?version=${Date.now()}`)
			const command = 'default' in fileInfo ? fileInfo.default : fileInfo

			commandsArr.push(command)
		}

		return commandsArr
	}

	async loadSlashCommmands (): Promise<void> {
		const botCommandFiles = fs.readdirSync(fileURLToPath(new URL('slash-commands', import.meta.url)))
		const commands = []

		for (const file of botCommandFiles) {
			if (file.endsWith('.js') || file.endsWith('.ts')) {
				const fileInfo = await import(`./slash-commands/${file}?version=${Date.now()}`)
				const command = 'default' in fileInfo ? fileInfo.default : fileInfo

				commands.push(new command(this.slashCreator, this))
			}
			else if (!file.endsWith('.map')) {
				const directory = fs.readdirSync(fileURLToPath(new URL(`slash-commands/${file}`, import.meta.url))).filter(f => f.endsWith('.js'))

				for (const subFile of directory) {
					const fileInfo = await import(`./slash-commands/${file}/${subFile}?version=${Date.now()}`)
					const command = 'default' in fileInfo ? fileInfo.default : fileInfo

					commands.push(new command(this.slashCreator, this))
				}
			}
		}

		this.slashCreator
			.registerCommands(commands)
			.syncCommands()
	}

	/**
	 * Used to fetch a user from cache if possible, or makes an API call if not
	 * @param userID ID of user to fetch
	 * @returns A user object
	 */
	async fetchUser (userID: string): Promise<User> {
		const cachedUser = this.bot.users.cache.get(userID)

		if (cachedUser) {
			return cachedUser
		}

		// fetch user using api call
		return this.bot.users.fetch(userID)
	}

	/**
	 * Fetches a member from a guilds cache if possible, or makes an API call if not
	 * @param guild Guild to check for member in
	 * @param userID ID of user to get member object of
	 * @returns A guild member object
	 */
	async fetchMember (guild: Guild, userID: string): Promise<GuildMember | undefined> {
		let member = guild.members.cache.get(userID)

		if (member) {
			return member
		}

		try {
			await guild.members.fetch()

			member = guild.members.cache.get(userID)

			if (member) {
				return member
			}
		}
		catch (err) {
			logger.error(err)
		}
	}

	private _getCommandFromInteraction (interaction: InteractionRequestData): CustomSlashCommand | undefined {
		return 'guild_id' in interaction ?
			this.slashCreator.commands.find(command =>
				!!(command.guildIDs &&
				command.guildIDs.includes(interaction.guild_id) &&
				command.commandName === interaction.data.name)) as CustomSlashCommand | undefined ||
				this.slashCreator.commands.get(`${interaction.data.type}:global:${interaction.data.name}`) as CustomSlashCommand | undefined :
			this.slashCreator.commands.get(`${interaction.data.type}:global:${interaction.data.name}`) as CustomSlashCommand | undefined
	}

	private async _handleSlashCommand (command: CustomSlashCommand, ctx: CommandContext) {
		try {
			let afterCommandMessage: MessageOptions | undefined

			// command was run in a server
			if (ctx.guildID) {
				// check if user has manage server permission before running GuildModCommand
				if (command.customOptions.guildModsOnly && (!ctx.member || !ctx.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild))) {
					return await ctx.send({
						content: `${icons.owo} Only users with the \`Manage Server\` permission can use that command.`,
						flags: InteractionResponseFlags.EPHEMERAL
					})
				}
			}

			// non-worksInDMs command cannot be used in DM channel
			else if (!command.customOptions.worksInDMs) {
				return await ctx.send({
					content: `${icons.shy} this chat feels a little too personal for that command, could you head to a server?`,
					flags: InteractionResponseFlags.EPHEMERAL
				})
			}

			// defer response before running command since command may take time to execute
			if (!command.customOptions.noDefer) {
				await ctx.defer(command.deferEphemeral)
			}

			// recursive function to make sure message is sent after bot responds to the command,
			// have to do this because some commands like /boss wait for user input which prevents me from placing
			// code after running the command. this is also just safer because it checks that command was responded to
			const sendAfterCommandMessage = (msg: MessageOptions, attemptNum = 1) => new Promise<boolean>((resolve, reject) => {
				setTimeout(async () => {
					try {
						if (attemptNum >= 5) {
							// command hasn't been responded to in over 5 seconds? give up i guess
							reject(new Error('Command not responded to after 5000 ms'))
							return
						}

						const hasResponded = await ctx.fetch()

						// ensure command was responded to before sending this message
						if (hasResponded.content || hasResponded.embeds.length) {
							await ctx.sendFollowUp(msg)
							resolve(true)
						}
						else {
							// try to respond again
							resolve(sendAfterCommandMessage(msg, attemptNum + 1))
						}
					}
					catch (err) {
						logger.warn(err)
					}
				}, 1000)
			})

			if (afterCommandMessage) {
				sendAfterCommandMessage(afterCommandMessage).catch(err => {
					logger.warn(err)
				})
			}

			logger.info(`Command (${command.commandName}) run by ${ctx.user.globalName || ctx.user.username} (${ctx.user.id}) in ${ctx.guildID ? `guild (${ctx.guildID})` : 'DMs'}`)
			await command.run(ctx)
		}
		catch (err) {
			logger.error(err)
			ctx.send({
				content: `${icons.confused} Ok so something might have broke... Just dont tell the devs they might restart me ${icons.cry}`,
				ephemeral: command.deferEphemeral
			}).catch(msgErr => {
				logger.warn(msgErr)
			})
		}
	}

	/**
	 * Gets a stream from ytdl-core IF POSSIBLE (some videos such as age-restricted vids will cause an error)
	 * @param queue The queue object
	 * @param trackUrl Track url to test
	 */
	getStream (queue: GuildQueue, trackUrl: string): Promise<Readable> {
		let stream: Readable | undefined

		return Promise.race([
			new Promise<never>((resolve, reject) => {
				stream = ytdl(trackUrl).on('error', err => {
					reject(err)
				})
			}),
			new Promise<Readable>((resolve, reject) => setTimeout(() => {
				if (stream) {
					resolve(stream)
				}
				else {
					reject(new Error('No stream found'))
				}
			}, 3 * 1000))
		])
	}
}
