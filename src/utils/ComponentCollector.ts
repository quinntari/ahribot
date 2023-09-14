import { EmbedBuilder } from 'discord.js'
import { ComponentContext, ComponentType, CommandContext, Message, TextInputStyle, ButtonStyle, MessageOptions, ModalOptions, ModalInteractionContext } from 'slash-create'
import { EventEmitter } from 'events'
import Ahri from '../ahri.js'
import { icons, webhooks } from '../config.js'
import FeedbackCommand from '../slash-commands/feedback.js'
import { BLUE_BUTTON, NEXT_BUTTON, PREVIOUS_BUTTON } from './constants.js'
import { logger } from './logger.js'
import { disableAllComponents } from './messageUtils.js'


interface Collector {
	messageID: string
	e: CollectorEventEmitter
	filter: (ctx: ComponentContext) => boolean
	collected: ComponentContext[]
	limit?: number
	timeout: NodeJS.Timeout
}

interface CollectorEventEmitter extends EventEmitter {
	on: CollectorEvents<this>
	once: CollectorEvents<this>
}

interface CollectorEvents<T> {
	(event: 'collect', listener: (ctx: ComponentContext) => void): T
	(event: 'end', listener: (msg: string | ComponentContext[]) => void): T
}

export interface CollectorObject {
	collector: CollectorEventEmitter
	stopCollector: (reason?: string) => void
}

export default class ComponentCollector {
	private app: Ahri
	private collectors: Collector[]
	private expireTimers: Map<string, NodeJS.Timeout>

	constructor (app: Ahri) {
		this.app = app
		this.collectors = []
		this.expireTimers = new Map()

		this.app.slashCreator.on('componentInteraction', async ctx => {
			if (ctx.customID === 'dm_respond') {
				if (!webhooks.botLogs) {
					await ctx.send({
						content: 'Sorry but the owner isnt accepting messages right meow',
						ephemeral: true
					})
					return
				}
				let mctx

				try {
					mctx = await FeedbackCommand.awaitInput(ctx, ctx.channelID, 'response input', [
						{
							type: ComponentType.ACTION_ROW,
							components: [
								{
									type: ComponentType.TEXT_INPUT,
									label: 'type here:',
									style: TextInputStyle.PARAGRAPH,
									custom_id: 'text_input',
									required: true
								}
							]
						}
					])
				}
				catch (err) {
					logger.debug('response canceled')
					return
				}

				const embed = new EmbedBuilder()
					.setColor('#FF7F96')
					.setThumbnail(mctx.user.avatarURL)
					.setDescription(mctx.values.text_input)

				try {
					await webhooks.botLogs.send({
						content: `<@494220264129953792>, response from ${ctx.user.globalName || ctx.user.username} (\`${ctx.user.id}\`)`,
						embeds: [embed.toJSON()]
					})
					ctx.editOriginal({
						components: [{
							type: ComponentType.ACTION_ROW,
							components: [{
								type: ComponentType.BUTTON,
								label: 'respond (already responded)',
								custom_id: 'dm_respond',
								style: ButtonStyle.SECONDARY,
								disabled: true
							}]
						}]
					}).catch(err => logger.warn(err))
					mctx.send({
						content: `${icons.owo} I'll make sure to forward this message to my owner!`
					}).catch(err => logger.warn(err))
				}
				catch (err) {
					await mctx.send({
						content: `${icons.cry} Something broke and the response couldn't be sent, try again idk`,
						ephemeral: true
					})
				}

				return
			}

			this.verify(ctx)
		})
	}

	private async verify (ctx: ComponentContext): Promise<void> {
		const colObj = this.collectors.find(obj => obj.messageID === ctx.message.id)

		if (colObj) {
			if (!colObj.filter(ctx)) {
				await ctx.send({
					ephemeral: true,
					content: `${icons.confused} That button is not for u.`
				})
				return
			}

			colObj.collected.push(ctx)
			colObj.e.emit('collect', ctx)

			if (colObj.limit && colObj.collected.length >= colObj.limit) {
				this.stopCollector(colObj, colObj.collected)
			}
		}

		const timer = this.expireTimers.get(ctx.message.id)
		if (!timer) {
			this.expireTimers.set(ctx.message.id, setTimeout(() => {
				this.expireTimers.delete(ctx.message.id)
			}, 5000))
		}
		else {
			this.expireTimers.delete(ctx.message.id)

			await ctx.acknowledge()
			await ctx.editOriginal({
				content: `${icons.confused} That button broke..? Try running the command again.`
			})
		}
	}

	/**
	 * An event-driven way to collect button clicks from users
	 * @param messageID ID of the message to collect button interactions from
	 * @param filter Filter the button interactions will have to pass
	 * @param time How long the button collector lasts in milliseconds
	 * @param limit How many button interactions to collect max
	 * @returns An object with an event emitting object: collector, and and function used to stop the collector early: stopCollector
	 */
	createCollector (messageID: string, filter: (i: ComponentContext) => boolean, time = 15000, limit?: number): CollectorObject {
		const eventCollector = new EventEmitter()

		const collectorObj: Collector = {
			messageID,
			timeout: setTimeout(() => {
				this.stopCollector(collectorObj, 'time')
			}, time),
			e: eventCollector,
			collected: [],
			limit,
			filter
		}

		this.collectors.push(collectorObj)

		return {
			collector: collectorObj.e,
			stopCollector: (reason?: string) => { this.stopCollector(collectorObj, reason) }
		}
	}

	/**
	 * Used to wait for a button click from a user on a given message
	 * @param messageID ID of the message to collect button interactions from
	 * @param filter Filter the button interactions will have to pass
	 * @param time How long the button collector lasts in milliseconds
	 * @param limit How many button interactions to collect max
	 * @returns An array of button interactions
	 */
	awaitClicks (messageID: string, filter: (i: ComponentContext) => boolean, time = 15000, limit = 1): Promise<ComponentContext[]> {
		const { collector } = this.createCollector(messageID, filter, time, limit)

		return new Promise((resolve, reject) => {
			collector.once('end', val => {
				if (val !== 'time') {
					resolve(val as ComponentContext[])
				}
				else {
					reject(val)
				}
			})
		})
	}

	/**
	 * Used to create a message with pagination buttons based on an array of messages
	 * @param ctx Command context to use when responding
	 * @param pages Array of messages to become pages
	 * @param otherComponentHandler Function that handles clicks on components unrelated to pagination (so custom buttons alongside the page buttons),
	 * the value you return determines whether the pagination loop continues or not (continuePagination: true = continue pagination)
	 */
	async paginate (
		ctx: CommandContext | ComponentContext,
		pages: MessageOptions[],
		otherComponentHandler?: (
			/**
			 * The component context of the interaction
			 */
			pageCtx: ComponentContext,
			/**
			 * The current page number
			 */
			page: number
		) => Promise<{
			/**
			 * Whether or not to continue pagination after handling the custom component
			 */
			continuePagination: boolean
			/**
			 * If this custom component changed the pages in any way, you can supply the new pages here,
			 * the length of the new pages array must be the SAME as the array provided initially
			 */
			newPages?: {
				messages: MessageOptions[]
				/**
				 * Whether to add page buttons to messages automatically, defaults true
				 */
				addPageComponents?: boolean
				/**
				 * Whether to reset the page to 0, requires the provided new pages array length to be same as initial message array provided.
				 * defaults true
				 */
				resetPageNumber?: boolean
			}
		}>,
		startOptions: Partial<{
			/**
			 * Whether to add page next/previous buttons to the message automatically
			 */
			addPageComponents: boolean
			/**
			 * 0 based index page number to start on, defaults to 0 (first page)
			 */
			startingPageNum: number
		}> = {}
	): Promise<void> {
		const { addPageComponents = true, startingPageNum = 0 } = startOptions

		if (pages.length === 1 && (!otherComponentHandler || !pages[0].components?.length)) {
			await ctx.editOriginal(pages[0])
			return
		}

		if (addPageComponents && pages.length > 1) {
			pages = ComponentCollector.addPageButtonsToPages(pages)
		}

		let botMessage = await ctx.editOriginal(pages[startingPageNum]) as Message
		let page = startingPageNum
		let looping = true

		while (looping) {
			try {
				const componentCtx = (await this.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id, 90000))[0]
				await componentCtx.acknowledge()

				if (componentCtx.customID === 'previous' && page !== 0) {
					page--

					botMessage = await componentCtx.editParent(pages[page]) as Message
				}
				else if (componentCtx.customID === 'next' && page !== (pages.length - 1)) {
					page++

					botMessage = await componentCtx.editParent(pages[page]) as Message
				}
				else if (componentCtx.customID !== 'pageNum' && otherComponentHandler) {
					try {
						const handledResult = await otherComponentHandler(componentCtx, page)
						if (handledResult.newPages) {
							const resetPageNumber = handledResult.newPages.resetPageNumber !== undefined ? handledResult.newPages.resetPageNumber : true
							const addNewPageComponents = handledResult.newPages.addPageComponents !== undefined ? handledResult.newPages.addPageComponents : true

							if (
								!resetPageNumber &&
								handledResult.newPages.messages.length !== pages.length
							) {
								throw new Error('new pages array length must match old pages length when not resetting page number')
							}

							if (addNewPageComponents && handledResult.newPages.messages.length > 1) {
								pages = ComponentCollector.addPageButtonsToPages(handledResult.newPages.messages)
							}
							else {
								pages = handledResult.newPages.messages
							}

							if (resetPageNumber) {
								page = 0
							}

							botMessage = await componentCtx.editParent(pages[page]) as Message
						}

						// stop listening for button clicks if continuePagination = false
						if (!handledResult.continuePagination) {
							looping = false
						}
					}
					catch (err) {
						logger.error(err)
						looping = false
					}
				}
			}
			catch (err) {
				looping = false
				botMessage.edit({
					content: `${icons.owo} That button stopped working.`,
					components: disableAllComponents(botMessage.components)
				}).catch(error => logger.warn(error))
			}
		}
	}

	/**
	 * Used to send a modal and collect the user response. Throws an error if no response is given.
	 * @param ctx {@link ComponentContext} to use when sending the modal
	 * @param options Options for the modal. {@link ModalOptions}
	 */
	async awaitModalInput (ctx: ComponentContext, options: ModalOptions): Promise<ModalInteractionContext> {
		let finished = false

		return Promise.race([
			new Promise<ModalInteractionContext>((resolve, reject) => {
				ctx.sendModal(options, async mctx => {
					try {
						if (finished) {
							await mctx.send({
								content: 'Your time to submit the modal has run out.',
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

			// if user clicks outside of the modal or lets it sit there forever, discord doesnt send anything so using this timeout to ensure code doesnt halt
			new Promise<never>((resolve, reject) => setTimeout(() => {
				finished = true
				reject(new Error('Modal was never submitted'))
			}, 25 * 1000))
		])
	}

	static addPageButtonsToPages (messages: MessageOptions[]): MessageOptions[] {
		for (let i = 0; i < messages.length; i++) {
			const page = messages[i]
			const buttons = [
				PREVIOUS_BUTTON(i === 0),
				BLUE_BUTTON(`Page ${i + 1} / ${messages.length}`, 'pageNum'),
				NEXT_BUTTON(i === (messages.length - 1))
			]

			if (page.components) {
				page.components.push({
					type: ComponentType.ACTION_ROW,
					components: buttons
				})
			}
			else {
				page.components = [{
					type: ComponentType.ACTION_ROW,
					components: buttons
				}]
			}
		}

		return messages
	}

	private stopCollector (collectorObj: Collector, message: string | ComponentContext[] = 'forced'): void {
		if (this.collectors.includes(collectorObj)) {
			clearTimeout(collectorObj.timeout)
			collectorObj.e.emit('end', message)
			this.collectors.splice(this.collectors.indexOf(collectorObj), 1)
		}
	}
}
