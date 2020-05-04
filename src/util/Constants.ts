import * as Package from '../../package.json';

import type { RESTOptions } from '../lib/RESTManager';

export const UserAgent = `DiscordBot (${Package.repository.url}, ${Package.version})`;

export const RestOptionsDefaults: Required<RESTOptions> = {
	userAgentAppendix: `Node.js/${process.version}`,
	offset: 100,
	retries: 1,
	timeout: 15000,
	version: 7,
	api: 'https://discord.com/api',
	cdn: 'https://cdn.discordapp.com'
};


export const Routes = {
	application: (): string => `/oauth2/applications/@me`,
	auditLog: (guildID: string): string => `/guilds/${guildID}/audit-logs`,
	ban: (guildID: string, userID: string): string => `/guilds/${guildID}/bans/${userID}`,
	bans: (guildID: string): string => `/guilds/${guildID}/bans`,
	channel: (channelID: string): string => `/channels/${channelID}`,
	crosspostMessage: (channelID: string, messageID: string): string => `/channels/${channelID}/messages/${messageID}/crosspost`,
	dms: (): string => `/users/@me/channels`,
	emoji: (guildID: string, emojiID: string): string => `/guilds/${guildID}/emojis/${emojiID}`,
	emojis: (guildID: string): string => `/guilds/${guildID}/emojis`,
	gateway: (): string => `/gateway`,
	gatewayBot: (): string => `/gateway/bot`,
	groupDMRecipient: (channelID: string, userID: string): string => `/channels/${channelID}/recipients/${userID}`,
	guild: (guildID: string): string => `/guilds/${guildID}`,
	guildChannels: (guildID: string): string => `/guilds/${guildID}/channels`,
	guildEmbed: (guildID: string): string => `/guilds/${guildID}/embed`,
	guildInvites: (guildID: string): string => `/guilds/${guildID}/invites`,
	guilds: (): string => `/guilds`,
	guildVanityURL: (guildID: string): string => `/guilds/${guildID}/vanity-url`,
	guildWebhooks: (guildID: string): string => `/guilds/${guildID}/webhooks`,
	guildWidgetImage: (guildID: string): string => `/guilds/${guildID}/widget.png`,
	integration: (guildID: string, integrationID: string): string => `/guilds/${guildID}/integrations/${integrationID}`,
	integrations: (guildID: string): string => `/guilds/${guildID}/integrations`,
	integrationSync: (guildID: string, integrationID: string): string => `/guilds/${guildID}/integrations/${integrationID}/sync`,
	invite: (inviteCode: string): string => `/invites/${inviteCode}`,
	invites: (channelID: string): string => `/channels/${channelID}/invites`,
	leaveGuild: (guildID: string): string => `/users/@me/guilds/${guildID}`,
	listVoiceRegions: (): string => `/voice/regions`,
	member: (guildID: string, userID: string): string => `/guilds/${guildID}/members/${userID}`,
	memberRole: (guildID: string, userID: string, roleID: string): string => `/guilds/${guildID}/members/${userID}/roles/${roleID}`,
	members: (guildID: string): string => `/guilds/${guildID}/members`,
	message: (channelID: string, messageID: string): string => `/channels/${channelID}/messages/${messageID}`,
	messages: (channelID: string): string => `/channels/${channelID}/messages`,
	nickname: (guildID: string, userID = '@me'): string => `/guilds/${guildID}/members/${userID}/nick`,
	permissions: (channelID: string, overwriteID: string): string => `/channels/${channelID}/permissions/${overwriteID}`,
	pin: (channelID: string, messageID: string): string => `/channels/${channelID}/pins/${messageID}`,
	pins: (channelID: string): string => `/channels/${channelID}/pins`,
	prune: (guildID: string): string => `/guilds/${guildID}/prune`,
	reaction: (channelID: string, messageID: string, userID = '@me'): string => `/channels/${channelID}/messages/${messageID}/reactions/${userID}`,
	reactions: (channelID: string, messageID: string): string => `/channels/${channelID}/messages/${messageID}/reactions`,
	role: (guildID: string, roleID: string): string => `/guilds/${guildID}/roles/${roleID}`,
	roles: (guildID: string): string => `/guilds/${guildID}/roles`,
	typing: (channelID: string): string => `/channels/${channelID}/typing`,
	user: (userID = '@me'): string => `/users/${userID}`,
	voiceRegions: (guildID: string): string => `/guilds/${guildID}/regions`,
	webhook: (webhookID: string): string => `/webhooks/${webhookID}`,
	webhookGithub: (webhookID: string, webhookToken: string): string => `/webhooks/${webhookID}/${webhookToken}/github`,
	webhooks: (channelID: string): string => `/channels/${channelID}/webhooks`,
	webhookSlack: (webhookID: string, webhookToken: string): string => `/webhooks/${webhookID}/${webhookToken}/slack`,
	webhookTokened: (webhookID: string, webhookToken: string): string => `/webhooks/${webhookID}/${webhookToken}`
};
