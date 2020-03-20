import { GuildObjectBase, GuildObject, GuildConfig } from "../objects/GuildObject";

export class BotGuild {
  private guildId: string;
  private guildName: string;
  private guildObject: GuildObjectBase;
  public config: GuildConfig;

  constructor() {
    this.GetGuild();
  }

  /** 
    Get the name of the guild
  */
  public GetName(): string {
    return this.guildObject.guildName;
  }

  /** 
    Set the name of the guild
  */
  public SetName(value: string): void {
    this.guildObject.guildName = value;
  }

  /** 
    Set the name of the guild
  */
  public SetConfig(key: string, value: string): void {
    this.guildObject.config[key] = value;
    this.guildObject.markModified("config");
  }

  /**
    Set the dkp table for this guild  
  */
  public SetTable(value: object): void {
    this.guildObject.dkptable = value;
    this.guildObject.markModified("dkptable");
  }

  /**
    Get the GuildId for this guild
  */
  public GetGuildId(): string {
    return this.guildObject.guildId;
  }

  /**
    Get the config for this guild
  */
  public GetConfig(): GuildConfig {
    return this.guildObject?.config;
  }

  private async GetGuild(): Promise<void> {
    let guild = null;

    guild = await GuildObject.findOne({ guildId: this.guildId }, async err => {
      if (err) {
        console.error(err);
      }
    });
    if (guild === null) {
      guild = new GuildObject({ guildId: this.guildId, config: { trigger: "!dkpb" } });
    }
    this.guildObject = guild;
  }

  /**
    Load guild from guildId
  */
  public async LoadFromId(guildId: string): Promise<void> {
    this.guildId = guildId;
    await this.GetGuild();
  }

  /**
    Save the guild to database
  */
  public async Save(): Promise<void> {
    await this.guildObject.save();
  }

  /**
    Get the given table from the current dkptable object 
  */
  public GetTable(table: string): Record<string, any> {
    try {
      if (this.guildObject.dkptable[table]) {
        return this.guildObject.dkptable[table];
      }
    } catch (error) {
      console.error(error.message);
      return [];
    }
    return [];
  }
}
