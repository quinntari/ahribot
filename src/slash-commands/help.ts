import { EmbedBuilder } from 'discord.js'
import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import { fileURLToPath } from 'url'
import Ahri from '../ahri.js'
import { icons } from '../config.js'
import Corrector from '../structures/Corrector.js'
import CustomSlashCommand from '../structures/CustomSlashCommand.js'


export default class extends CustomSlashCommand<'help'> {
	constructor (creator: SlashCreator, app: Ahri) {
		super(creator, app, {
			name: 'help',
			description: 'view the commands',
			longDescription: icons.owo,
			options: [{
				type: CommandOptionType.STRING,
				name: 'command',
				description: 'command to get info for',
				required: false
			}],
			category: 'other',
			guildModsOnly: false,
			worksInDMs: true,
			guildIDs: []
		})

		this.filePath = fileURLToPath(new URL('', import.meta.url))
	}

	async run (ctx: CommandContext): Promise<void> {
		const command = ctx.options.command

		if (command) {
			let cmd = this.app.slashCreator.commands.find(c => c.commandName === command) as CustomSlashCommand | undefined

			if (!cmd) {
				// try correcting command name
				const cmdCorrector = new Corrector(this.app.slashCreator.commands.map(c => c.commandName))
				const correctedCmd = cmdCorrector.getWord(command)

				cmd = this.app.slashCreator.commands.find(c => c.commandName === correctedCmd) as CustomSlashCommand | undefined
			}

			if (!cmd) {
				await ctx.send({
					content: `${icons.confused} I'm not sure what command you mean?`
				})

				return
			}

			const cmdEmbed = new EmbedBuilder()
				.setColor('#FF7F96')
				.setTitle(`${cmd.commandName} command info`)
				.setDescription(cmd.customOptions.longDescription)

			await ctx.send({
				embeds: [cmdEmbed.toJSON()]
			})
			return
		}

		const allCommands = Array.from(this.app.slashCreator.commands.values()) as CustomSlashCommand[]

		const commandsEmb = new EmbedBuilder()
			.setColor('#FF7F96')
			.setThumbnail('https://cdn.discordapp.com/attachments/1151081323218346093/1151150759870726235/oaoaoaoa.gif')
			.setDescription(`Hey there! I'm <@${this.app.bot.user.id}>, I can play music, chat, and other fun things. Here's a list of my commands:\n\n${allCommands.filter(c => c.customOptions.category !== 'other').map(c => this.getCommandDisplay(c)).join(', ')}`)

		await ctx.send({
			embeds: [commandsEmb.toJSON()]
		})
	}

	getCommandDisplay (cmd: CustomSlashCommand): string {
		if (!cmd.options || !cmd.options.length) {
			return `\`${cmd.commandName}\``
		}

		const optionsDisplay = []

		for (const opt of cmd.options) {
			if (opt.type === CommandOptionType.SUB_COMMAND) {
				optionsDisplay.push(opt.name)
			}
		}

		return `\`${cmd.commandName}${optionsDisplay.length ? ` ${optionsDisplay.join('/')}` : ''}\``
	}
}
