import { WebhookClient } from 'discord.js'


export const debug = process.env.NODE_ENV !== 'production'

export const botToken = process.env.BOT_TOKEN

export const clientId = process.env.BOT_CLIENT_ID

// This is only used for text commands (commands that rely on message.content)
// you can also just mention the bot if you don't have the message content intent
// ex. =ban <user> or @bot ban <user> both work
export const prefix = process.env.PREFIX || '='

export const icons = {
	owo: '<a:owo_skin:1151093413790371890>',
	kiss: '<:ahri_kiss:1151093674109845515>',
	shy: '<:ahri_shy:1151093475022999582>',
	caughtIn4k: '<:ahri4k:1151117217979707424>',
	confused: '<:ahri_huh:1151117050039767092>',
	pointing_left: '<:ahri_look:1151117087083864105>',
	cry: '<:ahricry:1151118947073142795>'
}

export const lewdGuilds = process.env.LEWD_GUILDS ? process.env.LEWD_GUILDS.split(',') : []

export const youtubeCookie = process.env.YOUTUBE_COOKIE

// User ids of users who have admin permissions (can run commands with the 'admin' category)
export const adminUsers = ['494220264129953792']

export const webhooks = {
	botLogs: process.env.BOT_LOGS_WEBHOOK_ID && process.env.BOT_LOGS_WEBHOOK_TOKEN ?
		new WebhookClient({ id: process.env.BOT_LOGS_WEBHOOK_ID, token: process.env.BOT_LOGS_WEBHOOK_TOKEN }) :
		undefined
}
