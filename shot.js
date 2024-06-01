const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } = require('discord.js');
const currentDateEpoch = Math.floor(Date.now() / 1000);
require('dotenv').config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

client.once('ready', () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
});

let tickets = new Map();
const LOG_CHANNEL_ID = '1244642395442774036';  // Log kanalının ID'sini burada belirtiyoruz

const getStatusEmbed = (ticketData, status) => {
    return new MessageEmbed()
        .setColor('#0099ff')
        .setAuthor({ name: 'Yeni bir destek talebi', iconURL: 'https://cdn.discordapp.com/icons/1201831290442358804/634614a95c083e60b2992c567995a13a.png'})
        .setThumbnail(ticketData.userAvatar)
        .addFields(
            { name: '<:919274618668347492:1246470334232789045> Talep Açan:', value: `<@${ticketData.user}>`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, 
            { name: '<:11200974840945787381:1246493425365291261> Talep Açılış Tarihi:', value: `<t:${ticketData.creationTime}:F>`, inline: true },
            { name: '<:1145584471077298236:1208794822316527666> Kategori', value: `${ticketData.categoryLabel}`, inline: true },
            { name: '\u200B', value: '\u200B', inline: true },
            { name: 'Durum', value: `${status}`, inline: true }
        );
};

client.on('messageCreate', async message => {
    if (message.content === '!send' && message.member.permissions.has('ADMINISTRATOR')) {
        const embed = new MessageEmbed()
            .setColor('#340d59')
            .setAuthor({ name: 'HGSoft | Destek Merkezi', iconURL: 'https://cdn.discordapp.com/icons/1201831290442358804/634614a95c083e60b2992c567995a13a.png' })
            .setThumbnail('https://cdn.discordapp.com/attachments/1228734525870309406/1245786687573856296/GdvFgAAAABJRU5ErkJggg_1.png?ex=665bff03&is=665aad83&hm=211c719cee78998cb6f75b4b6eea1e889eefca86fbb1ccbc102a3fc2fbf77379&')
            .setDescription('Aşağıda ki butona tıkladığınızda sizlere özel bir destek odası açılacaktır ve yetkililerimizle oradan konuşma yapabileceksiniz. \n\n <:1145584652707438602:1208794838636560434> **Mesai Saatlerimiz:** __07:30 - 01:30__ \n <:1180574711357382727:1208813649825759392> **Ortalama Cevaplanma Süresi:** __30 Dakika__');

        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('create_ticket')
                    .setLabel('🎫 Talep Oluştur')
                    .setStyle('PRIMARY'),
            );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isSelectMenu()) return;

    if (interaction.customId === 'create_ticket') {
        const now = new Date();
        const startHour = 7;
        const startMinute = 30;
        const endHour = 1;
        const endMinute = 30;
        
        const isAfterStart = now.getHours() > startHour || (now.getHours() === startHour && now.getMinutes() >= startMinute);
        const isBeforeEnd = now.getHours() < endHour || (now.getHours() === endHour && now.getMinutes() < endMinute) || now.getHours() > 12;  // since endHour is at 1 AM next day

        if (isAfterStart || isBeforeEnd) {
            const embed = new MessageEmbed()
                .setColor('#340d59')
                .setTitle('Destek Kategorinizi Seçiniz')
                .setThumbnail('https://cdn.discordapp.com/attachments/1201871257453199380/1246432045983469620/images_4_1.png?ex=665c5dcd&is=665b0c4d&hm=b53f4d626dab9233640b6cf9ff4d7f769b38e54711c7a1b8d0e95b3a4ce0a361&')
                .setDescription('Destek operatörlerimizin sizlere daha detaylı şekilde yardımcı olabilmesi için aşağıda ki menüden lütfen doğru kategoriye tıklayıp talebinizi oluşturunuz.');

            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('select_category')
                        .setPlaceholder('Kategorinizi seçin')
                        .addOptions([
                            {
                                label: '🔨 Teknik Destek',
                                description: 'Teknik sorunlar için destek',
                                value: 'technical_support',
                            },
                            {
                                label: '📙 Genel Destek',
                                description: 'Genel sorular için destek',
                                value: 'general_support',
                            },
                            {
                                label: '💸 Ödeme Sorunları',
                                description: 'Ödeme ve faturalandırma sorunları için destek',
                                value: 'payment_support',
                            },
                        ]),
                );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
            const closedEmbed = new MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Mesai Saatlerimizin Dışındayız')
                .setDescription('Talebinizi şu anda alamıyoruz. Destek saatlerimiz: 07:30 - 01:30.');
            
            await interaction.reply({ embeds: [closedEmbed], ephemeral: true });
        }
    }

    if (interaction.customId === 'select_category') {
        const category = interaction.values[0];
        let channelName = `ticket-${interaction.user.username}`;
        let channelTopic = `${interaction.user.username} tarafından oluşturuldu`;
        let categoryLabel = '';

        if (category === 'technical_support') {
            channelName = `teknik-${interaction.user.username}`;
            channelTopic = `Teknik Destek Talebi - ${interaction.user.username}`;
            categoryLabel = '🔨 Teknik Destek';
        } else if (category === 'general_support') {
            channelName = `genel-${interaction.user.username}`;
            channelTopic = `Genel Destek Talebi - ${interaction.user.username}`;
            categoryLabel = '📙 Genel Destek';
        } else if (category === 'payment_support') {
            channelName = `odeme-${interaction.user.username}`;
            channelTopic = `Ödeme Sorunu - ${interaction.user.username}`;
            categoryLabel = '💸 Ödeme Sorunları';
        }

        const ticketChannel = await interaction.guild.channels.create(channelName, {
            type: 'GUILD_TEXT',
            topic: channelTopic,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                },
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: ['VIEW_CHANNEL'],
                },
            ],
        });

        tickets.set(ticketChannel.id, {
            user: interaction.user.id,
            userAvatar: interaction.user.avatarURL(),
            creationTime: currentDateEpoch,
            status: 'Açık',  // İlk başta "Açık" olarak belirliyoruz
            categoryLabel: categoryLabel,
        });

        const ticketRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('close_ticket')
                    .setLabel('Talebi Kapat')
                    .setStyle('DANGER'),
                new MessageButton()
                    .setCustomId('in_progress_ticket')
                    .setLabel('Talebi İşleme Al')
                    .setStyle('SECONDARY'),
                new MessageButton()
                .setCustomId('resolve_ticket')
                .setLabel('Talebi Çözümle')
                .setStyle('SUCCESS')
        );

    const welcomeEmbed = getStatusEmbed(tickets.get(ticketChannel.id), tickets.get(ticketChannel.id).status);

    const welcomeMessage = await ticketChannel.send({ content: `${interaction.user}`, embeds: [welcomeEmbed], components: [ticketRow] });

    tickets.set(ticketChannel.id, {
        ...tickets.get(ticketChannel.id),
        welcomeMessageId: welcomeMessage.id  // Welcome mesajının ID'sini saklıyoruz
    });

    const confirmationEmbed = new MessageEmbed()
        .setColor('#26ff00')
        .setTitle('Talebiniz Oluşturuldu!')
        .setDescription(`Talebiniz #${ticketChannel.name} kanalında oluşturuldu.`);

    // Bu noktada, interaction.deferUpdate() kullanarak etkileşimi ertelemeyi deneyebiliriz.
    try {
        await interaction.deferUpdate();
        await interaction.followUp({ embeds: [confirmationEmbed], components: [], ephemeral: true });
    } catch (error) {
        console.error('Etkileşimi güncelleme hatası:', error);
    }
}

if (interaction.customId === 'close_ticket') {
    const ticketChannel = interaction.channel;
    const ticketData = tickets.get(ticketChannel.id);
    if (ticketData) {
        const statusEmbed = getStatusEmbed(ticketData, 'Kapalı');
        const welcomeMessage = await ticketChannel.messages.fetch(ticketData.welcomeMessageId);
        await welcomeMessage.edit({ embeds: [statusEmbed] });
    }
    await ticketChannel.delete();
    tickets.delete(ticketChannel.id);
}

if (interaction.customId === 'in_progress_ticket') {
    const ticketChannel = interaction.channel;
    const ticketData = tickets.get(ticketChannel.id);
    if (ticketData) {
        ticketData.status = 'İşlemde';
        tickets.set(ticketChannel.id, ticketData); // Update status
        const statusEmbed = getStatusEmbed(ticketData, ticketData.status);
        const welcomeMessage = await ticketChannel.messages.fetch(ticketData.welcomeMessageId);
        await welcomeMessage.edit({ embeds: [statusEmbed] });

        const user = interaction.guild.members.cache.get(ticketData.user);
        if (user) {
            await user.send({
                embeds: [
                    new MessageEmbed()
                        .setColor('#FFD700')
                        .setTitle('Destek Talebiniz İşlemde')
                        .setDescription('Talebiniz yetkililer tarafından işleme alındı.'),
                ],
            });
        }
        await interaction.reply({ content: 'Talep durumu **İşlemde** olarak güncellendi ve kullanıcıya bilgi verildi.', ephemeral: true });
    }
}

if (interaction.customId === 'resolve_ticket') {
    const ticketChannel = interaction.channel;
    const ticketData = tickets.get(ticketChannel.id);
    if (ticketData) {
        ticketData.status = 'Çözümlendi';
        tickets.set(ticketChannel.id, ticketData); // Status güncelle
        const statusEmbed = getStatusEmbed(ticketData, ticketData.status);
        const welcomeMessage = await ticketChannel.messages.fetch(ticketData.welcomeMessageId);
        await welcomeMessage.edit({ embeds: [statusEmbed] });

        const user = interaction.guild.members.cache.get(ticketData.user);
        if (user) {
            await user.send({
                embeds: [
                    new MessageEmbed()
                        .setColor('#00FF00')
                        .setTitle('Destek Talebiniz Çözümlendi')
                        .setDescription('Talebiniz çözümlendi.'),
                ],
            });

            await ticketChannel.permissionOverwrites.edit(user.id, { SEND_MESSAGES: false });

            setTimeout(async () => {
                if (ticketChannel.deletable) {
                    await ticketChannel.delete();
                    tickets.delete(ticketChannel.id);
                }
            }, 60 * 60 * 1000); // 1 saat (3600000 ms)

            await interaction.reply({ content: 'Talep çözümlendi ve kanal 1 saat sonra kapanacak.', ephemeral: true });
        }
    }
}
});

client.on('messageCreate', async message => {
if (message.author.bot) return;

const ticket = tickets.get(message.channel.id);
if (ticket && message.guild) {
    // İlk Kullanıcı Mesajı İçin
    if (message.author.id === ticket.user && ticket.status !== 'Yanıt Bekliyor') {  // Eğer durum hali hazırda Yanıt Bekliyor değilse güncellenebilir
        ticket.status = 'Yanıt Bekliyor';
        tickets.set(message.channel.id, ticket); // Durumu Güncelle
        const statusEmbed = getStatusEmbed(ticket, ticket.status);
        const welcomeMessage = await message.channel.messages.fetch(ticket.welcomeMessageId);
        await welcomeMessage.edit({ embeds: [statusEmbed] });

        // Log Kanalına Uyarı Mesajı Gönder
        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            logChannel.send(`UYARI! <#${message.channel.id}> bu kanalda ki müşteri yanıt bekliyor!`);
        }
    }

    // Belirli Kullanıcı Mesajı İçin
    const responsibleUsers = ['1075883575116840960', '131145397644034048'];
    if (responsibleUsers.includes(message.author.id) && ticket.status === 'Yanıt Bekliyor') {
        ticket.status = 'Yanıtlandı';
        tickets.set(message.channel.id, ticket); // Durumu Güncelle
        const statusEmbed = getStatusEmbed(ticket, ticket.status);
        const welcomeMessage = await message.channel.messages.fetch(ticket.welcomeMessageId);
        await welcomeMessage.edit({ embeds: [statusEmbed] });

        // Talebi açan kullanıcıya cevap mesajı gönder
        const ticketUser = await client.users.fetch(ticket.user);
        if (ticketUser) {
            const replyEmbed = new MessageEmbed()
                .setColor('#3498db')
                .setTitle('Talebiniz Yanıtlandı ✨')
                .setDescription(`Destek talebiniz bir yetkilimiz tarafından cevaplanmıştır, destek kanalınıza hemen gidin ve yetkilimizin cevabına göz atın! \n\n <#${message.channel.id}>`);
        
            await ticketUser.send({ embeds: [replyEmbed] });
        }
    }
}
});

client.login(process.env.TOKEN);