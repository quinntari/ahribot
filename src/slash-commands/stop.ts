import { SlashCreator, CommandContext } from 'slash-create'
import { useQueue } from 'discord-player'
import { fileURLToPath } from 'url'
import Ahri from '../ahri.js'
import { icons } from '../config.js'
import CustomSlashCommand from '../structures/CustomSlashCommand.js'


export default class extends CustomSlashCommand<'stop'> {
	constructor (creator: SlashCreator, app: Ahri) {
		super(creator, app, {
			name: 'stop',
			description: 'stop the music!',
			longDescription: 'it stops the music and clears the queue',
			category: 'music',
			guildModsOnly: false,
			worksInDMs: false,
			guildIDs: []
		})

		this.filePath = fileURLToPath(new URL('', import.meta.url))
	}

	async run (ctx: CommandContext): Promise<void> {
		if (!ctx.guildID) {
			throw new Error('No guild attached to interaction')
		}

		const queue = useQueue(ctx.guildID)

		if (!queue || !queue.isPlaying) {
			await ctx.sendFollowUp({
				content: `${icons.confused} Nothing is playing?`
			})
			return
		}

		queue.delete()

		await ctx.send({
			content: `${icons.owo} Stopping the music...`
		})
	}
}

