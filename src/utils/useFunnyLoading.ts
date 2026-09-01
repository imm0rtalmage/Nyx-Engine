import { useState, useEffect, useRef } from "react";

export interface LoadingContext {
  project?: any;
  characters?: any[];
  notes?: any[];
  setting?: string;
  activeSetting?: string;
}

// 1. CYBERPUNK 2077 & NIGHT CITY TRIVIA (Trauma, Cyberpunk RED, Edgerunners, Sci-Fi Dystopia)
export const CYBERPUNK_TRIVIA = [
  "Did you know? Trauma Team International charges up to 500,000 eurodollars a year for Platinum coverage, guaranteeing a heavily armed combat AV extraction within 3 minutes.",
  "Did you know? Mike Pondsmith created the original Cyberpunk TTRPG in 1988, heavily inspired by Ridley Scott's Blade Runner and Walter Jon Williams' Hardwired.",
  "Did you know? Night City was originally founded as 'Coronado City' by visionary industrialist Richard Night before his mysterious assassination in 1998.",
  "Did you know? In Cyberpunk lore, Johnny Silverhand lost his original arm in the Second Central American War before installing his trademark chrome cybernetic prosthesis.",
  "Did you know? The Old Net was destroyed in 2022 during the Fourth Corporate War when legendary Netrunner Rache Bartmoss unleashed the DataKrash virus.",
  "Did you know? Keanu Reeves loved playing Johnny Silverhand so much that he asked CD Projekt Red to double his recorded voice and motion-capture dialogue.",
  "Did you know? The Blackwall is an impenetrable ICE barrier erected by NetWatch, maintained by self-evolving rogue AIs to seal off the deadly wild AIs beyond.",
  "Did you know? Trauma Team aerodynes (AV-4s) feature twin computerized rotary autocannons to suppress hostile hostiles while medics stabilize wounded clients.",
  "Did you know? The iconic drink 'The Johnny Silverhand' at the Afterlife is tequila on the rocks, a splash of chili beer, and a rim of crushed chili peppers.",
  "Did you know? Sandevistan operating systems flood the nervous system with neural accelerators, allowing netrunners and solos to perceive bullets in slow motion.",
  "Did you know? Pacifica in Night City was originally slated to be an ultra-luxury tourist resort before corporate backers pulled all funding during the Unification War.",
  "Did you know? Cyberpsychosis is triggered when an accumulation of heavy cyberware, physical trauma, and social alienation degrades a person's baseline human empathy.",
  "Did you know? Arasaka's 'Relic 2.0' biochip was engineered by Anders Hellman using Soulkiller subroutines to house digitized human engrams.",
  "Did you know? Judy Alvarez's Mox-themed tattoos include the lyric 'There was nothing to be afraid of, and nothing to doubt' from the Red Hot Chili Peppers.",
  "Did you know? Legendary solo Morgan Blackhand was Mike Pondsmith's own player character during original tabletop playtests in the late 1980s.",
  "Did you know? Braindances (BDs) record raw human neural impulses and emotions directly from the cortex for playback, invented by Yuri Dimitrov in 2007.",
  "Did you know? The Valentinos gang in Heywood is one of Night City's largest booster gangs, deeply rooted in Santa Muerte devotion and neighborhood honor codes.",
  "Did you know? MaxTac (Maximum Force Tactical Division), known colloquially as the 'Psycho Squad', recruits rehabilitated cyberpsychos into their elite breach teams.",
  "Did you know? Kang Tao revolutionized the 2070s weapons market by pioneering smart-link firearms with gyrojet micro-missile tracking ammunition.",
  "Did you know? CD Projekt Red consulted directly with Mike Pondsmith on every district, corporation, and slang term to keep Cyberpunk 2077 100% lore-accurate."
];

// 2. FORGOTTEN REALMS & HIGH FANTASY TRIVIA (Shima, Faerûn, Toril, Dungeons & Dragons)
export const FORGOTTEN_REALMS_TRIVIA = [
  "Did you know? Ed Greenwood created the Forgotten Realms in 1967 as a childhood fantasy world decades before TSR published it for D&D in 1987.",
  "Did you know? Elminster Aumar, the Sage of Shadowdale, has lived for over a millennium and was chosen directly by Mystra as the First Chosen of Magic.",
  "Did you know? Waterdeep, the City of Splendors, is secretly ruled by the Masked Lords whose identities are shielded by enchanted helms and illusion cloaks.",
  "Did you know? Drizzt Do'Urden was originally conceived as a last-minute traveling sidekick for barbarian Wulfgar before author R.A. Salvatore made him the star.",
  "Did you know? Floating Netherese cities plummeted from the sky in -339 DR during Karsus's Folly, when the archwizard briefly usurped the godhood of Mystryl.",
  "Did you know? Candlekeep houses the greatest lore repository in Faerûn, requiring every applicant to present a unique, uncatalogued tome of immense value for entry.",
  "Did you know? Mind Flayers (Illithids) communicate via psionic resonance and reproduce by implanting tadpoles into humanoid hosts through ceremorphosis.",
  "Did you know? The Underdark spans thousands of subterranean miles beneath Toril, illuminated by bioluminescent fungi such as Barrelstalk and Fire Lichen.",
  "Did you know? A Beholder's central anti-magic eye suppresses all spells within a 150-foot cone, forcing parties to rely purely on steel and cunning.",
  "Did you know? Neverwinter earned its name because the Neverwinter River is continuously heated by sleeping fire elementals deep beneath Mount Hotenow.",
  "Did you know? Minsc the ranger wholeheartedly believes his miniature giant space hamster, Boo, whispers brilliant tactical battle commands into his ear.",
  "Did you know? The Harpers are a legendary clandestine fellowship of bards and mages founded in ancient Myth Drannor to defend Faerûn against tyranny.",
  "Did you know? Baldur's Gate takes its name from the legendary seafaring captain Balduran, who founded the initial harbor walls with his plundered treasure.",
  "Did you know? The Weave is the cosmic fabric woven by the goddess Mystra through which mortals safely harness the raw, volatile power of magic.",
  "Did you know? Red Wizards of Thay are infamous for their shaved tattooed craniums and their tyrannical rule over an empire fueled by necromancy.",
  "Did you know? The Sword Coast gets its moniker from the rugged coastal cliffs and treacherous jagged waters stretching from Waterdeep to the Cloudpeaks.",
  "Did you know? Dragonborn of Abeir-Toril were originally enslaved by chromatic dragons for centuries before the Spellplague merged their worlds.",
  "Did you know? In D&D lore, a Bag of Holding placed inside a Portable Hole ruptures the fabric of space, opening a one-way gate to the Astral Plane.",
  "Did you know? The city of Skullport lies directly beneath Waterdeep, functioning as a subterranean smuggler haven connected to the sprawling Undermountain dungeon.",
  "Did you know? Volothamp Geddarm ('Volo') is notorious across Faerûn for exaggerating his monster encounters in best-selling travel guides."
];

// 3. TEEN TITANS & DC UNIVERSE TRIVIA (Specter, Jump City, Titans Tower, Superheroes)
export const TEEN_TITANS_TRIVIA = [
  "Did you know? Marv Wolfman and George Pérez created Raven, Starfire, Cyborg, and Slade Wilson during their legendary 1980 'New Teen Titans' comic run.",
  "Did you know? Titans Tower in Jump City is shaped like a giant letter 'T' and was designed and financed by Cyborg (Victor Stone) and his scientist father Silas.",
  "Did you know? Raven's signature incantation 'Azarath Metrion Zinthos' channels the pacifist spiritual energy of her otherworldly sanctuary dimension, Azarath.",
  "Did you know? Starfire (Princess Koriand'r of Tamaran) can learn any spoken language instantaneously through physical lip or skin contact.",
  "Did you know? Beast Boy's real name is Garfield Logan; his green pigmentation and shapeshifting stem from an experimental cure for the fatal Sakutia virus.",
  "Did you know? Slade (Deathstroke the Terminator) possesses enhanced 90% brain capacity, superhuman agility, and accelerated cellular regeneration from military experiments.",
  "Did you know? In the classic 2003 Teen Titans animated series, Robin is never called 'Dick Grayson' aloud, though subtle flashbacks showcase his circus acrobat origins.",
  "Did you know? Cyborg was a star high school decathlete before an accident destroyed much of his body, leading to cybernetic reconstructions made of Promethium alloy.",
  "Did you know? Red X was originally an undercover alias forged by Robin to infiltrate Slade's inner circle before a mysterious rogue thief hijacked the suit.",
  "Did you know? Terra's geokinetic powers give her complete mastery over earth, continental crust, and volcanic magma without physical fatigue.",
  "Did you know? Silkie, Starfire's beloved pet larva, was originally engineered by Killer Moth as a mutant biological devourer before Starfire adopted him.",
  "Did you know? The energetic Teen Titans animated theme song was written and recorded in both English and Japanese by J-Pop duo Puffy AmiYumi.",
  "Did you know? Trigon the Terrible is an interdimensional demon lord who destroyed millions of worlds before attempting to use his daughter Raven as an Earth portal.",
  "Did you know? Brother Blood is the charismatic cult headmaster of the H.I.V. Academy, combining hypnotic mind control with dark techno-mystic rituals.",
  "Did you know? In DC continuity, Jump City is located along the California coast, providing the Titans their own bustling metropolis separate from Gotham and Metropolis.",
  "Did you know? Beast Boy's favorite fast-food spot in Jump City is 'Mega Meaty Meat', where he religiously orders strictly tofu and veggie burgers.",
  "Did you know? Robin carries customized birdarangs, smoke pellets, grapple claws, and flashbangs in his utility belt, engineered specifically for urban acrobatics.",
  "Did you know? Starfire's ultraviolet starbolts and flight powers are powered directly by solar radiation converted through her Tamaranian biology.",
  "Did you know? The Doom Patrol took in Beast Boy after his parents' death, making them his adoptive superhero family before he joined the Teen Titans.",
  "Did you know? Control Freak, the Titans' fourth-wall-breaking pop-culture villain, fights exclusively using high-tech television remotes and film tropes."
];

// 4. STAR WARS & SPACE OPERA TRIVIA (Korriban, Vance, Jedi, Sith, Galaxies Far Far Away)
export const STAR_WARS_TRIVIA = [
  "Did you know? Luke Skywalker's surname was originally written as Luke Starkiller in George Lucas's early 1974 screenplay drafts.",
  "Did you know? Yoda's biological species and home planet have intentionally never been named in any Star Wars canon or Expanded Universe material.",
  "Did you know? Samuel L. Jackson specifically requested a purple lightsaber for Mace Windu so he could easily spot his character during large battlefield scenes.",
  "Did you know? Chewbacca's iconic vocalizations were created by legendary sound designer Ben Burtt mixing sounds of bears, walruses, lions, and sick badgers.",
  "Did you know? The lightsaber hum sound effect was created by blending the idle hum of a film projector motor with cathode television tube feedback.",
  "Did you know? Korriban (also known as Moraband) is the ancient birthplace of the Sith order and houses the Valley of the Dark Lords.",
  "Did you know? The phrase 'I have a bad feeling about this' is spoken in every single main episodic Star Wars film.",
  "Did you know? George Lucas based Chewbacca's personality and appearance on his beloved Alaskan Malamute dog named Indiana.",
  "Did you know? Ewan McGregor and Hayden Christensen rehearsed their Episode III Mustafar duel at such blistering speed that the footage was not sped up at all.",
  "Did you know? Christopher Lee performed his own lightsaber fencing stunts as Count Dooku in Episode II: Attack of the Clones at age 79.",
  "Did you know? The Millennium Falcon's hull geometry was inspired by a half-eaten hamburger resting beside an olive on a toothpick.",
  "Did you know? The seismic charge explosion sound in Attack of the Clones features 1.5 seconds of dead silence before the bass detonates.",
  "Did you know? Han Solo's famous reply 'I know' to Princess Leia's 'I love you' was completely improvised on set by Harrison Ford.",
  "Did you know? David Prowse wore the physical Darth Vader suit on set, while James Earl Jones recorded the legendary voice in just two and a half hours.",
  "Did you know? Anthony Daniels (C-3PO) is the only actor to appear in all nine episodic Star Wars saga films."
];

// 5. MARVEL & MCU TRIVIA
export const MARVEL_TRIVIA = [
  "Did you know? Stan Lee and Jack Kirby co-created Iron Man, Thor, Hulk, the X-Men, and the Fantastic Four in the early 1960s Silver Age of Comics.",
  "Did you know? Vibranium in Wakanda was deposited by a colossal meteorite ten thousand years ago, mutating local flora into the mystical Heart-Shaped Herb.",
  "Did you know? In Marvel Comics lore, Wolverine was introduced in The Incredible Hulk #181 (1974) as an operative of the Canadian Department H.",
  "Did you know? The Infinity Stones (originally called the Soul Gems) are remnants of six singularities that predated the Big Bang.",
  "Did you know? Doctor Strange's Sanctum Sanctorum is located at 177A Bleecker Street in Greenwich Village, New York City, built upon focal points of mystic ley lines."
];

// 6. CALL OF CTHULHU & COSMIC HORROR TRIVIA
export const CALL_OF_CTHULHU_TRIVIA = [
  "Did you know? Sandy Petersen designed the Call of Cthulhu TTRPG in 1981 for Chaosium, pioneering the iconic 'Sanity' (SAN) psychological damage mechanic.",
  "Did you know? In H.P. Lovecraft's mythos, Great Cthulhu sleeps dreaming in the sunken corpse-city of R'lyeh beneath non-Euclidean geometry.",
  "Did you know? Miskatonic University is situated in fictional Arkham, Massachusetts, and houses one of the few restricted copies of Abdul Alhazred's Necronomicon.",
  "Did you know? Nyarlathotep is unique among Outer Gods for actively walking among humans in thousands of avatars to sow deception, chaos, and madness.",
  "Did you know? The King in Yellow (Hastur) drives readers irreversibly insane once they read the cursed stage play's fateful Second Act."
];

// 7. LORD OF THE RINGS & MIDDLE-EARTH TRIVIA
export const LORD_OF_THE_RINGS_TRIVIA = [
  "Did you know? J.R.R. Tolkien originally created the entire history and peoples of Middle-earth primarily as a linguistic sandbox for his invented Elvish languages.",
  "Did you know? The One Ring was forged by Sauron in the fires of Mount Doom during the Second Age (circa 1600 SA) using a large portion of his own celestial fëa (soul).",
  "Did you know? Mithril is a lightweight, indestructible silvery metal mined exclusively in the deep dwarven veins of Khazad-dûm (Moria).",
  "Did you know? Gandalf and Saruman are not mortal men, but Maiar—angelic spirits sent to Middle-earth in the guise of old wizards by the Valar.",
  "Did you know? The Palantíri (Seeing Stones) were crafted by Fëanor in Valinor during the First Age to communicate across immense continental distances."
];

// 8. DUNE & ARRAKIS TRIVIA
export const DUNE_TRIVIA = [
  "Did you know? Frank Herbert was inspired to write Dune in 1959 while researching the U.S. Department of Agriculture's sand dune stabilization project in Oregon.",
  "Did you know? Spice Melange is produced exclusively on Arrakis by the larval sandtrout and provides extended lifespan, heightened awareness, and interstellar foldspace navigation.",
  "Did you know? Bene Gesserit sisters undergo the Spice Agony by transmuting the poisonous Water of Life, unlocking maternal ancestral genetic memories.",
  "Did you know? Giant Sandworms (Shai-Hulud) on Arrakis can grow up to 450 meters in length and are venerated as physical manifestations of the desert.",
  "Did you know? The Holtzman Effect powers defensive shields and interstellar suspension engines, but interacting with a lasgun beam causes a nuclear sub-atomic explosion."
];

// 9. VAMPIRE: THE MASQUERADE & WORLD OF DARKNESS TRIVIA
export const VAMPIRE_TRIVIA = [
  "Did you know? Mark Rein-Hagen created Vampire: The Masquerade in 1991, establishing White Wolf's gothic-punk Storyteller System.",
  "Did you know? The First Tradition of the Camarilla, 'The Masquerade', strictly forbids Kindred from revealing their supernatural existence to mortal kine.",
  "Did you know? Caine, the biblical first murderer, is considered the mythical Dark Father and First Vampire in vampire lore (The Book of Nod).",
  "Did you know? Blood Potency and Generation dictate a vampire's distance from Caine, with Antediluvians (3rd Generation) possessing god-like powers.",
  "Did you know? The Beast is the primal, ravenous instinct lurking inside every Kindred, threatening Frenzy when hunger, anger, or terror take over."
];

// 10. WARHAMMER 40,000 TRIVIA
export const WARHAMMER_TRIVIA = [
  "Did you know? The Golden Throne on Holy Terra consumes the souls of one thousand psykers every day to sustain the Emperor's Astronomican warp beacon.",
  "Did you know? Space Marines receive 19 implanted gene-seed organs, including a secondary heart, multi-lung, and the Larraman organ for instant wound clotting.",
  "Did you know? The Warp is a parallel psychic dimension of pure emotion; ships without an active Gellar Field are torn apart by Chaos Daemons.",
  "Did you know? Orks produce a collective psychic field—if enough Orks believe a red vehicle travels faster, physics alters and it literally goes faster.",
  "Did you know? The Horus Heresy began in the 31st Millennium when Warmaster Horus fell to the Ruinous Powers of Chaos on the moon of Davin."
];

// 11. FALLOUT & POST-APOCALYPTIC TRIVIA
export const FALLOUT_TRIVIA = [
  "Did you know? Vault-Tec constructed almost all 122 Vaults not for public preservation, but as controlled sociological and psychological experiments.",
  "Did you know? The iconic Vault Boy giving a thumbs-up is a reference to measuring mushroom clouds against your thumb to gauge safe blast radius.",
  "Did you know? Nuka-Cola Quantum gets its glowing blue radiance from the radioactive isotope Strontium-90 included in its formula.",
  "Did you know? The Brotherhood of Steel was founded by Captain Roger Maxson at Mariposa Military Base immediately following the Great War of 2077.",
  "Did you know? Power Armor frames were engineered by West-Tek in 2067 to break the mechanized infantry stalemate during the Battle of Anchorage."
];

// 12. STAR TREK & SCI-FI FEDERATION TRIVIA
export const STAR_TREK_TRIVIA = [
  "Did you know? Gene Roddenberry created Star Trek in 1966 as a 'Wagon Train to the Stars', envisioning an optimistic, post-scarcity future for humanity.",
  "Did you know? The transporter effect was created using Alka-Seltzer dissolved in water, backlit against a black screen and double-exposed.",
  "Did you know? The Vulcan salute was introduced by Leonard Nimoy, based on a traditional Jewish priestly blessing he remembered from his childhood.",
  "Did you know? Warp Drive utilizes a matter/antimatter reactor controlled by dilithium crystals to bend spacetime rather than moving faster than light through space.",
  "Did you know? The Borg Collective operates with a singular shared consciousness, assimilating technology and biological distinctiveness into their hive mind."
];

// 13. GENERAL TTRPG & CLASSIC STORYTELLER WISDOM (Universal Fallback)
export const GENERAL_TTRPG_TRIVIA = [
  "Did you know? Gary Gygax and Dave Arneson published the original Dungeons & Dragons in 1974, evolving it from the medieval wargame Chainmail.",
  "Did you know? The d20 icosahedral die design dates back over 2,000 years to Ptolemaic Egypt and the Roman Empire.",
  "Did you know? In TTRPG game design, the 'Rule of Cool' encourages Game Masters to reward player creativity even if it bends strict mechanics.",
  "Did you know? Critical Hits (rolling a natural 20) were popularized in early tabletop zines and first officially codified in the 1979 Dungeon Master's Guide.",
  "Did you know? The concept of 'Alignment' in RPGs originally had only three axes: Law, Chaos, and Neutrality, inspired by author Michael Moorcock."
];

export const FUNNY_SYSTEM_PHRASES = [
  "Reticulating narrative splines...",
  "Calibrating dramatic tension...",
  "Consulting the Storyteller lore archives...",
  "Polishing character sheets & faction files...",
  "Bribing the digital dice roller...",
  "Untangling branching plotlines...",
  "Sharpening plot armor & world rules...",
  "Buffering dramatic scene pauses...",
  "Weaving fate threads in real time...",
  "Charging campaign mana registers...",
  "Calculating scene atmospheric lighting...",
  "Synthesizing NPC dialogue nuances..."
];

/**
 * Extracts dynamic lore cards directly from custom text written in the "Active Setting" field.
 */
export function extractDynamicSettingFacts(settingText: string, context?: LoadingContext): string[] {
  if (!settingText || !settingText.trim()) return [];

  const rawClean = settingText.trim();
  const facts: string[] = [];

  // 1. Headline summary card
  facts.push(`Active Setting Anchor: Grounding world physics and campaign boundaries for "${rawClean.length > 50 ? rawClean.slice(0, 47) + "..." : rawClean}"`);

  // 2. Break down multiple sentences or semicolon-separated clauses
  const clauses = rawClean
    .split(/[\n.;•\-]+/)
    .map(s => s.trim())
    .filter(s => s.length > 8);

  clauses.slice(0, 5).forEach((clause) => {
    facts.push(`Active Setting Rule: Extracted from campaign parameters — "${clause}"`);
  });

  // 3. Dynamic character or faction ties if available
  const chars = context?.characters || [];
  if (chars.length > 0) {
    chars.slice(0, 3).forEach((c: any) => {
      if (c.name && c.name.trim()) {
        facts.push(`Active Setting Dossier: Linking ${c.name} (${c.role || "Protagonist"}) into the active world setting...`);
      }
    });
  }

  return facts;
}

/**
 * Detect the campaign setting dynamically, prioritizing the "Active Setting" field.
 */
export function detectCampaignSetting(context?: LoadingContext): { key: string; settingTitle: string; isCustom: boolean } {
  const project = context?.project;
  const chars = context?.characters || [];
  const notes = context?.notes || [];

  // Primary Anchor: Active Setting string from context or project
  const activeSettingRaw = (
    context?.activeSetting ||
    context?.setting ||
    project?.setting ||
    project?.customSetting ||
    ""
  ).trim();

  // Secondary text to scan for fallback context
  const fullTextToScan = [
    activeSettingRaw,
    project?.name || "",
    project?.styleGuide || "",
    project?.plotOverview || "",
    project?.description || "",
    project?.system || "",
    ...(chars.map((c: any) => `${c.name || ""} ${c.role || ""} ${c.factionName || ""} ${c.description || ""}`)),
    ...(notes.map((n: any) => `${n.title || ""} ${n.content || ""}`))
  ].join(" ").toLowerCase();

  const activeLower = activeSettingRaw.toLowerCase();

  // 1. Cyberpunk 2077 / Night City / Trauma Team
  if (
    activeLower.includes("cyberpunk") ||
    activeLower.includes("2077") ||
    activeLower.includes("night city") ||
    activeLower.includes("trauma") ||
    activeLower.includes("edgerunner") ||
    activeLower.includes("arasaka") ||
    activeLower.includes("militech") ||
    fullTextToScan.includes("cyberpunk 2077") ||
    fullTextToScan.includes("trauma team") ||
    (fullTextToScan.includes("trauma") && fullTextToScan.includes("night city"))
  ) {
    return { key: "cyberpunk", settingTitle: activeSettingRaw || "Cyberpunk 2077 / Night City", isCustom: false };
  }

  // 2. Forgotten Realms / Faerûn / Shima / D&D
  if (
    activeLower.includes("forgotten realms") ||
    activeLower.includes("faerun") ||
    activeLower.includes("faerûn") ||
    activeLower.includes("toril") ||
    activeLower.includes("waterdeep") ||
    activeLower.includes("baldur") ||
    activeLower.includes("sword coast") ||
    activeLower.includes("shima") ||
    activeLower.includes("d&d") ||
    activeLower.includes("dnd") ||
    fullTextToScan.includes("forgotten realms") ||
    (fullTextToScan.includes("shima") && (fullTextToScan.includes("realms") || fullTextToScan.includes("faerun") || fullTextToScan.includes("d&d")))
  ) {
    return { key: "forgottenrealms", settingTitle: activeSettingRaw || "Forgotten Realms / Faerûn", isCustom: false };
  }

  // 3. Teen Titans / DC Comics / Specter / Jump City
  if (
    activeLower.includes("teen titans") ||
    activeLower.includes("titans tower") ||
    activeLower.includes("jump city") ||
    activeLower.includes("specter") ||
    activeLower.includes("dc comics") ||
    activeLower.includes("deathstroke") ||
    activeLower.includes("slade") ||
    activeLower.includes("starfire") ||
    activeLower.includes("azarath") ||
    fullTextToScan.includes("teen titans") ||
    (fullTextToScan.includes("specter") && (fullTextToScan.includes("titans") || fullTextToScan.includes("jump city")))
  ) {
    return { key: "teentitans", settingTitle: activeSettingRaw || "Teen Titans / Jump City", isCustom: false };
  }

  // 4. Star Wars / Galactic Lore / Jedi / Sith
  if (
    activeLower.includes("star wars") ||
    activeLower.includes("jedi") ||
    activeLower.includes("sith") ||
    activeLower.includes("lightsaber") ||
    activeLower.includes("mandalorian") ||
    activeLower.includes("korriban") ||
    activeLower.includes("tatooine") ||
    activeLower.includes("coruscant") ||
    fullTextToScan.includes("star wars")
  ) {
    return { key: "starwars", settingTitle: activeSettingRaw || "Star Wars / Galactic Lore", isCustom: false };
  }

  // 5. Marvel / MCU / Avengers / X-Men
  if (
    activeLower.includes("marvel") ||
    activeLower.includes("mcu") ||
    activeLower.includes("avengers") ||
    activeLower.includes("x-men") ||
    activeLower.includes("wakanda") ||
    activeLower.includes("stark industries") ||
    fullTextToScan.includes("marvel") ||
    fullTextToScan.includes("mcu")
  ) {
    return { key: "marvel", settingTitle: activeSettingRaw || "Marvel Universe / MCU", isCustom: false };
  }

  // 6. Call of Cthulhu / Lovecraftian / Arkham
  if (
    activeLower.includes("cthulhu") ||
    activeLower.includes("lovecraft") ||
    activeLower.includes("arkham") ||
    activeLower.includes("miskatonic") ||
    activeLower.includes("necronomicon") ||
    fullTextToScan.includes("call of cthulhu") ||
    fullTextToScan.includes("lovecraftian")
  ) {
    return { key: "cthulhu", settingTitle: activeSettingRaw || "Call of Cthulhu / Arkham", isCustom: false };
  }

  // 7. Lord of the Rings / Middle-Earth
  if (
    activeLower.includes("lord of the rings") ||
    activeLower.includes("middle-earth") ||
    activeLower.includes("middle earth") ||
    activeLower.includes("tolkien") ||
    activeLower.includes("mordor") ||
    activeLower.includes("gondor") ||
    activeLower.includes("rivendell") ||
    fullTextToScan.includes("lord of the rings") ||
    fullTextToScan.includes("middle-earth")
  ) {
    return { key: "lotr", settingTitle: activeSettingRaw || "Lord of the Rings / Middle-Earth", isCustom: false };
  }

  // 8. Dune / Arrakis / Spice
  if (
    activeLower.includes("dune") ||
    activeLower.includes("arrakis") ||
    activeLower.includes("fremen") ||
    activeLower.includes("shai-hulud") ||
    activeLower.includes("melange") ||
    fullTextToScan.includes("arrakis") ||
    fullTextToScan.includes("dune")
  ) {
    return { key: "dune", settingTitle: activeSettingRaw || "Dune / Arrakis", isCustom: false };
  }

  // 9. Vampire: The Masquerade / World of Darkness
  if (
    activeLower.includes("vampire: the masquerade") ||
    activeLower.includes("world of darkness") ||
    activeLower.includes("camarilla") ||
    activeLower.includes("kindred") ||
    activeLower.includes("vtm") ||
    fullTextToScan.includes("vampire: the masquerade") ||
    fullTextToScan.includes("world of darkness")
  ) {
    return { key: "vampire", settingTitle: activeSettingRaw || "Vampire: The Masquerade / WoD", isCustom: false };
  }

  // 10. Warhammer 40,000
  if (
    activeLower.includes("warhammer") ||
    activeLower.includes("40k") ||
    activeLower.includes("40,000") ||
    activeLower.includes("astartes") ||
    activeLower.includes("space marine") ||
    fullTextToScan.includes("warhammer 40k") ||
    fullTextToScan.includes("warhammer 40,000")
  ) {
    return { key: "warhammer", settingTitle: activeSettingRaw || "Warhammer 40,000", isCustom: false };
  }

  // 11. Fallout / Wasteland
  if (
    activeLower.includes("fallout") ||
    activeLower.includes("wasteland") ||
    activeLower.includes("vault-tec") ||
    activeLower.includes("pip-boy") ||
    fullTextToScan.includes("fallout")
  ) {
    return { key: "fallout", settingTitle: activeSettingRaw || "Fallout / Wasteland", isCustom: false };
  }

  // 12. Star Trek / Federation
  if (
    activeLower.includes("star trek") ||
    activeLower.includes("starfleet") ||
    activeLower.includes("klingon") ||
    activeLower.includes("uss enterprise") ||
    fullTextToScan.includes("star trek")
  ) {
    return { key: "startrek", settingTitle: activeSettingRaw || "Star Trek / Starfleet", isCustom: false };
  }

  // If user provided a specific custom setting text in "Active Setting"
  if (activeSettingRaw.length > 0) {
    return { key: "custom", settingTitle: activeSettingRaw, isCustom: true };
  }

  return { key: "general", settingTitle: project?.name || "Storyteller Archives", isCustom: false };
}

/**
 * Get setting-specific trivia facts array dynamically based on the "Active Setting" field.
 */
export function getSettingTriviaPool(context?: LoadingContext): { settingName: string; trivia: string[] } {
  const { key, settingTitle, isCustom } = detectCampaignSetting(context);
  const activeSettingRaw = (context?.activeSetting || context?.setting || context?.project?.setting || "").trim();
  const dynamicCustomFacts = extractDynamicSettingFacts(activeSettingRaw, context);

  switch (key) {
    case "cyberpunk":
      return {
        settingName: settingTitle,
        trivia: [...CYBERPUNK_TRIVIA, ...dynamicCustomFacts]
      };
    case "forgottenrealms":
      return {
        settingName: settingTitle,
        trivia: [...FORGOTTEN_REALMS_TRIVIA, ...dynamicCustomFacts]
      };
    case "teentitans":
      return {
        settingName: settingTitle,
        trivia: [...TEEN_TITANS_TRIVIA, ...dynamicCustomFacts]
      };
    case "starwars":
      return {
        settingName: settingTitle,
        trivia: [...STAR_WARS_TRIVIA, ...dynamicCustomFacts]
      };
    case "marvel":
      return {
        settingName: settingTitle,
        trivia: [...MARVEL_TRIVIA, ...dynamicCustomFacts]
      };
    case "cthulhu":
      return {
        settingName: settingTitle,
        trivia: [...CALL_OF_CTHULHU_TRIVIA, ...dynamicCustomFacts]
      };
    case "lotr":
      return {
        settingName: settingTitle,
        trivia: [...LORD_OF_THE_RINGS_TRIVIA, ...dynamicCustomFacts]
      };
    case "dune":
      return {
        settingName: settingTitle,
        trivia: [...DUNE_TRIVIA, ...dynamicCustomFacts]
      };
    case "vampire":
      return {
        settingName: settingTitle,
        trivia: [...VAMPIRE_TRIVIA, ...dynamicCustomFacts]
      };
    case "warhammer":
      return {
        settingName: settingTitle,
        trivia: [...WARHAMMER_TRIVIA, ...dynamicCustomFacts]
      };
    case "fallout":
      return {
        settingName: settingTitle,
        trivia: [...FALLOUT_TRIVIA, ...dynamicCustomFacts]
      };
    case "startrek":
      return {
        settingName: settingTitle,
        trivia: [...STAR_TREK_TRIVIA, ...dynamicCustomFacts]
      };
    case "custom":
      return {
        settingName: settingTitle,
        trivia: [
          ...dynamicCustomFacts,
          ...GENERAL_TTRPG_TRIVIA,
          ...FUNNY_SYSTEM_PHRASES
        ]
      };
    default:
      return {
        settingName: settingTitle,
        trivia: [
          ...dynamicCustomFacts,
          ...GENERAL_TTRPG_TRIVIA,
          ...FUNNY_SYSTEM_PHRASES
        ]
      };
  }
}

/**
 * Custom React hook that rotates through setting-appropriate lore facts and trivia dynamically.
 */
export function useFunnyLoading(
  isActive: boolean,
  defaultText: string,
  intervalMs = 7500,
  context?: LoadingContext
) {
  const [currentText, setCurrentText] = useState(defaultText);
  const contextRef = useRef(context);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (!isActive) {
      setCurrentText(defaultText);
      return;
    }

    // Determine setting-appropriate pool dynamically from the active setting
    const { trivia } = getSettingTriviaPool(contextRef.current);

    // Shuffle pool
    const finalShuffled = [...trivia].sort(() => Math.random() - 0.5);

    // Pick random start
    let index = Math.floor(Math.random() * (finalShuffled.length || 1));
    setCurrentText(finalShuffled[index] || defaultText);

    const interval = setInterval(() => {
      index = (index + 1) % (finalShuffled.length || 1);
      setCurrentText(finalShuffled[index] || defaultText);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    isActive,
    defaultText,
    intervalMs,
    context?.setting,
    context?.activeSetting,
    context?.project?.id,
    context?.project?.setting,
    context?.project?.name
  ]);

  return currentText;
}
