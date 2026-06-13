const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema({
  // --- Legacy / Existing Fields (optional for backward compatibility) ---
  imageUrl: { type: String },
  title: { type: String },
  subTitle: { type: String },
  description: { type: String },
  reference: { type: String },
  createAt: { type: Date, default: Date.now },

  // --- New Rich Lesson Fields ---
  lessonId: { type: String, unique: true, sparse: true }, // Maps to "id": "bn-2026-024"
  lesson_number: { type: Number },
  slug: { type: String },
  status: { type: String, default: "published" },
  
  language_pair: {
    source: { type: String, default: "en" },
    target: { type: String, default: "vi" }
  },
  
  level: {
    cefr: { type: String },
    label: { type: String }
  },
  
  category: { type: String },
  tags: [{ type: String }],
  publish_date: { type: String },
  estimated_reading_minutes: { type: Number },
  
  source: {
    publisher: { type: String },
    section: { type: String },
    original_title: { type: String },
    original_subtitle: { type: String },
    original_url: { type: String },
    original_publish_date: { type: String },
    author: { type: String },
    license_note: { type: String }
  },
  
  cover: {
    image_url: { type: String },
    image_alt: { type: String }
  },
  
  headline: {
    en: { type: String },
    vi: { type: String }
  },
  
  summary: {
    en: { type: String },
    vi: { type: String }
  },
  
  pages: [
    {
      page_number: { type: Number },
      page_title: {
        en: { type: String },
        vi: { type: String }
      },
      image_url: { type: String },
      content: {
        english_text: { type: String },
        vietnamese_translation: { type: String }
      },
      vocabulary: [
        {
          id: { type: String },
          word: { type: String },
          ipa: { type: String },
          part_of_speech: { type: String },
          meaning_vi: { type: String },
          meaning_en: { type: String },
          example_sentence: { type: String },
          audio_url: { type: String }
        }
      ]
    }
  ],
  
  activities: [
    {
      id: { type: String },
      type: { type: String }, // e.g. discussion_question, vocabulary_matching, gap_fill, summary_writing
      prompt_en: { type: String },
      prompt_vi: { type: String },
      instructions_en: { type: String },
      text_with_gaps: { type: String },
      min_words: { type: Number },
      max_words: { type: Number },
      items: [
        {
          word_id: { type: String },
          term: { type: String },
          answer: { type: String }
        }
      ],
      answer_key: [{ type: String }]
    }
  ],
  
  metadata: {
    created_by: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    review_status: { type: String },
    target_audience: { type: String },
    estimated_difficulty_score: { type: Number },
    word_count: {
      english: { type: Number },
      vietnamese: { type: Number     }
    }
  }
});

module.exports = mongoose.model("News", NewsSchema);
