// src/data/knowledgeData.js
export const sampleKnowledge = {
  agri: {
    "Seed Ash Preservation Technique": {
      blocks: [
        { label: "Technique", text: "Seeds are mixed with dry wood ash from the family hearth, stored in sealed mud pots. The alkalinity of ash prevents moisture absorption and repels insects without any chemical treatment." },
        { label: "Environmental Indicator", text: "Farmers test ash quality by rubbing it between fingers — fine, pale grey ash from sal wood indicates optimal alkalinity. Dark or oily ash is rejected." },
        { label: "Decision Rule", text: "Seeds are treated after the last full moon of Kartik month. The timing ensures seeds are fully dried from harvest before storage." }
      ],
      graph: { center: "Seed Ash Preservation", nodes: ["Wood Ash (Sal)", "Mud Pot Storage", "Kartik Moon Calendar", "Agni Ritual", "Alkalinity Testing"] }
    }
  },
  health: {
    "Pakhala Fermentation Gut Health System": {
      blocks: [
        { label: "Preparation Method", text: "Cooked rice is soaked in water overnight, sometimes 12–24 hours. The natural fermentation produces lactic acid bacteria that restore gut microbiome balance." },
        { label: "Clinical Indicator", text: "The water develops a slight sour smell and milky appearance — this indicates successful fermentation. Overly sour means over-fermented and should not be consumed." }
      ],
      graph: { center: "Pakhala Fermentation", nodes: ["Cooked Rice", "Overnight Soaking", "Lactic Acid Bacteria", "Probiotic Benefit", "Heat Stroke Remedy"] }
    }
  },
  craft: {
    "Dhokra Metal Casting (Lost-Wax Technique)": {
      blocks: [
        { label: "Core Technique", text: "A model is built from beeswax over a clay core. The wax is coated in layers of clay slip, dried, then heated — the wax melts and runs out (lost), leaving a hollow mould. Molten brass is poured in." },
        { label: "Critical Phase", text: "The firing temperature must be judged by the colour of the clay mould: pale orange indicates readiness. Too red means overheating; the mould will crack." }
      ],
      graph: { center: "Dhokra Metal Casting", nodes: ["Beeswax Model", "Clay Core", "Lost-Wax Method", "Brass Alloy", "Firing Temperature"] }
    }
  }
};

export const sampleAnalysis = {
  craft: {
    "Dhokra Metal Casting (Lost-Wax Technique)": [
      { time: "0:00 – 0:45", title: "Phase 1: Wax Modelling", desc: "Both hands detected in circular motion. Consistent inward pressure.", critical: "⚠ Critical: Wrist angle consistently maintained at 35–40°." },
      { time: "0:45 – 2:20", title: "Phase 2: Clay Coating Application", desc: "Right hand applies clay slip in downward strokes.", critical: "⚠ Critical: Layer overlap of ~30% ensures no gaps." }
    ]
  }
};

export const getChatResponse = (entry, message) => {
  const msg = message.toLowerCase();
  if (entry.includes("Dhokra") && msg.includes("wax")) return "The wax must come from forest bees — this is not just tradition but necessity. Forest beeswax melts at a lower, more even temperature.";
  if (entry.includes("Pakhala") && msg.includes("smell")) return "The water turns slightly milky with a gentle sour note. Too clear means fermentation has not started. Too sour means it has gone too far.";
  return "There are things that cannot fully be written — the weight of the hand, the smell of readiness, the colour of the right moment. But I will describe what I can.";
};