const { Collection, Client, RichEmbed } = require('discord.js');
let { token, reacts } = require('./config.json');
const client = new Client();

reacts = new Collection(reacts.map(i => {
	i[1].reactions = new Collection(i[1].reactions)
	return i
}))

client.login(token) 


client.on('ready', async() => {
	console.log('Bot online')
	await reacts.forEach(async (obj, id) => {
		let [channelid, msgid] = id.split('.');
		let channel = client.channels.get(channelid);
		if(!channel){
			reacts.delete(id)
			console.error('Channel with id', channelid, 'undefined')
			return;
		}
		try{
			let message = await channel.fetchMessage(msgid);
			obj.reactions.forEach((roleid, emoji, reactions) => {
				let role = getRole(roleid);
				if(!role){
					reactions.delete(emoji)
					console.log('Role with id', roleid, 'undefined')
					return;
				}
				console.log('add Collector')
				createCollector(message, emoji, role, obj.limit)
			})
		}catch(err){
			reacts.delete(id)
			console.error('Msg with id', msgid, 'undefined')
			console.error(err)
			return;
		}
	})
})

function getRole(id){
	let guild = client.guilds.find(i => i.roles.has(id));
	if(!guild)return undefined;
	return guild.roles.get(id)
}

function createCollector(message, emoji, role, limit){
	message.react(emoji)
	let filter = (reaction, user) => emoji == reaction.emoji.name || emoji == reaction.emoji.toString() || emoji == reaction.emoji.id
	let collector = message.createReactionCollector(filter);
	collector.on('collect', async r => {
		let { emoji, message, users } = r;
		let member = message.guild.members.get(users.last().id);
		if(member.user.bot)return;
		r.remove(member.user);
		let memberRoles = reacts.get(message.channel.id+'.'+message.id).reactions.filter(i => member.roles.has(i))
		if(memberRoles.size+1 > limit && !member.roles.has(role.id)){
			try{
				await sendLimit(member, limit);
			}catch(err){
				console.error(err)
			}
			return;
		}
		if(member.roles.has(role.id)) member.removeRole(role.id);
		else member.addRole(role.id)
	})
}
async function sendLimit(member, limit){
	if(!member.lastMessageID)return;
	member.lastMessage.channel.send(member.toString(), {
		embed: new RichEmbed()
		.setColor('DARK')
		.setTitle('Roles Limit')
		.setDescription('Вы достигли лимита ролей. ' + limit + '\nЧто бы получить новую роль, избавтесь от старых' )
		.setAuthor(member.user.username, member.user.avatarURL)
		.setTimestamp()
	}).then(i => i.delete(10000))
}
