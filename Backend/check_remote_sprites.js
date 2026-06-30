const mongoose = require("mongoose");
const PetTemplate = require("./models/Pet/PetTemplateModel");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, '../.env') });
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise';

async function check() {
    try {
        console.log("Connecting to:", MONGO_URL.split('@')[1]); // Hide credentials
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected");
        
        const pets = await PetTemplate.find();
        console.log(`Found ${pets.length} pets.`);
        
        pets.forEach(p => {
            const spriteKeys = p.sprites ? Object.keys(p.sprites).filter(k => p.sprites[k] && p.sprites[k].length > 0) : [];
            console.log(`Pet: ${p.name} (${p._id}) - Available Sprites: ${spriteKeys.length} [${spriteKeys.join(", ")}]`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
}

check();
