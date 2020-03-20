import { Message, MessageEmbed } from "discord.js";
import { BotGuild } from "./BotGuild";
import { parse, getUnixTime, addSeconds, addDays } from "date-fns";
import { version } from "../version";
import { Parser } from "../parser";
import * as https from "https";
import { MessageContent } from "./MessageContent";

export class ChannelReply {
  private message: Message;
  private botGuild: BotGuild;
  private params: string[];
  private content: MessageContent = new MessageContent();

  constructor(message: Message, botGuild: BotGuild) {
    this.message = message;
    this.botGuild = botGuild;
    this.params = message.content.split(" ");
  }

  /**
    Create and reply search result 
  */
  public ShowSearch(): void {
    const searchItem = this.params
      .splice(2)
      .join(" ")
      .toLocaleLowerCase();
    const items = [];
    this.botGuild.GetTable("MonDKP_Loot").forEach(item => {
      if (item.loot.toLocaleLowerCase().indexOf(searchItem) > -1) {
        items.unshift(item);
      }
    });

    if (items.length <= 0) {
      this.message.channel.send(`No match searching for '${searchItem}'`);
      return;
    }

    this.message.channel.send(this.content.SearchEmbed(items, searchItem));
  }

  /**
    Create and reply player loot result
  */
  public ShowLootByPlayer(): void {
    const player = this.params[2];
    const items = [];

    this.botGuild.GetTable("MonDKP_Loot").forEach(item => {
      if (item.player.toLocaleLowerCase() == player.toLocaleLowerCase()) {
        items.unshift(item);
      }
    });

    if (items.length <= 0) {
      this.message.channel.send(`It seems like ${player} has no loot yet`);
      return;
    }

    this.message.channel.send(this.content.LootEmbed(items));
  }

  /**
    Create and reply loot from raid result
  */
  public ShowLootByDate(): void {
    const items = [];
    const searchDate = this.params[2];
    let dateBase;
    let dateFrom;
    let dateTo;
    const zone = this.params.slice(3).join(" ");

    try {
      dateBase = parse(searchDate, "dd.MM.yyyy", new Date());
      dateFrom = getUnixTime(dateBase);
      dateTo = getUnixTime(addSeconds(addDays(dateBase, +1), -1));
    } catch (err) {
      console.error(err);
    }

    if (zone.length === 0) {
      this.message.channel.send(`Missing raid name. ${this.botGuild.GetConfig().trigger} ${searchDate} molten`);
      return;
    }

    this.botGuild.GetTable("MonDKP_Loot").forEach(item => {
      if (
        item.date < dateTo &&
        item.date > dateFrom &&
        item.zone.toLocaleLowerCase().indexOf(zone.toLocaleLowerCase()) > -1
      ) {
        items.unshift(item);
      }
    });
    if (items.length === 0) {
      this.message.channel.send(`Looks like no raid took place in '${zone}' on ${searchDate}`);
      return;
    }
    this.message.channel.send(this.content.ZoneEmbed(items, searchDate, zone));
  }

  /**
    Create and reply class result
  */
  public ShowClassDKP(): void {
    const searchItem = this.params[2];
    const items = [];
    this.botGuild.GetTable("MonDKP_DKPTable").forEach(item => {
      if (item.class.toLocaleLowerCase() == this.params[2].toLocaleLowerCase()) {
        items.unshift(item);
      }
    });

    if (items.length <= 0) {
      this.message.channel.send(`Sorry, got no results for class '${searchItem}'`);
      return;
    }

    this.message.channel.send(this.content.DKPStatusEmbed(items, searchItem));
  }

  /**
    Create and reply user dkp result
  */
  public ShowUserDKP(): void {
    const items = [];
    this.botGuild.GetTable("MonDKP_DKPTable").forEach(item => {
      if (item.player.toLocaleLowerCase() == this.params[1].toLocaleLowerCase()) {
        items.push(item);
      }
    });

    if (items.length <= 0) {
      this.message.channel.send(`Sorry, I don't know '${this.params[1]}'`);
      return;
    }

    this.message.channel.send(this.content.DKPStatusEmbed(items, this.params[1]));
  }

  /**
    Create and reply all users dkp result
  */
  public ShowAllUsersDKP(): void {
    const searchItem = this.params[2];
    const items = [];
    this.botGuild.GetTable("MonDKP_DKPTable").forEach(item => {
      items.unshift(item);
    });
    this.message.channel.send(this.content.DKPStatusEmbed(items, searchItem));
  }

  /**
    Create Help reply
  */
  public ShowDKPHelp(): void {
    const embed = new MessageEmbed();

    // const serversJoined = this.client.guilds.cache.size;
    // const botName = this.client.user.username;

    embed.type = "rich";
    embed.setTitle(`Help`).setColor("#ffffff");
    embed.setImage(
      "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
    );
    embed.setThumbnail(
      "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
    );
    embed.setDescription(`Check your DKP status, or check out who got that shiny item in the last raid.`);
    embed.addField("Show all commands", `${this.botGuild.GetConfig().trigger} help`);
    embed.addField("Search all loots for the given item", `${this.botGuild.GetConfig().trigger} search <item>`);
    embed.addField(
      "Show current DKP status for a user",
      `${this.botGuild.GetConfig().trigger} <user> | all\n\`\`\`${this.botGuild.GetConfig().trigger} Graa\n${
        this.botGuild.GetConfig().trigger
      } all\`\`\``
    );
    embed.addField("Show all items a user have looted", `${this.botGuild.GetConfig().trigger} loot <user>`);
    embed.addField(
      "Show all items on a date from an instance",
      `${this.botGuild.GetConfig().trigger} date <dd.mm.yyyy> <instance>\n\`\`\`${
        this.botGuild.GetConfig().trigger
      } date 16.03.2020 molten\`\`\``
    );
    embed.addField(
      "Show DKP status for a given class",
      `${this.botGuild.GetConfig().trigger} class <class>\n\`\`\`${
        this.botGuild.GetConfig().trigger
      } class priest\`\`\``
    );
    embed.addField("Update the DKP table from a new Monolith DKP file", `${this.botGuild.GetConfig().trigger} update`);
    embed.setFooter(`v${version}`);
    embed.setTimestamp();

    this.message.channel.send(embed);
  }

  /**
    Handle the update request
  */
  public async UpdateDKPData(): Promise<void> {
    const isCorrectRole = this.message.member.roles.cache.some(r => r.name === "DkpBotAdmin");

    if (isCorrectRole) {
      const responseMsg = await this.message.channel.send(
        `Okay, I'm ready to receive your MonolithDKP.lua file..\nYou will usually find it here: C:\\Program Files(x86)\\World of Warcraft\\_classic_\\WTF\\Account\\USERNAME\\SavedVariables\\MonolithDKP.lua`
      );
      const filter = (m: Message): boolean => {
        return m.author == this.message.author;
      };

      this.message.channel.awaitMessages(filter, { max: 1 }).then(async msg => {
        const url = msg.first().attachments.first().url;
        https.get(url, async response => {
          responseMsg.edit("Parsing the file");
          let data = "";
          response
            .on("data", function(buffer) {
              data += buffer;
            })
            .on("end", async () => {
              if (data) {
                try {
                  const parser = new Parser();
                  const content = await parser.ParseData(data);
                  this.botGuild.SetName(this.message.guild.name);
                  this.botGuild.SetTable(content);
                  responseMsg.edit("Perfect, it's all up to date now");
                } catch (error) {
                  responseMsg.edit(`Failed parsing file: ${error}`);
                }
                msg.first().delete();
              } else {
                responseMsg.edit(`No content in file`);
              }
            })
            .setEncoding("utf8");
        });
      });
    }
  }
}
