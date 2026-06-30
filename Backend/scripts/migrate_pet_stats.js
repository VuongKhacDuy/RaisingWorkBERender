const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const PetTemplate = require("../models/Pet/PetTemplateModel");
const UserPet = require("../models/Pet/UserPetModel");

const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://khongduocdau456:khongduocdau456@wordsrise.kvelvt0.mongodb.net/WordsRise';

const calcStat = (base, level) => Math.round(base + base * 0.1 * (level - 1));
const rollIV = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function migrate() {
    try {
        console.log("🚀 Starting Pet Stat Migration...");
        await mongoose.connect(MONGO_URL);
        console.log("✅ Connected to MongoDB");

        // 1. Update PetTemplates
        const templates = await PetTemplate.find();
        console.log(`📋 Processing ${templates.length} templates...`);

        for (const t of templates) {
            let updated = false;

            // Set min/max for HP if missing
            if (!t.minHP || !t.maxHP) {
                t.minHP = Math.floor(t.baseHp * 0.8);
                t.maxHP = Math.ceil(t.baseHp * 1.2);
                updated = true;
            }
            // Set min/max for Mana
            if (!t.minMana || !t.maxMana) {
                t.minMana = Math.floor(t.baseMana * 0.8);
                t.maxMana = Math.ceil(t.baseMana * 1.2);
                updated = true;
            }
            // Set min/max for Power
            if (!t.minPower || !t.maxPower) {
                t.minPower = Math.floor(t.basePower * 0.8);
                t.maxPower = Math.ceil(t.basePower * 1.2);
                updated = true;
            }
            // Defense
            if (t.minDefense === undefined || t.maxDefense === undefined || t.minDefense === 5 && t.maxDefense === 20) {
                t.minDefense = Math.floor(t.baseDefense * 0.8);
                t.maxDefense = Math.ceil(t.baseDefense * 1.2);
                updated = true;
            }
            // Speed
            if (t.minSpeed === undefined || t.maxSpeed === undefined || t.minSpeed === 5 && t.maxSpeed === 20) {
                t.minSpeed = Math.floor(t.baseSpeed * 0.8);
                t.maxSpeed = Math.ceil(t.baseSpeed * 1.2);
                updated = true;
            }

            // Fixed maxLevel
            if (t.maxLevel !== 100) {
                t.maxLevel = 100;
                updated = true;
            }

            if (updated) {
                await t.save();
                console.log(`   🔸 Updated template: ${t.name}`);
            }
        }

        // 2. Update UserPets
        const userPets = await UserPet.find().populate("petTemplateId");
        console.log(`🐾 Processing ${userPets.length} user pets...`);

        for (const p of userPets) {
            const template = p.petTemplateId;
            if (!template) {
                console.warn(`   ⚠️ Missing template for pet ${p._id}, skipping.`);
                continue;
            }

            let updated = false;

            // Check if base stats are the default ones (100, 50, 15, 10, 10)
            // Or if we just want to re-roll everything to be sure
            const isLegacy = (p.baseHp === 100 && p.baseMana === 50 && p.basePower === 15 && p.baseDefense === 10 && p.baseSpeed === 10);

            if (isLegacy) {
                console.log(`   🎲 Re-rolling stats for pet: ${p.nickname || template.name} (${p._id})`);

                p.baseHp = rollIV(template.minHP, template.maxHP);
                p.baseMana = rollIV(template.minMana, template.maxMana);
                p.basePower = rollIV(template.minPower, template.maxPower);
                p.baseDefense = rollIV(template.minDefense, template.maxDefense);
                p.baseSpeed = rollIV(template.minSpeed, template.maxSpeed);

                // Re-calculate current stats
                p.maxHp = calcStat(p.baseHp, p.level);
                p.hp = p.maxHp; // Refill HP
                p.maxMana = calcStat(p.baseMana, p.level);
                p.mana = p.maxMana; // Refill Mana
                p.power = calcStat(p.basePower, p.level);
                p.defense = calcStat(p.baseDefense, p.level);
                p.speed = calcStat(p.baseSpeed, p.level);

                updated = true;
            }

            if (updated) {
                await p.save();
            }
        }

        console.log("🏁 Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
