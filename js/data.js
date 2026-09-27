// Données du jeu et sauvegarde
window.FM = window.FM || {};

FM.CHARS = [
  {
    key: 'boy', name: 'Léo', desc: 'Un petit garçon courageux', cost: 0,
    outfits: [
      { name: 'Haillons', cost: 0 },
      { name: 'Sportif', cost: 150 },
      { name: 'Chevalier', cost: 250 }
    ]
  },
  {
    key: 'alien', name: 'Zork', desc: 'Un extraterrestre rigolo', cost: 300,
    outfits: [
      { name: 'Combi argentée', cost: 0 },
      { name: 'Astronaute', cost: 150 },
      { name: 'Rockeur', cost: 250 }
    ]
  },
  {
    key: 'princess', name: 'Rose', desc: 'Une princesse sportive', cost: 600,
    outfits: [
      { name: 'Robe rose', cost: 0 },
      { name: 'Fée', cost: 150 },
      { name: 'Reine', cost: 250 }
    ]
  },
  {
    key: 'dog', name: 'Toby', desc: 'Un chien toujours content', cost: 800,
    outfits: [
      { name: 'Toutou', cost: 0 },
      { name: 'Aviateur', cost: 200 },
      { name: 'Pompier', cost: 300 }
    ]
  },
  {
    key: 'cat', name: 'Minou', desc: 'Un chat malin et agile', cost: 1000,
    outfits: [
      { name: 'Chat orange', cost: 0 },
      { name: 'Chat botté', cost: 250 },
      { name: 'Chat pirate', cost: 400 }
    ]
  },
  {
    key: 'robot', name: 'Robo-Bob', desc: 'Un robot ultra rapide', cost: 1300,
    outfits: [
      { name: 'Chrome', cost: 0 },
      { name: 'Doré', cost: 300 },
      { name: 'Racer', cost: 500 }
    ]
  },
  {
    key: 'ninja', name: 'Kai', desc: 'Un ninja silencieux', cost: 1600,
    outfits: [
      { name: 'Ninja noir', cost: 0 },
      { name: 'Ninja rouge', cost: 400 },
      { name: 'Ninja glace', cost: 650 }
    ]
  },
  {
    key: 'pirate', name: 'Jack', desc: 'Un jeune pirate courageux', cost: 2000,
    outfits: [
      { name: 'Pirate', cost: 0 },
      { name: 'Capitaine', cost: 500 },
      { name: 'Marin', cost: 800 }
    ]
  },
  {
    key: 'hero', name: 'Super Léa', desc: 'Une super-héroïne', cost: 2400,
    outfits: [
      { name: 'Super Léa', cost: 0 },
      { name: 'Éclair', cost: 600 },
      { name: 'Nuit', cost: 950 }
    ]
  },
  {
    key: 'ghost', name: 'Boo', desc: 'Un fantôme très gentil', cost: 2900,
    outfits: [
      { name: 'Fantôme', cost: 0 },
      { name: 'Fantôme bleu', cost: 700 },
      { name: 'Roi fantôme', cost: 1150 }
    ]
  },
  {
    key: 'dino', name: 'Rexi', desc: 'Un bébé dinosaure', cost: 3400,
    outfits: [
      { name: 'Rexi vert', cost: 0 },
      { name: 'Volcan', cost: 850 },
      { name: 'Glacier', cost: 1350 }
    ]
  },
  {
    key: 'unicorn', name: 'Arc-en-ciel', desc: 'Une licorne magique', cost: 4000,
    outfits: [
      { name: 'Arc-en-ciel', cost: 0 },
      { name: 'Cosmique', cost: 1000 },
      { name: 'Dorée', cost: 1600 }
    ]
  },
  {
    key: 'wizard', name: 'Merlin', desc: 'Un magicien très sage', cost: 4700,
    outfits: [
      { name: 'Bleu', cost: 0 },
      { name: 'Rouge', cost: 1200 },
      { name: 'Sage vert', cost: 1900 }
    ]
  },
  {
    key: 'witch', name: 'Luna', desc: 'Une sorcière gentille', cost: 5400,
    outfits: [
      { name: 'Violette', cost: 0 },
      { name: 'Verte', cost: 1350 },
      { name: 'Étoilée', cost: 2150 }
    ]
  },
  {
    key: 'cowboy', name: 'Tex', desc: 'Un cowboy du far west', cost: 6200,
    outfits: [
      { name: 'Cow-boy', cost: 0 },
      { name: 'Shérif', cost: 1550 },
      { name: 'Cow-boy noir', cost: 2500 }
    ]
  },
  {
    key: 'penguin', name: 'Pino', desc: 'Un pingouin rigolo', cost: 7000,
    outfits: [
      { name: 'Classique', cost: 0 },
      { name: 'Explorateur', cost: 1750 },
      { name: 'Chic', cost: 2800 }
    ]
  },
  {
    key: 'bear', name: 'Bruno', desc: 'Un gros ours câlin', cost: 8000,
    outfits: [
      { name: 'Salopette', cost: 0 },
      { name: 'Ours polaire', cost: 2000 },
      { name: 'Cuisinier', cost: 3200 }
    ]
  },
  {
    key: 'bunny', name: 'Lola', desc: 'Une lapine sportive', cost: 9000,
    outfits: [
      { name: 'Robe rose', cost: 0 },
      { name: 'Salopette', cost: 2250 },
      { name: 'Ballerine', cost: 3600 }
    ]
  },
  {
    key: 'panda', name: 'Bao', desc: 'Un panda gourmand', cost: 10000,
    outfits: [
      { name: 'Panda', cost: 0 },
      { name: 'Kung-fu', cost: 2500 },
      { name: 'Astro-panda', cost: 4000 }
    ]
  },
  {
    key: 'dragon', name: 'Draco', desc: 'Un petit dragon', cost: 11500,
    outfits: [
      { name: 'Violet', cost: 0 },
      { name: 'Braise', cost: 2900 },
      { name: 'Émeraude', cost: 4600 }
    ]
  },
  {
    key: 'mummy', name: 'Ra', desc: "Une momie d'Égypte", cost: 13000,
    outfits: [
      { name: 'Bandelettes', cost: 0 },
      { name: 'Pharaon', cost: 3250 },
      { name: 'Momie rose', cost: 5200 }
    ]
  },
  {
    key: 'yeti', name: 'Yéti', desc: 'Le yéti des montagnes', cost: 15000,
    outfits: [
      { name: 'Yéti', cost: 0 },
      { name: 'Skieur', cost: 3750 },
      { name: 'Barbe à papa', cost: 6000 }
    ]
  },
  {
    key: 'pumpkin', name: 'Citrouille', desc: "Une citrouille d'Halloween", cost: 18000,
    outfits: [
      { name: 'Citrouille', cost: 0 },
      { name: 'Sorcier', cost: 4500 },
      { name: 'Royale', cost: 7200 }
    ]
  }
];

// 23 véhicules complètement décalés à débloquer (aucune tenue : un seul modèle chacun)
FM.VEHICLES = [
  { key: 'stroller', name: 'Poussette', desc: 'Pratique... pour un bébé', cost: 300 },
  { key: 'cart', name: 'Caddie', desc: 'Direct sorti du supermarché', cost: 500 },
  { key: 'vacuum', name: 'Aspirateur', desc: 'Glisse et avale la poussière', cost: 700 },
  { key: 'scooter', name: 'Trottinette', desc: 'Un classique de la cour de récré', cost: 900 },
  { key: 'skateboard', name: 'Planche à roulettes', desc: 'Petite mais qui envoie', cost: 1100 },
  { key: 'wheelbarrow', name: 'Brouette', desc: 'Empruntée au jardin', cost: 1400 },
  { key: 'suitcase', name: 'Valise à roulettes', desc: 'Prête pour l\'aéroport', cost: 1700 },
  { key: 'officechair', name: 'Fauteuil de bureau', desc: 'Roulettes en folie', cost: 2000 },
  { key: 'mower', name: 'Tondeuse à gazon', desc: 'Vroum vroum sur la piste', cost: 2400 },
  { key: 'dolly', name: 'Diable de déménageur', desc: 'Fait pour transporter... toi', cost: 2800 },
  { key: 'bathtub', name: 'Baignoire', desc: 'Bain de vitesse garanti', cost: 3300 },
  { key: 'sofa', name: 'Canapé', desc: 'Le confort avant tout', cost: 3800 },
  { key: 'piano', name: 'Piano à roulettes', desc: 'Une course en musique', cost: 4400 },
  { key: 'rockinghorse', name: 'Cheval à bascule', desc: 'Dada, mais rapide', cost: 5000 },
  { key: 'kart', name: 'Kart à pédales', desc: 'Le vrai esprit course', cost: 5700 },
  { key: 'bumpercar', name: 'Voiture tamponneuse', desc: 'Ça tape, ça fonce', cost: 6500 },
  { key: 'dragonfloat', name: 'Dragon gonflable', desc: 'Tout droit sorti de la piscine', cost: 7400 },
  { key: 'carpet', name: 'Tapis volant', desc: 'Un peu de magie sur la piste', cost: 8400 },
  { key: 'carriage', name: 'Carrosse royal', desc: 'Une arrivée très chic', cost: 9500 },
  { key: 'walker', name: 'Robot marcheur', desc: 'Un pilote mécanique', cost: 10800 },
  { key: 'saucer', name: 'Soucoupe volante', desc: 'Droit venue de l\'espace', cost: 12200 },
  { key: 'rocketsled', name: 'Traîneau fusée', desc: 'Ça glisse à toute vitesse', cost: 13800 },
  { key: 'rocket', name: 'Fusée miniature', desc: 'Le bolide ultime !', cost: 15600 }
];

FM.SAVE_KEY = 'fivemax_save_v1';

FM.defaultSave = function () {
  const s = { coins: 0, best: 0, selected: 'boy', unlocked: {}, owned: {}, equipped: {}, music: true, sfx: true, runs: 0, selectedVehicle: 'none', vehicleUnlocked: {} };
  FM.CHARS.forEach((c) => { s.unlocked[c.key] = c.cost === 0; s.owned[c.key] = [true, false, false]; s.equipped[c.key] = 0; });
  FM.VEHICLES.forEach((v) => { s.vehicleUnlocked[v.key] = false; });
  return s;
};

FM.loadSave = function () {
  const d = FM.defaultSave();
  try {
    const raw = localStorage.getItem(FM.SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return Object.assign(d, s, {
        unlocked: Object.assign(d.unlocked, s.unlocked),
        owned: Object.assign(d.owned, s.owned),
        equipped: Object.assign(d.equipped, s.equipped),
        vehicleUnlocked: Object.assign(d.vehicleUnlocked, s.vehicleUnlocked)
      });
    }
  } catch (e) { /* stockage indisponible : on joue quand même */ }
  return d;
};

FM.persist = function () {
  try { localStorage.setItem(FM.SAVE_KEY, JSON.stringify(FM.save)); } catch (e) { /* ignore */ }
};

FM.save = FM.loadSave();

// Efface toute la progression (en gardant le même objet pour que tout le jeu voie le changement)
FM.resetSave = function () {
  try { localStorage.removeItem(FM.SAVE_KEY); } catch (e) { /* ignore */ }
  Object.keys(FM.save).forEach((k) => delete FM.save[k]);
  Object.assign(FM.save, FM.defaultSave());
  FM.persist();
};
