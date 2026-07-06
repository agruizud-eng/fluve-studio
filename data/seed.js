// data/seed.js — dataset semilla + utilidades reseed/wipe/exportJSON/importJSON (ESQUEMA §4).
// Namespace: window.Fluve.seed
(function () {
  // ── Helpers de fecha ─────────────────────────────────────────────────────────
  function dAgo(n) {                   // dAgo(7) → ISO de hace 7 días
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }
  function hAgo(n) {                   // hAgo(3) → ISO de hace 3 horas
    return new Date(Date.now() - n * 3600000).toISOString();
  }
  function steps(status, baseDate) {   // trackingSteps por orden
    const S = ['recibido','produccion','qc','en_camino','entregado'];
    const idx = status === 'cancelado' ? 0 : S.indexOf(status);
    return S.map((step, i) => ({
      step, done: i <= idx,
      at: i <= idx ? new Date(new Date(baseDate).getTime() + i * 14 * 3600000).toISOString() : null,
    }));
  }

  // ── SEED ─────────────────────────────────────────────────────────────────────
  const SEED = {

    // ── settings ───────────────────────────────────────────────────────────────
    settings: [
      { key: 'pricing',
        targetMargin: 0.38, vat: 0.22, gatewayFee: 0.03,
        minMargin: 0.25, rounding: 0.90, costingMethod: 'weighted',
        categoryExceptions: { hogar: 0.50, granformato: 0.45 },
        royaltyTiers: { base: 0.10, pro: 0.20 },
        shipping: { expressCost: 4.90, standardFree: true, freeFrom: 50 } },
      { key: 'i18n', defaultLang: 'es' },
      { key: 'schema', version: 1, lastSeed: new Date().toISOString() },
    ],

    // ── techniques (7, exactos del ESQUEMA §3) ────────────────────────────────
    techniques: [
      { id:'dtf',         name:'DTF',            costModel:'area',    rate:9,   rateUnit:'ml',     minQty:1,  surchargePerUnit:0, idealFor:'Colores vivos, fotos, degradados', active:true },
      { id:'subl',        name:'Sublimación',    costModel:'fixed',   rate:2.8, rateUnit:'u',      minQty:1,  surchargePerUnit:2, idealFor:'Tazas, fundas, telas 100% poliéster', active:true },
      { id:'serig',       name:'Serigrafía',     costModel:'screens', rate:8,   rateUnit:'screen', minQty:10, surchargePerUnit:0, idealFor:'Tiradas altas, pocas tintas', active:true },
      { id:'bord',        name:'Bordado',        costModel:'stitches',rate:1.2, rateUnit:'millar', minQty:1,  surchargePerUnit:6, idealFor:'Gorras, polos, prendas premium', active:true },
      { id:'dtfuv',       name:'DTF UV',         costModel:'area',    rate:12,  rateUnit:'ml',     minQty:1,  surchargePerUnit:3, idealFor:'Superficies rígidas, colores metálicos', active:true },
      { id:'granformato', name:'Gran formato',   costModel:'area',    rate:18,  rateUnit:'m2',     minQty:1,  surchargePerUnit:0, idealFor:'Posters, cuadros, lonas', active:true },
      { id:'vinil',       name:'Vinilo textil',  costModel:'area',    rate:7,   rateUnit:'ml',     minQty:1,  surchargePerUnit:1, idealFor:'Nombres, números, textos cortos', active:true },
    ],

    // ── products (6) ──────────────────────────────────────────────────────────
    products: [
      { id:'remera', slug:'remera', name:'Remera Unisex', category:'ropa', active:true,
        basePrice:24.90, printAreaCm2:600, defaultTechnique:'dtf', pricingOverrideMargin:null,
        compatibleTechniques:['dtf','serig','bord','vinil','dtfuv'],
        colors:[{name:'Blanco',hex:'#FFFFFF'},{name:'Negro',hex:'#0A0A0A'},{name:'Gris',hex:'#6B6B6B'},{name:'Azul marino',hex:'#1B2A4A'}],
        sizes:['XS','S','M','L','XL','XXL'], images:{}, description:'100% algodón peinado. La base perfecta para cualquier técnica.', createdAt:dAgo(120) },
      { id:'hoodie', slug:'hoodie', name:'Hoodie Premium', category:'ropa', active:true,
        basePrice:44.90, printAreaCm2:700, defaultTechnique:'dtf', pricingOverrideMargin:null,
        compatibleTechniques:['dtf','serig','vinil','dtfuv'],
        colors:[{name:'Negro',hex:'#0A0A0A'},{name:'Gris oscuro',hex:'#333333'},{name:'Bordo',hex:'#6B0F1A'}],
        sizes:['S','M','L','XL','XXL'], images:{}, description:'Buzo canguro con canguro interior. Algodón + poliéster premium.', createdAt:dAgo(115) },
      { id:'taza', slug:'taza', name:'Taza Mágica 325 ml', category:'hogar', active:true,
        basePrice:11.90, printAreaCm2:150, defaultTechnique:'subl', pricingOverrideMargin:0.50,
        compatibleTechniques:['subl'],
        colors:[{name:'Blanco',hex:'#FFFFFF'}],
        sizes:null, images:{}, description:'Taza de cerámica para sublimación. Impresión a 360°.', createdAt:dAgo(100) },
      { id:'tote', slug:'tote', name:'Tote Bag Ecológica', category:'ropa', active:true,
        basePrice:14.90, printAreaCm2:400, defaultTechnique:'dtf', pricingOverrideMargin:null,
        compatibleTechniques:['dtf','serig','vinil'],
        colors:[{name:'Natural',hex:'#F5F0E8'},{name:'Negro',hex:'#0A0A0A'}],
        sizes:null, images:{}, description:'100% algodón canvas. Capacidad 10 L.', createdAt:dAgo(95) },
      { id:'funda', slug:'funda', name:'Funda Smartphone', category:'accesorios', active:true,
        basePrice:16.90, printAreaCm2:200, defaultTechnique:'subl', pricingOverrideMargin:null,
        compatibleTechniques:['subl','dtf','dtfuv'],
        colors:[{name:'Transparente',hex:'#FFFFFF'},{name:'Negro',hex:'#0A0A0A'}],
        sizes:null, images:{}, description:'Case rígido imprimible para modelos populares de iPhone y Samsung.', createdAt:dAgo(90) },
      { id:'cuadro', slug:'cuadro', name:'Cuadro Fine Art', category:'granformato', active:true,
        basePrice:34.90, printAreaCm2:5000, defaultTechnique:'granformato', pricingOverrideMargin:0.45,
        compatibleTechniques:['granformato'],
        colors:[{name:'Blanco',hex:'#FFFFFF'}],
        sizes:['A4','A3','A2','A1','A0'], images:{}, description:'Impresión en papel fine art 300 g. Colores calibrados.', createdAt:dAgo(80) },
    ],

    // ── artists (3) ───────────────────────────────────────────────────────────
    artists: [
      { id:'artist-kookylove', handle:'@kookylove', name:'Koky Love', avatarUrl:'',
        tier:'pro', royaltyRate:0.20, salesMonth:14, royaltiesAccrued:186.40, royaltiesPending:19.92, active:true },
      { id:'artist-studiofolk', handle:'@studiofolk', name:'Studio Folk', avatarUrl:'',
        tier:'base', royaltyRate:0.10, salesMonth:8, royaltiesAccrued:74.30, royaltiesPending:2.78, active:true },
      { id:'artist-lettering', handle:'@lettering.uy', name:'Lettering UY', avatarUrl:'',
        tier:'base', royaltyRate:0.10, salesMonth:5, royaltiesAccrued:32.10, royaltiesPending:0, active:true },
    ],

    // ── designs (12) — id numérico porque el store es autoIncrement ───────────
    designs: [
      { id:1,  title:'Tropical Vibes',   artistId:'artist-kookylove',  imageUrl:'', status:'approved', tags:['tropical','colores','verano'],   royaltyTier:'pro',  createdAt:dAgo(90) },
      { id:2,  title:'Neon Osaka',       artistId:'artist-kookylove',  imageUrl:'', status:'approved', tags:['neon','urbano','japones'],        royaltyTier:'pro',  createdAt:dAgo(80) },
      { id:3,  title:'Fluid Dreams',     artistId:'artist-kookylove',  imageUrl:'', status:'pending',  tags:['abstracto','fluido'],             royaltyTier:'pro',  createdAt:dAgo(5) },
      { id:4,  title:'Forest Spirits',   artistId:'artist-kookylove',  imageUrl:'', status:'approved', tags:['naturaleza','illustration'],      royaltyTier:'pro',  createdAt:dAgo(60) },
      { id:5,  title:'Mountain Echo',    artistId:'artist-studiofolk', imageUrl:'', status:'approved', tags:['montaña','minimalista'],          royaltyTier:'base', createdAt:dAgo(70) },
      { id:6,  title:'Urban Sketch',     artistId:'artist-studiofolk', imageUrl:'', status:'approved', tags:['urbano','boceto','ciudad'],       royaltyTier:'base', createdAt:dAgo(55) },
      { id:7,  title:'Coastal Lines',    artistId:'artist-studiofolk', imageUrl:'', status:'pending',  tags:['playa','lineas','geo'],           royaltyTier:'base', createdAt:dAgo(3) },
      { id:8,  title:'Desert Bloom',     artistId:'artist-studiofolk', imageUrl:'', status:'approved', tags:['desierto','botanico','suave'],    royaltyTier:'base', createdAt:dAgo(40) },
      { id:9,  title:'Minimal Type',     artistId:'artist-lettering',  imageUrl:'', status:'approved', tags:['tipografia','minimal','texto'],   royaltyTier:'base', createdAt:dAgo(50) },
      { id:10, title:'Script Love',      artistId:'artist-lettering',  imageUrl:'', status:'approved', tags:['script','amor','caligrafía'],    royaltyTier:'base', createdAt:dAgo(35) },
      { id:11, title:'Bold Statement',   artistId:'artist-lettering',  imageUrl:'', status:'approved', tags:['bold','frase','impacto'],        royaltyTier:'base', createdAt:dAgo(22) },
      { id:12, title:'Typeface Study',   artistId:'artist-lettering',  imageUrl:'', status:'approved', tags:['tipografia','estudio','letras'], royaltyTier:'base', createdAt:dAgo(10) },
    ],

    // ── users (4) ─────────────────────────────────────────────────────────────
    users: [
      { id:'user-admin', email:'admin@fluve.uy',  name:'Admin Fluvë',    role:'admin',    passwordHash:'admin123',  phone:null, addresses:[], taxId:null, provider:'email', createdAt:dAgo(180) },
      { id:'user-staff', email:'staff@fluve.uy',  name:'Staff Fluvë',    role:'staff',    passwordHash:'staff123',  phone:null, addresses:[], taxId:null, provider:'email', createdAt:dAgo(150) },
      { id:'user-c1',    email:'ana@test.com',     name:'Ana García',     role:'customer', passwordHash:'test123',   phone:'+598 99 111 222', addresses:[{id:'a1',label:'Casa',line:'Rivera 1234 apto 3',city:'Montevideo',zip:'11200',rut:null,default:true}], taxId:'1.234.567-8', provider:'email', createdAt:dAgo(60) },
      { id:'user-c2',    email:'carlos@test.com',  name:'Carlos López',   role:'customer', passwordHash:'test123',   phone:'+598 98 333 444', addresses:[{id:'a2',label:'Oficina',line:'18 de Julio 800',city:'Montevideo',zip:'11100',rut:'21.222.333/0001',default:true}], taxId:'9.876.543-2', provider:'email', createdAt:dAgo(45) },
    ],

    // ── suppliers (3) ─────────────────────────────────────────────────────────
    suppliers: [
      { id:'sup-1', name:'Imprenta Sur',   techniques:['dtf','vinil','serig','subl'], rating:4.5, zones:['Montevideo','Interior'], active:true, notes:'Entrega rápida. Solicitar proforma para +100u.' },
      { id:'sup-2', name:'TextilPro',      techniques:['dtf','bord','dtfuv','serig'], rating:4.2, zones:['Montevideo'],            active:true, notes:'Especialistas en bordado. Requiere archivo en DST.' },
      { id:'sup-3', name:'GranFormato Co', techniques:['granformato'],                rating:4.8, zones:['Montevideo','Remoto'],   active:true, notes:'Papel fine art 300g. Laminado disponible.' },
    ],

    // ── purchases (11) — id numérico (store autoIncrement) ───────────────────
    // Remera: 3 lotes (WA ≈ $8.04 / u)
    // Hoodie: 2 lotes (WA ≈ $15.33 / u)
    // Taza, Tote, Funda: 1 lote cada uno
    // DTF film: 2 lotes con distinto ancho → WA $/cm² (para inventario A30)
    // Vinilo: 1 lote
    purchases: [
      { id:1,  type:'product',  productId:'remera',   materialId:null, supplierId:'sup-1', qty:100, unitCost:8.50, date:dAgo(60),  width:null, areaCm2:null },
      { id:2,  type:'product',  productId:'remera',   materialId:null, supplierId:'sup-1', qty:200, unitCost:8.00, date:dAgo(30),  width:null, areaCm2:null },
      { id:3,  type:'product',  productId:'remera',   materialId:null, supplierId:'sup-1', qty:150, unitCost:7.80, date:dAgo(14),  width:null, areaCm2:null },
      { id:4,  type:'product',  productId:'hoodie',   materialId:null, supplierId:'sup-2', qty:50,  unitCost:16.00,date:dAgo(90),  width:null, areaCm2:null },
      { id:5,  type:'product',  productId:'hoodie',   materialId:null, supplierId:'sup-2', qty:100, unitCost:15.00,date:dAgo(21),  width:null, areaCm2:null },
      { id:6,  type:'product',  productId:'taza',     materialId:null, supplierId:'sup-1', qty:300, unitCost:3.50, date:dAgo(45),  width:null, areaCm2:null },
      { id:7,  type:'product',  productId:'tote',     materialId:null, supplierId:'sup-1', qty:200, unitCost:4.20, date:dAgo(30),  width:null, areaCm2:null },
      { id:8,  type:'product',  productId:'funda',    materialId:null, supplierId:'sup-2', qty:100, unitCost:4.50, date:dAgo(60),  width:null, areaCm2:null },
      // DTF film – lote 55cm (id:9) y 60cm (id:10) → WA ≈ $0.00571/cm²
      { id:9,  type:'material', productId:null, materialId:'dtf_film', supplierId:'sup-1', qty:1, unitCost:180, date:dAgo(45), width:55, areaCm2:30000, costPerCm2:0.0060 },
      { id:10, type:'material', productId:null, materialId:'dtf_film', supplierId:'sup-2', qty:1, unitCost:220, date:dAgo(20), width:60, areaCm2:40000, costPerCm2:0.0055 },
      // Vinilo
      { id:11, type:'material', productId:null, materialId:'vinilo',   supplierId:'sup-2', qty:1, unitCost:225, date:dAgo(35), width:60, areaCm2:50000, costPerCm2:0.0045 },
    ],

    // ── inventory (2 materiales) ──────────────────────────────────────────────
    inventory: [
      { id:'inv-dtf',   material:'dtf_film', unit:'cm2', stockArea:65000,
        avgCostPerCm2:Number(((30000*0.0060 + 40000*0.0055) / 70000).toFixed(6)),
        lots:[{purchaseId:9,areaCm2:30000,costPerCm2:0.0060},{purchaseId:10,areaCm2:40000,costPerCm2:0.0055}] },
      { id:'inv-vinil', material:'vinilo',   unit:'cm2', stockArea:50000,
        avgCostPerCm2:0.0045,
        lots:[{purchaseId:11,areaCm2:50000,costPerCm2:0.0045}] },
    ],

    // ── orders (6) ────────────────────────────────────────────────────────────
    orders: (function () {
      const line = (productId, productName, techniqueId, qty, unitPrice, designId = null) => ({
        lineId: 'l-' + productId,
        productId, productName,
        config: { color:'blanco', size:'M', side:'front', techniqueId, designId, qty },
        unitPrice, lineTotal: Number((unitPrice * qty).toFixed(2)),
      });
      return [
        { id:'FLV-2840', userId:'user-c1', status:'recibido',   createdAt:hAgo(3),
          lines:[line('remera','Remera Unisex','dtf',1,24.90,1)],
          contact:{name:'Ana García',email:'ana@test.com',phone:'+598 99 111 222'},
          shippingAddress:{label:'Casa',line:'Rivera 1234 apto 3',city:'Montevideo',zip:'11200'},
          shippingMethod:'express', shippingCost:4.90,
          subtotal:24.90, tax:0, total:29.80, paymentId:'TX-9910',
          supplierId:null, qcStatus:null,
          trackingSteps:steps('recibido',hAgo(3)) },

        { id:'FLV-2841', userId:'user-c1', status:'produccion', createdAt:dAgo(2),
          lines:[line('hoodie','Hoodie Premium','dtf',1,44.90,null)],
          contact:{name:'Ana García',email:'ana@test.com',phone:'+598 99 111 222'},
          shippingAddress:{label:'Casa',line:'Rivera 1234 apto 3',city:'Montevideo',zip:'11200'},
          shippingMethod:'express', shippingCost:4.90,
          subtotal:44.90, tax:0, total:49.80, paymentId:'TX-9911',
          supplierId:'sup-2', qcStatus:null,
          trackingSteps:steps('produccion',dAgo(2)) },

        { id:'FLV-2842', userId:'user-c2', status:'qc',         createdAt:dAgo(4),
          lines:[line('taza','Taza Mágica 325 ml','subl',2,13.90,5)],
          contact:{name:'Carlos López',email:'carlos@test.com',phone:'+598 98 333 444'},
          shippingAddress:{label:'Oficina',line:'18 de Julio 800',city:'Montevideo',zip:'11100'},
          shippingMethod:'express', shippingCost:4.90,
          subtotal:27.80, tax:0, total:32.70, paymentId:'TX-9912',
          supplierId:'sup-1', qcStatus:'passed',
          trackingSteps:steps('qc',dAgo(4)) },

        { id:'FLV-2843', userId:'user-c2', status:'en_camino',  createdAt:dAgo(6),
          lines:[line('tote','Tote Bag Ecológica','dtf',1,14.90,null)],
          contact:{name:'Carlos López',email:'carlos@test.com',phone:'+598 98 333 444'},
          shippingAddress:{label:'Oficina',line:'18 de Julio 800',city:'Montevideo',zip:'11100'},
          shippingMethod:'express', shippingCost:4.90,
          subtotal:14.90, tax:0, total:19.80, paymentId:'TX-9913',
          supplierId:'sup-1', qcStatus:'passed',
          trackingSteps:steps('en_camino',dAgo(6)) },

        { id:'FLV-2844', userId:'user-c1', status:'entregado',  createdAt:dAgo(12),
          lines:[line('remera','Remera Unisex','dtf',3,24.90,1)],
          contact:{name:'Ana García',email:'ana@test.com',phone:'+598 99 111 222'},
          shippingAddress:{label:'Casa',line:'Rivera 1234 apto 3',city:'Montevideo',zip:'11200'},
          shippingMethod:'standard', shippingCost:0,
          subtotal:74.70, tax:0, total:74.70, paymentId:'TX-9914',
          supplierId:'sup-1', qcStatus:'passed',
          trackingSteps:steps('entregado',dAgo(12)) },

        { id:'FLV-2845', userId:'user-c2', status:'cancelado',  createdAt:dAgo(8),
          lines:[line('funda','Funda Smartphone','dtf',1,16.90,null)],
          contact:{name:'Carlos López',email:'carlos@test.com',phone:'+598 98 333 444'},
          shippingAddress:{label:'Oficina',line:'18 de Julio 800',city:'Montevideo',zip:'11100'},
          shippingMethod:'express', shippingCost:4.90,
          subtotal:16.90, tax:0, total:21.80, paymentId:'TX-9915',
          supplierId:null, qcStatus:null,
          trackingSteps:steps('cancelado',dAgo(8)) },
      ];
    })(),

    // ── payments (6) ──────────────────────────────────────────────────────────
    payments: [
      { id:'TX-9910', orderId:'FLV-2840', method:'card',        amount:29.80, status:'approved', createdAt:hAgo(3),   refundOf:null },
      { id:'TX-9911', orderId:'FLV-2841', method:'mercadopago', amount:49.80, status:'approved', createdAt:dAgo(2),   refundOf:null },
      { id:'TX-9912', orderId:'FLV-2842', method:'card',        amount:32.70, status:'approved', createdAt:dAgo(4),   refundOf:null },
      { id:'TX-9913', orderId:'FLV-2843', method:'card',        amount:19.80, status:'approved', createdAt:dAgo(6),   refundOf:null },
      { id:'TX-9914', orderId:'FLV-2844', method:'transfer',    amount:74.70, status:'approved', createdAt:dAgo(12),  refundOf:null },
      { id:'TX-9915', orderId:'FLV-2845', method:'card',        amount:21.80, status:'refunded', createdAt:dAgo(8),   refundOf:null },
    ],

    // ── promos ────────────────────────────────────────────────────────────────
    promos: [
      { code:'WELCOME10', type:'percent',  value:10,   active:true,  expiresAt:dAgo(-30), minSubtotal:0  },
      { code:'FREESHIP',  type:'freeship', value:0,    active:true,  expiresAt:dAgo(-60), minSubtotal:30 },
    ],

    // ── royalties (3) — id numérico (store autoIncrement) ────────────────────
    royalties: [
      { id:1, artistId:'artist-kookylove',  amount:4.98,  status:'pending', paidAt:null,      orderRefs:['FLV-2840'] },
      { id:2, artistId:'artist-studiofolk', amount:2.78,  status:'pending', paidAt:null,      orderRefs:['FLV-2842'] },
      { id:3, artistId:'artist-kookylove',  amount:14.94, status:'paid',    paidAt:dAgo(7),   orderRefs:['FLV-2844'] },
    ],

    // ── tickets (2) ───────────────────────────────────────────────────────────
    tickets: [
      { id:'TKT-001', userId:'user-c1', orderId:'FLV-2841', subject:'¿Cuándo sale mi pedido?',
        messages:[
          { from:'user-c1', text:'Hola, quisiera saber cuándo pasa a envíos mi hoodie.', at:dAgo(1) },
          { from:'user-staff', text:'¡Hola Ana! Ya está en producción, estimamos despacho mañana.', at:hAgo(20) },
        ],
        status:'open', createdAt:dAgo(1) },
      { id:'TKT-002', userId:'user-c2', orderId:'FLV-2843', subject:'¿Me dan el número de seguimiento?',
        messages:[
          { from:'user-c2', text:'Necesito el tracking de mi tote bag.', at:dAgo(5) },
          { from:'user-staff', text:'¡Claro! El código de seguimiento es UY123456789. Correo uruguayo.', at:dAgo(4) },
        ],
        status:'pending', createdAt:dAgo(5) },
    ],

    // ── activity (3 entradas de ejemplo) — id numérico (store autoIncrement) ─
    activity: [
      { id:1, at:dAgo(45), userId:'user-admin', action:'seed.reseed',           entity:'system',   entityId:'fluve_studio',  before:null, after:null },
      { id:2, at:dAgo(4),  userId:'user-staff', action:'order.assign_supplier', entity:'orders',   entityId:'FLV-2842',      before:{supplierId:null}, after:{supplierId:'sup-1'} },
      { id:3, at:dAgo(7),  userId:'user-admin', action:'royalty.paid',          entity:'royalties',entityId:'3',             before:{status:'pending'}, after:{status:'paid',paidAt:dAgo(7)} },
    ],

    // ── stores vacíos en el seed (se crean igual para que los contadores de la UI no fallen)
    variants:  [],
    carts:     [],
    quotes:    [],
    favorites: [],
  };

  // ── Funciones públicas ───────────────────────────────────────────────────────

  const STORE_ORDER = [
    'settings','techniques','products','variants','artists','designs','users',
    'suppliers','purchases','inventory','orders','payments','promos',
    'royalties','tickets','favorites','activity','carts','quotes',
  ];

  async function wipe() {
    const dao = window.Fluve.dao;
    for (const name of STORE_ORDER) await dao[name].clear();
  }

  async function reseed() {
    const dao = window.Fluve.dao;
    // Actualizar lastSeed antes de poblar
    SEED.settings.find(s => s.key === 'schema').lastSeed = new Date().toISOString();
    for (const name of STORE_ORDER) {
      const data = SEED[name];
      if (data && data.length) await dao._clearAndBulk(name, data);
      else await dao[name].clear();
    }
    await dao.logActivity('seed.reseed', 'system', 'fluve_studio');
  }

  async function exportJSON() {
    const dao   = window.Fluve.dao;
    const result = { version: 1, exportedAt: new Date().toISOString(), stores: {} };
    for (const name of STORE_ORDER) {
      result.stores[name] = await dao[name].getAll();
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `fluve-db-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importJSON(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.stores) throw new Error('Archivo JSON inválido: falta la clave "stores".');
    const dao  = window.Fluve.dao;
    for (const name of STORE_ORDER) {
      const records = data.stores[name] || [];
      await dao._clearAndBulk(name, records);
    }
    await dao.logActivity('seed.import', 'system', 'fluve_studio', { after: { file: file.name } });
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.seed = { reseed, wipe, exportJSON, importJSON, STORE_ORDER };
})();
