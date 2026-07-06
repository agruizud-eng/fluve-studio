// views/client/editor.js — Editor de diseño online (6a) — canvas DOM sin dependencias
(function () {
  const { el } = window.Fluve.dom;
  const PE = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };

  async function editor({ query }) {
    const user = window.Fluve.session.current();
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; slot.style.height = '100%'; }

    let products = [], techniques = [];
    try {
      [products, techniques] = await Promise.all([
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.techniques.getAll(),
      ]);
    } catch {}

    // Estado del editor
    const S = {
      product: products[0] ?? { id:'remera', name:'Remera Unisex' },
      color: '#0A0E17',
      side: 'front',
      zoom: 100,
      elements: [], // { id, type:'text'|'image', text, x, y, w, h, fontSize, color, fontFamily, selected }
      selectedId: null,
    };

    let nextId = 1;
    const canvasW = 340, canvasH = 340;

    // DOM refs
    const canvas = el('div', { class:'editor-canvas', style:`width:${canvasW}px;height:${canvasH}px;overflow:hidden;position:relative` });
    const propPanel = el('div', { class:'editor-props' });
    const productSelectEl = el('select', { class:'admin-fld', style:'font-size:12px',
      onchange: e => { S.product = products.find(p=>p.id===e.target.value)||products[0]; renderCanvas(); }
    }, ...products.map(p=>el('option',{value:p.id},p.name)));
    const colorInp = el('input', { type:'color', value:S.color, style:'width:34px;height:34px;border-radius:8px;border:1px solid var(--line2);cursor:pointer;padding:2px',
      onchange: e => { S.color = e.target.value; renderCanvas(); }
    });

    function makeEl(type, extra = {}) {
      const id = 'el-' + (nextId++);
      const base = { id, type, x: 80, y: 100, w: 180, h: type==='text'?40:100, selected: true };
      if (type === 'text') Object.assign(base, { text:'Tu texto aquí', fontSize:22, color:'#EDF1FB', fontFamily:'Space Grotesk' });
      if (type === 'image') Object.assign(base, { src:'', bg:'rgba(44,92,255,.2)', emoji:'🖼️' });
      S.elements = S.elements.map(e=>({...e,selected:false}));
      S.selectedId = id;
      S.elements.push({ ...base, ...extra });
      renderCanvas(); renderProps();
    }

    function renderCanvas() {
      canvas.replaceChildren();
      // Background product color
      canvas.style.background = S.color;
      // Print area indicator
      canvas.append(el('div',{style:'position:absolute;inset:30px;border:1.5px dashed rgba(255,255,255,.2);border-radius:6px;pointer-events:none;z-index:0'}));
      // Product emoji
      canvas.append(el('div',{style:`position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:200px;opacity:.07;pointer-events:none;z-index:0`},(PE[S.product?.id]??'👕')));

      S.elements.forEach(elem => {
        if (elem.type === 'text') {
          const div = el('div', {
            class:'editor-element'+(elem.selected?' selected':''),
            style:`left:${elem.x}px;top:${elem.y}px;color:${elem.color};font:${elem.fontSize}px '${elem.fontFamily}';max-width:${elem.w}px;word-break:break-word;z-index:${elem.selected?10:1};user-select:none;cursor:move`,
          }, elem.text);
          makeDraggable(div, elem);
          canvas.append(div);
        } else if (elem.type === 'image') {
          const div = el('div', {
            class:'editor-element'+(elem.selected?' selected':''),
            style:`left:${elem.x}px;top:${elem.y}px;width:${elem.w}px;height:${elem.h}px;background:${elem.bg};display:flex;align-items:center;justify-content:center;font-size:40px;z-index:${elem.selected?10:1};cursor:move;border-radius:4px`,
          }, elem.src ? null : elem.emoji);
          if (elem.src) {
            const img = el('img',{src:elem.src,style:'width:100%;height:100%;object-fit:contain'});
            div.append(img);
          }
          makeDraggable(div, elem);
          canvas.append(div);
        }
      });
    }

    function makeDraggable(div, elem) {
      let startX, startY, ox, oy;
      div.addEventListener('mousedown', e => {
        S.elements = S.elements.map(x=>({...x,selected:x.id===elem.id}));
        S.selectedId = elem.id;
        startX = e.clientX; startY = e.clientY; ox = elem.x; oy = elem.y;
        function onMove(ev) {
          elem.x = ox + ev.clientX - startX;
          elem.y = oy + ev.clientY - startY;
          div.style.left = elem.x+'px'; div.style.top = elem.y+'px';
        }
        function onUp() { renderCanvas(); renderProps(); document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); }
        document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
        e.preventDefault(); renderProps();
      });
      div.addEventListener('click',e=>{ e.stopPropagation(); renderProps(); });
    }

    function renderProps() {
      propPanel.replaceChildren();
      const elem = S.elements.find(e=>e.id===S.selectedId);
      if (!elem) { propPanel.append(el('div',{class:'mono-label',style:'color:var(--mut)'},'Seleccioná un elemento para editarlo.')); return; }

      if (elem.type === 'text') {
        const txtArea = el('textarea',{class:'admin-fld',style:'resize:vertical;min-height:60px;font-size:12px',value:elem.text,oninput:e=>{elem.text=e.target.value;renderCanvas();}},elem.text);
        const szInp = el('input',{type:'range',min:10,max:72,value:elem.fontSize,style:'width:100%',oninput:e=>{elem.fontSize=parseInt(e.target.value);renderCanvas();}});
        const colInp = el('input',{type:'color',value:elem.color,style:'width:32px;height:32px;cursor:pointer',oninput:e=>{elem.color=e.target.value;renderCanvas();}});
        const fonts=['Space Grotesk','Inter','Space Mono'];
        const fontSel = el('select',{class:'admin-fld',style:'font-size:11px',onchange:e=>{elem.fontFamily=e.target.value;renderCanvas();}}, ...fonts.map(f=>el('option',{value:f,selected:f===elem.fontFamily?'true':null},f)));
        propPanel.append(
          el('div',{class:'field'},el('label',{class:'field__label'},'Texto'),txtArea),
          el('div',{class:'field'},el('label',{class:'field__label'},'Tipografía'),fontSel),
          el('div',{class:'field'},el('label',{class:'field__label'},'Tamaño: '+elem.fontSize+'px'),szInp),
          el('div',{style:'display:flex;align-items:center;gap:8px'},el('label',{class:'field__label'},'Color'),colInp),
          el('button',{class:'btn btn--danger',style:'margin-top:10px;width:100%;justify-content:center;font-size:12px',type:'button',onclick:()=>{S.elements=S.elements.filter(e=>e.id!==elem.id);S.selectedId=null;renderCanvas();renderProps();}},'🗑 Eliminar elemento'),
        );
      }
    }

    canvas.addEventListener('click',()=>{ S.elements=S.elements.map(e=>({...e,selected:false}));S.selectedId=null;renderProps(); });

    async function saveDesign() {
      if (!user) { window.Fluve.toast('Iniciá sesión para guardar tu diseño', 'error'); window.Fluve.router.navigate('#/auth?return=%23%2Feditor'); return; }
      const designId = Date.now();
      const design = {
        id: designId, title: 'Mi diseño ' + new Date().toLocaleDateString('es-UY'),
        artistId: user.id, userId: user.id,
        tags: ['custom','personal'], status: 'draft',
        editorData: JSON.stringify({ elements: S.elements, product: S.product?.id, color: S.color }),
        createdAt: new Date().toISOString(),
      };
      await window.Fluve.dao.designs.put(design);
      window.Fluve.toast('Diseño guardado en "Mis diseños"', 'success');
      window.Fluve.router.navigate(`#/personalizar/${S.product?.id??'remera'}?design=${designId}`);
    }

    // Layout
    const wrap = el('div', { class:'fu', style:'height:100%;display:flex;flex-direction:column' },
      // Topbar
      el('div', { class:'editor-topbar' },
        el('div', { style:'display:flex;align-items:center;gap:8px' },
          el('a', { href:'#/', class:'nav-logo' },
            el('span', { style:"font:600 17px 'Space Grotesk'" }, 'Fluvë', el('span',{style:'color:var(--mut);font-weight:400'},' Editor')),
          ),
        ),
        el('div', { style:'display:flex;align-items:center;gap:8px;margin-left:16px' },
          el('span', { class:'mono-label' }, 'Producto:'),
          productSelectEl,
          el('span', { class:'mono-label', style:'margin-left:8px' }, 'Color:'),
          colorInp,
        ),
        el('div', { style:'display:flex;gap:6px;margin-left:auto' },
          el('button',{class:'btn btn--ghost',style:'font-size:12px;min-height:34px;padding:0 12px',type:'button',onclick:()=>{ if(S.elements.length>0){S.elements.pop();renderCanvas();} }},'↩ Deshacer'),
          el('button',{class:'btn btn--ghost',style:'font-size:12px;min-height:34px;padding:0 12px',type:'button',onclick:saveDesign},'Guardar'),
          el('button',{class:'btn btn--primary',style:'font-size:12px;min-height:34px;padding:0 14px',type:'button',onclick:saveDesign},'Continuar →'),
        ),
      ),
      // Editor body
      el('div', { class:'editor-layout', style:'flex:1' },
        // Tool panel
        el('div', { class:'editor-tools' },
          toolBtn('T', 'Texto', () => makeEl('text')),
          toolBtn('🖼️', 'Imagen', () => {
            const fi=document.createElement('input'); fi.type='file'; fi.accept='image/*';
            fi.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>makeEl('image',{src:ev.target.result,emoji:null,bg:'transparent'});r.readAsDataURL(f);};
            fi.click();
          }),
          toolBtn('✦', 'Forma', () => makeEl('image', { bg:'rgba(44,92,255,.4)', emoji:'⬛', w:80, h:80 })),
          toolBtn('◩', 'Capas', () => window.Fluve.toast(S.elements.length+' elementos en el canvas','default')),
        ),
        // Canvas area
        el('div', { class:'editor-canvas-wrap', onclick:e=>{ if(e.target===e.currentTarget){S.elements=S.elements.map(x=>({...x,selected:false}));S.selectedId=null;renderProps();} } },
          canvas,
          el('div', { class:'editor-canvas-controls' },
            el('span',{class:'chip',style:'font-size:11px;cursor:pointer',onclick:()=>{S.zoom=Math.max(50,S.zoom-10);canvas.style.transform=`scale(${S.zoom/100})`;}},'−'),
            el('span',{class:'chip',style:'font-size:11px;cursor:pointer',onclick:()=>{S.zoom=100;canvas.style.transform='scale(1)';}},'100%'),
            el('span',{class:'chip',style:'font-size:11px;cursor:pointer',onclick:()=>{S.zoom=Math.min(200,S.zoom+10);canvas.style.transform=`scale(${S.zoom/100})`;}},'+'  ),
          ),
          el('div', { class:'editor-canvas-sides' },
            ...[['front','Frente'],['back','Espalda']].map(([s,l])=>
              el('span',{class:`chip${S.side===s?' chip-on':''}`,style:'font-size:11px;cursor:pointer',onclick:()=>{S.side=s;renderCanvas();},},l)
            ),
          ),
        ),
        // Properties panel
        propPanel,
      ),
    );

    renderCanvas(); renderProps();
    return wrap;
  }

  function toolBtn(icon, label, onClick) {
    const btn = el('div', { class:'editor-tool-btn', onclick:onClick },
      el('span', { style:'font-size:18px' }, icon),
      el('span', {}, label),
    );
    return btn;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.editor = editor;
})();
