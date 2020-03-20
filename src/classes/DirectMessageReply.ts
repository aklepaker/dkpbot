import { Message, MessageEmbed } from "discord.js";
import { BotGuild } from "./BotGuild";
import { parse, getUnixTime, addSeconds, addDays } from "date-fns";
import { version } from "../version";
import { Parser } from "../parser";
import * as https from "https";
import { MessageContent } from "./MessageContent";
import { DMConfigSession } from "../objects/DMConfigSession";

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

  public ShowConfig(): void {
    console.log(this.botGuild.GetName());

    const keysArray = [];
    const valuesArray = [];

    Object.keys(this.botGuild.GetConfig()).forEach(keyName => {
      keysArray.push(keyName);
      valuesArray.push(this.botGuild.GetConfig()[keyName]);
    });

    const embed = new MessageEmbed();

    embed.setTitle(`Current configuration for ${this.botGuild.GetName()}`).setColor("#ffffff");

    embed.type = "rich";
    embed.addField("Setting", keysArray, true);
    embed.addField("Value", valuesArray, true);
    embed.setTimestamp();

    this.message.channel.send(embed);
  }

  public ShowHelp(): void {
    this.message.channel.send(`Showing help for \`${this.guildName}\``);
  }

  public async ShowSetConfig(): Promise<void> {
    const key = this.rawParams[1];
    const newValue = this.rawParams[2];

    let oldValue = undefined;
    if (this.botGuild.GetConfig()[key] !== undefined) {
      oldValue = this.botGuild.GetConfig()[key];

      if (oldValue === newValue) {
        await this.message.author.dmChannel?.send(
          `Not updating \`${key}\` on server \`${this.guildName}\`, the value has not changed.`
        );
        return;
      }
      this.botGuild.SetConfig(key, newValue);
    }

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

  public ShowInitiateConfig(): void {
    this.message.channel.send(
      "Sorry, I don't talk to strangers.\nStart a conversation with me from your server. Use `help` in your server for more info."
    );
  }

  public ShowDefault(): void {
    this.message.channel.send("Uhm, I don't know that command. Try using `!help` for more information");
  }
}
