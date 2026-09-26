// Gazetteer for resolving captions and location tags to a place hierarchy:
//   country → province → city / town → suburb / estate
//
// Factual geography only. It exists so the site can group what the archive
// actually contains; a place listed here is never rendered unless at least one
// residence resolves to it.
//
// Flags
//   common   — the name is also an ordinary word or first name ("Strand",
//              "Wilderness", "George"); it is only matched from a location tag,
//              a 📍 line or a hashtag, never from free caption text.
//   shared   — the same name exists in more than one city ("Morningside" is in
//              Johannesburg and Durban); free-text matches need a
//              disambiguating city or province in the same caption.

const ZA = 'South Africa';
const WC = 'Western Cape';
const GP = 'Gauteng';
const KZN = 'KwaZulu-Natal';
const EC = 'Eastern Cape';
const MP = 'Mpumalanga';
const LP = 'Limpopo';
const NW = 'North West';
const FS = 'Free State';

// [name, kind, city, province, region, aliases, flags, country]
const ROWS = [
  // ---- Western Cape · Cape Town ------------------------------------------------
  ['Cape Town', 'city', 'Cape Town', WC, null, ['Kaapstad', 'CPT', 'Cape Town CBD', 'City Centre']],
  ['Clifton', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Camps Bay', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard', ['Campsbay']],
  ['Bakoven', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Bantry Bay', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Fresnaye', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Sea Point', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard', ['Seapoint']],
  ['Three Anchor Bay', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Green Point', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Mouille Point', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Llandudno', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard'],
  ['Hout Bay', 'suburb', 'Cape Town', WC, 'Atlantic Seaboard', ['Houtbay']],
  ['V&A Waterfront', 'suburb', 'Cape Town', WC, 'City Bowl', ['Waterfront', 'V & A Waterfront', 'Victoria & Alfred Waterfront']],
  ['De Waterkant', 'suburb', 'Cape Town', WC, 'City Bowl'],
  ['Tamboerskloof', 'suburb', 'Cape Town', WC, 'City Bowl'],
  ['Oranjezicht', 'suburb', 'Cape Town', WC, 'City Bowl'],
  ['Higgovale', 'suburb', 'Cape Town', WC, 'City Bowl'],
  ['Vredehoek', 'suburb', 'Cape Town', WC, 'City Bowl'],
  ['Gardens', 'suburb', 'Cape Town', WC, 'City Bowl', [], ['common']],
  ['Bo-Kaap', 'suburb', 'Cape Town', WC, 'City Bowl', ['Bo Kaap']],
  ['Constantia', 'suburb', 'Cape Town', WC, 'Southern Suburbs', ['Constantia Valley']],
  ['Bishopscourt', 'suburb', 'Cape Town', WC, 'Southern Suburbs'],
  ['Newlands', 'suburb', 'Cape Town', WC, 'Southern Suburbs', [], ['shared']],
  ['Claremont', 'suburb', 'Cape Town', WC, 'Southern Suburbs', ['Upper Claremont'], ['shared']],
  ['Rondebosch', 'suburb', 'Cape Town', WC, 'Southern Suburbs'],
  ['Kenilworth', 'suburb', 'Cape Town', WC, 'Southern Suburbs', [], ['shared']],
  ['Wynberg', 'suburb', 'Cape Town', WC, 'Southern Suburbs', ['Upper Wynberg']],
  ['Bergvliet', 'suburb', 'Cape Town', WC, 'Southern Suburbs'],
  ['Tokai', 'suburb', 'Cape Town', WC, 'Southern Suburbs'],
  ['Kirstenhof', 'suburb', 'Cape Town', WC, 'Southern Suburbs'],
  ['Noordhoek', 'suburb', 'Cape Town', WC, 'South Peninsula'],
  ['Kommetjie', 'suburb', 'Cape Town', WC, 'South Peninsula'],
  ['Scarborough', 'suburb', 'Cape Town', WC, 'South Peninsula'],
  ['Muizenberg', 'suburb', 'Cape Town', WC, 'South Peninsula'],
  ['St James', 'suburb', 'Cape Town', WC, 'South Peninsula', [], ['common']],
  ['Kalk Bay', 'suburb', 'Cape Town', WC, 'South Peninsula'],
  ['Fish Hoek', 'suburb', 'Cape Town', WC, 'South Peninsula'],
  ['Simon\'s Town', 'suburb', 'Cape Town', WC, 'South Peninsula', ['Simonstown', 'Simons Town']],
  ['Bloubergstrand', 'suburb', 'Cape Town', WC, 'Blaauwberg', ['Blouberg', 'Big Bay']],
  ['Melkbosstrand', 'suburb', 'Cape Town', WC, 'Blaauwberg', ['Melkbos']],
  ['Durbanville', 'suburb', 'Cape Town', WC, 'Northern Suburbs'],
  ['Somerset West', 'town', 'Somerset West', WC, 'Helderberg'],
  ['Erinvale', 'estate', 'Somerset West', WC, 'Helderberg', ['Erinvale Estate', 'Erinvale Golf Estate']],
  ['Gordon\'s Bay', 'town', 'Gordon\'s Bay', WC, 'Helderberg', ['Gordons Bay']],

  // ---- Western Cape · Winelands ------------------------------------------------
  ['Stellenbosch', 'town', 'Stellenbosch', WC, 'Cape Winelands', ['Stellies']],
  ['De Zalze', 'estate', 'Stellenbosch', WC, 'Cape Winelands', ['De Zalze Winelands Golf Estate']],
  ['Jonkershoek', 'suburb', 'Stellenbosch', WC, 'Cape Winelands'],
  ['Franschhoek', 'town', 'Franschhoek', WC, 'Cape Winelands'],
  ['Paarl', 'town', 'Paarl', WC, 'Cape Winelands'],
  ['Val de Vie', 'estate', 'Paarl', WC, 'Cape Winelands', ['Val de Vie Estate', 'ValdeVie']],
  ['Pearl Valley', 'estate', 'Paarl', WC, 'Cape Winelands', ['Pearl Valley Golf Estate']],
  ['Wellington', 'town', 'Wellington', WC, 'Cape Winelands', [], ['common']],
  ['Tulbagh', 'town', 'Tulbagh', WC, 'Cape Winelands'],
  ['Robertson', 'town', 'Robertson', WC, 'Cape Winelands', [], ['common']],
  ['McGregor', 'town', 'McGregor', WC, 'Cape Winelands', [], ['common']],
  ['Riebeek Kasteel', 'town', 'Riebeek Kasteel', WC, 'Swartland'],

  // ---- Western Cape · Overberg -------------------------------------------------
  ['Hermanus', 'town', 'Hermanus', WC, 'Overberg'],
  ['Onrus', 'suburb', 'Hermanus', WC, 'Overberg', ['Onrusrivier']],
  ['Kleinmond', 'town', 'Kleinmond', WC, 'Overberg'],
  ['Arabella', 'estate', 'Kleinmond', WC, 'Overberg', ['Arabella Country Estate']],
  ['Betty\'s Bay', 'town', 'Betty\'s Bay', WC, 'Overberg', ['Bettys Bay']],
  ['Pringle Bay', 'town', 'Pringle Bay', WC, 'Overberg'],
  ['Rooi-Els', 'town', 'Rooi-Els', WC, 'Overberg', ['Rooi Els', 'Rooiels']],
  ['Stanford', 'town', 'Stanford', WC, 'Overberg', [], ['common']],
  ['Greyton', 'town', 'Greyton', WC, 'Overberg'],
  ['Gansbaai', 'town', 'Gansbaai', WC, 'Overberg'],
  ['Arniston', 'town', 'Arniston', WC, 'Overberg', ['Waenhuiskrans']],

  // ---- Western Cape · Garden Route & Klein Karoo --------------------------------
  ['Plettenberg Bay', 'town', 'Plettenberg Bay', WC, 'Garden Route', ['Plett', 'Plett Bay']],
  ['Keurboomstrand', 'suburb', 'Plettenberg Bay', WC, 'Garden Route', ['Keurbooms']],
  ['Knysna', 'town', 'Knysna', WC, 'Garden Route'],
  ['Leisure Isle', 'suburb', 'Knysna', WC, 'Garden Route'],
  ['Thesen Islands', 'estate', 'Knysna', WC, 'Garden Route', ['Thesen Island']],
  ['Pezula', 'estate', 'Knysna', WC, 'Garden Route', ['Pezula Private Estate']],
  ['Brenton-on-Sea', 'suburb', 'Knysna', WC, 'Garden Route', ['Brenton on Sea']],
  ['Sedgefield', 'town', 'Sedgefield', WC, 'Garden Route'],
  ['Wilderness', 'town', 'Wilderness', WC, 'Garden Route', [], ['common']],
  ['George', 'city', 'George', WC, 'Garden Route', [], ['common']],
  ['Fancourt', 'estate', 'George', WC, 'Garden Route', ['Fancourt Estate']],
  ['Herolds Bay', 'town', 'Herolds Bay', WC, 'Garden Route', ['Herold\'s Bay']],
  ['Mossel Bay', 'town', 'Mossel Bay', WC, 'Garden Route'],
  ['Pinnacle Point', 'estate', 'Mossel Bay', WC, 'Garden Route', ['Pinnacle Point Estate']],
  ['Oudtshoorn', 'town', 'Oudtshoorn', WC, 'Klein Karoo'],
  ['Prince Albert', 'town', 'Prince Albert', WC, 'Great Karoo', [], ['common']],

  // ---- Western Cape · West Coast -----------------------------------------------
  ['Langebaan', 'town', 'Langebaan', WC, 'West Coast'],
  ['Paternoster', 'town', 'Paternoster', WC, 'West Coast'],
  ['Yzerfontein', 'town', 'Yzerfontein', WC, 'West Coast'],
  ['Jacobsbaai', 'town', 'Jacobsbaai', WC, 'West Coast', ['Jacobs Bay']],
  ['Shelley Point', 'estate', 'St Helena Bay', WC, 'West Coast'],

  // ---- Gauteng · Johannesburg --------------------------------------------------
  ['Johannesburg', 'city', 'Johannesburg', GP, null, ['Joburg', 'Jozi', 'JHB', 'Jo\'burg']],
  ['Sandton', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Sandhurst', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Sandown', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Hyde Park', 'suburb', 'Johannesburg', GP, 'Sandton', [], ['shared']],
  ['Inanda', 'suburb', 'Johannesburg', GP, 'Sandton', [], ['shared']],
  ['Atholl', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Morningside', 'suburb', 'Johannesburg', GP, 'Sandton', ['Morningside Manor'], ['shared']],
  ['Bryanston', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Illovo', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Hurlingham', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Rivonia', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Parkmore', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Dunkeld', 'suburb', 'Johannesburg', GP, 'Rosebank', ['Dunkeld West']],
  ['Craighall', 'suburb', 'Johannesburg', GP, 'Rosebank', ['Craighall Park']],
  ['Rosebank', 'suburb', 'Johannesburg', GP, 'Rosebank', [], ['shared']],
  ['Melrose', 'suburb', 'Johannesburg', GP, 'Rosebank', ['Melrose Estate', 'Melrose North']],
  ['Houghton', 'suburb', 'Johannesburg', GP, 'Houghton', ['Houghton Estate', 'Lower Houghton']],
  ['Westcliff', 'suburb', 'Johannesburg', GP, 'Parktown'],
  ['Parktown', 'suburb', 'Johannesburg', GP, 'Parktown', ['Parktown North']],
  ['Parkview', 'suburb', 'Johannesburg', GP, 'Parktown'],
  ['Saxonwold', 'suburb', 'Johannesburg', GP, 'Parktown'],
  ['Forest Town', 'suburb', 'Johannesburg', GP, 'Parktown'],
  ['Emmarentia', 'suburb', 'Johannesburg', GP, 'Northcliff'],
  ['Northcliff', 'suburb', 'Johannesburg', GP, 'Northcliff'],
  ['Fourways', 'suburb', 'Johannesburg', GP, 'Fourways'],
  ['Dainfern', 'estate', 'Johannesburg', GP, 'Fourways', ['Dainfern Golf Estate', 'Dainfern Valley']],
  ['Lonehill', 'suburb', 'Johannesburg', GP, 'Fourways'],
  ['Steyn City', 'estate', 'Johannesburg', GP, 'Fourways'],
  ['Kyalami', 'suburb', 'Johannesburg', GP, 'Midrand', ['Kyalami Estate']],
  ['Waterfall', 'estate', 'Johannesburg', GP, 'Midrand', ['Waterfall Estate', 'Waterfall Country Estate', 'Waterfall Equestrian Estate'], ['common']],
  ['Midrand', 'suburb', 'Johannesburg', GP, 'Midrand'],
  ['Sunninghill', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Woodmead', 'suburb', 'Johannesburg', GP, 'Sandton'],
  ['Bedfordview', 'town', 'Bedfordview', GP, 'Ekurhuleni'],
  ['Serengeti Estate', 'estate', 'Kempton Park', GP, 'Ekurhuleni', ['Serengeti Golf & Wildlife Estate', 'Serengeti Golf Estate']],

  // ---- Gauteng · Pretoria ------------------------------------------------------
  ['Pretoria', 'city', 'Pretoria', GP, null, ['Tshwane', 'PTA']],
  ['Waterkloof', 'suburb', 'Pretoria', GP, 'Pretoria East', ['Waterkloof Ridge', 'Waterkloof Heights', 'Waterkloof Park'], ['shared']],
  ['Brooklyn', 'suburb', 'Pretoria', GP, 'Pretoria East', [], ['common']],
  ['Lynnwood', 'suburb', 'Pretoria', GP, 'Pretoria East'],
  ['Menlo Park', 'suburb', 'Pretoria', GP, 'Pretoria East'],
  ['Groenkloof', 'suburb', 'Pretoria', GP, 'Pretoria East'],
  ['Erasmuskloof', 'suburb', 'Pretoria', GP, 'Pretoria East'],
  ['Faerie Glen', 'suburb', 'Pretoria', GP, 'Pretoria East'],
  ['Silver Lakes', 'estate', 'Pretoria', GP, 'Pretoria East', ['Silver Lakes Golf Estate', 'Silverlakes']],
  ['Mooikloof', 'estate', 'Pretoria', GP, 'Pretoria East', ['Mooikloof Equestrian Estate']],
  ['Woodhill', 'estate', 'Pretoria', GP, 'Pretoria East', ['Woodhill Golf Estate']],
  ['Irene', 'suburb', 'Centurion', GP, 'Centurion', [], ['common']],
  ['Centurion', 'city', 'Centurion', GP, 'Centurion'],
  ['Copperleaf', 'estate', 'Centurion', GP, 'Centurion', ['Copperleaf Golf Estate']],
  ['Blue Valley', 'estate', 'Centurion', GP, 'Centurion', ['Blue Valley Golf Estate']],

  // ---- North West --------------------------------------------------------------
  ['Hartbeespoort', 'town', 'Hartbeespoort', NW, 'Hartbeespoort', ['Harties']],
  ['Pecanwood', 'estate', 'Hartbeespoort', NW, 'Hartbeespoort', ['Pecanwood Estate', 'Pecanwood Golf Estate']],

  // ---- KwaZulu-Natal · Durban & North Coast -------------------------------------
  ['Durban', 'city', 'Durban', KZN, null, ['eThekwini', 'Durbs']],
  ['Umhlanga', 'suburb', 'Durban', KZN, 'Umhlanga', ['Umhlanga Rocks', 'Umhlanga Ridge']],
  ['La Lucia', 'suburb', 'Durban', KZN, 'Umhlanga'],
  ['Sibaya', 'estate', 'Durban', KZN, 'Umhlanga', ['Sibaya Coastal Precinct']],
  ['Izinga', 'estate', 'Durban', KZN, 'Umhlanga', ['Izinga Ridge']],
  ['Umdloti', 'suburb', 'Durban', KZN, 'Umhlanga'],
  ['Durban North', 'suburb', 'Durban', KZN, 'Durban North'],
  ['Glenashley', 'suburb', 'Durban', KZN, 'Durban North'],
  ['Mount Edgecombe', 'estate', 'Durban', KZN, 'Umhlanga', ['Mount Edgecombe Country Club Estate']],
  ['Westville', 'suburb', 'Durban', KZN, 'Outer West'],
  ['Kloof', 'suburb', 'Durban', KZN, 'Outer West', [], ['common']],
  ['Hillcrest', 'suburb', 'Durban', KZN, 'Outer West', [], ['shared']],
  ['Ballito', 'town', 'Ballito', KZN, 'North Coast'],
  ['Zimbali', 'estate', 'Ballito', KZN, 'North Coast', ['Zimbali Coastal Resort', 'Zimbali Lakes', 'Zimbali Estate']],
  ['Simbithi', 'estate', 'Ballito', KZN, 'North Coast', ['Simbithi Eco-Estate', 'Simbithi Eco Estate']],
  ['Brettenwood', 'estate', 'Ballito', KZN, 'North Coast', ['Brettenwood Coastal Estate']],
  ['Salt Rock', 'town', 'Salt Rock', KZN, 'North Coast', ['Saltrock']],
  ['Sheffield Beach', 'town', 'Sheffield Beach', KZN, 'North Coast'],
  ['Prince\'s Grant', 'estate', 'Blythedale', KZN, 'North Coast', ['Princes Grant']],
  ['Southbroom', 'town', 'Southbroom', KZN, 'South Coast'],
  ['San Lameer', 'estate', 'Southbroom', KZN, 'South Coast'],
  ['Howick', 'town', 'Howick', KZN, 'Midlands'],
  ['Hilton', 'town', 'Hilton', KZN, 'Midlands', [], ['common']],
  ['Nottingham Road', 'town', 'Nottingham Road', KZN, 'Midlands'],
  ['St Lucia', 'town', 'St Lucia', KZN, 'Zululand'],

  // ---- Eastern Cape ------------------------------------------------------------
  ['Gqeberha', 'city', 'Gqeberha', EC, 'Nelson Mandela Bay', ['Port Elizabeth']],
  ['Summerstrand', 'suburb', 'Gqeberha', EC, 'Nelson Mandela Bay'],
  ['St Francis Bay', 'town', 'St Francis Bay', EC, 'Kouga', ['St Francis', 'Cape St Francis']],
  ['Jeffreys Bay', 'town', 'Jeffreys Bay', EC, 'Kouga', ['J-Bay', 'Jeffrey\'s Bay']],
  ['Kenton-on-Sea', 'town', 'Kenton-on-Sea', EC, 'Sunshine Coast', ['Kenton on Sea']],
  ['Port Alfred', 'town', 'Port Alfred', EC, 'Sunshine Coast'],
  ['East London', 'city', 'East London', EC, 'Buffalo City'],
  ['Chintsa', 'town', 'Chintsa', EC, 'Wild Coast', ['Cintsa']],

  // ---- Mpumalanga, Limpopo, Free State -------------------------------------------
  ['White River', 'town', 'White River', MP, 'Lowveld'],
  ['Hazyview', 'town', 'Hazyview', MP, 'Lowveld'],
  ['Mbombela', 'city', 'Mbombela', MP, 'Lowveld', ['Nelspruit']],
  ['Sabi Sand', 'region', 'Sabi Sand', MP, 'Greater Kruger', ['Sabi Sands', 'Sabi Sand Game Reserve']],
  ['Leopard Creek', 'estate', 'Malelane', MP, 'Lowveld', ['Leopard Creek Country Club Estate']],
  ['Dullstroom', 'town', 'Dullstroom', MP, 'Highlands'],
  ['Hoedspruit', 'town', 'Hoedspruit', LP, 'Greater Kruger'],
  ['Waterberg', 'region', 'Waterberg', LP, 'Waterberg'],
  ['Clarens', 'town', 'Clarens', FS, 'Eastern Free State'],
  ['Parys', 'town', 'Parys', FS, 'Vredefort Dome'],

  // ---- Regions (grouping only) ---------------------------------------------------
  ['Atlantic Seaboard', 'region', null, WC, 'Atlantic Seaboard'],
  ['Southern Suburbs', 'region', null, WC, 'Southern Suburbs'],
  ['Cape Winelands', 'region', null, WC, 'Cape Winelands', ['Winelands']],
  ['Garden Route', 'region', null, WC, 'Garden Route'],
  ['Overberg', 'region', null, WC, 'Overberg'],
  ['West Coast', 'region', null, WC, 'West Coast', [], ['common']],
  ['North Coast', 'region', null, KZN, 'North Coast', ['KZN North Coast', 'Dolphin Coast']],

  // ---- Provinces -----------------------------------------------------------------
  [WC, 'province', null, WC, null, ['WC']],
  [GP, 'province', null, GP, null, ['GP']],
  [KZN, 'province', null, KZN, null, ['KZN', 'Kwazulu Natal', 'KwaZulu Natal']],
  [EC, 'province', null, EC, null, []],
  [MP, 'province', null, MP, null, []],
  [LP, 'province', null, LP, null, []],
  [NW, 'province', null, NW, null, []],
  [FS, 'province', null, FS, null, []],
  ['Northern Cape', 'province', null, 'Northern Cape', null, []],

  // ---- "In and around South Africa" -----------------------------------------------
  [ZA, 'country', null, null, null, ['SA', 'RSA', 'Mzansi', 'Suid-Afrika']],
  ['Mauritius', 'country', null, null, null, [], [], 'Mauritius'],
  ['Namibia', 'country', null, null, null, [], [], 'Namibia'],
  ['Swakopmund', 'town', 'Swakopmund', null, 'Erongo', [], [], 'Namibia'],
  ['Windhoek', 'city', 'Windhoek', null, 'Khomas', [], [], 'Namibia'],
  ['Botswana', 'country', null, null, null, [], [], 'Botswana'],
  ['Mozambique', 'country', null, null, null, [], [], 'Mozambique'],
  ['Ponta do Ouro', 'town', 'Ponta do Ouro', null, 'Maputo Province', [], [], 'Mozambique'],
  ['Vilanculos', 'town', 'Vilanculos', null, 'Inhambane', ['Vilankulo'], [], 'Mozambique'],
  ['Zimbabwe', 'country', null, null, null, [], [], 'Zimbabwe'],
  ['Victoria Falls', 'town', 'Victoria Falls', null, 'Matabeleland North', [], [], 'Zimbabwe'],
  ['Seychelles', 'country', null, null, null, [], [], 'Seychelles'],
  ['Eswatini', 'country', null, null, null, ['Swaziland'], [], 'Eswatini'],
  ['Lesotho', 'country', null, null, null, [], [], 'Lesotho'],
];

// Places that share a name with a place in another city.
const SHARED_ALTERNATIVES = {
  morningside: [{ city: 'Durban', province: KZN, region: 'Berea' }],
  rosebank: [{ city: 'Cape Town', province: WC, region: 'Southern Suburbs' }],
  waterkloof: [{ city: 'Somerset West', province: WC, region: 'Helderberg' }],
  kenilworth: [{ city: 'Johannesburg', province: GP, region: 'Southern Suburbs' }],
  claremont: [{ city: 'Pretoria', province: GP, region: 'Pretoria West' }],
  newlands: [{ city: 'Johannesburg', province: GP, region: 'Northcliff' }, { city: 'Pretoria', province: GP, region: 'Pretoria East' }],
  hillcrest: [{ city: 'Pretoria', province: GP, region: 'Pretoria East' }],
  inanda: [{ city: 'Durban', province: KZN, region: 'Inanda' }],
  // London's Hyde Park has no South African alternative; it only needs context.
  'hyde park': [],
};

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const PLACES = ROWS.map(([name, kind, city, province, region, aliases = [], flags = [], country = ZA]) => ({
  id: slug(`${country === ZA ? '' : country + '-'}${name}`),
  name,
  kind,
  city,
  province,
  region,
  country,
  aliases,
  common: flags.includes('common'),
  shared: flags.includes('shared'),
}));

const RANK = { estate: 6, suburb: 5, town: 4, city: 3, region: 2, province: 1, country: 0 };

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const namePattern = (label) => new RegExp(String.raw`(?<![\p{L}\d])${escape(label).replace(/\\?[ -]/g, '[\\s-]?')}(?![\p{L}\d])`, 'iu');

const INDEX = PLACES.flatMap((place) =>
  [place.name, ...place.aliases].map((label) => ({ place, label, re: namePattern(label), compact: slug(label).replace(/-/g, '') })),
);

// Find every gazetteer place mentioned in a string.
function scan(text, { allowCommon }) {
  const found = [];
  for (const { place, label, re } of INDEX) {
    if (place.common && !allowCommon && label === place.name) continue;
    // Short uppercase aliases ("SA", "WC", "GP", "CPT") must match exactly in case.
    if (label.length <= 3 && label === label.toUpperCase()) {
      if (!new RegExp(String.raw`(?<![\p{L}\d])${escape(label)}(?![\p{L}\d])`, 'u').test(text)) continue;
    } else if (!re.test(text)) continue;
    found.push({ place, label });
  }
  // One hit per place, keeping the longest label: "Waterkloof Ridge" beats "Waterkloof".
  const byPlace = new Map();
  for (const hit of found) {
    const prev = byPlace.get(hit.place.id);
    if (!prev || hit.label.length > prev.label.length) byPlace.set(hit.place.id, hit);
  }
  return [...byPlace.values()];
}

function scanHashtags(hashtags) {
  const found = [];
  for (const tag of hashtags) {
    for (const entry of INDEX) {
      if (entry.compact.length >= 4 && tag === entry.compact) found.push({ place: entry.place, label: `#${tag}` });
    }
  }
  return found;
}

function hierarchy(place) {
  const out = { country: place.country, province: place.province, city: place.city, region: place.region, suburb: null, estate: null };
  if (place.kind === 'suburb') out.suburb = place.name;
  if (place.kind === 'estate') out.estate = place.name;
  return out;
}

// Resolve a post's location from its evidence, most trustworthy first.
//   inputs: { locationTag, locationLines: [string], caption, hashtags: [string] }
// Returns null when nothing in the gazetteer is mentioned.
export function resolvePlace({ locationTag = null, locationLines = [], caption = '', hashtags = [] }) {
  const norm = (t) => String(t ?? '').replace(/[’‘]/g, "'");
  locationTag = locationTag ? norm(locationTag) : null;
  locationLines = locationLines.map(norm);
  caption = norm(caption);
  const layers = [
    { source: 'location-tag', confidence: 'high', hits: locationTag ? scan(locationTag, { allowCommon: true }) : [] },
    { source: 'caption-location-line', confidence: 'high', hits: locationLines.flatMap((l) => scan(l, { allowCommon: true })) },
    { source: 'caption-text', confidence: 'medium', hits: scan(caption, { allowCommon: false }) },
    { source: 'hashtag', confidence: 'low', hits: scanHashtags(hashtags) },
  ];

  const all = layers.flatMap((l) => l.hits.map((h) => ({ ...h, source: l.source, confidence: l.confidence })));
  if (!all.length) return null;

  // Context for shared names comes only from other, unambiguous mentions.
  const contextCities = new Set(all.filter((h) => !h.place.shared).map((h) => h.place.city).filter(Boolean));

  // Most specific place from the most trustworthy layer that mentions one.
  for (const layer of layers) {
    const hits = all.filter((h) => h.source === layer.source);
    if (!hits.length) continue;
    hits.sort((a, b) => RANK[b.place.kind] - RANK[a.place.kind]);
    const best = hits[0];
    let resolved = hierarchy(best.place);
    let confidence = best.confidence;
    const notes = [];

    if (best.place.shared && best.label === best.place.name) {
      const alternatives = SHARED_ALTERNATIVES[best.place.name.toLowerCase()] ?? [];
      const override = alternatives.find((alt) => contextCities.has(alt.city));
      if (override) {
        resolved = { ...resolved, city: override.city, province: override.province, region: override.region };
        notes.push(`"${best.place.name}" read as ${override.city} from context`);
      } else if (!contextCities.has(best.place.city)) {
        confidence = 'low';
        notes.push(`"${best.place.name}" is ambiguous without a city in the same post`);
      }
    }

    // Conflicting specific places at the same rank lower confidence.
    const conflicts = hits.filter((h) => h !== best && RANK[h.place.kind] === RANK[best.place.kind] && h.place.city !== best.place.city);
    if (conflicts.length) {
      confidence = confidence === 'high' ? 'medium' : 'low';
      notes.push(`also mentions ${[...new Set(conflicts.map((c) => c.place.name))].join(', ')}`);
    }

    return {
      placeId: best.place.id,
      name: best.place.name,
      kind: best.place.kind,
      ...resolved,
      source: layer.source,
      confidence,
      evidence: [...new Set(hits.map((h) => h.label))],
      notes,
    };
  }
  return null;
}
