import axios from "axios";
import crypto from "crypto";

class NaturalReaders {
  constructor() {
    this.base_url = "https://www.naturalreaders.com";
    this.tts_url = "https://2poo4vxwjc.execute-api.us-east-1.amazonaws.com/prod-wps";
    this.region = "us-east-1";
    this.service = "execute-api";
    this.jar = {};
    this.cache = {};

    this.lang_map = {
      "af-ZA": "Afrikaans (South Africa)",
      "sq-AL": "Albanian (Albania)",
      "am-ET": "Amharic (Ethiopia)",
      "ar": "Arabic (Generic)",
      "ar-EG": "Arabic (Egypt)",
      "ar-SA": "Arabic (Saudi Arabia)",
      "ar-IQ": "Arabic (Iraq)",
      "ar-LB": "Arabic (Lebanon)",
      "ar-LY": "Arabic (Libya)",
      "ar-SY": "Arabic (Syria)",
      "ar-YE": "Arabic (Yemen)",
      "hy-AM": "Armenian (Armenia)",
      "az-AZ": "Azerbaijani (Azerbaijan)",
      "eu-ES": "Basque (Basque)",
      "bn-IN": "Bengali (India)",
      "bs-BA": "Bosnian (Bosnia and Herzegovina)",
      "bg-BG": "Bulgarian (Bulgaria)",
      "my-MM": "Burmese (Myanmar)",
      "ca-ES": "Catalan (Spain)",
      "zh-HK": "Chinese (Cantonese)",
      "zh-CN": "Chinese (Mandarin)",
      "zh-TW": "Chinese (Mandarin, Taiwan)",
      "hr-HR": "Croatian (Croatia)",
      "cs-CZ": "Czech (Czech)",
      "da-DK": "Danish (Denmark)",
      "nl-BE": "Dutch (Belgium)",
      "nl-NL": "Dutch (Netherlands)",
      "en-AU": "English (Australia)",
      "en-CA": "English (Canada)",
      "en-HK": "English (Hong Kong SAR)",
      "en-IN": "English (India)",
      "en-IE": "English (Ireland)",
      "en-KE": "English (Kenya)",
      "en-NZ": "English (New Zealand)",
      "en-PH": "English (Philippines)",
      "en-SG": "English (Singapore)",
      "en-TZ": "English (Tanzania)",
      "en-GB": "English (UK)",
      "en-US": "English (US)",
      "en-CY": "English (Wales)",
      "et-EE": "Estonian (Estonia)",
      "fil-PH": "Filipino (Philippines)",
      "fi-FI": "Finnish (Finland)",
      "fr-BE": "French (Belgium)",
      "fr-CA": "French (Canada)",
      "fr-FR": "French (France)",
      "fr-CH": "French (Switzerland)",
      "gl-ES": "Galician (Galician)",
      "ka-GE": "Georgian (Georgia)",
      "de-AT": "German (Austria)",
      "de-DE": "German (Germany)",
      "de-CH": "German (Switzerland)",
      "el-GR": "Greek (Greece)",
      "he-IL": "Hebrew (Israel)",
      "hi-IN": "Hindi (India)",
      "hu-HU": "Hungarian (Hungary)",
      "is-IS": "Icelandic (Iceland)",
      "id-ID": "Indonesian (Indonesia)",
      "ga-IE": "Irish (Ireland)",
      "it-IT": "Italian (Italy)",
      "ja-JP": "Japanese (Japan)",
      "jv-ID": "Javanese (Indonesia)",
      "kn-IN": "Kannada (India)",
      "kk-KZ": "Kazakh (Kazakhstan)",
      "km-KH": "Khmer (Cambodia)",
      "ko-KR": "Korean (Korea)",
      "lo-LA": "Lao (Laos)",
      "lv-LV": "Latvian (Latvia)",
      "lt-LT": "Lithuanian (Lithuania)",
      "mk-MK": "Macedonian (North Macedonia)",
      "ms-MY": "Malay (Malaysia)",
      "ml-IN": "Malayalam (India)",
      "mt-MT": "Maltese (Malta)",
      "mn-MN": "Mongolian (Mongolia)",
      "ne-NP": "Nepali (Nepal)",
      "nb-NO": "Norwegian (Bokm\xe5l, Norway)",
      "no-NO": "Norwegian (Norway)",
      "ps-AF": "Pashto (Afghanistan)",
      "fa-IR": "Persian (Iran)",
      "pl-PL": "Polish (Poland)",
      "pt-BR": "Portuguese (Brazil)",
      "pt-PT": "Portuguese (Portugal)",
      "ro-RO": "Romanian (Romania)",
      "ru-RU": "Russian (Russia)",
      "sr-RS": "Serbian (Serbia)",
      "si-LK": "Sinhala (Sri Lanka)",
      "sk-SK": "Slovak (Slovakia)",
      "sl-SI": "Slovenian (Slovenia)",
      "so-SO": "Somali (Somalia)",
      "es-MX": "Spanish (Mexico)",
      "es-ES": "Spanish (Spain)",
      "es-CA": "Spanish (California)",
      "es-US": "Spanish (US)",
      "su-ID": "Sundanese (Indonesia)",
      "sw-KE": "Swahili (Kenya)",
      "sv-SE": "Swedish (Sweden)",
      "ta-IN": "Tamil (India)",
      "te-IN": "Telugu (India)",
      "th-TH": "Thai (Thailand)",
      "tr-TR": "Turkish (T\xfcrkiye)",
      "uk-UA": "Ukrainian (Ukraine)",
      "ur-IN": "Urdu (India)",
      "ur-PK": "Urdu (Pakistan)",
      "uz-UZ": "Uzbek (Uzbekistan)",
      "vi-VN": "Vietnamese (Vietnam)",
      "cy-GB": "Welsh (UK)",
      "zu-ZA": "Zulu (South Africa)",
      "multi": "Multi-Lingual"
    };

    this.raw_voices = [
      { name: "Arnaud", id: "124", lang: "nl-BE", engine: "ms" },
      { name: "Dena", id: "125", lang: "nl-BE", engine: "ms" },
      { name: "Harri", id: "134", lang: "fi-FI", engine: "ms" },
      { name: "Noora", id: "135", lang: "fi-FI", engine: "ms" },
      { name: "Noemi", id: "136", lang: "hu-HU", engine: "ms" },
      { name: "Tamas", id: "137", lang: "hu-HU", engine: "ms" },
      { name: "Adam", id: "235", lang: "en-US", engine: "ms" },
      { name: "Evelyn", id: "211", lang: "en-US", engine: "ms" },
      { name: "Derek", id: "209", lang: "en-US", engine: "ms" },
      { name: "Lola", id: "216", lang: "en-US", engine: "ms" },
      { name: "Lewis", id: "212", lang: "en-US", engine: "ms" },
      { name: "Ava", id: "186", lang: "en-US", engine: "ms" },
      { name: "Andrew", id: "188", lang: "en-US", engine: "ms" },
      { name: "Cora", id: "207", lang: "en-US", engine: "ms" },
      { name: "Steffan", id: "240", lang: "en-US", engine: "ms" },
      { name: "Serena", id: "215", lang: "en-US", engine: "ms" },
      { name: "Dustin", id: "210", lang: "en-US", engine: "ms" },
      { name: "Phoebe", id: "213", lang: "en-US", engine: "ms" },
      { name: "Samuel", id: "214", lang: "en-US", engine: "ms" },
      { name: "Amanda", id: "236", lang: "en-US", engine: "ms" },
      { name: "Christopher", id: "208", lang: "en-US", engine: "ms" },
      { name: "Davis", id: "65", lang: "en-US", engine: "ms" },
      { name: "Nancy", id: "67", lang: "en-US", engine: "ms" },
      { name: "Brandon", id: "237", lang: "en-US", engine: "ms" },
      { name: "Emma", id: "189", lang: "en-US", engine: "ms" },
      { name: "Nova", id: "233", lang: "en-US", engine: "ms" },
      { name: "Alloy", id: "234", lang: "en-US", engine: "ms" },
      { name: "Echo", id: "280", lang: "en-US", engine: "ms" },
      { name: "Fable", id: "281", lang: "en-US", engine: "ms" },
      { name: "Onyx", id: "282", lang: "en-US", engine: "ms" },
      { name: "Shimmer", id: "283", lang: "en-US", engine: "ms" },
      { name: "Ash", id: "284", lang: "en-US", engine: "ms" },
      { name: "Roger", id: "190", lang: "en-US", engine: "ms" },
      { name: "Brian", id: "187", lang: "en-US", engine: "ms" },
      { name: "Jane", id: "66", lang: "en-US", engine: "ms" },
      { name: "Tony", id: "73", lang: "en-US", engine: "ms" },
      { name: "Sara", id: "63", lang: "en-US", engine: "ms" },
      { name: "Eric", id: "62", lang: "en-US", engine: "ms" },
      { name: "Jason", id: "72", lang: "en-US", engine: "ms" },
      { name: "Ana (Child)", id: "8", lang: "en-US", engine: "ms" },
      { name: "Liam", id: "7", lang: "en-US", engine: "ms" },
      { name: "Ada", id: "217", lang: "en-GB", engine: "ms" },
      { name: "Ollie", id: "218", lang: "en-GB", engine: "ms" },
      { name: "Sonia", id: "9", lang: "en-GB", engine: "ms" },
      { name: "Ryan", id: "12", lang: "en-GB", engine: "ms" },
      { name: "Libby", id: "13", lang: "en-GB", engine: "ms" },
      { name: "Bella", id: "68", lang: "en-GB", engine: "ms" },
      { name: "Oliver", id: "69", lang: "en-GB", engine: "ms" },
      { name: "Maisie (Child)", id: "75", lang: "en-GB", engine: "ms" },
      { name: "Abbi", id: "105", lang: "en-GB", engine: "ms" },
      { name: "Thomas", id: "112", lang: "en-GB", engine: "ms" },
      { name: "Ethan", id: "116", lang: "en-GB", engine: "ms" },
      { name: "Hollie", id: "119", lang: "en-GB", engine: "ms" },
      { name: "Noah", id: "191", lang: "en-GB", engine: "ms" },
      { name: "Elliot", id: "192", lang: "en-GB", engine: "ms" },
      { name: "Alessio", id: "223", lang: "en-GB", engine: "ms" },
      { name: "Arabella", id: "219", lang: "en-GB", engine: "ms" },
      { name: "Florian", id: "141", lang: "en-GB", engine: "ms" },
      { name: "Giuseppe", id: "148", lang: "en-GB", engine: "ms" },
      { name: "Isabella", id: "243", lang: "en-GB", engine: "ms" },
      { name: "Isidora", id: "220", lang: "en-GB", engine: "ms" },
      { name: "Lucien", id: "222", lang: "en-GB", engine: "ms" },
      { name: "Macerio", id: "227", lang: "en-GB", engine: "ms" },
      { name: "Marcello", id: "224", lang: "en-GB", engine: "ms" },
      { name: "Remy", id: "138", lang: "en-GB", engine: "ms" },
      { name: "Seraphina", id: "140", lang: "en-GB", engine: "ms" },
      { name: "Thalita", id: "228", lang: "en-GB", engine: "ms" },
      { name: "Vivienne", id: "139", lang: "en-GB", engine: "ms" },
      { name: "Xiaochen", id: "245", lang: "en-GB", engine: "ms" },
      { name: "Ximena", id: "241", lang: "en-GB", engine: "ms" },
      { name: "Celeste", id: "153", lang: "fr-FR", engine: "ms" },
      { name: "Jerome", id: "154", lang: "fr-FR", engine: "ms" },
      { name: "Maurice", id: "155", lang: "fr-FR", engine: "ms" },
      { name: "Henri", id: "26", lang: "fr-FR", engine: "ms" },
      { name: "Denise", id: "27", lang: "fr-FR", engine: "ms" },
      { name: "Eloise (Child)", id: "70", lang: "fr-FR", engine: "ms" },
      { name: "Brigitte", id: "71", lang: "fr-FR", engine: "ms" },
      { name: "Charline", id: "126", lang: "fr-BE", engine: "ms" },
      { name: "Gerard", id: "127", lang: "fr-BE", engine: "ms" },
      { name: "Antoine", id: "23", lang: "fr-CA", engine: "ms" },
      { name: "Sylvie", id: "24", lang: "fr-CA", engine: "ms" },
      { name: "Jean", id: "25", lang: "fr-CA", engine: "ms" },
      { name: "Ariane", id: "128", lang: "fr-CH", engine: "ms" },
      { name: "Fabrice", id: "129", lang: "fr-CH", engine: "ms" },
      { name: "Elke", id: "150", lang: "de-DE", engine: "ms" },
      { name: "Christoph", id: "151", lang: "de-DE", engine: "ms" },
      { name: "Bernd", id: "152", lang: "de-DE", engine: "ms" },
      { name: "Conrad", id: "28", lang: "de-DE", engine: "ms" },
      { name: "Katja", id: "29", lang: "de-DE", engine: "ms" },
      { name: "Ingrid", id: "130", lang: "de-AT", engine: "ms" },
      { name: "Jonas", id: "131", lang: "de-AT", engine: "ms" },
      { name: "Leni", id: "132", lang: "de-CH", engine: "ms" },
      { name: "Jan", id: "133", lang: "de-CH", engine: "ms" },
      { name: "Pierina", id: "146", lang: "it-IT", engine: "ms" },
      { name: "Lisandro", id: "147", lang: "it-IT", engine: "ms" },
      { name: "Irma", id: "149", lang: "it-IT", engine: "ms" },
      { name: "Diego", id: "30", lang: "it-IT", engine: "ms" },
      { name: "Elsa", id: "32", lang: "it-IT", engine: "ms" },
      { name: "Rinaldo", id: "103", lang: "it-IT", engine: "ms" },
      { name: "Cataldo", id: "108", lang: "it-IT", engine: "ms" },
      { name: "Fiamma", id: "113", lang: "it-IT", engine: "ms" },
      { name: "Benigno", id: "110", lang: "it-IT", engine: "ms" },
      { name: "Hyunsu", id: "226", lang: "ko-KR", engine: "ms" },
      { name: "SunHi", id: "89", lang: "ko-KR", engine: "ms" },
      { name: "InJoon", id: "90", lang: "ko-KR", engine: "ms" },
      { name: "SoonBok", id: "91", lang: "ko-KR", engine: "ms" },
      { name: "Masaru", id: "225", lang: "ja-JP", engine: "ms" },
      { name: "Daichi", id: "84", lang: "ja-JP", engine: "ms" },
      { name: "Mayu", id: "85", lang: "ja-JP", engine: "ms" },
      { name: "Aoi (Child)", id: "86", lang: "ja-JP", engine: "ms" },
      { name: "Nanami", id: "87", lang: "ja-JP", engine: "ms" },
      { name: "Keita", id: "88", lang: "ja-JP", engine: "ms" },
      { name: "Duarte", id: "36", lang: "pt-PT", engine: "ms" },
      { name: "Fernanda", id: "37", lang: "pt-PT", engine: "ms" },
      { name: "Raquel", id: "38", lang: "pt-PT", engine: "ms" },
      { name: "Antonio", id: "39", lang: "pt-BR", engine: "ms" },
      { name: "Francisca", id: "40", lang: "pt-BR", engine: "ms" },
      { name: "Tristan", id: "221", lang: "es-ES", engine: "ms" },
      { name: "Alvaro", id: "49", lang: "es-ES", engine: "ms" },
      { name: "Elvira", id: "50", lang: "es-ES", engine: "ms" },
      { name: "Alonso", id: "51", lang: "es-US", engine: "ms" },
      { name: "Paloma", id: "52", lang: "es-US", engine: "ms" },
      { name: "Marina (Child)", id: "109", lang: "es-MX", engine: "ms" },
      { name: "Beatriz", id: "111", lang: "es-MX", engine: "ms" },
      { name: "Gerardo", id: "114", lang: "es-MX", engine: "ms" },
      { name: "Carlota", id: "117", lang: "es-MX", engine: "ms" },
      { name: "Pelayo", id: "118", lang: "es-MX", engine: "ms" },
      { name: "Nil", id: "142", lang: "es-ES", engine: "ms" },
      { name: "Triana", id: "143", lang: "es-ES", engine: "ms" },
      { name: "Arnau", id: "144", lang: "es-ES", engine: "ms" },
      { name: "Yunyi", id: "229", lang: "zh-CN", engine: "ms" },
      { name: "Xiaoyu", id: "230", lang: "zh-CN", engine: "ms" },
      { name: "Yunfan", id: "231", lang: "zh-CN", engine: "ms" },
      { name: "Yunxiao", id: "232", lang: "zh-CN", engine: "ms" },
      { name: "Xiaoxiao", id: "244", lang: "zh-CN", engine: "ms" },
      { name: "Yunjian", id: "76", lang: "zh-CN", engine: "ms" },
      { name: "Yunze", id: "78", lang: "zh-CN", engine: "ms" },
      { name: "Xiaoqiu", id: "79", lang: "zh-CN", engine: "ms" },
      { name: "YunJhe", id: "80", lang: "zh-TW", engine: "ms" },
      { name: "HsiaoChen", id: "81", lang: "zh-TW", engine: "ms" },
      { name: "WanLung", id: "82", lang: "zh-HK", engine: "ms" },
      { name: "HiuMaan", id: "83", lang: "zh-HK", engine: "ms" },
      { name: "William", id: "16", lang: "en-AU", engine: "ms" },
      { name: "Natasha", id: "17", lang: "en-AU", engine: "ms" },
      { name: "Annette", id: "101", lang: "en-AU", engine: "ms" },
      { name: "Freya", id: "102", lang: "en-AU", engine: "ms" },
      { name: "Ken", id: "104", lang: "en-AU", engine: "ms" },
      { name: "Darren", id: "106", lang: "en-AU", engine: "ms" },
      { name: "Kim", id: "107", lang: "en-AU", engine: "ms" },
      { name: "Tim", id: "115", lang: "en-AU", engine: "ms" },
      { name: "Neil", id: "193", lang: "en-AU", engine: "ms" },
      { name: "Carly", id: "194", lang: "en-AU", engine: "ms" },
      { name: "Neerja", id: "14", lang: "en-IN", engine: "ms" },
      { name: "Prabhat", id: "15", lang: "en-IN", engine: "ms" },
      { name: "Elimu", id: "195", lang: "en-TZ", engine: "ms" },
      { name: "Imani", id: "196", lang: "en-TZ", engine: "ms" },
      { name: "Molly", id: "197", lang: "en-NZ", engine: "ms" },
      { name: "Mitchell", id: "198", lang: "en-NZ", engine: "ms" },
      { name: "Connor", id: "199", lang: "en-IE", engine: "ms" },
      { name: "Emily", id: "200", lang: "en-IE", engine: "ms" },
      { name: "Asilia", id: "201", lang: "en-KE", engine: "ms" },
      { name: "Chilemba", id: "202", lang: "en-KE", engine: "ms" },
      { name: "Rosa", id: "203", lang: "en-PH", engine: "ms" },
      { name: "James", id: "204", lang: "en-PH", engine: "ms" },
      { name: "Wayne", id: "205", lang: "en-SG", engine: "ms" },
      { name: "Luna", id: "206", lang: "en-SG", engine: "ms" },
      { name: "Colette", id: "20", lang: "nl-NL", engine: "ms" },
      { name: "Maarten", id: "21", lang: "nl-NL", engine: "ms" },
      { name: "Fenna", id: "22", lang: "nl-NL", engine: "ms" },
      { name: "Mattias", id: "53", lang: "sv-SE", engine: "ms" },
      { name: "Sofie", id: "54", lang: "sv-SE", engine: "ms" },
      { name: "Hillevi", id: "55", lang: "sv-SE", engine: "ms" },
      { name: "Christel", id: "18", lang: "da-DK", engine: "ms" },
      { name: "Jeppe", id: "19", lang: "da-DK", engine: "ms" },
      { name: "Finn", id: "41", lang: "nb-NO", engine: "ms" },
      { name: "Pernille", id: "42", lang: "nb-NO", engine: "ms" },
      { name: "Iselin", id: "43", lang: "nb-NO", engine: "ms" },
      { name: "Marek", id: "33", lang: "pl-PL", engine: "ms" },
      { name: "Agnieszka", id: "34", lang: "pl-PL", engine: "ms" },
      { name: "Zofia", id: "35", lang: "pl-PL", engine: "ms" },
      { name: "Emil", id: "44", lang: "ro-RO", engine: "ms" },
      { name: "Alina", id: "45", lang: "ro-RO", engine: "ms" },
      { name: "Ahmet", id: "56", lang: "tr-TR", engine: "ms" },
      { name: "Emel", id: "57", lang: "tr-TR", engine: "ms" },
      { name: "Aled", id: "58", lang: "cy-GB", engine: "ms" },
      { name: "Nia", id: "59", lang: "cy-GB", engine: "ms" },
      { name: "Rami", id: "93", lang: "ar-LB", engine: "ms" },
      { name: "Saleh", id: "94", lang: "ar-YE", engine: "ms" },
      { name: "Laith", id: "95", lang: "ar-SY", engine: "ms" },
      { name: "Salma", id: "96", lang: "ar-EG", engine: "ms" },
      { name: "Rana", id: "97", lang: "ar-IQ", engine: "ms" },
      { name: "Iman", id: "98", lang: "ar-LY", engine: "ms" },
      { name: "Avri", id: "99", lang: "he-IL", engine: "ms" },
      { name: "Hila", id: "100", lang: "he-IL", engine: "ms" },
      { name: "Kalina", id: "156", lang: "bg-BG", engine: "ms" },
      { name: "Borislav", id: "157", lang: "bg-BG", engine: "ms" },
      { name: "Athina", id: "158", lang: "el-GR", engine: "ms" },
      { name: "Nestoras", id: "159", lang: "el-GR", engine: "ms" },
      { name: "Gadis", id: "160", lang: "id-ID", engine: "ms" },
      { name: "Ardi", id: "161", lang: "id-ID", engine: "ms" },
      { name: "Yasmin", id: "162", lang: "ms-MY", engine: "ms" },
      { name: "Osman", id: "163", lang: "ms-MY", engine: "ms" },
      { name: "Premwadee", id: "164", lang: "th-TH", engine: "ms" },
      { name: "Niwat", id: "165", lang: "th-TH", engine: "ms" },
      { name: "Achara", id: "185", lang: "th-TH", engine: "ms" },
      { name: "Gul", id: "166", lang: "ur-IN", engine: "ms" },
      { name: "Salman", id: "167", lang: "ur-IN", engine: "ms" },
      { name: "HoaiMy", id: "168", lang: "vi-VN", engine: "ms" },
      { name: "NamMinh", id: "169", lang: "vi-VN", engine: "ms" },
      { name: "Orla", id: "170", lang: "ga-IE", engine: "ms" },
      { name: "Colm", id: "171", lang: "ga-IE", engine: "ms" },
      { name: "Anu", id: "172", lang: "et-EE", engine: "ms" },
      { name: "Kert", id: "173", lang: "et-EE", engine: "ms" },
      { name: "Joana", id: "174", lang: "ca-ES", engine: "ms" },
      { name: "Enrique", id: "175", lang: "ca-ES", engine: "ms" },
      { name: "Alba", id: "176", lang: "ca-ES", engine: "ms" },
      { name: "Polina", id: "177", lang: "uk-UA", engine: "ms" },
      { name: "Ostap", id: "178", lang: "uk-UA", engine: "ms" },
      { name: "Eka", id: "179", lang: "ka-GE", engine: "ms" },
      { name: "Giorgi", id: "180", lang: "ka-GE", engine: "ms" },
      { name: "Gabrijela", id: "181", lang: "hr-HR", engine: "ms" },
      { name: "Srecko", id: "182", lang: "hr-HR", engine: "ms" },
      { name: "Vlasta", id: "183", lang: "cs-CZ", engine: "ms" },
      { name: "Antonin", id: "184", lang: "cs-CZ", engine: "ms" },
      { name: "Jenny", id: "122", lang: "en-US", engine: "ms" },
      { name: "Elizabeth", id: "4", lang: "en-US", engine: "ms" },
      { name: "Guy", id: "5", lang: "en-US", engine: "ms" },
      { name: "Michelle", id: "6", lang: "en-US", engine: "ms" },
      { name: "Matthew", id: "0", lang: "en-US", engine: "aws" },
      { name: "Salli", id: "3", lang: "en-US", engine: "aws" },
      { name: "Brian", id: "6", lang: "en-GB", engine: "aws" },
      { name: "Emma", id: "7", lang: "en-GB", engine: "aws" },
      { name: "Russell", id: "9", lang: "en-AU", engine: "aws" },
      { name: "Nicole", id: "10", lang: "en-AU", engine: "aws" }
    ];

    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 35e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    this.client.interceptors.request.use(
      req => {
        console.log(`[PROSES] HTTP Request: ${req?.method?.toUpperCase()} ${req?.url}`);
        const ck = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
        if (ck) req.headers["Cookie"] = ck;
        return req;
      },
      err => {
        console.log(`[ERROR] Request Interceptor: ${err?.message}`);
        return Promise.reject(err);
      }
    );

    this.client.interceptors.response.use(
      res => {
        console.log(`[PROSES] HTTP Response: ${res?.status} dari ${res?.config?.url}`);
        const raw = res.headers?.["set-cookie"] || [];
        (Array.isArray(raw) ? raw : [raw]).forEach(c => {
          if (!c) return;
          const [pair] = c.split(";");
          const [k, ...v] = pair.split("=");
          if (k?.trim()) this.jar[k.trim()] = v.join("=").trim();
        });
        return res;
      },
      err => {
        console.log(`[ERROR] Response Interceptor: ${err?.response?.status || err?.message}`);
        return Promise.reject(err);
      }
    );
  }

  hd(ref = "") {
    try {
      return {
        Referer: ref ? (ref.startsWith("http") ? ref : `${this.base_url}${ref}`) : `${this.base_url}/`,
        Origin: this.base_url,
        Accept: "*/*"
      };
    } catch (err) {
      console.log(`[ERROR] hd: ${err?.message}`);
      return {};
    }
  }

  h(k, d) {
    try {
      return crypto.createHmac("sha256", k).update(d).digest();
    } catch (err) {
      console.log(`[ERROR] h: ${err?.message}`);
      throw err;
    }
  }

  sha(d) {
    try {
      return crypto.createHash("sha256").update(d, "utf8").digest("hex");
    } catch (err) {
      console.log(`[ERROR] sha: ${err?.message}`);
      throw err;
    }
  }

  sig(k, d, r, s) {
    try {
      return this.h(this.h(this.h(this.h("AWS4" + k, d), r), s), "aws4_request");
    } catch (err) {
      console.log(`[ERROR] sig: ${err?.message}`);
      throw err;
    }
  }

  q_str(p) {
    try {
      return Object.keys(p || {})
        .sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(p[k])}`)
        .join("&");
    } catch (err) {
      console.log(`[ERROR] q_str: ${err?.message}`);
      return "";
    }
  }

  val_str(v, name, req = !0) {
    try {
      const clean = v !== undefined && v !== null ? String(v).trim() : "";
      if (req && !clean) throw new Error(`Parameter "${name}" wajib diisi dan tidak boleh kosong.`);
      return clean;
    } catch (err) {
      console.log(`[ERROR] val_str: ${err?.message}`);
      throw err;
    }
  }

  async ini() {
    try {
      if (this.cache["session"]) return this.cache["session"];
      console.log("[PROSES] Mengambil kredensial guest AWS Cognito...");
      const id_res = await axios.post(
        "https://cognito-identity.us-east-1.amazonaws.com/",
        { IdentityPoolId: "us-east-1:bae5c41f-cb27-4ac6-9ac1-05977f7812d0" },
        {
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityService.GetId"
          },
          timeout: 15e3
        }
      );

      const id = id_res?.data?.IdentityId || "";
      if (!id) throw new Error("Gagal memperoleh Cognito Identity ID");

      const cred_res = await axios.post(
        "https://cognito-identity.us-east-1.amazonaws.com/",
        { IdentityId: id },
        {
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityService.GetCredentialsForIdentity"
          },
          timeout: 15e3
        }
      );

      const creds = cred_res?.data?.Credentials || {};
      if (!creds?.AccessKeyId || !creds?.SecretKey) {
        throw new Error("Gagal mengekstrak kredensial AWS dari Cognito Identity");
      }

      this.cache["session"] = {
        ak: creds.AccessKeyId,
        sk: creds.SecretKey,
        tok: creds.SessionToken || ""
      };

      console.log(`[PROSES] Kredensial aktif. Key ID: ${creds.AccessKeyId}`);
      return this.cache["session"];
    } catch (err) {
      console.log(`[ERROR] Inisialisasi sesi gagal: ${err?.message || err}`);
      throw new Error(`Inisialisasi sesi gagal: ${err?.message || err}`);
    }
  }

  b_auth({ m, p, q, d, dt, hd, ak, sk }) {
    try {
      console.log("[PROSES] Menghitung Signature AWS SigV4");
      const pl_h = this.sha(d || "");
      const d_str = dt.toISOString().slice(0, 10).replace(/-/g, "");
      const amz_dt = dt.toISOString().replace(/[:-]|\.\d{3}/g, "");
      const scp = `${d_str}/${this.region}/${this.service}/aws4_request`;

      const l_hd = {};
      Object.keys(hd || {}).forEach(k => {
        l_hd[k.toLowerCase()] = String(hd[k]).trim();
      });

      const s_hds = Object.keys(l_hd).sort().join(";");
      const c_hds = Object.keys(l_hd).sort().map(k => `${k}:${l_hd[k]}\n`).join("");
      const cr = `${m}\n${p}\n${this.q_str(q)}\n${c_hds}\n${s_hds}\n${pl_h}`;
      const s2s = `AWS4-HMAC-SHA256\n${amz_dt}\n${scp}\n${this.sha(cr)}`;
      const k_sig = this.sig(sk, d_str, this.region, this.service);
      const sg = crypto.createHmac("sha256", k_sig).update(s2s).digest("hex");

      return {
        auth: `AWS4-HMAC-SHA256 Credential=${ak}/${scp}, SignedHeaders=${s_hds}, Signature=${sg}`,
        amz_date: amz_dt
      };
    } catch (err) {
      console.log(`[ERROR] b_auth: ${err?.message}`);
      throw err;
    }
  }

  async voice_list({ lang, ...rest } = {}) {
    try {
      console.log("[PROSES] Mengambil voice_list NaturalReaders...");
      const target_lang = lang ? this.val_str(lang, "lang", !1) : "";
      
      let voices = this.raw_voices.map(v => ({
        voice_id: v.id,
        name: v.name,
        locale: v.lang,
        language: this.lang_map[v.lang] || v.lang,
        engine: v.engine
      }));

      if (target_lang) {
        voices = voices.filter(v => v.locale.toLowerCase() === target_lang.toLowerCase() || v.language.toLowerCase().includes(target_lang.toLowerCase()));
      }

      const languages = Object.entries(this.lang_map).map(([code, name]) => ({
        code: code,
        name: name
      }));

      return {
        status: true,
        result: {
          total_voices: voices.length,
          voices: voices,
          languages: languages
        }
      };
    } catch (err) {
      console.log(`[ERROR] voice_list: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Gagal mengambil daftar suara"
        }
      };
    }
  }

  async create({
    text,
    voice = "161",
    lang = "id-ID",
    speed = "0",
    engine = "ms",
    email = "user@naturalreaders.com",
    ...rest
  } = {}) {
    try {
      const content = this.val_str(text, "text", !0);
      const voice_input = this.val_str(voice, "voice", !0);
      const lang_input = this.val_str(lang, "lang", !0);
      const engine_input = this.val_str(engine, "engine", !0);
      const speed_input = String(speed ?? "0").trim();
      const email_input = this.val_str(email, "email", !0);

      const matched_by_id = this.raw_voices.find(v => v.id === voice_input);
      const matched_by_name = this.raw_voices.find(v => v.name.toLowerCase() === voice_input.toLowerCase());
      const selected_voice = matched_by_id || matched_by_name;

      if (!selected_voice) {
        const avail_voices = this.raw_voices.map(v => `${v.name} (ID: ${v.id})`).slice(0, 15).join(", ");
        throw new Error(`Voice "${voice_input}" tidak valid. Tersedia: ${avail_voices}, dll.`);
      }

      const active_id = selected_voice.id;
      const active_lang = (this.lang_map[lang_input] ? lang_input : selected_voice.lang) || "en-US";
      const active_engine = ["ms", "aws"].includes(engine_input.toLowerCase()) ? engine_input.toLowerCase() : selected_voice.engine;

      const creds = await this.ini();
      console.log(`[PROSES] Menghasilkan audio TTS untuk "${content.slice(0, 30)}..." [Voice: ${selected_voice.name} (${active_id}), Lang: ${active_lang}, Engine: ${active_engine}]`);

      const q = {
        app: rest?.app || "pw",
        ca: String(rest?.ca ?? "false"),
        e: email_input,
        l: String(rest?.license ?? "0"),
        lo: active_lang,
        r: active_id,
        s: speed_input,
        sm: String(rest?.sm ?? "true"),
        v: active_engine,
        vn: rest?.version || "10.8.61"
      };

      const b = JSON.stringify({ t: content });
      const dt = new Date();
      const u = new URL(`${this.tts_url}/tts`);

      const h_in = {
        "content-type": "application/json; charset=UTF-8",
        host: u.host,
        "x-amz-date": dt.toISOString().replace(/[:-]|\.\d{3}/g, ""),
        ...(creds?.tok ? { "x-amz-security-token": creds.tok } : {})
      };

      const { auth, amz_date } = this.b_auth({
        m: "POST",
        p: u.pathname,
        q,
        d: b,
        dt,
        hd: h_in,
        ak: creds.ak,
        sk: creds.sk
      });

      const hd = {
        ...this.hd(),
        Accept: "*/*",
        "Accept-Language": `${active_lang},id;q=0.9`,
        Authorization: auth,
        "Content-Type": "application/json; charset=UTF-8",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "x-amz-date": amz_date,
        ...(creds?.tok ? { "x-amz-security-token": creds.tok } : {})
      };

      const res = await axios.post(`${this.tts_url}/tts`, b, {
        params: q,
        headers: hd,
        responseType: "arraybuffer",
        timeout: 4e4
      });

      const audio_buf = Buffer.from(res?.data || "");
      if (!audio_buf.length) {
        throw new Error("Respon buffer audio kosong dari server gateway");
      }

      const audio_b64 = audio_buf.toString("base64");
      console.log(`[PROSES] Sintesis audio sukses (${audio_buf.length} bytes).`);

      return {
        status: true,
        result: {
          voice_id: active_id,
          voice_name: selected_voice.name,
          language: active_lang,
          language_name: this.lang_map[active_lang] || active_lang,
          speed: speed_input,
          engine: active_engine,
          char_count: content.length,
          audio_format: "mp3",
          audio_base64: audio_b64,
          data_uri: `data:audio/mp3;base64,${audio_b64}`
        }
      };
    } catch (err) {
      console.log(`[ERROR] Generate TTS: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.response?.data ? Buffer.from(err?.response?.data).toString() : err?.message || "Gagal memproses speech synthesis"
        }
      };
    }
  }
}

export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const validActions = ["create", "voice_list", "voices"];

    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: [
            "/?action=create&text=Halo+dunia&voice=161&lang=id-ID",
            "/?action=create&text=Hello+world&voice=Andrew&lang=en-US",
            "/?action=voice_list&lang=en-US"
          ]
        }
      });
    }

    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: validActions
      });
    }

    const api = new NaturalReaders();
    let response;

    switch (action) {
      case "create": {
        if (!params.text || !String(params.text).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create({
          text: params.text,
          voice: params.voice !== undefined ? params.voice : "161",
          lang: params.lang || "id-ID",
          speed: params.speed || "0",
          engine: params.engine || "ms",
          email: params.email || "user@naturalreaders.com",
          ...params
        });
        break;
      }
      case "voice_list":
      case "voices": {
        response = await api.voice_list({
          lang: params.lang,
          ...params
        });
        break;
      }
    }

    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.message || "Gagal memproses request ke NaturalReaders."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada handler:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}