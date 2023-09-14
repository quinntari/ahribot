import { EmbedBuilder } from 'discord.js'
import { inspect } from 'util'
import { TextCommand } from '../types/Commands.js'
import { reply } from '../utils/messageUtils.js'
import { LewdGuildWhitelist } from '../utils/database.js'


// have to do this or tsc will remove unused variables
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const v = {
	LewdGuildWhitelist
}

const command: TextCommand = {
	name: 'eval',
	aliases: [],
	permissionLevel: 'admin',
	worksInDMs: true,
	async execute (app, message, { args, prefix }) {
		let commandInput = message.content.slice(prefix.length).trimStart().slice(this.name.length).trimStart()

		if (commandInput.startsWith('```')) {
			// remove the first and last lines from code block
			commandInput = commandInput.split('\n').slice(1, -1).join('\n')
		}

		try {
			const start = new Date().getTime()
			// eslint-disable-next-line no-eval
			let evaled = await eval(commandInput)
			const end = new Date().getTime()

			if (typeof evaled !== 'string') evaled = inspect(evaled)

			const segments = evaled.match(/[\s\S]{1,1500}/g)

			if (segments.length === 1) {
				const evalEmbed = new EmbedBuilder()
					.setDescription(`\`\`\`js\n${segments[0]}\`\`\``)
					.setColor(12118406)
					.setFooter({ text: `${end - start}ms` })

				await reply(message, {
					embeds: [evalEmbed.toJSON()]
				})
			}
			else {
				for (let i = 0; i < (segments.length < 5 ? segments.length : 5); i++) {
					await message.channel.send(`\`\`\`js\n${segments[i]}\`\`\``)
				}
			}
		}
		catch (err) {
			const evalEmbed = new EmbedBuilder()
				.setTitle('Something went wrong.')
				.setDescription(`\`\`\`js\n${err}\`\`\``)
				.setColor(13914967)

			await reply(message, {
				embeds: [evalEmbed.toJSON()]
			})
		}
	}
}

export default command
