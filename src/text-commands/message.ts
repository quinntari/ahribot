import { EmbedBuilder, ComponentType, ButtonStyle } from 'discord.js'
import { icons } from '../config.js'
import { TextCommand } from '../types/Commands.js'
import { reply } from '../utils/messageUtils.js'


export const command: TextCommand = {
	name: 'message',
	aliases: [],
	permissionLevel: 'admin',
	worksInDMs: true,
	async execute (app, message, { args, prefix }) {
		const userID = args[0]
		const messageIn = args.slice(1).join(' ')

		if (!userID) {
			await reply(message, {
				content: '❌ You forgot to include a user ID.'
			})
			return
		}
		else if (!messageIn) {
			await reply(message, {
				content: '❌ You need to include a message. `message <id> <message>`.'
			})
			return
		}

		const user = await app.fetchUser(userID)
		const imagesAttached = Array.from(message.attachments.values())

		const userMsg = new EmbedBuilder()
			.setThumbnail(message.author.avatarURL())
			.setDescription(messageIn)
			.setColor('#FF7F96')

		if (imagesAttached.length) {
			if (imagesAttached[0].url.endsWith('.mp4') || imagesAttached[0].url.endsWith('.mp3')) {
				userMsg.addFields([{
					name: 'File',
					value: imagesAttached[0].url
				}])
			}
			else {
				userMsg.setImage(imagesAttached[0].url)
			}
		}

		try {
			await user.send({
				content: `${icons.shy} My owner, *${message.author.displayName}*, asked me to pass this message to you:`,
				embeds: [userMsg.toJSON()],
				components: [{
					type: ComponentType.ActionRow,
					components: [{
						type: ComponentType.Button,
						label: 'respond',
						customId: 'dm_respond',
						style: ButtonStyle.Secondary
					}]
				}]
			})

			await reply(message, {
				content: `📨 Message sent to **${user.displayName}**!`
			})
		}
		catch (err) {
			await reply(message, {
				content: `Error sending message:\`\`\`js\n${err}\`\`\``
			})
		}
	}
}
