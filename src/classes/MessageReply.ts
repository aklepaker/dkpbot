import { addDays, addSeconds, getUnixTime, parse } from "date-fns";
import { Message, MessageEmbed } from "discord.js";
import * as https from "https";
import { DMConfigSession } from "../objects/DMConfigSession";
import { GuildConfig } from "../objects/GuildObject";
import { version } from "../version";
import { BotGuild } from "./BotGuild";
import { MessageContent } from "./MessageContent";
import { Parser } from "./Parser";


export class MessageReply {
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

        if (this.rawParams[0].toLocaleLowerCase() === this.botGuild.GetConfig().trigger.toLocaleLowerCase()) {
            this.rawParams.shift();
        }


    }

    public async ShowConfig(): Promise<void> {
        const descriptionObject: GuildConfig = {
            trigger: "The word used to trigger the bot in a server",
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
        embed.setDescription("Update with `set <key> <value>`")
        embed.type = "rich";
        embed.addField("Key", keysArray, true);
        embed.addField("Value", valuesArray, true);
        embed.addField("Description", descriptionArray, true);
        embed.setTimestamp();

        this.message.channel.send(embed);
    }


    public async ShowSetConfig(): Promise<void> {
        const key = this.botGuild.GetConfigName(this.rawParams[1]);
        const newValue = this.rawParams[2];

        if (key === undefined) {
            await this.message.channel.send(
                `Missing or unknown setting.`
            );
            return;

        }

        if (newValue === undefined) {
            await this.message.channel.send(
                `Missing value for \`${key}\``
            );
            return;
        }

        let oldValue = undefined;
        // if (this.botGuild.GetConfig()[key] !== undefined) {
        oldValue = this.botGuild.GetConfig()[key] ? this.botGuild.GetConfig()[key] : this.botGuild.defaultConfig[key];

        if (oldValue === newValue) {
            await this.message.channel.send(
                `Not updating \`${key}\` on server \`${this.guildName}\`, the value has not changed.`
            );
            return;
        }
        this.botGuild.SetConfig(key, newValue);
        // }

        await this.message.channel?.send(
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
            "Uhm, I don't know you, and I don't talk to stragers.\nStart a conversation with me from your server. Use `!dkpb dm` from your server to initiate a session with me."
        );
    }

    public ShowDefault(): void {
        this.message.channel.send("Uhm, I don't know that command. Try using `help` for more information");
    }

    /**
    Create and reply search result 
    */
    public async ShowSearch(): Promise<void> {
        const searchItem = this.rawParams
            .splice(1)
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

        this.message.channel.send(await this.content.SearchEmbed(items, searchItem));
    }

    /**
    Create boss searc result 
    */
    public async ShowBossSearch(): Promise<void> {
        const searchItem = this.rawParams
            .splice(1)
            .join(" ")
            .toLocaleLowerCase();
        const items = [];
        this.botGuild.GetTable("MonDKP_Loot").forEach(item => {
            if (item.boss.toLocaleLowerCase().indexOf(searchItem) > -1) {
                items.unshift(item);
            }
        });

        if (items.length <= 0) {
            this.message.channel.send(`No match searching for '${searchItem}'`);
            return;
        }

        this.message.channel.send(await this.content.SearchBossEmbed(items, searchItem));
    }

    /**
      Create and reply player loot result
    */
    public ShowLootByPlayer(): void {
        const player = this.rawParams[1];
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
        const searchDate = this.rawParams[1];
        let dateBase;
        let dateFrom;
        let dateTo;
        const zone = this.rawParams.slice(2).join(" ");

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
        const searchItem = this.rawParams[1];
        const items = [];
        this.botGuild.GetTable("MonDKP_DKPTable").forEach(item => {
            if (item.class.toLocaleLowerCase() == searchItem.toLocaleLowerCase()) {
                items.unshift(item);
            }
        });

        if (items.length <= 0) {
            this.message.channel.send(`Sorry, got no results for class '${searchItem}'`);
            return;
        }

        this.message.channel.send(this.content.DKPStatusEmbed(items, searchItem));
    }


    public ShowClassTalents(): void {
        const searchItem = this.rawParams[1];
        const items = [];
        this.botGuild.GetTable("MonDKP_DKPTable").forEach(item => {
            if (item.class.toLocaleLowerCase() == searchItem.toLocaleLowerCase()) {
                items.unshift(item);
            }
        });

        if (items.length <= 0) {
            this.message.channel.send(`Sorry, got no results for class '${searchItem}'`);
            return;
        }

        this.message.channel.send(this.content.CreateClassTalentsEmbed(items, searchItem));
    }


    /**
      Create and reply user dkp result
    */
    public ShowUserDKP(): void {
        const items = [];
        const player = this.rawParams[0].toLocaleLowerCase();
        this.botGuild.GetTable("MonDKP_DKPTable").forEach(item => {
            if (item.player.toLocaleLowerCase() == player) {
                items.push(item);
            }
        });

        if (items.length <= 0) {
            this.message.channel.send(`Sorry, I don't know '${player}'`);
            return;
        }

        this.message.channel.send(this.content.DKPStatusEmbed(items, player));
    }

    /**
      Create and reply all users dkp result
    */
    public ShowAllUsersDKP(): void {
        const searchItem = this.rawParams[1];
        const items = [];
        this.botGuild.GetTable("MonDKP_DKPTable").forEach(item => {
            items.unshift(item);
        });
        this.message.channel.send(this.content.DKPStatusEmbed(items, searchItem));
    }

    /**
      Create Help reply
    */
    public ShowDKPHelp(isAdmin: boolean, isDm: boolean): void {
        const embed = new MessageEmbed();

        const trigger = !isDm ? this.botGuild.GetConfig().trigger : "";

        embed.type = "rich";
        embed.setTitle(`Help`).setColor("#ffffff");
        embed.setImage(
            "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
        );
        embed.setThumbnail(
            "https://icon-library.net/images/discord-transparent-server-icon/discord-transparent-server-icon-16.jpg"
        );
        embed.setDescription(`Check your DKP status, or check out who got that shiny item in the last raid.`);
        if (!isDm) {
            embed.addField("Show all commands", `${trigger} help`);
        }
        if (!isDm) {
            embed.addField("Start a direct message session with the bort", `${trigger} dm`);
        }

        embed.addField("Search all loots for the given item", `${trigger} search <item>`);
        embed.addField(
            "Show current DKP status for a user",
            `${trigger} <user> | all\n\`\`\`${trigger} Graa\n${
            trigger
            } all\`\`\``
        );
        embed.addField("Show all items a user have looted", `${trigger} loot <user>`);
        embed.addField(
            "Show all items on a date from an instance",
            `${trigger} date <dd.mm.yyyy> <instance>\n\`\`\`${
            trigger
            } date 16.03.2020 molten\`\`\``
        );
        embed.addField(
            "Show DKP status for a given class",
            `${trigger} class <class>\n\`\`\`${
            trigger
            } class priest\`\`\``
        );

        embed.addField(
            "Show talents for a given class",
            `${trigger} talents <class>\n\`\`\`${
            trigger
            } talents priest\`\`\``
        );

        embed.addField("Search all boss loots", `${trigger} boss <name>\n\`\`\`${trigger} boss lucifron\n${trigger} boss nef\n\`\`\``);

        if (isAdmin && isDm) {
            embed.addField("Show current configuration", `${trigger} show`);
            embed.addField("Set new configuration value", `${trigger} set <key> <value>`);
            // embed.addField("Show stats about bot usage", `!stats`);
            // embed.addField("Show about this bot", `${trigger} about`);
            embed.addField("Exit configuration mode", `${trigger} close`);
        }

        embed.addField("Update the DKP table from a new Monolith DKP file", `${trigger} update`);
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
                        .on("data", function (buffer) {
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
