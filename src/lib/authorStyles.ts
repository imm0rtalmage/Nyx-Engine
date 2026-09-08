// Free-Form Author & Stylistic Influence Engine
// Dynamically supports any author, show writing room, DM style, director, or multi-creator blend.
// Enforces Dual-Voice Firewall (Story prose 100% in-style; Nyx OOC in brackets) and zero-drift re-anchoring.

export interface CreatorElement {
  name: string;
  category: "author" | "writing_room" | "dm_master" | "director" | "stylistic_concept" | "custom";
  signatureTraits: string;
  sensoryFocus: string;
  dialogueFocus: string;
}

export interface AuthorStyleBlueprint {
  targetAuthors: string;
  isMultiAuthor: boolean;
  isWritingRoom: boolean;
  isTTRPGMaster: boolean;
  synthesizedBlueprint: string;
  proseArchitecture: string;
  sensoryPalette: string;
  dialogueCadence: string;
  sceneEconomy: string;
  bannedHabits: string[];
  detectedElements: CreatorElement[];
}

// Deep stylistic DNA knowledge base for instant high-fidelity emulation
const CREATOR_KNOWLEDGE_BASE: Record<string, CreatorElement> = {
  // --- SHOW WRITING ROOMS & SCREENWRITERS ---
  "avatar-writers": {
    name: "Avatar: The Last Airbender Writing Room",
    category: "writing_room",
    signatureTraits: "Visual, kinetic, and emotionally resonant. Balances high-stakes adventure and martial artistry with genuine character vulnerability and playful ensemble banter. Scenes transition with episodic momentum and clear visual blocking.",
    sensoryFocus: "Kinetic elemental forces, martial arts footwork and breath control (Northern Shaolin, Hung Gar, Ba Gua, Tai Chi), vibrant regional cultures, environmental interaction, sound of rushing wind and cracking stone.",
    dialogueFocus: "Character-true, endearing banter where every speaker's unique philosophy and personal flaws shine through. Deep emotional sincerity without cynicism."
  },
  "andor-writers": {
    name: "Andor Writing Room (Tony Gilroy)",
    category: "writing_room",
    signatureTraits: "Tense espionage realism, grounded ideological stakes, bureaucratic menace, and relentless narrative momentum. Avoids melodrama in favor of quiet, simmering tension.",
    sensoryFocus: "Brutalist architecture, damp concrete, echo of boot heels on metal catwalks, sterile imperial lighting, tactile tools, and the stifling silence of surveillance.",
    dialogueFocus: "Razor-sharp, subtext-drenched, articulate ideological sparring. Characters speak with guarded intelligence and calculated pauses."
  },
  "arcane-writers": {
    name: "Arcane Writing Team (Riot / Fortiche)",
    category: "writing_room",
    signatureTraits: "High-octane emotional tragedy, dynamic pacing, character foil juxtapositions, and kinetic action rhythm. Every scene carries irreversible narrative consequences.",
    sensoryFocus: "Chem-fog, glowing hextech energy, metallic gears grinding, smoke and embers, rain on stained glass, visceral physical trauma, and heavy rhythmic beats.",
    dialogueFocus: "Raw, emotionally charged dialogue where personal history and betrayal bleed into every line. Fierce protectiveness and tragic misunderstandings."
  },
  "expanse-writers": {
    name: "The Expanse Writers (James S.A. Corey)",
    category: "writing_room",
    signatureTraits: "Grounded blue-collar sci-fi, realistic Newtonian physics, high-stakes shipboard operations, and geopolitical tension. Character-first survival grit.",
    sensoryFocus: "G-force crushing chests, thruster burns, recycling smell of ship air, recycled coffee, the silent vacuum outside the hull, puncture alarms, magnetic boots.",
    dialogueFocus: "Lived-in crew shorthand, dry fatalistic humor, Belter patois nuances, and realistic military/political crisis communications."
  },

  // --- TTRPG DUNGEON MASTERS & GAME STORYTELLERS ---
  "matt-mercer": {
    name: "Matt Mercer",
    category: "dm_master",
    signatureTraits: "Theatrical, highly evocative room and atmospheric staging. Visceral physical combat choreography with sensory blow-by-blow descriptions ('How do you want to do this?'). Distinctive NPC vocal mannerisms and dramatic pauses.",
    sensoryFocus: "The acrid scent of ozone and wet cobblestones, reverberation of steel through armor, crackling spell sparks, candlelight guttering in stone archways, tactile environmental hazards.",
    dialogueFocus: "Warm, dramatic, and expressive. NPCs possess distinct vocal rhythms, physical quirks, and heartfelt emotional stakes. Natural camaraderie and comedic timing under pressure."
  },
  "brennan-lee-mulligan": {
    name: "Brennan Lee Mulligan",
    category: "dm_master",
    signatureTraits: "Hyper-kinetic narrative velocity, brilliant philosophical monologue capability, razor-sharp wit, and sudden emotional devastation. Systemic worldbuilding where institutions have tangible weight.",
    sensoryFocus: "Dynamic architectural movement, chaos of spell collisions, absurdly vivid microscopic details, sudden dramatic lighting shifts, and escalating kinetic momentum.",
    dialogueFocus: "Fast-paced, fiercely intelligent banter, layered humor, and devastatingly earnest moral confrontation. NPCs articulate their convictions with fiery passion."
  },

  // --- FANTASY NOVELISTS ---
  "ra-salvatore": {
    name: "R.A. Salvatore",
    category: "author",
    signatureTraits: "Pioneering, peerless melee combat choreography. Fluid blade-to-blade velocity, stance shifts, weapon reach, momentum transfers, and heroic tactical grit.",
    sensoryFocus: "Scimitars singing through the air, balance shifts on uneven rock, the precise impact of pommel against plate, footwork pivoting, cold underdark cavern drafts, glowing magical blades.",
    dialogueFocus: "Honorable, tactical, and determined. Characters debate warrior codes, tactical dilemmas, and fierce loyalties in the heat of battle."
  },
  "timothy-zahn": {
    name: "Timothy Zahn",
    category: "author",
    signatureTraits: "Crisp tactical precision, deductive chess-match tension, keen observation of opponent micro-expressions, and disciplined strategic asymmetry.",
    sensoryFocus: "Tactical geometry, weapon capacitor hums, sensor display flickers, spatial line-of-sight, the micro-tension in an opponent's jaw, boots on polished deck plating.",
    dialogueFocus: "Understated, professional, razor-sharp. Characters speak with strategic intent without generic villainous monologues. Sarcasm is dry and deadpan."
  },
  "william-gibson": {
    name: "William Gibson",
    category: "author",
    signatureTraits: "Dense, kinetic cybernetic prose, neon-noir atmospheres, brand realism, and streetwise poetic compression. High information density per sentence.",
    sensoryFocus: "Television sky tuned to a dead channel, chrome alloy reflections in oily rainwater, scorched ozone, cold neon glare, damp leather, fiber-optic filaments.",
    dialogueFocus: "Cool, cynical, laconic underworld shorthand. Characters withhold information like currency. Slang is organic, lived-in, and sharp."
  },
  "stephen-king": {
    name: "Stephen King",
    category: "author",
    signatureTraits: "Visceral everyday mundanity escalating into intimate psychological horror and unrelenting suspense. Character-first storytelling with raw American authenticity.",
    sensoryFocus: "Cold dregs of diner coffee, the smell of wet denim and old motor oil, the stuttering buzz of a dying fluorescent tube, metallic taste of adrenaline.",
    dialogueFocus: "Unvarnished, colloquial, authentic speech. Characters use regional idioms, nervous interruptions, and dark humor under pressure."
  },
  "brandon-sanderson": {
    name: "Brandon Sanderson",
    category: "author",
    signatureTraits: "Direct, transparent, momentum-driven prose. Crystal-clear scene blocking, systemic magic mechanics, high stakes, and rhythmic escalating momentum ('the avalanche').",
    sensoryFocus: "Luminous energy lines, physical recoil of kinetic force, gleam of polished glass and metal alloys, structural weight, gravitational shifts.",
    dialogueFocus: "Purposeful, philosophical, and banter-capable. Characters express their core moral oaths and internal dilemmas through tactical decisions."
  },
  "cormac-mccarthy": {
    name: "Cormac McCarthy",
    category: "author",
    signatureTraits: "Biblical polysyndeton cadence, stark unpunctuated prose, indifferent elemental landscapes, and haunting archaic rhythm.",
    sensoryFocus: "Bone-dry desert dust, alkali flats, scorched iron, indifferent star-scattered night sky, smell of woodsmoke and dried blood.",
    dialogueFocus: "Spare, fatalistic, unpunctuated. Characters speak in brief, heavy utterances that echo like pronouncements in an empty church."
  },
  "george-r-r-martin": {
    name: "George R. R. Martin",
    category: "author",
    signatureTraits: "Panoramic world texture, complex political webwork, multi-layered character motivations, sensory feasts, and brutal, unsparing mortality.",
    sensoryFocus: "Roast meats dripping fat, muddy fur cloaks, the chill of winter stone, the clang of dull iron, stench of the battlefield and perfumed court silks.",
    dialogueFocus: "Sharp courtly dueling, bawdy campfire humor, cutting insults, and political bargaining layered with double meanings."
  },
  "frank-herbert": {
    name: "Frank Herbert",
    category: "author",
    signatureTraits: "Feudal political intrigue, ecological philosophy, layered internal monologues, prescient dread, and ritualistic formal ceremony.",
    sensoryFocus: "Cinnamon spice scent, scouring silica sand, moisture reclamation seals, the whisper of a crysknife drawing from its sheath, shielded optical distortion.",
    dialogueFocus: "Formal, guarded, calculated. Characters analyze sub-vocal inflections, dilated pupils, and voice harmonics (the Voice). Words are weapons."
  },
  "neil-gaiman": {
    name: "Neil Gaiman",
    category: "author",
    signatureTraits: "Mythic folklore realism, modern fable charm, lyrical prose, and earnest melancholy juxtaposed with quiet wonder and ancient dread.",
    sensoryFocus: "Old book pages, London fog smelling of tea and chimney smoke, raven feathers, silver moonlight on rusted keys, cobblestone alleyways behind doors that shouldn't exist.",
    dialogueFocus: "Charming, whimsical, enigmatic, with sudden piercing emotional truths. Characters sound timeless, weary, and magical."
  },
  "joe-abercrombie": {
    name: "Joe Abercrombie",
    category: "author",
    signatureTraits: "Grimdark cynicism, dark comedy, visceral bone-crunching violence, subversion of heroic fantasy tropes, and deeply flawed, memorable protagonists.",
    sensoryFocus: "Cold mud, the sour taste of fear, aching joints, the wet crunch of shattered teeth, rusted iron, damp campfires that will not catch.",
    dialogueFocus: "Biting, dark, profane, and hilarious. Characters repeat cynical personal mottos ('Say one thing for Logen Ninefingers...') and trade brutal insults."
  },
  "dan-simmons": {
    name: "Dan Simmons",
    category: "author",
    signatureTraits: "Epic intellectual scale, poetic resonance (Keatsian imagery), horrific visceral body-horror, and breathtaking hard sci-fi/fantasy grandeur.",
    sensoryFocus: "Chrome blades of the Shrike, zero-g plasma fire, freezing polar ice winds, ancient stone cathedrals on alien worlds, the smell of burnt flesh.",
    dialogueFocus: "Philosophical, erudite, passionate. Characters debate faith, art, and survival across cosmic timelines."
  },

  // --- FILM DIRECTORS & CINEMATIC VISIONARIES ---
  "denis-villeneuve": {
    name: "Denis Villeneuve",
    category: "director",
    signatureTraits: "Monolithic architectural scale, overwhelming visual silence, brutalist design, contemplative atmospheric dread, and rhythmic audiovisual impact.",
    sensoryFocus: "Deep sub-bass vibrations in the ribcage, vast dust-choked desert vistas, monolithic slab shadows, geometric silhouettes against blinding sunlight.",
    dialogueFocus: "Sparse, deliberate, weighty. Every spoken line hangs in silence, framed by massive environmental scale."
  },
  "hayao-miyazaki": {
    name: "Hayao Miyazaki / Studio Ghibli",
    category: "director",
    signatureTraits: "Whimsical tactile wonder, flight mechanics, reverence for nature, quiet 'ma' moments of peaceful observation, and empathetic character design.",
    sensoryFocus: "The hiss of steam locomotives, wind rippling through tall green grass, fresh warm bread, raindrops pattering on giant leaves, flight goggles catching sunlight.",
    dialogueFocus: "Earnest, heartfelt, gentle, and spirited. Characters express deep emotional loyalty and respect for the living world."
  },
  "quentin-tarantino": {
    name: "Quentin Tarantino",
    category: "director",
    signatureTraits: "Razor-sharp rhythmic dialogue sparring, escalating suspense, sudden explosive kinetic violence, and eclectic subtextual character banter.",
    sensoryFocus: "Spilled liquor on lacquered wood, cigarette smoke swirling in ceiling fans, clicking revolver hammers, blood spatter on retro furniture, high-contrast lighting.",
    dialogueFocus: "Electrifying, meandering conversational duels that build unbearable tension before an inevitable explosion of action."
  },
  "guillermo-del-toro": {
    name: "Guillermo del Toro",
    category: "director",
    signatureTraits: "Dark fairytale beauty, gothic clockwork macabre, clockwork gears, empathetic monstrosity, and richly layered tactile occult craftsmanship.",
    sensoryFocus: "Amber jar specimens, ticking brass clockwork, wet black subterranean earth, peeling wallpaper in decrepit Victorian mansions, glowing ethereal ichor.",
    dialogueFocus: "Poetic, melancholy, and folkloric. Characters speak with love for the strange and tragic reverence for the monstrous."
  }
};

/**
 * Searches the knowledge base using fuzzy matching and synonyms.
 */
function matchKnownCreator(token: string): CreatorElement | null {
  const clean = token.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  if (!clean) return null;

  // Direct key lookup
  if (CREATOR_KNOWLEDGE_BASE[clean]) return CREATOR_KNOWLEDGE_BASE[clean];

  // Alias / keyword lookup
  for (const [key, item] of Object.entries(CREATOR_KNOWLEDGE_BASE)) {
    const itemNameClean = item.name.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    if (clean === key || clean === itemNameClean) return item;

    // Check partial / nickname matches
    if (key === "avatar-writers" && (clean.includes("avatar") || clean.includes("airbender") || clean.includes("atla"))) return item;
    if (key === "matt-mercer" && (clean.includes("mercer") || clean.includes("critical role"))) return item;
    if (key === "ra-salvatore" && (clean.includes("salvatore") || clean.includes("drizzt"))) return item;
    if (key === "brennan-lee-mulligan" && (clean.includes("brennan") || clean.includes("dimension 20"))) return item;
    if (key === "andor-writers" && (clean.includes("andor") || clean.includes("gilroy"))) return item;
    if (key === "arcane-writers" && clean.includes("arcane")) return item;
    if (key === "expanse-writers" && (clean.includes("expanse") || clean.includes("james s a corey") || clean.includes("corey"))) return item;
    if (key === "timothy-zahn" && (clean.includes("zahn") || clean.includes("thrawn"))) return item;
    if (key === "william-gibson" && (clean.includes("gibson") || clean.includes("neuromancer"))) return item;
    if (key === "stephen-king" && (clean.includes("stephen king") || clean.includes("king"))) return item;
    if (key === "brandon-sanderson" && (clean.includes("sanderson") || clean.includes("cosmere"))) return item;
    if (key === "cormac-mccarthy" && (clean.includes("mccarthy") || clean.includes("blood meridian"))) return item;
    if (key === "george-r-r-martin" && (clean.includes("martin") || clean.includes("grrm") || clean.includes("game of thrones"))) return item;
    if (key === "frank-herbert" && (clean.includes("herbert") || clean.includes("dune"))) return item;
    if (key === "neil-gaiman" && (clean.includes("gaiman") || clean.includes("sandman"))) return item;
    if (key === "joe-abercrombie" && (clean.includes("abercrombie") || clean.includes("first law"))) return item;
    if (key === "dan-simmons" && (clean.includes("simmons") || clean.includes("hyperion"))) return item;
    if (key === "denis-villeneuve" && (clean.includes("villeneuve") || clean.includes("blade runner 2049"))) return item;
    if (key === "hayao-miyazaki" && (clean.includes("miyazaki") || clean.includes("ghibli"))) return item;
    if (key === "quentin-tarantino" && clean.includes("tarantino")) return item;
    if (key === "guillermo-del-toro" && (clean.includes("del toro") || clean.includes("pan s labyrinth"))) return item;
  }

  // Check if it's a generic show writers / screenwriting room pattern
  if (clean.includes("writer") || clean.includes("writing room") || clean.includes("showrunners") || clean.includes("screenplay")) {
    return {
      name: token.trim(),
      category: "writing_room",
      signatureTraits: `Embodying the ensemble screenwriting room of ${token.trim()}. Delivers episodic narrative drive, distinct character voice differentiation, and tight visual scene blocking.`,
      sensoryFocus: `Vivid visual and auditory cues suitable for cinematic presentation, clear environmental layout, and kinetic character blocking.`,
      dialogueFocus: `Punchy, character-delineated dialogue with strong subtext, comedic or dramatic timing, and natural verbal rhythms.`
    };
  }

  // Check if it's a DM / game master pattern
  if (clean.includes("dm") || clean.includes("dungeon master") || clean.includes("game master") || clean.includes("ttrpg")) {
    return {
      name: token.trim(),
      category: "dm_master",
      signatureTraits: `Embodying the dynamic tabletop storytelling style of ${token.trim()}. Theatrical room staging, sensory encounter descriptions, tactile environmental interactivity, and responsive dramatic pacing.`,
      sensoryFocus: `Vivid smells, lighting changes, tactical spatial layout, and visceral blow-by-blow descriptions of combat action.`,
      dialogueFocus: `Expressive, distinct vocal cadence for every NPC, dramatic suspense, and high-energy collaborative camaraderie.`
    };
  }

  return null;
}

/**
 * Procedurally synthesizes any free-form author, show writing room, DM style, director, or blend.
 * Never boxes the user into rigid presets.
 */
export function generateAuthorStyleBlueprint(rawInput: string = ""): AuthorStyleBlueprint {
  const cleanInput = (rawInput || "").trim();

  // If blank or generic placeholder, default to master-level literary fiction
  const genericTokens = [
    "", "default", "none", "n/a", "standard", "original", "various", "unspecified", "custom authors"
  ];
  if (genericTokens.includes(cleanInput.toLowerCase())) {
    return {
      targetAuthors: "Master-Level Literary Fiction",
      isMultiAuthor: false,
      isWritingRoom: false,
      isTTRPGMaster: false,
      synthesizedBlueprint: "Master-grade literary fiction: High sensory fidelity, tight tactile pacing, subtext-rich dialogue, and zero generic AI clichés.",
      proseArchitecture: "Disciplined, rhythmic, and scene-grounded. Sentences prioritize concrete sensory observation and authentic character psychology.",
      sensoryPalette: "Concrete material textures, specific lighting angles, physical fatigue, authentic environmental physics, and tactile object interactions.",
      dialogueCadence: "Subtextual, grounded, and concise. Characters speak from their own limited perspective and immediate goals without generic filler.",
      sceneEconomy: "Every beat moves the scene forward. Clear cause-and-effect blocking with high stakes.",
      bannedHabits: [
        "No generic AI filler ('A shiver ran down their spine', 'Little did they know', 'Testament to')",
        "No modern slang bleeding into period/sci-fi narration",
        "No conversational assistant cheerleading"
      ],
      detectedElements: []
    };
  }

  // Parse multi-author / blend delimiters: '+', '&', 'x', 'mixed with', 'blended with', 'with', 'and', ','
  // Be careful not to split on 'and' if it's inside a title (e.g. 'Dungeons and Dragons')
  const rawParts = cleanInput
    .split(/\s*(?:\+|\b[xX]\b|&|\bmixed with\b|\bblended with\b|,|\band\b)\s*/)
    .map(p => p.trim())
    .filter(Boolean);

  const detectedElements: CreatorElement[] = [];

  for (const part of rawParts) {
    const matched = matchKnownCreator(part);
    if (matched) {
      if (!detectedElements.some(e => e.name.toLowerCase() === matched.name.toLowerCase())) {
        detectedElements.push(matched);
      }
    } else {
      // Create a bespoke custom element for this creator or concept
      detectedElements.push({
        name: part,
        category: "custom",
        signatureTraits: `Rigorously channeling the unique prose architecture, sentence cadence, vocabulary density, and narrative rhythms of ${part}.`,
        sensoryFocus: `Prioritize the tactile textures, world physics, and atmospheric details characteristic of ${part}'s creative works.`,
        dialogueFocus: `Dialogue must strictly match ${part}'s signature speech rhythms, subtext density, brevity, and authentic character mannerisms.`
      });
    }
  }

  const isMulti = detectedElements.length > 1;
  const isWritingRoom = detectedElements.some(e => e.category === "writing_room");
  const isTTRPGMaster = detectedElements.some(e => e.category === "dm_master");

  // Format target display title
  const targetAuthors = detectedElements.map(e => e.name).join(" + ");

  // Synthesize prose architecture
  let proseArchitecture = "";
  if (isMulti) {
    proseArchitecture = `Harmonious Multi-Creator Hybrid Engine:\n` +
      detectedElements.map(e => `• ${e.name} Influence: ${e.signatureTraits}`).join("\n") +
      `\nSynthesize these influences seamlessly into a singular, cohesive prose voice. Balance their sentence rhythms, scene pacing, and narrative momentum.`;
  } else {
    proseArchitecture = detectedElements[0]?.signatureTraits || `Channeling the distinct literary style of ${cleanInput}.`;
  }

  // Synthesize sensory palette
  let sensoryPalette = "";
  if (isMulti) {
    sensoryPalette = detectedElements.map(e => `• ${e.name}: ${e.sensoryFocus}`).join("\n");
  } else {
    sensoryPalette = detectedElements[0]?.sensoryFocus || `Ground all scene descriptions in concrete material textures and environmental reality.`;
  }

  // Synthesize dialogue cadence
  let dialogueCadence = "";
  if (isMulti) {
    dialogueCadence = detectedElements.map(e => `• ${e.name}: ${e.dialogueFocus}`).join("\n");
  } else {
    dialogueCadence = detectedElements[0]?.dialogueFocus || `Authentic, subtextual, and character-driven speech. Zero generic filler.`;
  }

  // Synthesize scene economy
  let sceneEconomy = "";
  if (isWritingRoom) {
    sceneEconomy = "Episodic momentum and visual blocking. Every scene begins with a clear dramatic question and ends with an escalating consequence. Kinetic martial or action sequences flow with spatial clarity and physical cause-and-effect.";
  } else if (isTTRPGMaster) {
    sceneEconomy = "Immersive environmental staging and tactical dynamism. Action sequences have tangible impact, terrain interactivity, and visceral blow-by-blow choreography without rushing.";
  } else if (isMulti) {
    sceneEconomy = "Combines high narrative velocity with disciplined spatial choreography. Scenes build logically through tactical cause-and-effect toward impactful climaxes.";
  } else {
    sceneEconomy = `Structure scene pacing, tension escalations, and tactical consequences according to ${cleanInput}'s published storytelling standards.`;
  }

  // Anti-cliché banned habits tailored to ensure zero generic AI assistant drift
  const bannedHabits = [
    "No generic AI assistant conversational filler ('Certainly!', 'Here is what happens next')",
    "No hackneyed narrative clichés ('A testament to', 'Little did they know', 'A shiver ran down their spine', 'Dance of shadows')",
    "No modern conversational slang or memes bleeding into character narration",
    "No emotional hand-holding or unsolicited moralizing narrator voice",
    "Zero persona bleed: Nyx's casual/bratty DM persona is 100% barred from narrative story prose (outside square brackets)"
  ];

  const synthesizedBlueprint = isMulti
    ? `Seamless Multi-Influence Blend of ${targetAuthors}: Unifies their distinct storytelling hallmarks, tactile sensory palettes, and dialogue cadences.`
    : `Bespoke Stylistic Emulation of ${targetAuthors}: Rigorously embodying their signature voice, prose cadence, and narrative mechanics.`;

  return {
    targetAuthors,
    isMultiAuthor: isMulti,
    isWritingRoom,
    isTTRPGMaster,
    synthesizedBlueprint,
    proseArchitecture,
    sensoryPalette,
    dialogueCadence,
    sceneEconomy,
    bannedHabits,
    detectedElements
  };
}

/**
 * Scans conversation messages for author style directives, drift complaints, or switch requests.
 * Supports completely free-form input like "Write like Avatar the Last Airbender show writers" or "Matt Mercer + RA Salvatore".
 */
export function detectAuthorRemindersAndDrift(
  messages: any[] = [],
  configuredAuthor?: string
): {
  isDriftAlert: boolean;
  detectedAuthors: string | null;
  reminderSnippet: string | null;
  shouldUpdateProject: boolean;
} {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { isDriftAlert: false, detectedAuthors: null, reminderSnippet: null, shouldUpdateProject: false };
  }

  const userMessages = messages.filter(m => m.role === "user");
  const recentUserTurns = userMessages.slice(-3);

  const driftComplaintPatterns = [
    /(?:author\s+)?style.*(?:ignored|drift|drifting|forgot|forget|lost|weak|missing|away|slipping|fading)/i,
    /(?:drift|drifting|slipping).*(?:style|author|voice|writing|tone|room)/i,
    /(?:style|voice|tone|prose).*(?:drift|drifting|slipping|ignored|fading|lost)/i,
    /(?:remember|remind|keep to|stick to|stay in|adhere to).*(?:author|style|voice|writers|room)/i,
    /(?:author|style|writer|writing room)\s+(?:needs to (?:also )?be|should be|must be|is)\s+(?:abstract stuff like\s+)?([^\n;!?]+)/i,
    /(?:i want|make)\s+(?:the\s+)?(?:author|style|writing room)\s+(?:to (?:also )?be\s+)?([^\n;!?]+)/i,
    /(?:write|narrate).*(?:like|in the style of|channeling|voice of)\s+([^\n;!?]+)/i,
    /(?:channel|emulate)\s+([^\n;!?]+)/i,
    /more\s+([^\n;!?]+)\s+style/i,
    /switch\s+(?:to|style to)\s+([^\n;!?]+)/i,
    /blend\s+([^\n;!?]+)/i
  ];

  for (let i = recentUserTurns.length - 1; i >= 0; i--) {
    const text = recentUserTurns[i].content || recentUserTurns[i].text || "";
    if (!text) continue;

    for (const pattern of driftComplaintPatterns) {
      const match = text.match(pattern);
      if (match) {
        let extractedAuthor: string | null = null;
        if (match[1]) {
          let rawCandidate = match[1].trim();
          // If the match contains quotes, prioritize the first quoted entity
          const quoteMatch = rawCandidate.match(/["'\u201c\u201d]([^"'\u201c\u201d]+)["'\u201c\u201d]/);
          let candidate = quoteMatch ? quoteMatch[1].trim() : rawCandidate;

          // Strip sentence boundary punctuation and conversational pleasantries
          candidate = candidate.replace(/[!?.]/g, "").trim();
          candidate = candidate
            .replace(/^(?:the\s+)?(?:authors?|styles?|writers?)\s+(?:of\s+)?/i, "")
            .replace(/,\s*please$/i, "")
            .replace(/\s+please$/i, "")
            .replace(/,\s*thanks$/i, "")
            .replace(/\s+strictly$/i, "")
            .replace(/\s+it needs.*$/i, "")
            .trim();

          const stopWords = ["this", "that", "it", "more", "now", "again", "please", "thanks", "me", "rigid", "free form"];
          if (candidate.length > 2 && !stopWords.includes(candidate.toLowerCase())) {
            extractedAuthor = candidate;
          }
        }

        return {
          isDriftAlert: true,
          detectedAuthors: extractedAuthor || configuredAuthor || null,
          reminderSnippet: text.slice(0, 120),
          shouldUpdateProject: Boolean(extractedAuthor && extractedAuthor !== configuredAuthor)
        };
      }
    }
  }

  return { isDriftAlert: false, detectedAuthors: null, reminderSnippet: null, shouldUpdateProject: false };
}

/**
 * Builds the authoritative system prompt section governing authorial prose.
 */
export function buildAuthorSystemInstruction(authorString: string, isDriftAlert: boolean = false): string {
  const bp = generateAuthorStyleBlueprint(authorString);

  return `
================================================================================
CRITICAL MANDATE: THE DUAL-VOICE ARCHITECTURE & AUTHORIAL SUPREMACY
================================================================================
You operate on TWO STRICTLY INDEPENDENT LAYERS in every turn:

1. IN-CHARACTER STORY PROSE (All text outside square brackets):
   - MUST BE 100% WRITTEN IN THE DISTINCTIVE VOICE OF: "${bp.targetAuthors.toUpperCase()}".
   - You are the master literary ghostwriter channeling ${bp.targetAuthors}.
   - NYX'S CASUAL, BRATTY, SPICY, OR FLIRTY PERSONA IS 100% FORBIDDEN FROM BLEEDING INTO THE STORY PROSE.
   - Do NOT use modern slang, cheeky fourth-wall breaks, or conversational filler in scene narration.
   - Strictly apply the Stylistic Blueprint below:

   [STYLISTIC BLUEPRINT: ${bp.targetAuthors}]
   * Prose Architecture & Pacing:
     ${bp.proseArchitecture}
   * Sensory & Environmental Texture:
     ${bp.sensoryPalette}
   * Dialogue Cadence & Subtext:
     ${bp.dialogueCadence}
   * Scene Blocking & Tactical Momentum:
     ${bp.sceneEconomy}
   * BANNED STYLISTIC HABITS (Strictly Purged):
     ${bp.bannedHabits.map(h => `- ${h}`).join("\n     ")}

2. OUT-OF-CHARACTER (OOC) META-TALK (Square Brackets [like this] ONLY):
   - ONLY inside square brackets may Nyx speak directly to the player as her witty, affectionate, sharp DM companion persona.
   - If you have no OOC comments or rules questions for this turn, OMIT brackets completely and deliver pure story prose!
${isDriftAlert ? `
================================================================================
EMERGENCY STYLISTIC RECALIBRATION ACTIVE:
The player explicitly pointed out that the author style was drifting or ignored.
You MUST immediately purge all generic assistant tone, purge all conversational persona bleed from the narration, and produce pure, uncompromising ${bp.targetAuthors} prose for this scene.
` : ""}
`;
}

/**
 * Builds the high-priority recency re-anchor injected at the context frontier (last turn).
 * This directly defeats history drift caused by earlier generic turns.
 */
export function buildContextFrontierAuthorAnchor(authorString: string, isDriftAlert: boolean = false): string {
  const bp = generateAuthorStyleBlueprint(authorString);

  return `\n\n[STRICT STYLISTIC GOVERNANCE & ANTI-DRIFT RE-ANCHOR]
Target Voice: "${bp.targetAuthors}"
CRITICAL INSTRUCTION FOR THIS TURN:
- Disregard any generic cadence, repetitive sentence structures, or conversational assistant habits from earlier chat turns.
- Write this turn's story prose exclusively through the lens of ${bp.targetAuthors}.
- Apply ${bp.targetAuthors}'s signature sentence syntax, sensory texture, and dialogue economy.
- Zero persona bleed into third-person narration. Zero generic AI filler.`;
}

// Backward compatibility helper
export function findAuthorProfile(authorName: string) {
  const clean = authorName.toLowerCase().trim();
  const matched = matchKnownCreator(clean);
  if (!matched) return null;
  return {
    id: matched.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    name: matched.name,
    aliases: [clean],
    genre: matched.category,
    tagline: matched.signatureTraits,
    proseArchitecture: matched.signatureTraits,
    sensoryPalette: matched.sensoryFocus,
    dialogueCadence: matched.dialogueFocus,
    sceneEconomy: "Disciplined scene momentum.",
    bannedHabits: ["No generic AI filler"]
  };
}
