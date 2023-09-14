import { QueueRepeatMode, Track, useQueue } from 'discord-player'
import { SlashCreator, CommandContext } from 'slash-create'
import { fileURLToPath } from 'url'
import Ahri from '../ahri.js'
import { icons } from '../config.js'
import CustomSlashCommand from '../structures/CustomSlashCommand.js'


export default class extends CustomSlashCommand<'skip'> {
	constructor (creator: SlashCreator, app: Ahri) {
		super(creator, app, {
			name: 'skip',
			description: 'skip the current song',
			longDescription: 'for when you\'re sick of the current song',
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
		const currentTrack = queue?.currentTrack

		if (!queue || !queue.isPlaying || !currentTrack) {
			await ctx.sendFollowUp({
				content: `${icons.confused} Nothing is playing?`
			})
			return
		}

		queue.node.skip()

		const nextTrack = queue.tracks.toArray()[0] as Track | undefined
		let msg

		if (queue.repeatMode === QueueRepeatMode.TRACK) {
			msg = 'I\'m repeating the song! Disable this using the `/loop` command.'
		}
		else if (nextTrack) {
			msg = `Now playing: \`${nextTrack.title.replace(/`/g, '')}\`.`
		}
		else if (queue.repeatMode === QueueRepeatMode.AUTOPLAY) {
			msg = 'Autoplaying another song...'
		}
		else if (queue.repeatMode === QueueRepeatMode.QUEUE) {
			msg = 'Repeating the queue! disable this using the `/loop` command.'
		}
		else {
			msg = 'Now playing: There\'s nothing else to play.'
		}

		await ctx.send({
			content: `Skipping \`${currentTrack.title.replace(/`/g, '')}\`\n\n${msg}`
		})
	}
}

