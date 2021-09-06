require("dotenv").config();
const { SlashCommandBuilder } = require("@discordjs/builders");
const req = require("petitio");
const { parse } = require("node-html-parser");
const Redis = require("ioredis");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect your Discord account to your Gats account.")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("The Gats account you want to connect to.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const redis = new Redis(process.env.REDIS);
    let table;
    let errString =
      "Unable to connect your account! Make sure you logged into it and finished a game within the last minute. If you have stats tracking disabled, you may need to enable it and retry.";
    if (!interaction.options.getString("username")) {
      return interaction.reply("provide a username.");
    }
    if (interaction.options.getString("username")) {
      const request = await req(
        `https://stats.gats.io/${interaction.options.getString("username")}`
      ).text();
      const root = parse(request);
      usernameEl = root.querySelector("div .col-xs-12 h1");
      table = root.querySelector("tbody");
      if (usernameEl) {
        username = usernameEl.rawText.replace(" Stats", "");
        activity = table.querySelectorAll("td")[21].rawText;
        if (activity.includes("seconds ago" || "minute ago")) {
          redis.hget("accounts", username, (err, result) => {
            if (err) {
              console.error(err);
              return interaction.reply("internal error");
            }
            if (result) {
              return interaction.reply(
                "This account has already been claimed by someone. It may be you. If you think this is a mistake, please ask a moderator for assistance."
              );
            } else {
              redis.hset("accounts", username, interaction.user.id);
              return interaction.reply("Linked your account successfully!");
            }
          });
        } else return interaction.reply(errString);
      } else return interaction.reply("Invalid username.");
    }
  },
};
