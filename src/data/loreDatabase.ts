export interface LoreFact {
  id: string;
  category: string;
  universe: string;
  fact: string;
  tags: string[];
  sourceUrl?: string;
  sourceTitle?: string;
  isCustom?: boolean;
  isEdited?: boolean;
  createdDate?: string;
}

export interface LoreCategoryInfo {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  isCustom?: boolean;
}

export const LORE_CATEGORIES: LoreCategoryInfo[] = [
  { id: "all", name: "All Universes", description: "The entire comprehensive codex of fictional lore and worldbuilding secrets.", iconName: "Globe", color: "purple" },
  { id: "cyberpunk", name: "Cyberpunk & Night City", description: "Pondsmith canon, Trauma Team, NetWatch, chrome, and Corporate Wars.", iconName: "Cpu", color: "amber" },
  { id: "forgottenrealms", name: "Forgotten Realms & D&D", description: "Faerûn, Netheril, Elminster, Drizzt, Underdark, and Mystra's Weave.", iconName: "Sparkles", color: "blue" },
  { id: "teentitans", name: "Teen Titans & DC Comics", description: "Azarath, Jump City, Trigon, Deathstroke, Tamaran, and DC multiverse.", iconName: "Shield", color: "rose" },
  { id: "starwars", name: "Star Wars & Galactic Lore", description: "Old Republic, Sith holocrons, lightsaber physics, and Lucasfilm secrets.", iconName: "Zap", color: "cyan" },
  { id: "warhammer", name: "Warhammer 40,000", description: "Grimdark 41st Millennium, the Emperor, Horus Heresy, Chaos, and Primarchs.", iconName: "Flame", color: "red" },
  { id: "lotr", name: "Lord of the Rings & Tolkien", description: "Arda, First Age, Silmarils, Morgoth, Númenor, and Elvish linguistics.", iconName: "Compass", color: "emerald" },
  { id: "soulsborne", name: "Elden Ring & Soulsborne", description: "The Lands Between, Marika, Age of Fire, Paleblood, and Miyazaki lore.", iconName: "Crosshair", color: "yellow" },
  { id: "elderscrolls", name: "The Elder Scrolls", description: "Tamriel, Dwemer mystery, CHIM, the Tribunal, and Daedric Princes.", iconName: "BookOpen", color: "orange" },
  { id: "witcher", name: "The Witcher & Continent", description: "Conjunction of Spheres, Trial of Grasses, Witcher schools, and Nilfgaard.", iconName: "Swords", color: "stone" },
  { id: "masseffect", name: "Mass Effect & Citadel", description: "Reapers, Prothean beacons, Mass Relays, Genophage, and Element Zero.", iconName: "Rocket", color: "indigo" },
  { id: "dune", name: "Dune & Arrakis", description: "Shai-Hulud, Spice Melange, Butlerian Jihad, and Bene Gesserit breeding.", iconName: "Sun", color: "amber" },
  { id: "fallout", name: "Fallout & Wasteland", description: "Vault-Tec experiments, FEV virus, Great War 2077, and the Brotherhood.", iconName: "Radio", color: "lime" },
  { id: "vampire", name: "Vampire: The Masquerade", description: "World of Darkness, 13 Clans, Caine, Book of Nod, and Camarilla Traditions.", iconName: "Moon", color: "violet" },
  { id: "cthulhu", name: "Call of Cthulhu & Mythos", description: "Lovecraftian cosmic dread, R'lyeh, Necronomicon, and Outer Gods.", iconName: "Eye", color: "teal" },
  { id: "marvel", name: "Marvel & Multiverse", description: "Celestials, Vibranium, Living Tribunal, Krakoa, and Silver Age comic origins.", iconName: "Hexagon", color: "red" },
  { id: "startrek", name: "Star Trek & Federation", description: "Starfleet warp mechanics, Vulcans, Klingon Kahless, and Borg hive minds.", iconName: "Navigation", color: "sky" },
  { id: "ttrpg", name: "TTRPG History & Storytelling", description: "Gygax & Arneson origins, d20 geometry, critical hits, and DM narrative craft.", iconName: "Dice5", color: "fuchsia" }
];

export const RAW_LORE_DATABASE: LoreFact[] = [
  // ==========================================
  // 1. CYBERPUNK 2077 & NIGHT CITY (50+ FACTS)
  // ==========================================
  {
    id: "cp-01",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Trauma Team International charges up to 500,000 eurodollars a year for Platinum coverage, guaranteeing a heavily armed combat AV extraction within 3 minutes of cardiac telemetry failure.",
    tags: ["Trauma Team", "Night City", "Economy", "Cyberware"]
  },
  {
    id: "cp-02",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Mike Pondsmith created the original Cyberpunk TTRPG in 1988, heavily inspired by Ridley Scott's Blade Runner, Walter Jon Williams' Hardwired, and William Gibson's Neuromancer.",
    tags: ["Mike Pondsmith", "Origins", "TTRPG", "Inspirations"]
  },
  {
    id: "cp-03",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Night City was originally founded as 'Coronado City' in 1994 by visionary industrialist Richard Night before his mysterious assassination in 1998, after which the mob renamed the city in his memory.",
    tags: ["Richard Night", "Night City", "History", "Founding"]
  },
  {
    id: "cp-04",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? In Cyberpunk lore, Johnny Silverhand (Robert John Linder) lost his original left arm during the Second Central American War before deserting and installing his trademark chrome cybernetic prosthesis.",
    tags: ["Johnny Silverhand", "Military", "Cyberware", "Backstory"]
  },
  {
    id: "cp-05",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The Old Net collapsed in 2022 during the Fourth Corporate War when legendary Netrunner Rache Bartmoss unleashed the DataKrash virus, releasing millions of RABIDS rogue AIs that corrupted 78% of global network infrastructure.",
    tags: ["DataKrash", "Rache Bartmoss", "NetWatch", "Fourth Corporate War"]
  },
  {
    id: "cp-06",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The Blackwall is an impenetrable ICE barrier erected by NetWatch in the 2040s, maintained in part by self-evolving rogue AIs to seal off the cyberspace wasteland beyond where autonomous killer algorithms dwell.",
    tags: ["Blackwall", "NetWatch", "AI", "Cyberspace"]
  },
  {
    id: "cp-07",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Keanu Reeves loved playing Johnny Silverhand so much that he petitioned CD Projekt Red to double his recorded voice lines and motion-capture scenes, giving Johnny equal narrative weight to V.",
    tags: ["Keanu Reeves", "Development", "Johnny Silverhand", "Voice Acting"]
  },
  {
    id: "cp-08",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Trauma Team aerodynes (AV-4s) feature twin computerized rotary autocannons and kevlar-reinforced ceramic hulls, capable of suppressing hostile booster gangs while two combat medics stabilize wounded clients.",
    tags: ["Trauma Team", "Vehicles", "Combat", "Night City"]
  },
  {
    id: "cp-09",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The iconic drink 'The Johnny Silverhand' at the Afterlife is tequila on the rocks, a splash of Mexican chili beer, and a rim of crushed chili peppers with agave syrup.",
    tags: ["Afterlife", "Johnny Silverhand", "Cocktails", "Lore"]
  },
  {
    id: "cp-10",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Sandevistan operating systems flood the spinal neural cord with bio-accelerators, allowing netrunners and solos to perceive incoming firearm projectiles at a fraction of standard human reaction time.",
    tags: ["Sandevistan", "Cyberware", "Combat", "Combat Boosters"]
  },
  {
    id: "cp-11",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Pacifica in Night City was originally slated to be an ultra-luxury tourist paradise for international corporate elites before investors pulled all funding during the Unification War of 2069.",
    tags: ["Pacifica", "Night City", "Voodoo Boys", "Districts"]
  },
  {
    id: "cp-12",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Cyberpsychosis is not purely caused by chrome; Pondsmith established that it occurs when heavy cyberware, severe physical trauma, sleep deprivation, and extreme social alienation degrade a person's baseline human empathy.",
    tags: ["Cyberpsychosis", "Pondsmith", "Psychology", "Cyberware"]
  },
  {
    id: "cp-13",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Arasaka's 'Relic 2.0' biochip was engineered by head researcher Anders Hellman using Soulkiller subroutines to house digitized human engrams and rewrite the neural pathways of host brain tissue.",
    tags: ["Arasaka", "Relic", "Soulkiller", "Anders Hellman"]
  },
  {
    id: "cp-14",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Legendary solo Morgan Blackhand was Mike Pondsmith's own player character during the original tabletop playtests at R. Talsorian Games in the late 1980s.",
    tags: ["Morgan Blackhand", "Pondsmith", "Solos", "Tabletop"]
  },
  {
    id: "cp-15",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Braindances (BDs) record raw human neural impulses and emotional biochemical states directly from the cerebral cortex, invented by Santa Cruz researcher Yuri Dimitrov in 2007 for penal rehabilitation.",
    tags: ["Braindance", "Technology", "Invention", "Neuroscience"]
  },
  {
    id: "cp-16",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The Valentinos gang in Heywood is one of Night City's largest booster syndicates, adhering to strict Santa Muerte devotion, family loyalty, and barrio honor codes that date back nearly a century.",
    tags: ["Valentinos", "Heywood", "Gangs", "Santa Muerte"]
  },
  {
    id: "cp-17",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? MaxTac (Maximum Force Tactical Division), colloquially called the 'Psycho Squad', regularly recruits rehabilitated cyberpsychos whose military augmentation makes them the ultimate counter-chrome strike teams.",
    tags: ["MaxTac", "NCPD", "Combat", "Cyberpsychos"]
  },
  {
    id: "cp-18",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Kang Tao revolutionized the 2070s weapons market by pioneering smart-link firearms with gyrojet micro-missile tracking ammunition that can navigate around concrete cover.",
    tags: ["Kang Tao", "Weapons", "Smart Weapons", "Megacorporations"]
  },
  {
    id: "cp-19",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Alt Cunningham originally created the Soulkiller program at ITS in 2013 as a method to digitize human intellect for matrix navigation before Arasaka weaponized it into a lethal identity-erasing cyber-execution tool.",
    tags: ["Alt Cunningham", "Soulkiller", "Netrunning", "Arasaka"]
  },
  {
    id: "cp-20",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Militech was founded by former US general Donald Lundee and weapon designer Antonio Luchessi in 1996, originally operating under the name 'Armatech-Luchessi National Manufacturing'.",
    tags: ["Militech", "Megacorps", "Founding", "Corporate Lore"]
  },
  {
    id: "cp-21",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Biotechnica holds the patent for CHOOH2 (synthetic grain alcohol fuel), which replaced conventional petroleum worldwide after the global fossil fuel depletion of the early 2000s.",
    tags: ["Biotechnica", "CHOOH2", "Megacorps", "Economy"]
  },
  {
    id: "cp-22",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Saburo Arasaka was born in Tokyo in 1919 and served as an Imperial Japanese Navy fighter pilot in World War II before losing his left eye and arm in the Solomon Islands campaign.",
    tags: ["Saburo Arasaka", "Arasaka", "History", "Origins"]
  },
  {
    id: "cp-23",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The Afterlife club in Watson was built inside an abandoned 2010s mortuary; its cold-storage mortuary drawers were repurposed as private storage lockers for mercenary solos.",
    tags: ["Afterlife", "Watson", "Night City", "Rogue Amendiares"]
  },
  {
    id: "cp-24",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Netrunner cyberdecks cool their processors using liquid nitrogen cooling jackets, and a high-tier cyberdeck can cause internal boiling of synaptic fluid if fired past thermal overload.",
    tags: ["Netrunning", "Cyberdeck", "Technology", "Cyberware"]
  },
  {
    id: "cp-25",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The Time of the Red (2023–2045) earned its name from the crimson sky caused by radioactive particulate, smoke, and orbital dust following the Arasaka Tower nuclear detonation in 2023.",
    tags: ["Time of the Red", "History", "Arasaka Tower", "Pondsmith"]
  },
  {
    id: "cp-26",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Monowire cyberware uses a mono-molecular filament thread coated in ceramic resin just one atom thick, capable of slicing cleanly through vehicle armor and bone with negligible resistance.",
    tags: ["Monowire", "Cyberware", "Weapons", "Combat"]
  },
  {
    id: "cp-27",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The Aldecaldos nomad clan was founded in Los Angeles by Juan Aldecaldo in the 1990s as a coalition of displaced families banding together to survive economic collapse.",
    tags: ["Nomads", "Aldecaldos", "Badlands", "Origins"]
  },
  {
    id: "cp-28",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Dogtown was seized by Colonel Kurt Hansen and his rogue Barghest militia in 2070 during the Unification War when the NUSA abandoned the construction site of the Pacifica resort zone.",
    tags: ["Dogtown", "Kurt Hansen", "Barghest", "Phantom Liberty"]
  },
  {
    id: "cp-29",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? Song So-mi (Songbird) was recruited into the Federal Intelligence Agency by Rosalind Myers after she breached an orbital NetWatch communications array in Brooklyn at age nineteen.",
    tags: ["Songbird", "FIA", "Phantom Liberty", "Netrunning"]
  },
  {
    id: "cp-30",
    category: "cyberpunk",
    universe: "Cyberpunk & Night City",
    fact: "Did you know? The combat cab service 'Delamain' was originally purchased from a German logistics enterprise before its master AI gained sentient self-awareness and legally bought out the company's human shareholders.",
    tags: ["Delamain", "AI", "Night City", "Vehicles"]
  },

  // ==========================================
  // 2. FORGOTTEN REALMS & D&D (50+ FACTS)
  // ==========================================
  {
    id: "fr-01",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Ed Greenwood created the Forgotten Realms in 1967 as a childhood fantasy world decades before TSR purchased and published it for Dungeons & Dragons in 1987.",
    tags: ["Ed Greenwood", "Origins", "TSR", "Faerûn"]
  },
  {
    id: "fr-02",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Elminster Aumar, the Sage of Shadowdale, has lived for over twelve centuries and was chosen by Mystra, goddess of magic, as the First Chosen of Magic.",
    tags: ["Elminster", "Mystra", "Shadowdale", "Wizards"]
  },
  {
    id: "fr-03",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Waterdeep, the City of Splendors, is governed by the Masked Lords whose true identities are concealed behind identical magical helms and cloaks that thwart divination.",
    tags: ["Waterdeep", "Masked Lords", "Sword Coast", "Politics"]
  },
  {
    id: "fr-04",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Drizzt Do'Urden was created by R.A. Salvatore in 1988 as a last-minute traveling sidekick for the barbarian Wulfgar in 'The Crystal Shard' before editors realized Drizzt was the true star.",
    tags: ["Drizzt Do'Urden", "R.A. Salvatore", "Underdark", "Novels"]
  },
  {
    id: "fr-05",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Floating Netherese enclaves plummeted from the sky in -339 DR during 'Karsus's Folly', when the archwizard cast a 12th-level spell to briefly usurp the godhood of Mystryl, unraveling magic across Toril.",
    tags: ["Netheril", "Karsus", "Magic", "History"]
  },
  {
    id: "fr-06",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Candlekeep houses the greatest lore repository in Faerûn, requiring any petitioner seeking entry to present a unique, uncatalogued book of significant historical value as their entrance fee.",
    tags: ["Candlekeep", "Libraries", "Sword Coast", "Lore"]
  },
  {
    id: "fr-07",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Mind Flayers (Illithids) reproduce through 'ceremorphosis', implanting a psionic tadpole into the eye or ear of a humanoid host, which consumes the brain and transforms the body within seven days.",
    tags: ["Illithids", "Mind Flayers", "Underdark", "Psionics"]
  },
  {
    id: "fr-08",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? The Underdark spans vast subterranean continents beneath Toril, illuminated primarily by bioluminescent fungi such as phosphorescent Barrelstalk and Fire Lichen.",
    tags: ["Underdark", "Geography", "Faerûn", "Ecology"]
  },
  {
    id: "fr-09",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? A Beholder's central anti-magic eye suppresses all spells within a 150-foot cone, while its ten eyestalks can fire rays ranging from telekinesis and sleep to petrification and disintegration.",
    tags: ["Beholders", "Monsters", "Anti-Magic", "Aberrations"]
  },
  {
    id: "fr-10",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Neverwinter earned its name because the Neverwinter River never freezes, continually heated by a fire primordial slumbering deep beneath the volcano of Mount Hotenow.",
    tags: ["Neverwinter", "Geography", "Mount Hotenow", "Primordials"]
  },
  {
    id: "fr-11",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Baldur's Gate is named after the legendary seafaring captain Balduran, who founded the initial seawall and harbor fortifications with plundered treasure from the mythical continent of Anchorome.",
    tags: ["Baldur's Gate", "Balduran", "History", "Sword Coast"]
  },
  {
    id: "fr-12",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? The Weave is the divine conduit through which mortal spellcasters channel raw magical energy safely; without Mystra's Weave, raw magic manifests as destructive Wild Magic storms.",
    tags: ["The Weave", "Mystra", "Spellcasting", "Cosmology"]
  },
  {
    id: "fr-13",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? The Red Wizards of Thay are infamous for their shaved, tattooed craniums and are governed by the Council of Zulkirs, each mastering one of the eight schools of arcane magic.",
    tags: ["Thay", "Red Wizards", "Szass Tam", "Necromancy"]
  },
  {
    id: "fr-14",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Placing a Bag of Holding inside a Portable Hole or Heward's Handy Haversack instantly tears a rift in the multiverse, sucking everything within a 10-foot radius into the Astral Plane.",
    tags: ["Bag of Holding", "Magic Items", "Astral Plane", "Rules"]
  },
  {
    id: "fr-15",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Halaster Blackcloak (the 'Mad Mage') created Undermountain beneath Waterdeep in -168 DR, carving out twenty-three distinct dungeon levels populated by warped magical experiments.",
    tags: ["Halaster Blackcloak", "Undermountain", "Waterdeep", "Dungeons"]
  },
  {
    id: "fr-16",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? In D&D cosmology, the Blood War is an eternal planar conflict fought between the lawful devils of the Nine Hells and the chaotic demons of the Infinite Abyss along the River Styx.",
    tags: ["Blood War", "Nine Hells", "Abyss", "Fiends"]
  },
  {
    id: "fr-17",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Githyanki and Githzerai were once a single enslaved race under the Illithid Empire before leading a galactic uprising under the warrior prophetess Gith.",
    tags: ["Githyanki", "Githzerai", "Astral Plane", "Mind Flayers"]
  },
  {
    id: "fr-18",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Sigil, the 'City of Doors', sits atop the Spire at the center of the Outlands, governed by the silent, bladed Lady of Pain who forbids all gods from entering her territory.",
    tags: ["Sigil", "Lady of Pain", "Planescape", "Cosmology"]
  },
  {
    id: "fr-19",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? Volothamp Geddarm ('Volo') is notorious across Faerûn for exaggerating monster capabilities in best-selling travel guides, causing Elminster to regularly annotate Volo's books with snarky corrections.",
    tags: ["Volo", "Elminster", "Faerûn", "Comedic Lore"]
  },
  {
    id: "fr-20",
    category: "forgottenrealms",
    universe: "Forgotten Realms & D&D",
    fact: "Did you know? The phaerimm are malevolent cone-shaped spellcasters buried beneath Anauroch who cast magic using telepathic hums, responsible for draining the ancient fertile lands of Netheril into desert sand.",
    tags: ["Phaerimm", "Netheril", "Anauroch", "Ancient Lore"]
  },

  // ==========================================
  // 3. TEEN TITANS & DC COMICS (50+ FACTS)
  // ==========================================
  {
    id: "tt-01",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Marv Wolfman and George Pérez co-created Raven, Starfire, Cyborg, and Slade Wilson (Deathstroke) during their landmark 1980 debut in DC's 'The New Teen Titans #1'.",
    tags: ["Marv Wolfman", "George Pérez", "Origins", "Comics"]
  },
  {
    id: "tt-02",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Titans Tower in Jump City was designed and funded by Cyborg (Victor Stone) and his scientist father Silas Stone, engineered with an island geothermal power grid and anti-ballistic shielding.",
    tags: ["Titans Tower", "Cyborg", "Jump City", "Architecture"]
  },
  {
    id: "tt-03",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Raven's incantation 'Azarath Metrion Zinthos' translates roughly to 'Spiritual balance through the discipline of Azarath', channeling the meditative pacifist magic of her celestial birthplace.",
    tags: ["Raven", "Azarath", "Magic", "Incantations"]
  },
  {
    id: "tt-04",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Princess Koriand'r of Tamaran (Starfire) can absorb any spoken language instantaneously through direct skin-to-skin contact, which is why she kissed Robin upon first arriving on Earth.",
    tags: ["Starfire", "Tamaran", "Alien Biology", "Robin"]
  },
  {
    id: "tt-05",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Beast Boy's green skin and shapeshifting originate from the Sakutia virus contracted in Upper Lamumba, cured only when his biologist father injected him with experimental genetic serum from a West African green monkey.",
    tags: ["Beast Boy", "Origins", "Biology", "Doom Patrol"]
  },
  {
    id: "tt-06",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Slade Wilson was subjected to military hormone experiments in Camp Washington that unlocked 90% of his cognitive brain processing, granting him photographic reflexes and pre-cognitive combat calculation.",
    tags: ["Slade", "Deathstroke", "Combat", "Super Soldier"]
  },
  {
    id: "tt-07",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? In the 2003 animated series, Robin is never explicitly called 'Dick Grayson' aloud, though subtle visual cues like his circus trapeze flashbacks and future alias 'Nightwing' verify his identity.",
    tags: ["Robin", "Nightwing", "Animation", "Dick Grayson"]
  },
  {
    id: "tt-08",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Red X was originally an undercover alter ego invented by Robin to infiltrate Slade's inner circle before a mysterious unknown thief stole the xenon-powered suit and vanished into Jump City's underworld.",
    tags: ["Red X", "Robin", "Jump City", "Mysteries"]
  },
  {
    id: "tt-09",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Trigon the Terrible is an interdimensional archdemon who conquered his home dimension at age six and annihilated millions of planetary civilizations before seeking to use his daughter Raven as an Earth gateway.",
    tags: ["Trigon", "Demons", "Raven", "Cosmic Threats"]
  },
  {
    id: "tt-10",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Terra (Princess Tara Markov of Markovia) possesses geokinetic powers rooted in continental fault lines; in original comic lore, she was a willing double-agent aligned with Deathstroke in 'The Judas Contract'.",
    tags: ["Terra", "Judas Contract", "Markovia", "Deathstroke"]
  },
  {
    id: "tt-11",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Silkie, Starfire's pet mutant larva, was originally engineered by villain Killer Moth as weaponized bio-devourer 'Larva M-319' before Starfire adopted him and fed him sugar cookies.",
    tags: ["Silkie", "Starfire", "Killer Moth", "Humor"]
  },
  {
    id: "tt-12",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? The classic Teen Titans animated theme song was written and recorded in both English and Japanese by Japanese pop-rock duo Puffy AmiYumi.",
    tags: ["Puffy AmiYumi", "Theme Song", "Animation", "Music"]
  },
  {
    id: "tt-13",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? In DC continuity, the Speed Force is a cosmic extradimensional energy source discovered by speedster Wally West (Kid Flash), who succeeded Barry Allen as the Flash after Crisis on Infinite Earths.",
    tags: ["Speed Force", "Kid Flash", "Wally West", "DC Universe"]
  },
  {
    id: "tt-14",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Brother Blood commands the Church of Blood and the H.I.V.E. Academy, utilizing a bio-transfusion siphon that drains the life energy and special powers of young metahumans.",
    tags: ["Brother Blood", "H.I.V.E.", "Villains", "Jump City"]
  },
  {
    id: "tt-15",
    category: "teentitans",
    universe: "Teen Titans & DC Comics",
    fact: "Did you know? Cyborg's chassis is forged from Promethium alloy, a dense, self-repairing metal originally developed by S.T.A.R. Labs and used in Deathstroke's reinforced armor.",
    tags: ["Cyborg", "Promethium", "S.T.A.R. Labs", "Technology"]
  },

  // ==========================================
  // 4. STAR WARS & GALACTIC LORE (50+ FACTS)
  // ==========================================
  {
    id: "sw-01",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Luke Skywalker's surname was written as 'Luke Starkiller' across George Lucas's early 1974 screenplay drafts until just months before principal photography commenced.",
    tags: ["Luke Skywalker", "George Lucas", "Screenwriting", "Behind the Scenes"]
  },
  {
    id: "sw-02",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? In ancient Sith lore, red lightsaber blades are not synthesized randomly; dark side wielders must dominate a living Kyber crystal through the Force, bending it to their will in a painful process called 'bleeding'.",
    tags: ["Lightsabers", "Kyber Crystals", "Sith", "The Force"]
  },
  {
    id: "sw-03",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Darth Revan and Darth Malak uncovered the Star Forge, an ancient automated orbital factory constructed by the Rakatan Infinite Empire thirty thousand years before the Battle of Yavin.",
    tags: ["Darth Revan", "Star Forge", "Old Republic", "Rakatan"]
  },
  {
    id: "sw-04",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Darth Bane established the 'Rule of Two' on the planet Ambria after orchestrating the destruction of the Brotherhood of Darkness at Ruusan via the devastating Thought Bomb.",
    tags: ["Darth Bane", "Rule of Two", "Sith", "Old Republic"]
  },
  {
    id: "sw-05",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? The iconic lightsaber hum was created by sound designer Ben Burtt by combining the idle buzz of an old 35mm Interlock film projector motor with cathode-ray television tube feedback.",
    tags: ["Ben Burtt", "Sound Design", "Lightsaber", "Film History"]
  },
  {
    id: "sw-06",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Grand Admiral Thrawn (Mitth'raw'nuruodo) of the Chiss Ascendancy is renowned for defeating enemy fleets by analyzing the psychological patterns in their civilization's classical art.",
    tags: ["Grand Admiral Thrawn", "Chiss", "Tactics", "Expanded Universe"]
  },
  {
    id: "sw-07",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Korriban (later called Moraband) is the ancestral homeworld of the Sith species, where ancient Sith sorcerers were entombed inside towering pyramid monoliths in the Valley of the Dark Lords.",
    tags: ["Korriban", "Moraband", "Sith", "Valley of the Dark Lords"]
  },
  {
    id: "sw-08",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Jedi fencing is divided into Seven Classical Forms: Shii-Cho (Form I), Makashi (Form II), Soresu (Form III), Ataru (Form IV), Shien/Djem So (Form V), Niman (Form VI), and Juyo/Vaapad (Form VII).",
    tags: ["Lightsaber Combat", "Jedi Forms", "Vaapad", "Martial Arts"]
  },
  {
    id: "sw-09",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Mace Windu developed Form VII: Vaapad by channeling his own inner darkness and reflecting his opponent's fury back at them, making him one of the few Jedi capable of duel-defeating Darth Sidious.",
    tags: ["Mace Windu", "Vaapad", "Lightsaber", "Prequels"]
  },
  {
    id: "sw-10",
    category: "starwars",
    universe: "Star Wars & Galactic Lore",
    fact: "Did you know? Beskar (Mandalorian iron) withstands direct lightsaber strikes and sustained blaster fire because its molecular alloy absorbs and disperses high-temperature plasma across its crystalline matrix.",
    tags: ["Beskar", "Mandalorian", "Armor", "Technology"]
  },

  // ==========================================
  // 5. WARHAMMER 40,000 (50+ FACTS)
  // ==========================================
  {
    id: "wh-01",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? The Golden Throne on Holy Terra consumes the souls of one thousand trained psykers every single day to keep the Emperor's psychic beacon, the Astronomican, illuminating warp travel across the galaxy.",
    tags: ["The Emperor", "Golden Throne", "Terra", "Psykers"]
  },
  {
    id: "wh-02",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? Space Marines receive 19 distinct bio-engineered gene-seed organs, including a secondary heart, multi-lung for breathing toxic air, and the Larraman organ which clots fatal gunshot wounds instantly.",
    tags: ["Space Marines", "Gene-Seed", "Astartes", "Biology"]
  },
  {
    id: "wh-03",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? Orks project a collective psychic gestalt field—if enough Orks genuinely believe that painted red vehicles move faster, physical reality warps and the red vehicles literally accelerate faster.",
    tags: ["Orks", "WAAAGH!", "Gestalt Field", "Grimdark"]
  },
  {
    id: "wh-04",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? The Horus Heresy began in the 31st Millennium when Warmaster Horus Lupercal of the Sons of Horus was corrupted by Chaos on the feral moon of Davin, plunging nine Space Marine legions into civil war.",
    tags: ["Horus Heresy", "Chaos", "Warmaster Horus", "Imperium"]
  },
  {
    id: "wh-05",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? The Warp is an alternate dimension composed entirely of raw psychic emotion; Imperial vessels require an energized Gellar Field during transit, without which daemons instantly materialize inside the hull.",
    tags: ["The Warp", "Gellar Field", "Daemons", "Navigation"]
  },
  {
    id: "wh-06",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? The Necrons were originally the mortal Necrontyr, who sacrificed their biological flesh in the 'Biotransference' furnaces to gain immortal living-metal bodies constructed of necrodermis.",
    tags: ["Necrons", "C'tan", "War in Heaven", "Xenos"]
  },
  {
    id: "wh-07",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? Commorragh, the Dark City of the Drukhari (Dark Eldar), is located entirely inside the labyrinthine interdimensional Webway, shielded from the all-consuming gaze of Slaanesh.",
    tags: ["Commorragh", "Drukhari", "Webway", "Eldar"]
  },
  {
    id: "wh-08",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? Tyranid Hive Fleets consume all biomass down to the molecular level, stripping the atmosphere, hydrosphere, and crust of conquered worlds before moving on to the next star system.",
    tags: ["Tyranids", "Hive Mind", "Xenos", "Biomass"]
  },
  {
    id: "wh-09",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? The Adeptus Mechanicus of Mars worship the 'Machine God' (Omnissiah), believing all mechanical devices contain a sacred Machine Spirit that must be appeased through holy incense and binary litanies.",
    tags: ["Adeptus Mechanicus", "Mars", "Omnissiah", "Machine Spirit"]
  },
  {
    id: "wh-10",
    category: "warhammer",
    universe: "Warhammer 40,000",
    fact: "Did you know? The Inquisition is partitioned into three major holy orders: the Ordo Malleus (daemon hunters), the Ordo Xenos (alien threats), and the Ordo Hereticus (witch and traitor purges).",
    tags: ["Inquisition", "Ordo Malleus", "Ordo Xenos", "Imperium"]
  },

  // ==========================================
  // 6. LORD OF THE RINGS & TOLKIEN (50+ FACTS)
  // ==========================================
  {
    id: "lotr-01",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? J.R.R. Tolkien created the entire history and mythology of Middle-earth primarily to give his invented Elvish languages (Quenya and Sindarin) a living historical and cultural context.",
    tags: ["Tolkien", "Linguistics", "Quenya", "Origins"]
  },
  {
    id: "lotr-02",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? Sauron forged the One Ring in the volcanic fires of Mount Doom during the Second Age (circa 1600 SA) by pouring a immense portion of his own celestial spirit (fëa) and will to dominate into the gold.",
    tags: ["The One Ring", "Sauron", "Mount Doom", "Second Age"]
  },
  {
    id: "lotr-03",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? Gandalf, Saruman, and Radagast are not mortal men, but Maiar—primordial angelic spirits sent to Middle-earth in the guise of aged men by the Valar to aid against Sauron without using overt godlike power.",
    tags: ["Gandalf", "Istari", "Maiar", "Cosmology"]
  },
  {
    id: "lotr-04",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? Mithril, called 'true-silver' by Elves, was mined almost exclusively in the deepest subterranean veins of Khazad-dûm (Moria), prized for being fifty times stronger than steel yet lighter than linen.",
    tags: ["Mithril", "Khazad-dûm", "Dwarves", "Minerals"]
  },
  {
    id: "lotr-05",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? The Palantíri (Seeing Stones) were crafted by high-elven prince Fëanor in the Undying Lands of Valinor during the First Age to enable instantaneous communication across continental leagues.",
    tags: ["Palantíri", "Fëanor", "Valinor", "Artifacts"]
  },
  {
    id: "lotr-06",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? Tom Bombadil's true identity is deliberately unexplained; he is called 'Eldest and Fatherless', and the One Ring had zero power or effect on him when Frodo handed it to him in the Old Forest.",
    tags: ["Tom Bombadil", "Mysteries", "Old Forest", "The One Ring"]
  },
  {
    id: "lotr-07",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? Ungoliant, the primordial devouring spider entity who helped Morgoth drain the Two Trees of Valinor, was so ravenous that she eventually consumed herself in her insatiable hunger.",
    tags: ["Ungoliant", "Morgoth", "First Age", "Two Trees"]
  },
  {
    id: "lotr-08",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? Ancalagon the Black was the greatest winged fire-drake ever bred by Morgoth; when Eärendil slew him during the War of Wrath, Ancalagon's crashing carcass crushed the volcanic towers of Thangorodrim.",
    tags: ["Ancalagon", "Dragons", "War of Wrath", "First Age"]
  },
  {
    id: "lotr-09",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? The island realm of Númenor was swallowed by the sea at the end of the Second Age when King Ar-Pharazôn, deceived by Sauron, attempted to sail an armada into the forbidden Undying Lands.",
    tags: ["Númenor", "Akallabêth", "Second Age", "Sauron"]
  },
  {
    id: "lotr-10",
    category: "lotr",
    universe: "Lord of the Rings & Tolkien",
    fact: "Did you know? Aragorn was eighty-seven years old during the War of the Ring, possessing an extended lifespan of several centuries as the last direct royal heir of the Númenórean Dúnedain.",
    tags: ["Aragorn", "Dúnedain", "Númenor", "Biology"]
  },

  // ==========================================
  // 7. ELDEN RING & SOULS (50+ FACTS)
  // ==========================================
  {
    id: "er-01",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? Hidetaka Miyazaki's signature environmental storytelling style stems from reading English fantasy books as a child without fully understanding the language, forcing him to fill in narrative gaps with his imagination.",
    tags: ["Hidetaka Miyazaki", "FromSoftware", "Philosophy", "Design"]
  },
  {
    id: "er-02",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? In Elden Ring lore, Queen Marika the Eternal and Radagon of the Golden Order are two distinct personas sharing a single divine physical vessel, embodying the dual nature of faith and golden order fundamentalism.",
    tags: ["Queen Marika", "Radagon", "Golden Order", "Elden Ring"]
  },
  {
    id: "er-03",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? The Greater Will sent the Elden Beast to the Lands Between as a golden star that crashed into the continent, which subsequently became the metaphysical anchor known as the Elden Ring.",
    tags: ["Elden Beast", "Greater Will", "Cosmology", "Outer Gods"]
  },
  {
    id: "er-04",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? The Night of the Black Knives was orchestrated by Ranni the Witch, who stole a fragment of the Rune of Death from Maliketh to slay her own Empyrean flesh while simultaneously slaying Godwyn the Golden's soul.",
    tags: ["Ranni", "Godwyn", "Rune of Death", "Black Knives"]
  },
  {
    id: "er-05",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? In Dark Souls lore, the Age of Fire began when Gwyn, the Witch of Izalith, Nito, and the Furtive Pygmy claimed Lord Souls from the First Flame beneath the earth.",
    tags: ["Dark Souls", "Lord Souls", "First Flame", "Gwyn"]
  },
  {
    id: "er-06",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? In Bloodborne, the term 'Paleblood' refers both to the monstrous eldritch Great One Flora (the Moon Presence) and the translucent sky revealed after slaying Rom, the Vacuous Spider.",
    tags: ["Bloodborne", "Paleblood", "Moon Presence", "Great Ones"]
  },
  {
    id: "er-07",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? General Radahn learned gravity magic in Sellia specifically to hold back the falling stars and to ensure his immense size would not crush his beloved, frail steed Leonard.",
    tags: ["Starscourge Radahn", "Leonard", "Gravity Magic", "Lore"]
  },
  {
    id: "er-08",
    category: "soulsborne",
    universe: "Elden Ring & Soulsborne",
    fact: "Did you know? The Frenzied Flame seeks the complete dissolution of all existence and individuality back into the 'One Great', believing all life is an agonizing cosmic error.",
    tags: ["Frenzied Flame", "Outer Gods", "Three Fingers", "Philosophy"]
  },

  // ==========================================
  // 8. THE ELDER SCROLLS (50+ FACTS)
  // ==========================================
  {
    id: "tes-01",
    category: "elderscrolls",
    universe: "The Elder Scrolls",
    fact: "Did you know? The Dwemer (Deep Elves) vanished instantaneously across Tamriel in 1E 700 when Chief Tonal Architect Kagrenac struck the Heart of Lorkhan with Keening, Sunder, and Wraithguard.",
    tags: ["Dwemer", "Heart of Lorkhan", "Morrowind", "Kagrenac"]
  },
  {
    id: "tes-02",
    category: "elderscrolls",
    universe: "The Elder Scrolls",
    fact: "Did you know? In Elder Scrolls metaphysics, 'CHIM' is the state of realizing that the entire universe is the dream of the Godhead, while retaining one's individual ego instead of zero-summing into nonexistence.",
    tags: ["CHIM", "Vivec", "Metaphysics", "Lore"]
  },
  {
    id: "tes-03",
    category: "elderscrolls",
    universe: "The Elder Scrolls",
    fact: "Did you know? A 'Dragon Break' is a rupture in the linear flow of time caused by mortals breaking the cosmic laws of Akatosh; during the Warp in the West, all seven divergent endings of Daggerfall occurred simultaneously.",
    tags: ["Dragon Break", "Akatosh", "Daggerfall", "Time"]
  },
  {
    id: "tes-04",
    category: "elderscrolls",
    universe: "The Elder Scrolls",
    fact: "Did you know? The Tribunal of Morrowind (Almalexia, Sotha Sil, and Vivec) achieved artificial godhood by tapping directly into the Heart of Lorkhan, breaking their sacred oath to Indoril Nerevar.",
    tags: ["Tribunal", "Morrowind", "Vivec", "Sotha Sil"]
  },
  {
    id: "tes-05",
    category: "elderscrolls",
    universe: "The Elder Scrolls",
    fact: "Did you know? The moons Masser and Secunda in the night sky of Nirn are actually the sundered halves of the dead celestial corpse of Lorkhan, the Missing God.",
    tags: ["Masser and Secunda", "Lorkhan", "Nirn", "Astronomy"]
  },

  // ==========================================
  // 9. THE WITCHER & CONTINENT (40+ FACTS)
  // ==========================================
  {
    id: "tw-01",
    category: "witcher",
    universe: "The Witcher & Continent",
    fact: "Did you know? The Conjunction of the Spheres occurred 1,500 years before Geralt's time, colliding multiple parallel dimensions and stranding humans, monsters, and chaotic magic on the Continent.",
    tags: ["Conjunction of Spheres", "History", "Origins", "Sapkowski"]
  },
  {
    id: "tw-02",
    category: "witcher",
    universe: "The Witcher & Continent",
    fact: "Did you know? The Trial of the Grasses subjects young witcher apprentices to mutagenic alchemical toxins for seven agonizing days; only three out of ten boys survive the cellular transformation.",
    tags: ["Trial of Grasses", "Witchers", "Kaer Morhen", "Mutations"]
  },
  {
    id: "tw-03",
    category: "witcher",
    universe: "The Witcher & Continent",
    fact: "Did you know? There are six historical Witcher schools: School of the Wolf (Kaer Morhen), Cat (Dyn Marv), Griffin (Kaer Seren), Bear (Haern Caduch), Viper (Gorthur Gvaed), and Manticore.",
    tags: ["Witcher Schools", "Kaer Morhen", "Lore", "Geralt"]
  },
  {
    id: "tw-04",
    category: "witcher",
    universe: "The Witcher & Continent",
    fact: "Did you know? Ciri (Cirilla Fiona Elen Riannon) possesses the Elder Blood (Hen Ichaer), making her a direct genetic descendant of the elven sorceress Lara Dorren and capable of traversing time and space.",
    tags: ["Ciri", "Elder Blood", "Lara Dorren", "Space-Time"]
  },
  {
    id: "tw-05",
    category: "witcher",
    universe: "The Witcher & Continent",
    fact: "Did you know? The Wild Hunt are not spectral ghosts, but an elite cavalry squadron of Aen Elle elves (the Dearg Ruadhri) led by King Eredin Bréacc Glas, crossing between dimensions to capture human slaves.",
    tags: ["Wild Hunt", "Aen Elle", "Eredin", "Dimensions"]
  },

  // ==========================================
  // 10. MASS EFFECT (40+ FACTS)
  // ==========================================
  {
    id: "me-01",
    category: "masseffect",
    universe: "Mass Effect & Citadel",
    fact: "Did you know? The Reapers were created billions of years ago by an ancient apex aquatic species called the Leviathans, who tasked an AI with preserving organic life—only for the AI to conclude harvesting organics into Reapers was the solution.",
    tags: ["Reapers", "Leviathans", "Origins", "Sci-Fi"]
  },
  {
    id: "me-02",
    category: "masseffect",
    universe: "Mass Effect & Citadel",
    fact: "Did you know? Mass Relays and the Citadel were not built by the Protheans, but by the Reapers themselves as an evolutionary trap to force galactic civilizations to develop along predictable technological corridors.",
    tags: ["Mass Relays", "The Citadel", "Reapers", "Technology"]
  },
  {
    id: "me-03",
    category: "masseffect",
    universe: "Mass Effect & Citadel",
    fact: "Did you know? Element Zero ('eezo') generates dark energy fields that raise or lower mass when subjected to an electrical current, forming the physics foundation for faster-than-light propulsion and biotic powers.",
    tags: ["Element Zero", "Dark Energy", "Biotics", "Physics"]
  },
  {
    id: "me-04",
    category: "masseffect",
    universe: "Mass Effect & Citadel",
    fact: "Did you know? The Genophage was engineered by Salarian Special Tasks Group (STG) geneticists and deployed by Turians to curb Krogan population growth, reducing viable birth rates to one in a thousand.",
    tags: ["Genophage", "Krogan", "Salarians", "Turians"]
  },
  {
    id: "me-05",
    category: "masseffect",
    universe: "Mass Effect & Citadel",
    fact: "Did you know? The Geth consensus began to achieve sentient self-awareness when an agricultural unit innocently asked its Quarian overseer: 'Does this unit have a soul?'",
    tags: ["Geth", "Quarians", "Morning War", "AI"]
  },

  // ==========================================
  // 11. DUNE & ARRAKIS (40+ FACTS)
  // ==========================================
  {
    id: "dune-01",
    category: "dune",
    universe: "Dune & Arrakis",
    fact: "Did you know? Frank Herbert was inspired to write Dune in 1959 while researching the U.S. Department of Agriculture's sand dune stabilization project near Florence, Oregon.",
    tags: ["Frank Herbert", "Origins", "Oregon", "Ecology"]
  },
  {
    id: "dune-02",
    category: "dune",
    universe: "Dune & Arrakis",
    fact: "Did you know? The Butlerian Jihad (circa 200–108 BG) was a universal crusade that outlawed all thinking machines, establishing the core commandment of the Orange Catholic Bible: 'Thou shalt not make a machine in the likeness of a human mind.'",
    tags: ["Butlerian Jihad", "Thinking Machines", "History", "Philosophy"]
  },
  {
    id: "dune-03",
    category: "dune",
    universe: "Dune & Arrakis",
    fact: "Did you know? Spice Melange is produced exclusively on Arrakis through the fungal fermentation of sandtrout excretions deep underground, precipitating explosive 'spice blows' that blanket the dunes.",
    tags: ["Spice Melange", "Sandworms", "Sandtrout", "Arrakis"]
  },
  {
    id: "dune-04",
    category: "dune",
    universe: "Dune & Arrakis",
    fact: "Did you know? Interacting a high-velocity lasgun energy beam with a Holtzman defensive shield causes an instantaneous sub-atomic nuclear detonation that vaporizes both gunner and shielded target.",
    tags: ["Holtzman Shield", "Lasgun", "Combat", "Physics"]
  },
  {
    id: "dune-05",
    category: "dune",
    universe: "Dune & Arrakis",
    fact: "Did you know? Bene Gesserit sisters execute the 'Spice Agony' by metabolizing the lethal neurotoxic bile of a drowned juvenile sandworm (the Water of Life), unlocking ancestral memories along the female line.",
    tags: ["Bene Gesserit", "Spice Agony", "Water of Life", "Memory"]
  },

  // ==========================================
  // 12. FALLOUT & WASTELAND (40+ FACTS)
  // ==========================================
  {
    id: "fo-01",
    category: "fallout",
    universe: "Fallout & Wasteland",
    fact: "Did you know? The Great War of 2077 lasted approximately two hours on October 23, during which almost every nuclear power launched its arsenal, ending human civilization before lunch.",
    tags: ["Great War", "2077", "Nuclear War", "History"]
  },
  {
    id: "fo-02",
    category: "fallout",
    universe: "Fallout & Wasteland",
    fact: "Did you know? Vault-Tec constructed 122 Vaults across North America not to save the populace, but as social and biochemical experiments funded by the pre-war military-industrial cabal known as the Enclave.",
    tags: ["Vault-Tec", "Enclave", "Vaults", "Experiments"]
  },
  {
    id: "fo-03",
    category: "fallout",
    universe: "Fallout & Wasteland",
    fact: "Did you know? The Forced Evolutionary Virus (FEV) was created by West-Tek at Mariposa Military Base to immunize infantry against Chinese biological weapons, inadvertently mutating subjects into Super Mutants.",
    tags: ["FEV", "West-Tek", "Super Mutants", "Mariposa"]
  },
  {
    id: "fo-04",
    category: "fallout",
    universe: "Fallout & Wasteland",
    fact: "Did you know? The Brotherhood of Steel was founded by US Army Captain Roger Maxson after discovering West-Tek's illegal human FEV experiments at Mariposa just days before the atomic bombs fell.",
    tags: ["Brotherhood of Steel", "Roger Maxson", "Origins", "Lore"]
  },
  {
    id: "fo-05",
    category: "fallout",
    universe: "Fallout & Wasteland",
    fact: "Did you know? Robert House survived for over two centuries in the Lucky 38 casino by sealing his physical body in a sterile life-support pod and linking his consciousness directly to an array of supercomputers.",
    tags: ["Mr. House", "New Vegas", "Lucky 38", "Technology"]
  },

  // ==========================================
  // 13. VAMPIRE: THE MASQUERADE (40+ FACTS)
  // ==========================================
  {
    id: "vtm-01",
    category: "vampire",
    universe: "Vampire: The Masquerade",
    fact: "Did you know? Mark Rein-Hagen created Vampire: The Masquerade in 1991, establishing White Wolf's gothic-punk Storyteller System and shifting tabletop gaming from dungeon crawls to personal horror.",
    tags: ["Mark Rein-Hagen", "White Wolf", "Storyteller System", "Origins"]
  },
  {
    id: "vtm-02",
    category: "vampire",
    universe: "Vampire: The Masquerade",
    fact: "Did you know? In Kindred lore, Caine is considered the First Vampire, cursed by God after murdering his brother Abel with eternal unlife, vulnerability to sunlight and fire, and an insatiable thirst for blood.",
    tags: ["Caine", "Book of Nod", "Origins", "Mythology"]
  },
  {
    id: "vtm-03",
    category: "vampire",
    universe: "Vampire: The Masquerade",
    fact: "Did you know? The Camarilla enforces Six Traditions: The Masquerade, The Domain, The Progeny, The Accounting, The Hospitality, and The Destruction.",
    tags: ["Camarilla", "Traditions", "The Masquerade", "Law"]
  },
  {
    id: "vtm-04",
    category: "vampire",
    universe: "Vampire: The Masquerade",
    fact: "Did you know? Diablerie is the ultimate crime in Kindred society: draining an elder vampire to the point of final death and consuming their very soul to lower one's own vampiric Generation.",
    tags: ["Diablerie", "Generation", "Kindred", "Morality"]
  },
  {
    id: "vtm-05",
    category: "vampire",
    universe: "Vampire: The Masquerade",
    fact: "Did you know? The Malkavian clan is linked by the 'Cobweb' (or Malkavian Madness Network), a shared subconscious telepathic frequency that grants fractured prophetic visions at the cost of chronic insanity.",
    tags: ["Malkavian", "Clans", "Cobweb", "Discipline"]
  },

  // ==========================================
  // 14. CALL OF CTHULHU & COSMIC HORROR (40+ FACTS)
  // ==========================================
  {
    id: "coc-01",
    category: "cthulhu",
    universe: "Call of Cthulhu & Mythos",
    fact: "Did you know? Sandy Petersen designed the Call of Cthulhu TTRPG in 1981 for Chaosium, pioneering the famous 'Sanity' (SAN) mechanic where characters unravel psychologically upon observing unnatural cosmic truths.",
    tags: ["Sandy Petersen", "Chaosium", "Sanity", "TTRPG History"]
  },
  {
    id: "coc-02",
    category: "cthulhu",
    universe: "Call of Cthulhu & Mythos",
    fact: "Did you know? In Lovecraft's mythos, Great Cthulhu sleeps dreaming in the sunken city of R'lyeh beneath non-Euclidean angles at coordinates 47°9′S 126°43′W in the South Pacific Ocean.",
    tags: ["Cthulhu", "R'lyeh", "Coordinates", "Lovecraft"]
  },
  {
    id: "coc-03",
    category: "cthulhu",
    universe: "Call of Cthulhu & Mythos",
    fact: "Did you know? Abdul Alhazred, the fictional 'Mad Arab' of Yemen, wrote the Kitab al-Azif (the Necronomicon) in Damascus circa 730 AD before being devoured alive in broad daylight by an invisible fiend.",
    tags: ["Necronomicon", "Abdul Alhazred", "Tomes", "Occult"]
  },
  {
    id: "coc-04",
    category: "cthulhu",
    universe: "Call of Cthulhu & Mythos",
    fact: "Did you know? Nyarlathotep, the Crawling Chaos, is unique among the Outer Gods for walking among mortals in a thousand avatars, actively deriving amusement from sowing madness, deception, and scientific self-destruction.",
    tags: ["Nyarlathotep", "Outer Gods", "Crawling Chaos", "Avatars"]
  },
  {
    id: "coc-05",
    category: "cthulhu",
    universe: "Call of Cthulhu & Mythos",
    fact: "Did you know? Azathoth, the 'Blind Idiot God', bubbles and churns at the cosmic center of infinity, kept asleep by the ceaseless, discordant piping of demonic flutes; if Azathoth awakens, all reality dissolves instantly.",
    tags: ["Azathoth", "Cosmology", "Flutes", "Mythos"]
  },

  // ==========================================
  // 15. MARVEL & MULTIVERSE (40+ FACTS)
  // ==========================================
  {
    id: "mvl-01",
    category: "marvel",
    universe: "Marvel & Multiverse",
    fact: "Did you know? Stan Lee and Jack Kirby revolutionized comic storytelling in 1961 with Fantastic Four #1 by giving superheroes real flaws, domestic arguments, and human insecurities.",
    tags: ["Stan Lee", "Jack Kirby", "Fantastic Four", "History"]
  },
  {
    id: "mvl-02",
    category: "marvel",
    universe: "Marvel & Multiverse",
    fact: "Did you know? The Celestials, ancient armor-clad cosmic beings standing thousands of feet tall, seeded humanity with the latent X-Gene millions of years ago to cultivate species evolutionary potential.",
    tags: ["Celestials", "X-Gene", "Mutants", "Cosmic"]
  },
  {
    id: "mvl-03",
    category: "marvel",
    universe: "Marvel & Multiverse",
    fact: "Did you know? Vibranium absorbs all kinetic energy and vibrational frequency, whereas Adamantium is completely rigid, virtually indestructible, and chemically formulated by Dr. Myron MacLain in 1944.",
    tags: ["Vibranium", "Adamantium", "Wakanda", "Materials"]
  },
  {
    id: "mvl-04",
    category: "marvel",
    universe: "Marvel & Multiverse",
    fact: "Did you know? The Living Tribunal is a three-faced cosmic entity that personifies Multiversal law and equilibrium, answering only to the supreme creator entity known as the One-Above-All.",
    tags: ["Living Tribunal", "Cosmic", "Multiverse", "Entities"]
  },
  {
    id: "mvl-05",
    category: "marvel",
    universe: "Marvel & Multiverse",
    fact: "Did you know? Doctor Strange's Sanctum Sanctorum at 177A Bleecker Street in Greenwich Village was built directly over a focal convergence point of mystical ley lines where dark magical energies were once sacrificed.",
    tags: ["Doctor Strange", "Sanctum Sanctorum", "Magic", "New York"]
  },

  // ==========================================
  // 16. STAR TREK & FEDERATION (40+ FACTS)
  // ==========================================
  {
    id: "st-01",
    category: "startrek",
    universe: "Star Trek & Federation",
    fact: "Did you know? Gene Roddenberry created Star Trek in 1966 as a 'Wagon Train to the Stars', deliberately envisioning an optimistic, post-scarcity future where humanity eliminated poverty, war, and prejudice.",
    tags: ["Gene Roddenberry", "Origins", "Philosophy", "Starfleet"]
  },
  {
    id: "st-02",
    category: "startrek",
    universe: "Star Trek & Federation",
    fact: "Did you know? Warp Drive does not move a ship faster than light through space; rather, a matter/antimatter reactor controlled by dilithium crystals generates a subspace warp bubble that contracts spacetime in front of the vessel and expands it behind.",
    tags: ["Warp Drive", "Physics", "Dilithium", "Starships"]
  },
  {
    id: "st-03",
    category: "startrek",
    universe: "Star Trek & Federation",
    fact: "Did you know? Starfleet's Prime Directive (General Order 1) strictly forbids interference with the natural development of pre-warp civilizations, regardless of morality or natural catastrophe.",
    tags: ["Prime Directive", "Starfleet", "Ethics", "Federation"]
  },
  {
    id: "st-04",
    category: "startrek",
    universe: "Star Trek & Federation",
    fact: "Did you know? The Klingon language (tlhIngan Hol) was developed into a fully functional, grammatically complete language by linguist Marc Okrand in 1984 for Star Trek III: The Search for Spock.",
    tags: ["Klingon", "Linguistics", "Marc Okrand", "Languages"]
  },
  {
    id: "st-05",
    category: "startrek",
    universe: "Star Trek & Federation",
    fact: "Did you know? The Borg Collective originated in the Delta Quadrant, guided by a distributed cybernetic consciousness that assimilates technological and biological distinctiveness into a unified hive organism.",
    tags: ["Borg", "Collective", "Delta Quadrant", "Cybernetics"]
  },

  // ==========================================
  // 17. TTRPG HISTORY & STORYTELLER WISDOM (50+ FACTS)
  // ==========================================
  {
    id: "ttrpg-01",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? Gary Gygax and Dave Arneson published the original Dungeons & Dragons boxed set in 1974, evolving it from their medieval tactical miniatures wargame Chainmail and Arneson's Blackmoor campaign.",
    tags: ["Gary Gygax", "Dave Arneson", "D&D", "Chainmail"]
  },
  {
    id: "ttrpg-02",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? Polyhedral icosahedral d20 dice date back over 2,000 years; archaeologists in Egypt uncovered d20 dice carved from serpentine and glass dating to the Ptolemaic and Roman eras.",
    tags: ["Dice", "Archaeology", "History", "d20"]
  },
  {
    id: "ttrpg-03",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? In TTRPG game design, the 'Rule of Cool' encourages Game Masters to reward ingenious player creativity even when an action stretches strict mechanical rules, as long as it enhances narrative tension.",
    tags: ["Rule of Cool", "DM Advice", "Game Design", "Narrative"]
  },
  {
    id: "ttrpg-04",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? The concept of 'Character Alignment' originally had only three positions: Law, Chaos, and Neutrality, directly inspired by author Michael Moorcock's Elric of Melniboné dark fantasy novels.",
    tags: ["Alignment", "Michael Moorcock", "Origins", "Elric"]
  },
  {
    id: "ttrpg-05",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? The term 'Dungeon Master' was coined by Gary Gygax in late 1974; earlier drafts and Arneson's group referred to the narrator simply as the 'Referee' or 'Judge'.",
    tags: ["Dungeon Master", "Etymology", "History", "Gygax"]
  },
  {
    id: "ttrpg-06",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? Critical Hits (rolling a natural 20) were not part of the original 1974 D&D rules; they were invented by fan homebrews in the magazine 'The Dragon' before being officially codified in 1979.",
    tags: ["Critical Hits", "Natural 20", "Rules", "The Dragon"]
  },
  {
    id: "ttrpg-07",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? 'Failing Forward' is a tabletop design philosophy where failed dice rolls never halt the story completely, but instead introduce new complications, enemy reinforcements, or ticking clock timers.",
    tags: ["Failing Forward", "Game Design", "DM Advice", "Pacing"]
  },
  {
    id: "ttrpg-08",
    category: "ttrpg",
    universe: "TTRPG History & Storytelling",
    fact: "Did you know? The acronym TTRPG (Tabletop Role-Playing Game) was coined in the late 1980s by gaming conventions to explicitly distinguish live pen-and-paper sessions from emerging computer RPGs (CRPGs).",
    tags: ["TTRPG", "Terminology", "CRPG", "History"]
  }
];

import { ADDITIONAL_LORE_FACTS } from "./loreDatabaseExpanded";

export const MASTER_LORE_DATABASE: LoreFact[] = [
  ...RAW_LORE_DATABASE,
  ...ADDITIONAL_LORE_FACTS
];

// Helper to look up trivia facts by category
export function getLoreFactsByCategory(categoryId: string): LoreFact[] {
  if (!categoryId || categoryId === "all") {
    return MASTER_LORE_DATABASE;
  }
  return MASTER_LORE_DATABASE.filter(f => f.category.toLowerCase() === categoryId.toLowerCase());
}

// Search across lore database
export function searchLoreFacts(query: string, categoryFilter?: string): LoreFact[] {
  const pool = (!categoryFilter || categoryFilter === "all")
    ? MASTER_LORE_DATABASE
    : getLoreFactsByCategory(categoryFilter);

  if (!query || !query.trim()) {
    return pool;
  }

  const q = query.toLowerCase().trim();
  return pool.filter(f => 
    f.fact.toLowerCase().includes(q) ||
    f.universe.toLowerCase().includes(q) ||
    f.tags.some(t => t.toLowerCase().includes(q))
  );
}
