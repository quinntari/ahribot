import DiscordJS from 'discord.js'
import SlashCreate from 'slash-create'
import { ResolvedMember as SlashCreateResolvedMember } from 'slash-create/lib/structures/resolvedMember.js'


export type AnyUser = DiscordJS.User | SlashCreate.User
export type AnyMember = DiscordJS.GuildMember | SlashCreateResolvedMember

export async function reply<T extends DiscordJS.Message> (msg: T, content: DiscordJS.MessageReplyOptions): Promise<T> {
	try {
		const botMsg = await msg.reply(content)

		return botMsg as T
	}
	catch (err) {
		return msg.channel.send(content) as Promise<T>
	}
}

/**
 * Disable all components
 * @param components Array of component action rows or buttons
 * @returns Components with all components disabled
 */
export function disableAllComponents (components: (SlashCreate.AnyComponentButton | SlashCreate.ComponentSelectMenu)[]): (SlashCreate.AnyComponentButton | SlashCreate.ComponentSelectMenu)[]
export function disableAllComponents (components: SlashCreate.AnyComponent[]): SlashCreate.ComponentActionRow[]
export function disableAllComponents (components: SlashCreate.AnyComponent[]): SlashCreate.AnyComponent[] {
	if (isActionRowComponents(components)) {
		return components.map(r => ({ ...r, components: r.components.map(c => ({ ...c, disabled: true })) }))
	}

	return (components as (SlashCreate.AnyComponentButton | SlashCreate.ComponentSelectMenu)[]).map(c => ({ ...c, disabled: true }))
}

function isActionRowComponents (components: SlashCreate.AnyComponent[]): components is SlashCreate.ComponentActionRow[] {
	return components.every(c => c.type === SlashCreate.ComponentType.ACTION_ROW)
}
