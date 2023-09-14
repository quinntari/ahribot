import { EmbedBuilder } from 'discord.js'
import { SlashCreator, CommandContext, ModalInteractionContext, ComponentType, TextInputStyle, ComponentActionRow, ComponentContext } from 'slash-create'
import { fileURLToPath } from 'url'
import { icons, webhooks } from '../config.js'
import Ahri from '../ahri.js'
import CustomSlashCommand from '../structures/CustomSlashCommand.js'
import { logger } from '../utils/logger.js'


export default class FeedbackCommand extends CustomSlashCommand<'feedback'> {
	constructor (creator: SlashCreator, app: Ahri) {
		super(creator, app, {
			name: 'feedback',
			description: 'send a nice message to my owner!',
			longDescription: 'lets you send a nice *or not so nice* message to my owner. YOU MIGHT GET A RESPONSE??',
			category: 'info',
			guildModsOnly: false,
			worksInDMs: false,
			guildIDs: [],
			noDefer: true
		})

		this.filePath = fileURLToPath(new URL('', import.meta.url))
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.guildID) {
			throw new Error('No guild attached to interaction')
		}

		const guild = this.app.bot.guilds.cache.get(ctx.guildID)


		if (!guild || !webhooks.botLogs) {
			await ctx.send({
				content: 'sorry this command isn\'t working right now :\\'
			})
			return
		}

		let mctx

		try {
			mctx = await FeedbackCommand.awaitInput(ctx, ctx.channelID, 'send feedback!', [
				{
					type: ComponentType.ACTION_ROW,
					components: [
						{
							type: ComponentType.TEXT_INPUT,
							label: 'type here:',
							style: TextInputStyle.PARAGRAPH,
							custom_id: 'text_input',
							placeholder: 'I love ahribot so so much but I really wish... blah blah blah...',
							required: true
						}
					]
				}
			])
		}
		catch (err) {
			logger.debug('feedback canceled')
			return
		}

		const embed = new EmbedBuilder()
			.setColor('#FF7F96')
			.setThumbnail(mctx.user.avatarURL)
			.setDescription(mctx.values.text_input)
			.addFields({ name: 'Guild', value: `${guild.name}\n\`\`\`\nID: ${guild.id}\`\`\`` })

		try {
			await webhooks.botLogs.send({
				content: `<@494220264129953792>, feedback from ${ctx.user.globalName || ctx.user.username} (\`${ctx.user.id}\`)`,
				embeds: [embed.toJSON()]
			})
			mctx.send({
				content: `${icons.kiss} thanks for the feedback!! you may or may not get a response`,
				ephemeral: true
			}).catch(err => logger.warn(err))
		}
		catch (err) {
			await mctx.send({
				content: `${icons.confused} something broke and the feedback couldn't be send, try again idk`,
				ephemeral: true
			})
		}
	}

	static awaitInput (ctx: CommandContext | ComponentContext, originalChannelID: string, title: string, modalComponents: ComponentActionRow[]): Promise<ModalInteractionContext> {
		let finished = false

		return Promise.race([
			new Promise<ModalInteractionContext>((resolve, reject) => {
				ctx.sendModal({
					title,
					components: modalComponents
				}, async mctx => {
					try {
						if (finished) {
							await mctx.send({
								content: 'you ran out of time to submit!',
								ephemeral: true
							})
							return
						}
						else if (mctx.channelID !== originalChannelID) {
							await mctx.send({
								content: 'you changed channels while submitting?',
								ephemeral: true
							})
							return
						}
					}
					catch (err) {
						logger.warn(err)
					}

					resolve(mctx)
				}).catch(reject)
			}),

			new Promise<never>((resolve, reject) => setTimeout(() => {
				finished = true
				reject(new Error('Feedback not input'))
			}, 60 * 2 * 1000))
		])
	}
}

