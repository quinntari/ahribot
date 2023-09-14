import { QueryType, Track } from 'discord-player'
import { BaseGuildTextChannel, ChannelType, EmbedBuilder } from 'discord.js'
import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import { fileURLToPath } from 'url'
import Ahri from '../ahri.js'
import { clientId, icons, webhooks } from '../config.js'
import CustomSlashCommand from '../structures/CustomSlashCommand.js'
import { logger } from '../utils/logger.js'


export interface QueueMetadata {
	channel: BaseGuildTextChannel
}

export function getTrackDisplay (track: Track): string {
	if (track.source === 'spotify') {
		return `\`${track.author.replace(/`/g, '')} - ${track.title.replace(/`/g, '')}\` (${track.duration})`
	}

	return `\`${track.title.replace(/`/g, '')}\` (${track.duration})`
}

export default class extends CustomSlashCommand<'play'> {
	constructor (creator: SlashCreator, app: Ahri) {
		super(creator, app, {
			name: 'play',
			description: 'Play a song in voice chat!',
			longDescription: 'Play a song from youtube, spotify, soundcloud, etc.',
			options: [{
				name: 'search',
				type: CommandOptionType.STRING,
				description: 'song to play (url or search input)',
				required: true
			}],
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

		const guild = this.app.bot.guilds.cache.get(ctx.guildID)
		const channel = guild?.channels.cache.get(ctx.channelID)
		const botMember = guild?.members.cache.get(clientId || '')

		if (!guild || (!channel || ![ChannelType.GuildText, ChannelType.PublicThread, ChannelType.GuildVoice].includes(channel.type)) || !botMember) {
			await ctx.send({
				content: `${icons.confused} There's something wrong with my music player module, you should try reinviting me to the server.`
			})
			return
		}

		const member = await this.app.fetchMember(guild, ctx.user.id)

		if (!member) {
			throw new Error('No member found')
		}
		else if (!member.voice.channel) {
			await ctx.send({ content: `${icons.pointing_left} you have to join a voice channel first` })
			return
		}

		const botPermissions = member.voice.channel.permissionsFor(botMember)
		if (!member.voice.channel.members.has(botMember.id) && !botPermissions.has('Connect')) {
			await ctx.send({ content: `${icons.pointing_left} I dont have permission to join your voice channel (you could move me there tho)` })
			return
		}
		else if (!botPermissions.has('Speak')) {
			await ctx.send({ content: `${icons.pointing_left} I dont have permission to speak in your voice channel...` })
			return
		}

		const query = ctx.options.search
		const user = await this.app.fetchUser(ctx.user.id)
		const searchResult = await this.app.musicPlayer.search(query, {
			requestedBy: user,
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: QueryType.YOUTUBE_SEARCH
		}).catch(err => {
			logger.error(err)
		})

		if (!searchResult || !searchResult.tracks.length) {
			await ctx.send({ content: `${icons.cry} I couldn't find anything to play...` })
			return
		}

		for (const track of searchResult.tracks) {
			track.url = `${track.url}&bpctr=9999999999&has_verified=1`
		}

		const { queue } = await this.app.musicPlayer.play(member.voice.channel, searchResult, {
			nodeOptions: {
				metadata: {
					channel
				},
				volume: 100,
				leaveOnEnd: false,
				leaveOnEmpty: true,
				leaveOnEmptyCooldown: 1000 * 60,
				selfDeaf: true
			}
		})

		try {
			if (!queue.connection) await queue.connect(member.voice.channel)
		}
		catch {
			queue.delete()
			await ctx.send({ content: `${icons.confused} There was an issue trying to join ur voice channel` })
			return
		}

		const playEmbed = new EmbedBuilder()
			.setColor('#FF7F96')
		let tracksDisplay

		if (searchResult.playlist) {
			playEmbed.setTitle(`${icons.owo} Loading your playlist...`)
			tracksDisplay = `${searchResult.tracks.length <= 10 ?
				searchResult.tracks.map(getTrackDisplay).join('\n') :
				`${searchResult.tracks.slice(0, 10).map(getTrackDisplay).join('\n')}\n...and ${searchResult.tracks.length - 10} other tracks`}`
		}
		else {
			playEmbed.setTitle(`${icons.owo} Loading...`)
			tracksDisplay = getTrackDisplay(searchResult.tracks[0])
		}

		playEmbed.setDescription(tracksDisplay)

		await ctx.send({
			embeds: [playEmbed.toJSON()]
		})

		if (webhooks.botLogs) {
			webhooks.botLogs.send({
				embeds: [
					new EmbedBuilder()
						.setThumbnail(ctx.user.avatarURL)
						.setDescription(`*${ctx.user.globalName || ctx.user.username}* is listening to ${searchResult.playlist ? `a playlist with ${searchResult.tracks.length} songs` : 'a song'} in the server *${guild.name}*`)
						.addFields(
							{ name: `${searchResult.playlist ? 'Songs' : 'Song'}`, value: tracksDisplay },
							{ name: 'User ID', value: `\`\`\`${ctx.user.id}\`\`\``, inline: true },
							{ name: 'Guild ID', value: `\`\`\`${guild.id}\`\`\``, inline: true }
						)
						.setColor('#FF7F96')
				]
			})
		}
	}
}

