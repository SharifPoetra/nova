import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ApplicationCommandType } from 'discord.js';

@ApplyOptions<Command.Options>({
	description: 'Melihat profil ekonomi kamu di Nova'
})
export class ProfilCommand extends Command {
	// Ini untuk registrasi ke API Discord (Slash Command)
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				// Contoh tambah opsi: /profil user:@member
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('User yang ingin dilihat profilnya')
						.setRequired(false)
				)
		);
	}

	// Ini fungsi yang dijalankan saat user mengetik /profil
	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		const target = interaction.options.getUser('user') ?? interaction.user;

		await interaction.reply({
			content: `📊 **Profil Nova: ${target.username}**\n\n` +
                     `💰 Saldo: 0 (Belum ada database)\n` +
                     `🌟 Level: 1\n` +
                     `🆔 ID: \`${target.id}\``,
			ephemeral: false // Set true jika hanya user tersebut yang boleh lihat
		});
	}
}
