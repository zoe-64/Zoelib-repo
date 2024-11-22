export type JsonItem = {
	Name: string,
	Group: AssetGroupName,
	Color: HexColor[] | "Default",
	Difficulty?: number | 10,
	Craft?: CraftingItem,
	Property?: ItemProperties
}

const pronounMap = {
    "HeHim": {"subjective": "he", "objective": "him", "dependent": "his", "independent": "his", "reflexive": "himself"},
    "SheHer": {"subjective": "she", "objective": "her", "dependent": "her", "independent": "hers", "reflexive": "herself"},
    "TheyThem": {"subjective": "they", "objective": "them", "dependent": "their", "independent": "theirs", "reflexive": "themself"},
    "ItIt": {"subjective": "it", "objective": "it", "dependent": "its", "independent": "its", "reflexive": "itself"}, // not sure if it's even used
};
export class Pronoun {
    static pronouns = {
        "HeHim": {"subjective": "he", "objective": "him", "dependent": "his", "independent": "his", "reflexive": "himself"},
        "SheHer": {"subjective": "she", "objective": "her", "dependent": "her", "independent": "hers", "reflexive": "herself"},
        "TheyThem": {"subjective": "they", "objective": "them", "dependent": "their", "independent": "theirs", "reflexive": "themself"}, // not used by bc
        "ItIt": {"subjective": "it", "objective": "it", "dependent": "its", "independent": "its", "reflexive": "itself"}, // not used by bc
    }
    static shapes = ["subjective", "objective", "dependent", "independent", "reflexive"]
    static get(shape: typeof Pronoun.shapes[number], player: typeof Player): string {
        let pronouns: keyof typeof Pronoun.pronouns = player.GetPronouns();
        return Pronoun.pronouns[pronouns][shape as keyof typeof Pronoun.pronouns[typeof pronouns]];
    }  
}
export function GetName(player:typeof Player):string {
    return player.Nickname || player.Name || "Unknown";
}
export function GetPlayer(identifier: "random" | typeof Player.MemberNumber | typeof Player.Name | typeof Player.Nickname): typeof Player | null {
    if (typeof identifier == "string") {
        identifier = identifier?.toLowerCase()
    }
    for (let character of ChatRoomCharacter) {
        if (character.MemberNumber == identifier) {
            return character as typeof Player;
        }
        if (typeof identifier == "number") {
            continue;
        }
        if (character.Name?.toLowerCase() == identifier) {
            return character as typeof Player;
        }
        if (character.Nickname && character.Nickname.toLowerCase() == identifier) {
            return character as typeof Player;
        }
    }
    if (identifier == "random") {
        return ChatRoomCharacter[Math.floor(Math.random() * ChatRoomCharacter.length)] as typeof Player;
    }
    console.error("Player not found: ", identifier)
    return null;
}
export function GetItem(raw: JsonItem):Item {
    let asset = AssetGet("Female3DCG", raw.Group, raw.Name) as Asset;
    return AssetToItem(asset, raw.Color, 10, raw?.Craft, raw?.Property)
}
export function AssetToItem(Asset:Asset, Color:HexColor[] | "Default"="Default", Difficulty:number=10, Craft?:CraftingItem, Property?:ItemProperties):Item {
    return {
        Asset: Asset,
        Color: Color,
        Difficulty:  Difficulty,
        Craft: Craft, 
        Property: Property
    } as Item;
}
    
export function ColorMix(colors:[HexColor]):HexColor {
        let total:RGBColor = {r: 0, g: 0, b: 0};
        
        for(let color of colors) {
            let rgb = DrawHexToRGB(color);
            total.r += rgb.r
            total.g += rgb.g
            total.b += rgb.b
        }
        let avgRgb:RGBColor = {
            r: Math.round(total.r / colors.length),
            g: Math.round(total.g / colors.length),
            b: Math.round(total.b / colors.length)
        }; 
    
        return DrawRGBToHex([avgRgb.r, avgRgb.g, avgRgb.b]);
}
export function AverageColor(color_1:HexColor, color_2:HexColor, ratio:number=0.5):HexColor {
    let rgb_1 = DrawHexToRGB(color_1);
    let rgb_2 = DrawHexToRGB(color_2);
    let avgRgb:RGBColor = {
        r: Math.round(rgb_1.r * ratio + rgb_2.r * (1-ratio)),
        g: Math.round(rgb_1.g * ratio + rgb_2.g * (1-ratio)),
        b: Math.round(rgb_1.b * ratio + rgb_2.b * (1-ratio))
    }; 
    return DrawRGBToHex([avgRgb.r, avgRgb.g, avgRgb.b]);
}
export class Messager {
    // Processes a response based on the specified type.
    static process(response: {Type:ServerChatRoomMessageType, Content:ServerChatRoomMessageContentType}, isJson:boolean = true, type:ServerChatRoomMessageType = "Hidden"): ServerChatRoomMessage | null {
        if (response.Type != type) return null;
        if (isJson) {
            let data:Object;
            try {
                data = JSON.parse(response.Content);
            } catch (e) {
                return null;
            }
            return {...data, ...response};
        }
        return response;
    }
    

    static send(json:JSON | string | object, target:typeof Player.MemberNumber | undefined, type:ServerChatRoomMessageType = "Hidden") {
        if (typeof json != "string") {
            json = JSON.stringify(json);
        }
        ServerSend("ChatRoomChat", {Content:json, Type: type, Target: target})
    }
    static localSend(message: string) {
        ChatRoomSendLocal(message);
    }
    static listener(callback:(data: ServerChatRoomMessage, sender: Character, msg: string, metadata?: IChatRoomMessageMetadata) => boolean, priority:number = -5, description:string = "") {
        ChatRoomRegisterMessageHandler({Description:description, Callback: callback, Priority: priority})
    }
   
}
(globalThis as any).Messager = Messager;
export class LocalCache {
    prefix:string;
    constructor(prefix:string) {
        this.prefix = prefix;
    }
    
    //Retrieves the value of a property from the cache.
    get(property:string, defaultValue:any = null, ): typeof defaultValue | any {
        let data = JSON.parse(localStorage.getItem(`${this.prefix}`) as string) || {};
        return (typeof data[property] != 'undefined' &&  data[property] != null) ? data[property] : defaultValue;
    } 

    set(property:string, value:any) { // any value JSON.stringify can convert
        let data = JSON.parse(localStorage.getItem(`${this.prefix}`) as string) || {};
        data[property] = value;
        localStorage.setItem(`${this.prefix}`, JSON.stringify(data));
    }
}

export class SentenceBuilder {
    static target:typeof Player;
    set target(player:typeof Player) {
        SentenceBuilder.target = player;
    }
    get target() {
        return SentenceBuilder.target;
    }

    static data: {[key:string]: {[values:string]:string[]}} = {
        "§dependent§": {get neutral() {return [Pronoun.get("dependent",SentenceBuilder.target)]}},
        "§subjective§": {get neutral() {return [Pronoun.get("subjective",SentenceBuilder.target)]}},
        "§objective§": {get neutral() {return [Pronoun.get("objective",SentenceBuilder.target)]}},
        "§independent§": {get neutral() {return [Pronoun.get("independent",SentenceBuilder.target)]}},
        "§reflexive§": {get neutral() {return [Pronoun.get("reflexive",SentenceBuilder.target)]}},
    }

    static prompt(sentence:string, player:typeof Player=Player): string {
        let pronoun = {"SheHer":"female", "HeHim":"male"}[player.GetPronouns()]
        let sentenceKeys = sentence.match(/§[a-zA-Z-]*§/g)
        if (!sentenceKeys) {
            return sentence;
        }
        for (let key of sentenceKeys) {
            if (!SentenceBuilder.data.hasOwnProperty(key)) {
                SentenceBuilder.data[key] = {"neutral": ["(key-"+key+"-missing)"]}
                //throw new Error(`The key ${key} is not in the data object`)
            }
            let options = [
                ...typeof SentenceBuilder.data[key][pronoun] != 'undefined' ? SentenceBuilder.data[key][pronoun] : [],
                ...typeof SentenceBuilder.data[key].neutral != 'undefined' ? SentenceBuilder.data[key].neutral : []]
            sentence = sentence.replaceAll(key, options[RandomInt(0, options.length-1)]);
        }
        
        if (sentence.match(/§[a-zA-Z-]*§/g)) {
            return SentenceBuilder.prompt(sentence, player);
        }
        return sentence;
    }
}
export function RandomInt(min:number, max:number):number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
export async function GetJson(url:string):Promise<any> {
    return fetch(url).then(response => response.json());
}
export function CraftItem(name:string, description:string,property:CraftingPropertyType,color: string | "Default"="Default", isPrivate:boolean=false, itemProperty:ItemProperties | null=null, lock:AssetLockType | "" = "", asset:Asset | {Name:""}={Name:""}, typeRecord:TypeRecord | null =null): CraftingItem {
	return {
		Item: asset.Name,
		Property: property,
		Lock: lock, 
		Name: name,
		Description: description,
		Color: color,
		Private: isPrivate,
		TypeRecord: typeRecord,
		ItemProperty: itemProperty,
	};
}