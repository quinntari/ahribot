import { EmbedBuilder } from 'discord.js'
import { webhooks } from '../config.js'
import { EventHandler } from '../types/Events.js'
import { logger } from '../utils/logger.js'


export default {
	name: 'guildDelete',
	async run (guild) {
		try {
			if (webhooks.botLogs) {
				const guildEmbed = new EmbedBuilder()
					.setTitle('Left Server')
					.setDescription(`**Name**: ${guild.name}\n` +
						`**ID**: ${guild.id}\n` +
						`**Joined**: ${guild.joinedAt.toLocaleString('en-US', { timeZone: 'America/New_York' })}`)
					.setColor(16734296)

				await webhooks.botLogs.send({
					embeds: [guildEmbed.toJSON()]
				})
			}
		}
		catch (err) {
			logger.error(err)
		}
	}
} as EventHandler<'guildDelete'>
