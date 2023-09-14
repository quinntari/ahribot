import { EmbedBuilder } from 'discord.js'
import { webhooks } from '../config.js'
import { EventHandler } from '../types/Events.js'
import { logger } from '../utils/logger.js'


export default {
	name: 'guildCreate',
	async run (guild) {
		try {
			if (webhooks.botLogs) {
				const guildEmbed = new EmbedBuilder()
					.setTitle('Joined Server')
					.setDescription(`**Name**: ${guild.name}\n` +
						`**ID**: ${guild.id}\n` +
						`**Members**: ${guild.memberCount}`)
					.setColor(9043800)

				await webhooks.botLogs.send({
					embeds: [guildEmbed.toJSON()]
				})
			}
		}
		catch (err) {
			logger.error(err)
		}
	}
} as EventHandler<'guildCreate'>
