/* eslint-disable @typescript-eslint/no-explicit-any */
import { addDays, addSeconds, format, getUnixTime, parse } from "date-fns";
import { Client, Guild, Message, MessageEmbed } from "discord.js";
import * as https from "https";
import { sortBy } from "lodash";
import { connect } from "mongoose";
import { GuildObject, GuildObjectBase } from "./objects/BotGuild";
import { Parser } from "./parser";
import { version } from "./version";

export class Bot {
  private client: Client;
  private readonly token: string;
  private parser: Parser;
  private dkp: GuildObjectBase[] = [] as GuildObjectBase[];
  private trigger: string;
  private listeningIndex: number;
  constructor() {
    console.info(`DKPbot v${version}`);
    const url = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOSTNAME}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin`;
    this.client = new Client();
    this.token = process.env.TOKEN;
    this.parser = new Parser("dkp.lua");
    this.trigger = "!dkpb";
    this.listeningIndex = 0;

    try {
      connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: true,
        useCreateIndex: true
      }).then(result => {
        console.info("MongoDB Connected:", result.connection.readyState === 1 ? true : false);
      });
    } catch (error) {
      console.error("Failed connecting", error);
    }
  }

  private async Init(): Promise<void> {
    this.client.guilds.cache.forEach(async (guild: Guild) => {
      try {
        let importGuild = null;
        let dkpTable = null;
        importGuild = await this.GetGuild(guild.id);
        if (this.parser.FileExists(guild.id)) {
          try {
            dkpTable = await this.parser.Parse(guild.id);
            importGuild.dkptable = dkpTable;
            await importGuild.save();
            this.parser.RemoveFile(guild.id);
          } catch (error) {
            // no file, skip it.
          }
        }
        this.dkp[guild.id] = importGuild;
      } catch (error) {
        const err = error as Error;
        console.error(err);
        this.dkp[guild.id] = {};
      }
    });
  }

  public listen(): Promise<string> {
    this.client.on("ready", () => {
      this.client.user.setActivity({ type: "LISTENING", name: `${this.trigger} help` });
      this.client.setInterval(() => {
        const text = this.GetListeningText();
        this.client.user.setActivity({
          type: "LISTENING",
          name: text
        });
      }, 30000);
      this.Init();
    });

    this.client.on("guildCreate", async (guild: Guild) => {
      await this.OnGuildJoin(guild);
    });

    this.client.on("guildDelete", async (guild: Guild) => {
      // this.parser.RemoveFile(guild.id);
      await this.OnGuildLeave(guild);
    });

    this.client.on("message", async (message: Message) => {
      this.ParseMessage(message);
    });

    return this.client.login(this.token);
  }
  private async OnGuildLeave(guild: Guild): Promise<void> {
    const dbGuild = await this.GetGuild(guild.id);
    dbGuild.remove();
    console.info(`Removed from ${guild.name}`);
  }

  private async OnGuildJoin(guild: Guild): Promise<void> {
    console.info(`Joined ${guild.name}`);
    const dbGuild = await this.GetGuild(guild.id);
    dbGuild.guildName = guild.name;
    this.dkp[guild.id] = dbGuild;
  }

  private async GetGuild(guildId: string): Promise<GuildObjectBase> {
    let guild = null;

    guild = await GuildObject.findOne({ guildId }, async err => {
      if (err) {
        console.error(err);
      }
    });
    if (guild === null) {
      guild = await new GuildObject({ guildId, config: { trigger: "!dkpb" } });
    }
    return guild;
  }

  private GetDKPTable(guildId: string, table: string): Record<string, any> {
    try {
      if (this.dkp[guildId].dkptable[table]) {
        return this.dkp[guildId].dkptable[table];
      }
    } catch (error) {
      console.error(error.message);
      return [];
    }
    return [];
  }

  private async ParseMessage(message: Message): Promise<void> {
    if (message.content.startsWith(this.trigger)) {
      const params = message.content.split(" ");
      const guildId = message.guild.id;

      if (this.dkp[guildId] === undefined && params[1] !== "update" && params[1] !== "help") {
        message.channel.send(
          `I don't have a DKP table yet. Use '${this.trigger} update' to upload a Monolith DKP lua file.`
        );
        return;
      }

      if (params.length >= 3) {
        switch (params[1]) {
          case "search":
            {
              this.ShowSearch(params, message);
            }
            break;
          case "loot":
            {
              this.ShowLootByPlayer(params, message);
            }
            break;

          case "date":
            {
              this.ShowLootByDate(params, message);
            }
            break;
          case "class": {
            this.ShowClassDKP(params, message);
          }

          case "talents": {
            this.ShowClassTalents(params, message);
          }
        }
      } else {
        switch (params[1]) {
          case "all":
            {
              this.ShowAllUsersDKP(params, message);
            }
            break;

          case "update":
            {
              await this.UpdateDKPData(message);
            }
            break;

          case "help":
            {
              await this.ShowHelp(message);
            }
            break;
          default: {
            this.ShowUserDKP(params, message);
          }
        }
      }
    }
  }

  private ShowSearch(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params
      .splice(2)
      .join(" ")
      .toLocaleLowerCase();
    const items = [];
    this.GetDKPTable(guildId, "MonDKP_Loot").forEach(item => {
      if (item.loot.toLocaleLowerCase().indexOf(searchItem) > -1) {
        items.unshift(item);
      }
    });

    if (items.length <= 0) {
      message.channel.send(`No match searching for '${searchItem}'`);
      return;
    }

    message.channel.send(this.CreateSearchEmbed(items, searchItem));
  }

  private ShowLootByPlayer(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const player = params[2];
    const items = [];

    this.GetDKPTable(guildId, "MonDKP_Loot").forEach(item => {
      if (item.player.toLocaleLowerCase() == player.toLocaleLowerCase()) {
        items.unshift(item);
      }
    });

    if (items.length <= 0) {
      message.channel.send(`It seems like ${player} has no loot yet`);
      return;
    }

    message.channel.send(this.CreateLootEmbed(items));
  }

  private ShowLootByDate(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const items = [];
    const searchDate = params[2];
    let dateBase;
    let dateFrom;
    let dateTo;
    const zone = params.slice(3).join(" ");

    try {
      dateBase = parse(searchDate, "dd.MM.yyyy", new Date());
      dateFrom = getUnixTime(dateBase);
      dateTo = getUnixTime(addSeconds(addDays(dateBase, +1), -1));
    } catch (err) {
      console.error(err);
    }

    if (zone.length === 0) {
      message.channel.send(`Missing raid name. ${this.trigger} ${searchDate} molten`);
      return;
    }

    this.GetDKPTable(guildId, "MonDKP_Loot").forEach(item => {
      if (
        item.date < dateTo &&
        item.date > dateFrom &&
        item.zone.toLocaleLowerCase().indexOf(zone.toLocaleLowerCase()) > -1
      ) {
        items.unshift(item);
      }
    });
    if (items.length === 0) {
      message.channel.send(`Looks like no raid took place in '${zone}' on ${searchDate}`);
      return;
    }
    message.channel.send(this.CreateZoneEmbed(items, searchDate, zone));
  }

  private ShowClassDKP(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params[2];
    const items = [];
    this.GetDKPTable(guildId, "MonDKP_DKPTable").forEach(item => {
      if (item.class.toLocaleLowerCase() == params[2].toLocaleLowerCase()) {
        items.unshift(item);
      }
    });

    if (items.length <= 0) {
      message.channel.send(`Sorry, got no results for class '${searchItem}'`);
      return;
    }

    message.channel.send(this.CreateDKPStatusEmbed(items, searchItem));
  }

  private ShowClassTalents(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params[2];
    const items = [];
    this.GetDKPTable(guildId, "MonDKP_DKPTable").forEach(item => {
      if (item.class.toLocaleLowerCase() == params[2].toLocaleLowerCase()) {
        items.unshift(item);
      }
    });

    if (items.length <= 0) {
      message.channel.send(`Sorry, got no results for class '${searchItem}'`);
      return;
    }

    message.channel.send(this.CreateClassTalentsEmbed(items, searchItem));
  }

  private ShowUserDKP(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const items = [];
    this.GetDKPTable(guildId, "MonDKP_DKPTable").forEach(item => {
      if (item.player.toLocaleLowerCase() == params[1].toLocaleLowerCase()) {
        items.push(item);
      }
    });

    if (items.length <= 0) {
      message.channel.send(`Sorry, I don't know '${params[1]}'`);
      return;
    }

    message.channel.send(this.CreateDKPStatusEmbed(items, params[1]));
  }

  private ShowAllUsersDKP(params: string[], message: Message): void {
    const guildId = message.guild.id;
    const searchItem = params[2];
    const items = [];
    this.GetDKPTable(guildId, "MonDKP_DKPTable").forEach(item => {
      items.unshift(item);
    });
    message.channel.send(this.CreateDKPStatusEmbed(items, searchItem));
  }

  private ShowHelp(message: Message): void {
    const embed = new MessageEmbed();

    const serversJoined = this.client.guilds.cache.size;
    const botName = this.client.user.username;

    embed.type = "rich";
    embed.setTitle(`${botName} - Help`).setColor("#ffffff");
    embed.setImage(
      "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
    );
    embed.setThumbnail(
      "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
    );
    embed.setDescription(`Check your DKP status, or check out who got that shiny item in the last raid.`);
    embed.addField("Show all commands", `${this.trigger} help`);
    embed.addField("Search all loots for the given item", `${this.trigger} search <item>`);
    embed.addField(
      "Show current DKP status for a user",
      `${this.trigger} <user> | all\n\`\`\`${this.trigger} Graa\n${this.trigger} all\`\`\``
    );
    embed.addField("Show all items a user have looted", `${this.trigger} loot <user>`);
    embed.addField(
      "Show all items on a date from an instance",
      `${this.trigger} date <dd.mm.yyyy> <instance>\n\`\`\`${this.trigger} date 16.03.2020 molten\`\`\``
    );
    embed.addField(
      "Show DKP status for a given class",
      `${this.trigger} class <class>\n\`\`\`${this.trigger} class priest\`\`\``
    );
    embed.addField(
      "Show talents for a given class",
      `${this.trigger} talents <class>\n\`\`\`${this.trigger} talents priest\`\`\``
    );
    embed.addField("Update the DKP table from a new Monolith DKP file", `${this.trigger} update`);
    embed.setFooter(`v${version} - Currently serving ${serversJoined} servers`);
    embed.setTimestamp();

    message.channel.send(embed);
  }

  private async UpdateDKPData(message: Message): Promise<void> {
    const isCorrectRole = message.member.roles.cache.some(r => r.name === "DkpBotAdmin");
    const guildId = message.guild.id;

    if (isCorrectRole) {
      const responseMsg = await message.channel.send(
        `Okay, I'm ready to receive your MonolithDKP.lua file..\nYou will usually find it here: C:\\Program Files(x86)\\World of Warcraft\\_classic_\\WTF\\Account\\USERNAME\\SavedVariables\\MonolithDKP.lua`
      );
      const filter = (m: Message): boolean => {
        return m.author == message.author;
      };

      message.channel.awaitMessages(filter, { max: 1 }).then(async msg => {
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
                  const content = await this.parser.ParseData(data);
                  const guildData = this.dkp[guildId] as GuildObjectBase;
                  guildData.guildName = message.guild.name;
                  guildData.dkptable = content;
                  guildData.markModified("dkptable");
                  await guildData.save({}, err => {
                    if (err) {
                      console.error(err);
                    }
                  });
                  this.dkp[guildId] = guildData;
                  // this.parser.SaveFile(data, guildId);

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

  private CreateLootEmbed(items: any[]): MessageEmbed {
    if (items.length <= 0) {
      return null;
    }

    const embed = new MessageEmbed();

    const timeArray = [];
    const costArray = [];
    const itemArray = [];

    embed.type = "rich";
    embed.setTitle(`Loot history for ${items[0]?.player}`).setColor("#ffffff");
    embed.setTimestamp();

    items.forEach(item => {
      const lootItem = item.loot.substring(item.loot.indexOf("["), item.loot.lastIndexOf("]") + 1);

      const time = format(new Date(item.date * 1000), "dd.MM.yyyy");
      timeArray.unshift(time);
      itemArray.unshift(`${lootItem}`);
      costArray.unshift(item.cost.toString());
    });

    embed.addField("Item", itemArray, true);
    embed.addField("DKP", costArray, true);
    embed.addField("Date", timeArray, true);

    return embed;
  }

  private CreateSearchEmbed(items: any[], search: string): MessageEmbed {
    if (items.length <= 0) {
      return null;
    }
    const embed = new MessageEmbed();

    const playerArray = [];
    const timeArray = [];
    const costArray = [];
    const itemArray = [];

    embed.type = "rich";
    embed.setTitle(`Got ${items.length} result(s) searching for '${search}' `).setColor("#ffffff");
    embed.setTimestamp();

    const sortedItems = sortBy(items, ["cost"]);

    sortedItems.reverse().forEach(item => {
      const lootItem = item.loot.substring(item.loot.indexOf("["), item.loot.lastIndexOf("]") + 1);
      const time = format(new Date(item.date * 1000), "dd.MM.yyyy");

      itemArray.unshift(`${lootItem}`);
      playerArray.unshift(item.player);
      timeArray.unshift(time);
      costArray.unshift(item.cost);
    });

    embed.addField("Item", itemArray, true);
    embed.addField("Player", playerArray, true);
    embed.addField("Cost", costArray, true);

    return embed;
  }

  private CreateZoneEmbed(items: any[], search: string, zone: string): MessageEmbed {
    if (items.length <= 0) {
      return null;
    }
    const embed = new MessageEmbed();

    const playerArray = [];
    const costArray = [];
    const itemArray = [];

    zone = items[0].zone;

    embed.type = "rich";
    embed.setTitle(`There were ${items.length} item(s) distributed in ${zone} on ${search}`).setColor("#ffffff");
    embed.setTimestamp();

    items.forEach(item => {
      const lootItem = item.loot.substring(item.loot.indexOf("["), item.loot.lastIndexOf("]") + 1);
      const cost = item.cost;

      itemArray.unshift(`${lootItem}`);
      playerArray.unshift(item.player);
      costArray.unshift(cost);
    });

    embed.addField("Item", itemArray, true);
    embed.addField("Player", playerArray, true);
    embed.addField("DKP", costArray, true);
    embed.setFooter("Links has been removed due to discord message size restrictions\n");

    return embed;
  }

  lootObjects = [];
  private CreateDKPStatusEmbed(items: any, search: string): MessageEmbed {
    const embed = new MessageEmbed();

    embed.setTitle(`Current DKP status for ${search}`).setColor("#ffffff");

    const playerArray = [];
    const dkpArray = [];
    const classArray = [];

    items = sortBy(items, ["dkp"]);

    items.forEach(item => {
      playerArray.unshift(item.player);
      dkpArray.unshift(item.dkp);
      classArray.unshift(item.class[0] + item.class.substring(1).toLocaleLowerCase());
    });

    embed.type = "rich";
    embed.addField("Player", playerArray, true);
    embed.addField("Class", classArray, true);
    embed.addField("DKP", dkpArray, true);

    embed.setTimestamp();

    return embed;
  }

  private CreateClassTalentsEmbed(items: any, search: string): MessageEmbed {
    const embed = new MessageEmbed();

    embed.setTitle(`Current talents for ${search}`).setColor("#ffffff");

    const playerArray = [];
    const specArray = [];
    const classArray = [];

    items = sortBy(items, ["player"]).reverse();

    items.forEach(item => {
      playerArray.unshift(item.player);
      specArray.unshift(item.spec);
      classArray.unshift(item.class[0] + item.class.substring(1).toLocaleLowerCase());
    });

    embed.type = "rich";
    embed.addField("Player", playerArray, true);
    embed.addField("Class", classArray, true);
    embed.addField("Spec", specArray, true);

    embed.setTimestamp();

    return embed;
  }

  private GetListeningText(): string {
    const textArray = [`${this.trigger} help`, `${this.client.guilds.cache.size} servers`];
    this.listeningIndex = this.listeningIndex + 1 < textArray.length ? this.listeningIndex + 1 : 0;
    return textArray[this.listeningIndex];
  }
}
