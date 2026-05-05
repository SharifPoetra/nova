import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
	description: 'Melihat profil ekonomi kamu di Nova'
})
export class ProfileCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('User yang ingin dilihat profilnya')
						.setRequired(false)
				)
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// Tentukan target: user yang di-mention atau orang yang ngetik command
		const target = interaction.options.getUser('user') ?? interaction.user;

		// Supaya bot nggak timeout kalau database agak lambat (koneksi internet lemot)
		await interaction.deferReply();

		try {
			// Menggunakan upsert: Cari user, kalau nggak ada langsung buat baru
			const userData = await this.container.db.user.findOneAndUpdate(
			  { id: target.id }, // Filter
        { $setOnInsert: { id: target.id } }, // Data saat pertama buat
        { upsert: true,
          returnDocument: "after",
          setDefaultsOnInsert: true } // Opsi
			);

			return interaction.editReply({
				content: `📊 **Profil Nova: ${target.username}**\n\n` +
						 `💰 **Saldo:** ${userData.balance.toLocaleString('id-ID')} koin\n` +
						 `🌟 **Level:** ${userData.level}\n` +
						 `📈 **EXP:** ${userData.exp}\n` +
						 `📅 **Bergabung:** ${userData.createdAt.toLocaleDateString('id-ID')}`
			});
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply('❌ Terjadi kesalahan saat mengambil data dari database.');
		}
	}
}
