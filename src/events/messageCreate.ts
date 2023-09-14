import { Message, ChannelType } from 'discord.js'
import { prefix, adminUsers, icons } from '../config.js'
import { logger } from '../utils/logger.js'
import { reply } from '../utils/messageUtils.js'
import { EventHandler } from '../types/Events.js'


export default {
	name: 'messageCreate',
	async run (message) {
		try {
			if (message.author.bot || !this.acceptingCommands || !message.content) {
				return
			}

			const prefixUsed = message.content.startsWith(prefix) ?
				prefix :
				this.bot.user && message.content.startsWith(`<@${this.bot.user.id}>`) ?
					`<@${this.bot.user.id}>` :
					this.bot.user && message.content.startsWith(`<@!${this.bot.user.id}>`) ?
						`<@!${this.bot.user.id}>` :
						undefined

			// verify bot prefix was used or bot was mentioned
			if (!prefixUsed) {
				return
			}

			else if (message.channel.partial) {
				await message.channel.fetch()
			}


			if (message.guild) {
				const botPerms = this.bot.user && message.guild.members.cache.get(this.bot.user.id)?.permissions

				if (!botPerms || !botPerms.has('SendMessages') || !botPerms.has('UseExternalEmojis')) {
					// bot doesnt have permission to send messages or use emojis, just return since text commands are optional
					return
				}
			}

			const args = message.content.slice(prefixUsed.length).trimStart().split(/ +/)
			const commandName = args.shift()?.toLowerCase()

			const command = this.commands.find(cmd => cmd.name === commandName || (cmd.aliases.length && cmd.aliases.includes(commandName ?? '')))

			// no command was found
			if (!command) {
				if (prefixUsed !== prefix) {
					// player mentioned bot, maybe they need help?
					await reply(message as Message, {
						content: `${icons.confused} do you need help? use the \`/help\` command!`
					})
				}
				return
			}
			else if (command.permissionLevel === 'admin' && !adminUsers.includes(message.author.id)) {
				return
			}
			else if (!command.worksInDMs && message.channel.type === ChannelType.DM) {
				await reply(message as Message, {
					content: `${icons.shy} this chat feels a little too personal for that command, could you head to a server?`
				})
				return
			}

			try {
				await command.execute(this, message, { args, prefix: prefixUsed })
			}
			catch (err) {
				logger.error(err)
				message.channel.send('Command failed to execute!').catch(e => { logger.warn(e) })
			}
		}
		catch (err) {
			logger.warn(err)
		}
	}
} as EventHandler<'messageCreate'>
