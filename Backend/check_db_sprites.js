const mongoose = require("mongoose");
const PetTemplate = require("./models/Pet/PetTemplateModel");

async function check() {
    try {
        await mongoose.connect("mongodb://localhost:27017/RaisingWorkBE");
        console.log("Connected to MongoDB");
        
        const pets = await PetTemplate.find().limit(5);
        console.log("Found", pets.length, "pets");
        
        pets.forEach(p => {
            console.log(`Pet: ${p.name}`);
            console.log(`Sprites:`, JSON.stringify(p.sprites, null, 2));
        });
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

check();
