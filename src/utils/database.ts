import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize'


const sql = new Sequelize('data', 'blobfysh', undefined, {
	dialect: 'sqlite',
	host: 'localhost',
	storage: 'data.sqlite',
	logging: false
})

interface LewdGuildWhitelistModel extends Model<InferAttributes<LewdGuildWhitelistModel>, InferCreationAttributes<LewdGuildWhitelistModel>> {
	guildID: string
}

export const LewdGuildWhitelist = sql.define<LewdGuildWhitelistModel>('lewd_guild_whitelist', {
	guildID: {
		type: DataTypes.STRING,
		allowNull: false,
		primaryKey: true
	}
})
