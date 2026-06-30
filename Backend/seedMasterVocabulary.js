const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const MasterVocabulary = require('./models/Vocabulary/MasterVocabularyModel');

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise';

const vocabularyData = [
    {
        word: "cat",
        ipa: "/kæt/",
        level: "kids",
        partOfSpeech: "noun",
        meaningEn: "a small animal kept as a pet",
        meaningVi: "con mèo",
        example: "The cat is sleeping.",
        topic: "animals",
        frequency: "high",
        register: "neutral",
        collocations: ["pet cat"],
        synonyms: ["feline"],
        antonyms: [],
        wordFamily: ["cats"],
        phrasalVerbs: [],
        difficultyScore: 1,
        ieltsBand: 1.0
    },
    {
        word: "run",
        ipa: "/rʌn/",
        level: "A1",
        partOfSpeech: "verb",
        meaningEn: "to move quickly on foot",
        meaningVi: "chạy",
        example: "I run every morning.",
        topic: "daily_life",
        frequency: "high",
        register: "neutral",
        collocations: ["run fast"],
        synonyms: ["jog"],
        antonyms: ["walk"],
        wordFamily: ["runner", "running"],
        phrasalVerbs: ["run away"],
        difficultyScore: 5,
        ieltsBand: 2.0
    },
    {
        word: "happy",
        ipa: "/ˈhæpi/",
        level: "A1",
        partOfSpeech: "adj",
        meaningEn: "feeling pleasure",
        meaningVi: "vui vẻ",
        example: "She feels happy today.",
        topic: "emotion",
        frequency: "high",
        register: "neutral",
        collocations: ["very happy"],
        synonyms: ["joyful"],
        antonyms: ["sad"],
        wordFamily: ["happiness"],
        phrasalVerbs: [],
        difficultyScore: 6,
        ieltsBand: 2.5
    },
    {
        word: "improve",
        ipa: "/ɪmˈpruːv/",
        level: "A2",
        partOfSpeech: "verb",
        meaningEn: "to become better",
        meaningVi: "cải thiện",
        example: "You should improve your skills.",
        topic: "education",
        frequency: "high",
        register: "neutral",
        collocations: ["improve skills"],
        synonyms: ["enhance"],
        antonyms: ["worsen"],
        wordFamily: ["improvement"],
        phrasalVerbs: [],
        difficultyScore: 15,
        ieltsBand: 4.0
    },
    {
        word: "decision",
        ipa: "/dɪˈsɪʒən/",
        level: "B1",
        partOfSpeech: "noun",
        meaningEn: "a choice made",
        meaningVi: "quyết định",
        example: "He made a big decision.",
        topic: "life",
        frequency: "high",
        register: "neutral",
        collocations: ["make a decision"],
        synonyms: ["choice"],
        antonyms: ["indecision"],
        wordFamily: ["decide"],
        phrasalVerbs: [],
        difficultyScore: 25,
        ieltsBand: 5.0
    },
    {
        word: "develop",
        ipa: "/dɪˈveləp/",
        level: "B1",
        partOfSpeech: "verb",
        meaningEn: "to grow or change",
        meaningVi: "phát triển",
        example: "The company develops software.",
        topic: "business",
        frequency: "high",
        register: "neutral",
        collocations: ["develop skills"],
        synonyms: ["grow"],
        antonyms: ["decline"],
        wordFamily: ["development"],
        phrasalVerbs: [],
        difficultyScore: 30,
        ieltsBand: 5.5
    },
    {
        word: "significant",
        ipa: "/sɪɡˈnɪfɪkənt/",
        level: "B2",
        partOfSpeech: "adj",
        meaningEn: "important or meaningful",
        meaningVi: "quan trọng",
        example: "This is a significant change.",
        topic: "academic",
        frequency: "medium",
        register: "formal",
        collocations: ["significant impact"],
        synonyms: ["important"],
        antonyms: ["minor"],
        wordFamily: ["significance"],
        phrasalVerbs: [],
        difficultyScore: 55,
        ieltsBand: 6.5
    },
    {
        word: "analyze",
        ipa: "/ˈænəlaɪz/",
        level: "C1",
        partOfSpeech: "verb",
        meaningEn: "to examine in detail",
        meaningVi: "phân tích",
        example: "Scientists analyze data.",
        topic: "research",
        frequency: "medium",
        register: "formal",
        collocations: ["analyze data"],
        synonyms: ["examine"],
        antonyms: ["ignore"],
        wordFamily: ["analysis"],
        phrasalVerbs: [],
        difficultyScore: 75,
        ieltsBand: 7.0
    },
    {
        word: "mitigate",
        ipa: "/ˈmɪtɪɡeɪt/",
        level: "C1",
        partOfSpeech: "verb",
        meaningEn: "to reduce severity",
        meaningVi: "giảm nhẹ",
        example: "Policies mitigate risks.",
        topic: "environment",
        frequency: "low",
        register: "formal",
        collocations: ["mitigate risk"],
        synonyms: ["reduce"],
        antonyms: ["worsen"],
        wordFamily: ["mitigation"],
        phrasalVerbs: [],
        difficultyScore: 80,
        ieltsBand: 7.5
    },
    {
        word: "ubiquitous",
        ipa: "/juːˈbɪkwɪtəs/",
        level: "C2",
        partOfSpeech: "adj",
        meaningEn: "present everywhere",
        meaningVi: "phổ biến khắp nơi",
        example: "Smartphones are ubiquitous.",
        topic: "technology",
        frequency: "low",
        register: "formal",
        collocations: ["ubiquitous presence"],
        synonyms: ["widespread"],
        antonyms: ["rare"],
        wordFamily: ["ubiquity"],
        phrasalVerbs: [],
        difficultyScore: 95,
        ieltsBand: 8.5
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing data
        await MasterVocabulary.deleteMany({});
        console.log('Cleared existing MasterVocabulary.');

        // Insert new data
        await MasterVocabulary.insertMany(vocabularyData);
        console.log('Successfully seeded 10 MasterVocabulary items.');

        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();
