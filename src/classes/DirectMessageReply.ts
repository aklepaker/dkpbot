import { Message, MessageEmbed } from "discord.js";
import { DMConfigSession } from "../objects/DMConfigSession";
import { version } from "../version";
import { BotGuild } from "./BotGuild";
import { MessageContent } from "./MessageContent";
import { GuildConfig } from "../objects/GuildObject";

export class DirectMessageReply {
  private message: Message;
  private rawParams: string[];
  private guildName: string;
  private botGuild: BotGuild;
  private content: MessageContent = new MessageContent();
  private configSession: DMConfigSession;

  constructor(message: Message, configSession: DMConfigSession, botGuild: BotGuild) {
    this.message = message;
    this.rawParams = message.content.split(" ");
    this.configSession = configSession;
    this.botGuild = botGuild;
    this.guildName = this.botGuild.GetName();
  }

  public async ShowConfig(): Promise<void> {
    const descriptionObject: GuildConfig = {
      trigger: "The word used to trigger the bot",
      roleName: "The admin role needed to configure and update the bot."
    }

    const keysArray = [];
    const valuesArray = [];
    const descriptionArray = [];

    Object.keys(descriptionObject).forEach(keyName => {
      keysArray.push(keyName.toLocaleLowerCase());
      valuesArray.push(this.botGuild.GetConfig()[keyName] ? this.botGuild.GetConfig()[keyName] : this.botGuild.defaultConfig[keyName]);
      descriptionArray.push(descriptionObject[keyName] !== undefined ? descriptionObject[keyName] : "")
    });

    const embed = new MessageEmbed();

    embed.setTitle(`Configuration for ${this.botGuild.GetName()}`).setColor("#ffffff");
    embed.setDescription("Update with `!set <key> <value>`")
    embed.type = "rich";
    embed.addField("Key", keysArray, true);
    embed.addField("Value", valuesArray, true);
    embed.addField("Description", descriptionArray, true);
    embed.setTimestamp();

    this.message.channel.send(embed);
  }

  public async ShowHelp(): Promise<void> {
    const embed = new MessageEmbed();

    // const serversJoined = this.client.guilds.cache.size;
    // const botName = this.client.user.username;

    embed.type = "rich";
    embed.setTitle(`Help`).setColor("#ffffff");
    embed.setDescription(`Configuration commands for \`${this.guildName}\``);
    embed.addField("Show current configuration", `!show`);
    embed.addField("Set new configuration value", `!set <key> <value>`);
    // embed.addField("Show stats about bot usage", `!stats`);
    embed.addField("Show about this bot", `!about`);
    embed.addField("Exit configuration mode", `!close`);
    embed.setFooter(`v${version}`);
    embed.setTimestamp();

    this.message.channel.send(embed);
  }

  public async ShowSetConfig(): Promise<void> {
    const key = this.botGuild.GetConfigName(this.rawParams[1]);
    const newValue = this.rawParams[2];

    let oldValue = undefined;
    // if (this.botGuild.GetConfig()[key] !== undefined) {
    oldValue = this.botGuild.GetConfig()[key] ? this.botGuild.GetConfig()[key] : this.botGuild.defaultConfig[key];

    if (oldValue === newValue) {
      await this.message.author.dmChannel?.send(
        `Not updating \`${key}\` on server \`${this.guildName}\`, the value has not changed.`
      );
      return;
    }
    this.botGuild.SetConfig(key, newValue);
    // }

    await this.message.author.dmChannel?.send(
      `Updated \`${key}\` from \`${oldValue}\` to \`${newValue}\` on server \`${this.guildName}\``
    );
  }

  public async ShowClose(): Promise<void> {
    if (this.message.channel.type === "dm") {
      this.configSession.remove();
      await this.message.channel.delete();
    }
  }

  public ShowNoConfigInitiated(): void {
    this.message.channel.send(
      "Sorry, I don't talk to strangers.\nStart a conversation with me from your server. Use `help` in your server for more info."
    );
  }

  public ShowDefault(): void {
    this.message.channel.send("Uhm, I don't know that command. Try using `!help` for more information");
  }
}
