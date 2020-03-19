import * as fs from "fs";

export class Parser {
  private fileToParse: string;
  private fileToSave: string;
  private preparsedFile: string;
  constructor(file: string) {
    this.fileToParse = file;
    this.fileToSave = file;
    this.preparsedFile = file;
  }

  public Parse = async (guildId: string): Promise<object> => {
    try {
      const content = await this.LoadFileContent(guildId);
      if (content) {
        return content;
      }
    } catch (error) {
      switch (error.code) {
        case "ENOENT":
          console.error(`No such file or directory, ${error.path}`);
          break;

        default:
          console.error(error);
      }
    }
  };

  public FileExists(guildId: string): boolean {
    const fileName = `${guildId}_dkp.lua`;
    if (fs.existsSync(fileName)) {
      return true;
    }
    return false;
  }

  private LoadFileContent = async (guildId: string): Promise<object> => {
    const fileName = `${guildId}_dkp.lua`;
    const data = fs.readFileSync(fileName, { encoding: "utf8" });
    return await this.ParseData(data);
  };

  public LoadParsedFile = async (guildId: string): Promise<string> => {
    const fileName = `${guildId}_dkp.lua`;
    try {
      const data = fs.readFileSync(fileName, { encoding: "utf8" });
      return data;
    } catch (error) {
      console.error(`${fileName} does not exists`);
    }
  };

  public SaveFile = (data: string, guildId: string): void => {
    const fileName = `${guildId}_dkp.lua`;

    fs.writeFile(fileName, data, err => {
      if (err) {
        console.log("Error: ", err);
        throw err;
      }
    });
  };

  public RemoveFile = (guildId: string): void => {
    const fileName = `${guildId}_dkp.lua`;
    fs.unlink(fileName, err => {
      if (err) {
        console.log("Error: ", err);
        throw err;
      }
    });
  };

  public ParseData = async (data: string): Promise<object> => {
    return await this.GetSegments(data);
  };

  /*
  Get each segment of the LUA file
  */
  private GetSegments = async (data: string): Promise<object> => {
    const regex = /^\w+/gm;
    const matches = data.match(regex);
    const object = {};

    try {
      for (let i = 0; i < matches.length; i++) {
        const indexStart = data.indexOf(matches[i]) + matches[i].length;
        const indexEnd = i + 1 < matches.length ? data.indexOf(matches[i + 1]) : data.length;

        const tempSegment = data.substring(indexStart, indexEnd);
        const segment = tempSegment.substring(tempSegment.indexOf("{"));

        try {
          object[matches[i]] = JSON.parse(this.ToJSON(segment));
        } catch (error) {
          console.log(indexStart, indexEnd);
          console.log(matches[i], error);
        }

        // const objects = await this.ToJSON(segment);
      }
    } catch (error) {
      console.log(error);
    }
    return object;
  };

  /*
  This method is PoC and should be sorted out. 
  */
  private ToJSON = (data: string): string => {
    const regexp = /,(\r\n\t*)([\}|\]])/gm;
    let result: string = null;

    result = data
      .replace(/\[(.*)\]\s\=\s/g, "$1:") // change equal to colon & remove outer brackets
      .replace(regexp, "$1$2")
      .replace(/\]\,\[/gm, "},{")
      .replace(/[\t\r\n]/g, "") // remove tabs & returns
      .replace(/\}\,\s--\s\[\d+\]\}/g, "},") // replace sets ending with a comment with square brackets
      .replace(/\,\s--\s\[\d+\]/g, ",") // remove close subgroup and comment
      .replace(/,"seed":((\d+)|"(.*)")/gm, "");

    // Some stupid shit right here, checking if this should be an array
    // or not
    if (result.match(/\{{2}/gm)) {
      result = `[${result.substring(1, result.length - 1)}]`;
    }

    return result;
  };
}
