import { QueueRepeatMode, Track, useQueue } from 'discord-player'
import { EmbedBuilder } from 'discord.js'
import { SlashCreator, CommandContext, MessageOptions } from 'slash-create'
import { fileURLToPath } from 'url'
import Ahri from '../ahri.js'
import { icons } from '../config.js'
import CustomSlashCommand from '../structures/CustomSlashCommand.js'
import { getTrackDisplay } from './play.js'


const SONGS_PER_PAGE = 20

export default class extends CustomSlashCommand<'queue'> {
	constructor (creator: SlashCreator, app: Ahri) {
		super(creator, app, {
			name: 'queue',
			description: 'view to song queue',
			longDescription: 'shows all the songs being played',
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

		const pages = this.generatePages([currentTrack, ...queue.tracks.toArray()], queue.repeatMode)

		if (pages.length <= 1) {
			await ctx.send(pages[0])
			return
		}

		await this.app.componentCollector.paginate(ctx, pages)
	}

	generatePages (tracks: Track[], loopMode: QueueRepeatMode): MessageOptions[] {
		const pages = []
		const maxPage = Math.ceil(tracks.length / SONGS_PER_PAGE) || 1
		const tracksWithIndex = tracks.map((t, i) => ({ track: t, num: i }))

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (SONGS_PER_PAGE * i) - SONGS_PER_PAGE
			const indexLast = SONGS_PER_PAGE * i
			const filteredTracks = tracksWithIndex.slice(indexFirst, indexLast)

			const embed = new EmbedBuilder()
				.setColor('#FF7F96')
				.setDescription(`__**${tracksWithIndex.length} "${tracksWithIndex.length === 1 ? 'song' : 'songs'}" in queue**__` +
					`\n\n${filteredTracks.map(t => `${t.num === 0 ? 'PLAYING: ' : `${t.num}.`} ${getTrackDisplay(t.track)}${t.num === 0 ? '\n' : ''}`).join('\n')}`)

			if (loopMode !== QueueRepeatMode.OFF) {
				embed.addFields([
					{
						name: '__loop mode__',
						value: loopMode === QueueRepeatMode.TRACK ? '🔂 song' : loopMode === QueueRepeatMode.QUEUE ? '🔁 queue' : 'autoplay songs'
					}
				])
			}

			pages.push({
				embeds: [embed.toJSON()]
			})
		}

		return pages
	}
}

