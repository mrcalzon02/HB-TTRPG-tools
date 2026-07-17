(() => {
  'use strict';

  const palette = (name, base, dark, light, accent, secondary, cloud = '#eef4f6') => ({name,base,dark,light,accent,secondary,cloud});
  const profile = (id, label, render, palettes, variants, options = {}) => ({id,label,render,palettes,variants,...options});

  const profiles = [
    profile('star','Stellar photosphere','star',[
      palette('golden granulation','#f4bb4f','#9b3a18','#fff2a8','#ff6e2e','#d94c1a','#fff4c7'),
      palette('red dwarf convection','#e76543','#5f1018','#ffc29f','#ff3f31','#a72531','#ffd0b8'),
      palette('white stellar surface','#dbeaff','#647ba8','#ffffff','#9ecbff','#b2c3e0','#ffffff')
    ],['granulated photosphere','active flare belt','quiet stellar disk','prominence-rich limb'],{features:['convective cells','starspots','prominences','coronal glow']}),

    profile('belt','Debris and asteroid field','belt',[
      palette('silicate field','#7c746b','#201f20','#b9afa1','#9c8064','#555158','#d9d4cc'),
      palette('metal-rich field','#777f86','#20262b','#c8d2d8','#c39762','#4b555d','#e0e6e9'),
      palette('carbonaceous field','#4a4541','#151617','#81766d','#705245','#2f3030','#b9b1aa')
    ],['dense collisional belt','sparse rubble stream','metallic fragment field','carbonaceous debris family'],{features:['irregular fragments','dust lanes','size distribution','collision glints']}),

    profile('facility','Orbital installation','facility',[
      palette('blacklight industrial','#4d5f6a','#0b1014','#b4c4cc','#61d8d0','#27343c','#d7eff0'),
      palette('weathered station','#5b5b57','#111311','#aaa99e','#d9a84f','#31332f','#e9e1cf')
    ],['ring station','spindle habitat','modular yard','defense platform'],{features:['radiator wings','docking trusses','habitat lights','service modules']}),

    profile('hot-gas-giant','Hot gas giant','gas',[
      palette('copper storm bands','#a85d3f','#3b1720','#f0ae68','#f7d18a','#6d3040','#f5d5b3'),
      palette('violet hot giant','#694d87','#20172d','#bba7df','#dc766f','#44305e','#e5dcf4'),
      palette('charcoal ember giant','#5e5148','#181517','#b88d6e','#f06b3e','#332b2c','#d6bba8')
    ],['inflated equatorial bands','heat-driven chevrons','dark nightside giant','metal-vapor storm deck'],{features:['high-speed jets','thermal inversion haze','planet-scale vortices','glowing upper atmosphere']}),

    profile('gas-giant','Banded gas giant','gas',[
      palette('ochre ammonia bands','#b68a58','#4a3229','#edc88e','#b9573e','#765239','#f4e7ca'),
      palette('cream and rust bands','#c5a574','#4e3930','#f4dfad','#a94c38','#7b6344','#fff0d0'),
      palette('blue-gray storm giant','#71869b','#273442','#bacddd','#d9a84f','#4b6072','#e8f1f5'),
      palette('sage cloud giant','#849174','#2b352f','#cad4b6','#a66b4d','#566451','#edf1df')
    ],['broad zonal bands','turbulent belt-and-zone structure','storm-dominated hemisphere','pale ammonia deck'],{features:['zonal jets','oval storms','convective plumes','polar haze']}),

    profile('ice-giant','Methane-rich ice giant','ice-gas',[
      palette('cyan methane haze','#4f9fbd','#153849','#a8d8e8','#dbedf3','#2f718e','#e6f7fb'),
      palette('deep cobalt giant','#3e6b9b','#13243f','#8fb7dc','#b9d6ee','#284c75','#dcebf7'),
      palette('turquoise polar giant','#58a69e','#183e44','#a8ded5','#e0f5ef','#33746f','#e8faf6'),
      palette('pale glacial giant','#88aebd','#314d5e','#d3e5eb','#ffffff','#5f8798','#f5fbfc')
    ],['smooth methane globe','dark-storm ice giant','polar-vortex giant','subtle banded ice giant'],{features:['methane haze','dark anticyclones','high white clouds','polar brightening']}),

    profile('ocean','Ocean-dominated world','ocean',[
      palette('deep pelagic world','#1e5f91','#07213c','#59a9cf','#3f7c53','#163e66','#edf7fb'),
      palette('turquoise shallow ocean','#228c9c','#07373f','#74d1cf','#b2a66e','#176674','#f2ffff'),
      palette('violet alien ocean','#514b91','#1b183f','#918ac7','#5f8a6a','#312967','#eeeaff'),
      palette('dark abyssal ocean','#163e5f','#061521','#3979a0','#506847','#0d2b43','#d9eff8')
    ],['global pelagic ocean','archipelago ocean','storm-wrapped water world','ice-rimmed ocean planet'],{features:['gyre coloration','island arcs','storm spirals','polar sea ice']}),

    profile('temperate','Temperate continental world','continents',[
      palette('blue-green terrestrial','#286b93','#09243b','#6da9c2','#4c7e42','#b28d56','#f3f7f5'),
      palette('olive continental world','#3d7183','#132c36','#7fa9ad','#71814c','#b49062','#f1f0e6'),
      palette('teal and violet biosphere','#347f82','#102e35','#7fb9b0','#6c5d88','#b78067','#f2eef5'),
      palette('dark forest world','#245d72','#081e29','#5b91a0','#315e3c','#9c7950','#edf4ef')
    ],['large continental plates','archipelago-dominated world','equatorial supercontinent','broken inland-sea world'],{features:['continental shelves','mountain chains','desert interiors','polar caps','weather systems']}),

    profile('super-earth','Dense-atmosphere super-Earth','dense-terrestrial',[
      palette('high-pressure green world','#365f68','#0e252c','#7ca4a5','#55734d','#8a6952','#dde7df'),
      palette('cloud-heavy super-Earth','#6e7f87','#253038','#b7c4c7','#65785a','#94735d','#f6f7f3'),
      palette('rust-and-sea super-Earth','#486e78','#17292f','#91aeb1','#9a5c3f','#665743','#edf1eb')
    ],['dense cloud labyrinth','high-gravity continental world','storm-belt super-Earth','tectonically active super-Earth'],{features:['thick cloud decks','compressed weather bands','massive highlands','broad volcanic provinces']}),

    profile('desert','Arid desert world','desert',[
      palette('iron dune world','#a26f45','#3c251d','#d7a76a','#d9b55c','#704230','#ead9bd'),
      palette('pale salt desert','#b6a889','#4c463b','#e8dfc7','#d8c78f','#837763','#f3ead4'),
      palette('red canyon world','#a34d35','#3b1718','#df8a5c','#d9a84f','#672b27','#e9c1a4'),
      palette('violet mineral desert','#75556f','#2d2030','#b38fa7','#bc8c63','#4e384b','#dfcedd')
    ],['dune-sea planet','canyon and basin world','salt-flat desert','dust-storm arid world'],{features:['dune fields','dry basins','canyon networks','dust storms','mineral flats']}),

    profile('greenhouse','Greenhouse or toxic-atmosphere world','haze',[
      palette('sulfuric cloud world','#b9a23e','#493d17','#e8d77b','#d37b36','#7b6828','#f4e8a8'),
      palette('amber pressure world','#a87534','#422713','#e3b768','#d9a84f','#6e4827','#f3d6a2'),
      palette('green chlorine haze','#71824c','#26331f','#b7c583','#d9b867','#4e6038','#e2ecc8'),
      palette('rose photochemical haze','#9c6672','#3f232d','#d5a2aa','#e0a45f','#704652','#f3d8dc')
    ],['opaque sulfuric cloud deck','layered photochemical haze','superrotating greenhouse atmosphere','toxic storm world'],{features:['opaque haze','superrotating clouds','acidic droplets','lightning silhouettes']}),

    profile('molten','Molten or magma-ocean world','molten',[
      palette('basaltic magma ocean','#6b231d','#0d0b0b','#d94a24','#ffbb3f','#321112','#ffdf86'),
      palette('yellow-white melt world','#9b3a17','#160b08','#f7772d','#ffd95b','#4b170f','#fff0a4'),
      palette('violet metal melt','#542238','#100a11','#b84862','#f4a84f','#2a1122','#f7d1ae')
    ],['magma-ocean planet','crust-raft molten world','tidally heated lava globe','metal-vapor melt world'],{features:['incandescent fissures','floating crust rafts','lava seas','volcanic plumes']}),

    profile('volcanic','Volcanically active world','volcanic',[
      palette('black basalt and lava','#3b3030','#0c0a0a','#73605d','#e0522b','#251d1d','#d8c3b7'),
      palette('sulfur volcanic world','#6b5d32','#1b1710','#aa9560','#e0b438','#42351c','#e7dcae'),
      palette('ash-gray tectonic world','#55555a','#151519','#96969d','#d35b37','#343238','#dedee2'),
      palette('oxidized volcanic world','#714231','#1d1110','#af7255','#f0853d','#482a21','#e8c3ad')
    ],['fissure-dominated basalt world','ash-cloud volcanic planet','sulfur caldera world','cryovolcanic-looking hot world'],{features:['lava fissures','caldera chains','ash plumes','sulfur deposits','tectonic scars']}),

    profile('frozen','Frozen or cryogenic world','frozen',[
      palette('blue fractured ice','#91b7c9','#2a485d','#d8edf4','#6f95b1','#55798d','#f7fcff'),
      palette('nitrogen ice world','#b3c5d1','#445566','#eef5f7','#d2b9c5','#7a8d9b','#ffffff'),
      palette('dirty glacier world','#87949a','#303c43','#cbd4d6','#8d7766','#5c696d','#edf2f2'),
      palette('methane frost world','#82adb5','#294c55','#cce5e3','#9f7f9f','#50747a','#f1fbf8')
    ],['fractured ice shell','glacier-plate world','nitrogen frost plain','cryovolcanic ice world'],{features:['polygonal ice plates','subsurface fractures','cryovolcanic domes','dark tholin streaks','frost basins']}),

    profile('carbon','Carbon-rich world','carbon',[
      palette('graphite and tholin world','#3d3435','#0a0a0c','#766266','#8f493f','#251f22','#bdb2b5'),
      palette('diamond-crust world','#424853','#0c0e12','#87909c','#b7d7e6','#272c34','#e4f5fa'),
      palette('tar-black hydrocarbon world','#322d29','#08090a','#665a4f','#8d5b3c','#1f1c19','#c9b8a8')
    ],['graphite badlands','diamond-rich fractured crust','tar and tholin world','carbonaceous impact world'],{features:['dark plains','crystalline facets','hydrocarbon stains','high-contrast impact rays']}),

    profile('metallic','Metal-rich terrestrial world','metallic',[
      palette('iron-nickel world','#74777b','#22262a','#c2c6c9','#bd7e50','#4d5257','#e9ecee'),
      palette('oxidized metal world','#75564a','#241b19','#b88c74','#d09a54','#49352e','#e6d4ca'),
      palette('blue steel world','#596a75','#19242b','#a5b5be','#7db2c5','#354651','#dce7ec')
    ],['faceted metallic crust','iron impact world','oxidized metal plains','reflective tectonic world'],{features:['metallic facets','impact basins','reflective scarps','oxidation provinces']}),

    profile('dwarf','Dwarf planet or volatile-rich minor world','dwarf',[
      palette('tholins and nitrogen ice','#8d654d','#2d211d','#c6a78d','#d7d2c5','#5a4035','#eee7df'),
      palette('bright volatile dwarf','#aeb6ba','#3b454b','#e7ecee','#b98469','#757f84','#ffffff'),
      palette('dark patchwork dwarf','#5a514e','#171719','#91827b','#9d6a52','#363033','#d4ccc8'),
      palette('pink ice dwarf','#a88488','#3b2d32','#d6bcc0','#d5d8d5','#71585e','#f6ecee')
    ],['volatile patchwork dwarf','great-basin dwarf world','tholinated ice body','bright fractured minor planet'],{features:['albedo provinces','volatile ice fields','great impact basin','tholinated equator','fractured scarps']}),

    profile('airless','Airless rocky moon','moon',[
      palette('gray regolith moon','#777775','#252526','#bab7b2','#92918d','#535253','#dedbd5'),
      palette('brown silicate moon','#7b695b','#2c241f','#b7a18b','#9b8169','#55463c','#ded0c0'),
      palette('bright highland moon','#9d9b94','#343434','#d9d6cc','#b7b3a8','#6c6b67','#f1eee5'),
      palette('dark maria moon','#5d5e61','#16181b','#96989c','#787a80','#393b3f','#d1d3d5')
    ],['maria and highlands','densely cratered regolith','young ray-crater moon','tidally fractured airless moon'],{features:['impact craters','ejecta rays','dark maria','highland blocks','tectonic grooves']}),

    profile('rocky','Rocky terrestrial world','rocky',[
      palette('neutral silicate world','#817669','#2d2926','#b9aa98','#9e7959','#554b43','#ddd3c5'),
      palette('rusted terrestrial','#8d533e','#321c18','#c78567','#d3a05b','#5b342a','#e4c4b3'),
      palette('basaltic rocky world','#5e6162','#1b2022','#979d9e','#7d6a57','#3a4042','#cfd4d4'),
      palette('pale mineral world','#9b927e','#3b382f','#d1c8ae','#a57d62','#665f50','#e7e0cf'),
      palette('violet silicate world','#70606d','#28222a','#aa96a5','#9a705d','#4a3f48','#ded1db')
    ],['tectonic rocky planet','weathered silicate world','impact-scarred terrestrial','mineral province world'],{features:['tectonic plates','erosion basins','mineral provinces','impact scars','mountain belts']}),

    profile('artificial','Artificial or engineered world','artificial',[
      palette('industrial shell world','#45545d','#0c1216','#9aabb3','#61d8d0','#28353c','#d8eef0'),
      palette('golden megastructure','#595248','#11110f','#a89b83','#d9a84f','#373128','#ede1c7'),
      palette('ruined machine world','#4a4646','#100f10','#857d7b','#a94b3f','#2d292b','#d3c7c5')
    ],['panelled shell world','planetary habitat lattice','machine-world surface','ruined megastructure globe'],{features:['panel grids','radiator continents','city-light networks','maintenance scars','structural seams']})
  ];

  const ringStyles = [
    {id:'broad-ice',label:'broad icy rings',width:18,opacity:.66,tilt:-14,gaps:3},
    {id:'thin-dust',label:'thin dusty rings',width:7,opacity:.48,tilt:9,gaps:5},
    {id:'multi-band',label:'multiple narrow ring bands',width:12,opacity:.58,tilt:-8,gaps:7},
    {id:'dark-shepherded',label:'dark shepherded rings',width:14,opacity:.42,tilt:17,gaps:4},
    {id:'bright-young',label:'bright young ring system',width:22,opacity:.76,tilt:-20,gaps:2}
  ];

  globalThis.BlacklightExoImageryDefinitions = Object.freeze({
    version:2,
    profiles:Object.freeze(profiles),
    ringStyles:Object.freeze(ringStyles)
  });
})();