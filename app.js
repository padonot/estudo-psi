/* App de estudo — Psicologia · Transpetro
   4 abas: Estudar · Simulados · Revisar · Desempenho. Conteúdo em dados.js; progresso no localStorage. */
(function () {
  'use strict';
  const D = window.DADOS;
  const KEY = 'psi.v1';
  const $ = (s) => document.querySelector(s);
  const DIA = 864e5;
  const hoje = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const somaDias = (n) => { const d = new Date(Date.now() + n * DIA); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const LET = 'ABCDE';
  const embaralhar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------------- progresso ---------------- */
  const novo = () => ({ v: 1, nome: '', prova: '2026-12-06', lidos: {}, resp: {}, erros: {}, cart: {}, sims: {}, andamento: null, ultBackup: 0, ultMat: '' });
  let G;
  try { G = Object.assign(novo(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { G = novo(); }
  const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { toast('Não consegui salvar. Faça um backup na aba Ajustes.'); } };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  function registrar(qid, ok, letra) {
    const r = G.resp[qid] || { n: 0, ok: 0 };
    r.n++; if (ok) r.ok++; r.ult = letra; r.d = hoje(); r.certo = ok;
    G.resp[qid] = r;
    if (!ok) G.erros[qid] = { cx: 0, due: hoje() };
  }
  const errosHoje = () => Object.entries(G.erros).filter(([q, e]) => D.questoes[q] && e.due <= hoje()).map(([q]) => q);

  /* ---------------- utilidades de tela ---------------- */
  let tId;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tId); tId = setTimeout(() => t.classList.remove('on'), 2600); }
  const corPct = (p) => (p >= 80 ? 'verde' : p >= 50 ? 'amarelo' : 'vermelho');
  const corHex = (p) => (p >= 80 ? 'var(--ok)' : p >= 50 ? 'var(--meio)' : 'var(--ruim)');
  const pct = (ok, n) => (n ? Math.round((100 * ok) / n) : null);
  const PRIO = { alta: 'cai muito', media: 'cai às vezes', baixa: 'cai pouco' };
  const deitado = () => window.innerWidth > window.innerHeight && window.innerWidth >= 900;
  const NOMEBLOCO = Object.assign({ pt: 'Português', en: 'Inglês' }, ...(D.blocos || []).map((b) => ({ [b.id]: b.nome })));
  const ORDEMBLOCO = (D.blocos || []).map((b) => b.id).concat(['pt', 'en']);
  const ehEsp = (q) => q.mat !== 'pt' && q.mat !== 'en';
  function analisa(itens, resp) {
    const r = { ok: 0, n: itens.length, esp: [0, 0], ger: [0, 0], por: {}, blo: {}, tip: {} };
    itens.forEach((qid) => {
      const q = D.questoes[qid]; const c = resp[qid] === q.gab ? 1 : 0; r.ok += c;
      const f = ehEsp(q) ? r.esp : r.ger; f[0] += c; f[1]++;
      [['por', q.mat], ['blo', q.bloco || q.mat], ['tip', ehEsp(q) ? (q.tipo || 'conceito') : null]].forEach(([k, v]) => { if (!v) return; r[k][v] = r[k][v] || [0, 0]; r[k][v][0] += c; r[k][v][1]++; });
    });
    return r;
  }
  function situacao(r) {
    const R = D.regras || { min: 0.5, zero: [] }, linhas = [];
    const fase = (nome, [o, n]) => { if (!n) return; const need = Math.ceil(n * R.min); linhas.push({ ok: o >= need, txt: nome + ': ' + o + '/' + n + ' (' + pct(o, n) + '%)' + (o >= need ? '' : ' — faltaram ' + (need - o) + ' para o corte') }); };
    fase('Específicas', r.esp); fase('Conhecimentos Gerais', r.ger);
    R.zero.forEach((m) => { const v = r.por[m]; if (v) linhas.push({ ok: v[0] > 0, txt: (mat(m) ? mat(m).curto : m) + ': ' + (v[0] > 0 ? 'não zerou' : 'ZEROU — eliminaria') }); });
    return { passou: linhas.every((l) => l.ok), linhas };
  }
  const mat = (id) => D.materias.find((m) => m.id === id);
  const diasProva = () => Math.ceil((new Date(G.prova + 'T00:00:00') - new Date(hoje() + 'T00:00:00')) / DIA);

  function acertoTema(tid) {
    let ok = 0, n = 0;
    D.temas[tid].q.forEach((q) => { const r = G.resp[q]; if (r) { n += r.n; ok += r.ok; } });
    return { ok, n, p: pct(ok, n) };
  }
  function acertoMat(mid) {
    let ok = 0, n = 0;
    Object.values(D.questoes).forEach((q) => { if (q.mat !== mid) return; const r = G.resp[q.id]; if (r) { n += r.n; ok += r.ok; } });
    return { ok, n, p: pct(ok, n) };
  }

  /* ---------------- navegação (o botão voltar do Android funciona) ---------------- */
  let V = { aba: 'hoje' };
  const pilha = [];
  function ir(nova) { pilha.push(V); V = nova; history.pushState({ n: pilha.length }, ''); render(); window.scrollTo(0, 0); }
  function trocarAba(a) { pilha.length = 0; V = { aba: a }; history.replaceState({ n: 0 }, ''); render(); window.scrollTo(0, 0); }
  window.addEventListener('popstate', () => {
    if (V.sess && V.sess.modo === 'simulado' && !V.sess.fim && !V.sess.saindo) {
      if (!confirm('Sair do simulado? Ele fica salvo e você continua depois.')) { history.pushState({ n: pilha.length }, ''); return; }
      guardarAndamento();
    }
    V = pilha.pop() || { aba: V.aba }; render();
  });
  history.replaceState({ n: 0 }, '');

  /* ---------------- render ---------------- */
  function render() {
    document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('on', b.dataset.aba === V.aba));
    const n = errosHoje().length; const bd = $('#badge'); bd.textContent = n; bd.style.display = n ? 'block' : 'none';
    let h = '';
    if (V.sess) h = telaSessao();
    else if (V.tema) h = telaTema();
    else h = { hoje: telaHoje, simulados: telaSimulados, revisar: telaRevisar, desempenho: telaDesempenho, ajustes: telaAjustes }[V.aba]();
    $('#titulo').textContent = V.sess ? V.sess.titulo : V.tema ? mat(D.temas[V.tema].mat).curto : ({ hoje: 'Hoje', simulados: 'Simulado', revisar: 'Revisar', desempenho: 'Desempenho', ajustes: 'Ajustes' }[V.aba]);
    $('#tela').innerHTML = h;
    $('#abas').style.display = V.sess ? 'none' : 'flex';
    document.body.classList.toggle('foco', !!V.sess);
  }

  /* ---------------- ESTUDAR ---------------- */
  function cartaoHoje() {
    const e = errosHoje().length, d = diasProva();
    const prox = D.simulados.find((s) => !(G.sims[s.id] || []).length);
    let h = '<section class="card hoje"><h2>' + (G.nome ? 'Olá, ' + esc(G.nome) + '!' : 'Para hoje') + '</h2>';
    if (d >= 0) h += '<div class="muted">' + (d === 0 ? 'A prova é hoje. Boa prova!' : 'Faltam <b>' + d + '</b> dia' + (d > 1 ? 's' : '') + ' para a prova.') + '</div>';
    h += '<div class="linha2">';
    if (G.andamento) h += '<button class="bt" data-acao="continuar">▶ Continuar simulado</button>';
    if (e) h += '<button class="bt' + (G.andamento ? ' sec' : '') + '" data-acao="erros">Refazer ' + e + ' erro' + (e > 1 ? 's' : '') + '</button>';
    if (!G.andamento && prox) h += '<button class="bt sec" data-acao="sim" data-id="' + prox.id + '">' + esc(prox.titulo) + '</button>';
    h += '<button class="bt sec" data-acao="rapida">Revisão rápida</button></div></section>';
    return h;
  }
  function proximoSim() { return D.simulados.find((x) => !(G.sims[x.id] || []).length); }
  function telaHoje() {
    const d = diasProva(), e = errosHoje().length, prox = proximoSim();
    const feitos = D.simulados.filter((x) => (G.sims[x.id] || []).length).length;
    let h = '<section class="card hoje"><h2>' + (G.nome ? 'Olá, ' + esc(G.nome) + '!' : 'Para hoje') + '</h2>';
    if (d >= 0) h += '<div class="muted">' + (d === 0 ? 'A prova é hoje. Boa prova!' : 'Faltam <b>' + d + '</b> dia' + (d > 1 ? 's' : '') + ' para a prova.') + '</div>';
    if (G.andamento) h += '<button class="bt" data-acao="continuar">▶ Continuar ' + esc(G.andamento.titulo) + ' (' + Object.keys(G.andamento.resp).length + '/' + G.andamento.itens.length + ')</button>';
    else if (prox) h += '<button class="bt" data-acao="sim" data-id="' + prox.id + '">📝 Fazer ' + esc(prox.titulo) + ' · ' + prox.qids.length + ' questões</button>';
    else h += '<button class="bt" data-acao="rapido">⚡ Treino curto (10 questões)</button>';
    h += '<div class="linha2">' + (e ? '<button class="bt sec" data-acao="erros">Refazer ' + e + ' erro' + (e > 1 ? 's' : '') + '</button>' : '') + '<button class="bt sec" data-acao="rapida">Revisão rápida</button></div></section>';
    h += '<section class="card"><h2>📝 Simulados feitos</h2>' + barra('Progresso', pct(feitos, D.simulados.length), feitos + ' de ' + D.simulados.length);
    const ult = ultimos(5);
    h += ult.length ? ult.map(({ titulo, r }) => barra(titulo + ' · ' + r.d.slice(8) + '/' + r.d.slice(5, 7), pct(r.ok, r.n), r.ok + '/' + r.n)).join('') : '<p class="muted">Nenhum ainda. Comece pelo botão acima.</p>';
    return h + '</section>';
  }
  function ultimos(n) {
    const l = []; Object.entries(G.sims).forEach(([id, rs]) => rs.forEach((r) => { const s = D.simulados.find((x) => x.id === id); l.push({ titulo: s ? s.titulo : 'Treino curto', r }); }));
    return l.sort((x, y) => (x.r.d < y.r.d ? 1 : -1)).slice(0, n);
  }
  function telaEstudar() {
    const m = mat(G.ultMat) || D.materias.find((x) => x.temas.length) || D.materias[0];
    let h = '<div class="segs">' + D.materias.map((x) => '<button data-acao="mat" data-id="' + x.id + '" class="' + (x.id === m.id ? 'on' : '') + '">' + esc(x.curto) + '</button>').join('') + '</div>';
    if (!m.temas.length) return h + '<div class="card vazio"><b>🧠</b>O conteúdo de ' + esc(m.curto) + ' chega na próxima atualização do app.</div>';
    h += '<ul class="lista">' + m.temas.map((tid) => {
      const t = D.temas[tid], a = acertoTema(tid), lido = G.lidos[tid];
      const info = [t.q.length ? t.q.length + ' questões' : '', t.c.length ? t.c.length + ' cartões' : ''].filter(Boolean).join(' · ');
      return '<li><button class="item" data-acao="tema" data-id="' + tid + '"><span class="bola' + (lido ? ' lido' : '') + '"></span><span class="nome">' + esc(t.nome) + '<span class="sub">' + info + '</span></span>' +
        (a.p != null ? '<span class="pct ' + corPct(a.p) + '">' + a.p + '%</span>' : '<span class="tag ' + t.prio + '">' + PRIO[t.prio] + '</span>') + '</button></li>';
    }).join('') + '</ul>';
    return h + '<p class="muted">● verde = já lido. A % é o seu acerto nas questões do tema.</p>';
  }
  function bloco(b) {
    if (b.t === 'p') return '<p>' + md(b.text) + '</p>';
    if (b.t === 'key') return '<div class="key">' + md(b.text) + '</div>';
    if (b.t === 'warn') return '<div class="warn">' + md(b.text) + '</div>';
    if (b.t === 'flip') return '<div class="flip">' + md(b.q) + '<details><summary>Ver resposta</summary>' + md(b.a) + '</details></div>';
    if (b.t === 'table') return tabela(b);
    return '';
  }
  const tabela = (t) => '<div class="tabw"><table><tr>' + t.head.map((x) => '<th>' + md(x) + '</th>').join('') + '</tr>' + t.rows.map((r) => '<tr>' + r.map((x) => '<td>' + md(x) + '</td>').join('') + '</tr>').join('') + '</table></div>';
  function telaTema() {
    const t = D.temas[V.tema], r = t.resumo, a = acertoTema(t.id);
    let h = '<button class="bt sec" style="margin:0 0 14px" data-acao="voltar">← Voltar</button>';
    h += '<section class="card"><h1>' + esc(t.nome) + '</h1><span class="tag ' + t.prio + '">' + PRIO[t.prio] + ' na prova</span>' + (a.p != null ? ' <span class="pct ' + corPct(a.p) + '">· seu acerto: ' + a.p + '%</span>' : '');
    if (r) {
      if (r.lead) h += '<p class="lead">' + md(r.lead) + '</p>';
      if (r.points) h += '<ul class="pontos">' + r.points.map((p) => '<li>' + md(p) + '</li>').join('') + '</ul>';
      if (r.table) h += tabela(r.table);
      if (r.banca) h += '<p class="muted">' + md(r.banca) + '</p>';
    } else if (!t.aula.length) h += '<p class="muted">Este tema é treinado direto nos ' + (t.c.length ? 'cartões' : 'exercícios') + ' abaixo.</p>';
    h += '</section>';
    if (t.aula.length) h += '<details><summary>📚 Explicação completa (' + t.aula.length + ' parte' + (t.aula.length > 1 ? 's' : '') + ')</summary>' + t.aula.map((s) => '<h3>' + esc(s.titulo) + '</h3>' + s.blocos.map(bloco).join('')).join('') + '</details>';
    if (t.q.length) h += '<button class="bt" data-acao="treinar" data-id="' + t.id + '">Treinar este tema (' + Math.min(10, t.q.length) + ' questões)</button>';
    if (t.c.length) h += '<button class="bt' + (t.q.length ? ' sec' : '') + '" data-acao="cartoes" data-id="' + t.id + '">Cartões deste tema (' + Math.min(15, t.c.length) + ')</button>';
    h += '<button class="bt sec" data-acao="lido" data-id="' + t.id + '">' + (G.lidos[t.id] ? '✓ Lido — desmarcar' : 'Marcar como lido ✓') + '</button>';
    return h;
  }

  /* ---------------- SESSÕES (treino, simulado, erros, cartões) ---------------- */
  function iniciar(sess) { sess.i = 0; sess.resp = sess.resp || {}; sess.inicio = sess.inicio || Date.now(); ir({ aba: V.aba, sess }); if (sess.modo === 'simulado') relogio(); }
  function treinoTema(tid) {
    const t = D.temas[tid];
    const ord = t.q.slice().sort((a, b) => peso(a) - peso(b));
    iniciar({ modo: 'treino', titulo: t.nome, itens: ord.slice(0, 10) });
  }
  const peso = (q) => { const r = G.resp[q]; return r ? (r.certo ? 2 : 0) + Math.random() : 1 + Math.random(); };
  function cartoesTema(tid) {
    const t = D.temas[tid];
    const ord = t.c.slice().sort((a, b) => ((G.cart[a] || {}).cx || 0) - ((G.cart[b] || {}).cx || 0) || Math.random() - 0.5);
    iniciar({ modo: 'cartoes', titulo: t.nome, itens: ord.slice(0, 15) });
  }
  function revisaoRapida() {
    const lidos = Object.keys(G.lidos).filter((t) => D.temas[t]);
    const temas = lidos.length ? lidos : Object.keys(D.temas);
    const venc = Object.entries(G.cart).filter(([c, e]) => D.cartoes[c] && e.due <= hoje()).map(([c]) => 'c:' + c);
    const novosC = embaralhar(temas.flatMap((t) => D.temas[t].c).filter((c) => !G.cart[c])).map((c) => 'c:' + c);
    const qs = embaralhar(temas.flatMap((t) => D.temas[t].q)).sort((a, b) => peso(a) - peso(b)).map((q) => 'q:' + q);
    const itens = embaralhar(venc.slice(0, 5).concat(novosC.slice(0, 3), qs.slice(0, 10))).slice(0, 10);
    if (!itens.length) return toast('Ainda não há itens para revisar.');
    iniciar({ modo: 'misto', titulo: 'Revisão rápida', itens });
  }
  function refazerErros() {
    const e = embaralhar(errosHoje());
    if (!e.length) return toast('Nenhum erro para hoje. 🎉');
    iniciar({ modo: 'erros', titulo: 'Refazer erros', itens: e.slice(0, 15) });
  }
  function abrirSimulado(id) {
    if (G.andamento && G.andamento.simId !== id && !confirm('Há outro simulado em andamento. Descartar e começar este?')) return;
    if (G.andamento && G.andamento.simId === id) return continuar();
    const s = D.simulados.find((x) => x.id === id);
    iniciar({ modo: 'simulado', titulo: s.titulo, simId: id, itens: s.qids.slice(), limite: s.min * 60e3 });
    guardarAndamento();
  }
  function simuladoSorteado(mid) {
    const todas = embaralhar(Object.keys(D.questoes).filter((q) => !mid || D.questoes[q].mat === mid)).sort((a, b) => peso(a) - peso(b));
    iniciar({ modo: 'simulado', titulo: 'Treino curto' + (mid ? ' · ' + mat(mid).curto : ''), simId: 'rapido', itens: todas.slice(0, 10), limite: 30 * 60e3 });
    guardarAndamento();
  }
  function guardarAndamento() {
    const s = V.sess; if (!s || s.modo !== 'simulado' || s.fim) return;
    G.andamento = { simId: s.simId, titulo: s.titulo, itens: s.itens, resp: s.resp, i: s.i, usado: (s.usado || 0) + (Date.now() - s.inicio), limite: s.limite };
    s.usado = G.andamento.usado; s.inicio = Date.now(); salvar();
  }
  function continuar() {
    const a = G.andamento; if (!a) return;
    const sess = { modo: 'simulado', titulo: a.titulo, simId: a.simId, itens: a.itens, resp: a.resp, usado: a.usado, limite: a.limite };
    iniciar(sess); V.sess.i = a.i || 0; render();
  }
  let rel;
  function relogio() {
    clearInterval(rel);
    rel = setInterval(() => {
      const s = V.sess; if (!s || s.modo !== 'simulado' || s.fim) return clearInterval(rel);
      const rest = s.limite - ((s.usado || 0) + (Date.now() - s.inicio));
      const el = $('#relogio'); if (el) el.textContent = mmss(rest);
      if (rest <= 0) { toast('Tempo esgotado. Simulado entregue.'); entregar(); }
    }, 1000);
  }
  const mmss = (ms) => { ms = Math.max(0, ms); const m = Math.floor(ms / 60e3), s = Math.floor((ms % 60e3) / 1e3); return (m >= 60 ? Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };

  function htmlTexto(id) {
    const t = D.textos[id]; if (!t) return '';
    const corpo = t.lines ? '<ol>' + t.lines.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ol>' : (t.paras || [t.text || '']).map((p) => '<p>' + esc(p) + '</p>').join('');
    return '<details class="texto-d"' + (V.sess.textoAberto || deitado() ? ' open' : '') + '><summary>📄 ' + esc(t.title || 'Texto') + (t.range ? ' (questões ' + esc(t.range) + ')' : '') + '</summary><div class="texto">' + corpo + '</div></details>';
  }

  function telaSessao() {
    const s = V.sess;
    if (s.fim) return telaResultado();
    const it = s.itens[s.i];
    const total = s.itens.length;
    let h = '<div class="qtopo"><span class="muted">' + (s.i + 1) + ' de ' + total + '</span>';
    if (s.modo === 'simulado') h += '<span class="relogio" id="relogio">' + mmss(s.limite - ((s.usado || 0) + (Date.now() - s.inicio))) + '</span>';
    h += '<button class="bt sec" style="width:auto;margin:0;padding:8px 14px" data-acao="sair">Sair</button></div>';
    const ehCartao = s.modo === 'cartoes' || (s.modo === 'misto' && it.startsWith('c:'));
    const id = s.modo === 'misto' ? it.slice(2) : it;
    if (ehCartao) return h + telaCartao(id);
    const q = D.questoes[id];
    h += '<section class="card' + (q.texto ? ' comtexto' : '') + '">' + (q.texto ? htmlTexto(q.texto) : '') + '<div class="qlado"><div class="muted">' + esc(mat(q.mat).curto) + ' · ' + esc(D.temas[q.tema] ? D.temas[q.tema].nome : '') + '</div><p class="enun">' + md(q.enun) + '</p>';
    const marc = s.resp[id];
    const mostra = s.modo !== 'simulado' && marc != null;
    q.alts.forEach((a, k) => {
      let c = '';
      if (mostra) c = k === q.gab ? ' certa' : k === marc ? ' errada' : '';
      else if (marc === k) c = ' marc';
      h += '<button class="alt' + c + '" data-acao="alt" data-k="' + k + '"' + (mostra ? ' disabled' : '') + '><b>' + LET[k] + '</b><span>' + md(a) + '</span></button>';
    });
    if (mostra) {
      const ok = marc === q.gab;
      h += '<div class="com ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? '✔ Certo!' : '✘ Resposta certa: ' + LET[q.gab]) + '</b>' + (q.fonte ? ' <span class="muted">· ' + esc(q.fonte) + (q.origem === 'atualizada' ? ' · atualizada' : '') + '</span>' : '') + '\n' + md(q.com || '') + (q.pega ? '\n\n<b>Pegadinha:</b> ' + md(q.pega) : '') + '</div>';
    }
    h += '</div></section>';
    if (s.modo === 'simulado') {
      h += '<div class="linha2"><button class="bt sec" data-acao="ant"' + (s.i ? '' : ' disabled') + '>← Anterior</button><button class="bt sec" data-acao="prox"' + (s.i < total - 1 ? '' : ' disabled') + '>Próxima →</button></div>';
      h += '<details><summary>Ver todas as questões (' + Object.keys(s.resp).length + '/' + total + ' respondidas)</summary><div class="grade">' + s.itens.map((x, k) => '<button data-acao="ir" data-k="' + k + '" class="' + (s.resp[x] != null ? 'resp' : '') + (k === s.i ? ' atual' : '') + '">' + (k + 1) + '</button>').join('') + '</div></details>';
      h += '<button class="bt" data-acao="entregar">Entregar simulado</button>';
    } else if (mostra) h += '<button class="bt" data-acao="seguir">' + (s.i < total - 1 ? 'Próxima →' : 'Ver resultado') + '</button>';
    return h;
  }
  function telaCartao(cid) {
    const s = V.sess, c = D.cartoes[cid], r = s.resp[cid];
    let h = '<section class="card cartao"><div class="muted">' + esc(mat(c.mat).curto) + ' · ' + esc(D.temas[c.tema].nome) + '</div><p class="enun">' + md(c.frente) + '</p>';
    if (c.alts && c.alts.length) {
      c.alts.forEach((a, k) => {
        const cl = r == null ? '' : k === c.gab ? ' certa' : k === r ? ' errada' : '';
        h += '<button class="alt' + cl + '" data-acao="calt" data-k="' + k + '"' + (r != null ? ' disabled' : '') + '><b>' + LET[k] + '</b><span>' + md(a) + '</span></button>';
      });
      if (r != null) h += '<div class="com ' + (r === c.gab ? 'ok' : 'no') + '">' + md(c.verso) + '</div></section><button class="bt" data-acao="seguir">Próximo →</button>';
      else h += '</section>';
      return h;
    }
    if (!s.virado) return h + '</section><button class="bt" data-acao="virar">Mostrar resposta</button>';
    return h + '<div class="com ok">' + md(c.verso) + '</div></section><div class="linha2"><button class="bt sec" data-acao="lembrei" data-v="0">✘ Não lembrei</button><button class="bt" data-acao="lembrei" data-v="1">✔ Lembrei</button></div>';
  }
  function marcarCartao(cid, ok) {
    const e = G.cart[cid] || { cx: 0 };
    if (ok) { e.cx = Math.min(e.cx + 1, 4); e.due = somaDias([1, 3, 7, 15, 30][e.cx]); } else { e.cx = 0; e.due = somaDias(1); }
    G.cart[cid] = e; V.sess.resp[cid] = V.sess.resp[cid] != null ? V.sess.resp[cid] : ok; salvar();
  }
  function responder(k) {
    const s = V.sess; const it = s.itens[s.i]; const id = s.modo === 'misto' ? it.slice(2) : it;
    if (s.modo === 'simulado') { s.resp[id] = k; guardarAndamento(); render(); return; }
    if (s.resp[id] != null) return;
    const q = D.questoes[id]; const ok = k === q.gab;
    s.resp[id] = k;
    if (s.modo === 'erros') {
      const e = G.erros[id] || { cx: 0 };
      if (ok) { e.cx++; if (e.cx >= 3) delete G.erros[id]; else { e.due = somaDias([1, 3, 7][e.cx]); G.erros[id] = e; } } else G.erros[id] = { cx: 0, due: somaDias(1) };
      const r = G.resp[id] || { n: 0, ok: 0 }; r.n++; if (ok) r.ok++; r.certo = ok; r.d = hoje(); G.resp[id] = r;
    } else registrar(id, ok, LET[k]);
    salvar(); render();
  }
  function seguir() { const s = V.sess; s.virado = false; if (s.i < s.itens.length - 1) { s.i++; render(); window.scrollTo(0, 0); } else { s.fim = true; render(); window.scrollTo(0, 0); } }

  function entregar() {
    const s = V.sess; clearInterval(rel);
    const usado = (s.usado || 0) + (Date.now() - s.inicio);
    s.itens.forEach((qid) => {
      const q = D.questoes[qid]; const k = s.resp[qid]; const certo = k === q.gab;
      if (k != null) registrar(qid, certo, LET[k]); else G.erros[qid] = { cx: 0, due: hoje() };
    });
    const A = analisa(s.itens, s.resp); A.d = hoje(); A.seg = Math.round(usado / 1000);
    (G.sims[s.simId] = G.sims[s.simId] || []).push(A);
    G.andamento = null; s.fim = true; s.nota = A;
    salvar();
    if (Date.now() - (G.ultBackup || 0) > 7 * DIA) setTimeout(() => toast('Dica: faça um backup na aba Ajustes.'), 1500);
    render(); window.scrollTo(0, 0);
  }
  function telaResultado() {
    const s = V.sess;
    if (s.modo !== 'simulado') {
      const vals = Object.entries(s.resp); const ok = vals.filter(([id, v]) => (D.questoes[id] ? v === D.questoes[id].gab : v === true || (D.cartoes[id] && v === D.cartoes[id].gab))).length;
      const p = pct(ok, vals.length);
      return '<section class="card" style="text-align:center"><h1>Pronto!</h1><div class="grande ' + corPct(p || 0) + '">' + ok + ' / ' + vals.length + '</div><p class="muted">' + (p >= 80 ? 'Muito bem! 👏' : p >= 50 ? 'Bom. Os erros já foram para o Revisar.' : 'Os erros foram para o Revisar. Vale reler o resumo do tema.') + '</p></section><button class="bt" data-acao="fechar">Concluir</button>';
    }
    const N = s.nota, p = pct(N.ok, N.n), S = situacao(N);
    let h = '<section class="card" style="text-align:center"><h1>' + esc(s.titulo) + '</h1><div class="grande ' + corPct(p) + '">' + p + '%</div><div class="muted">' + N.ok + ' de ' + N.n + ' · ' + Math.round(N.seg / 60) + ' min · ' + (N.seg / 60 / N.n).toFixed(1) + ' min por questão (prova: 3,9)</div></section>';
    h += '<section class="card"><h2>' + (S.passou ? '✔ Passaria no corte' : '✘ Seria eliminada') + '</h2>' + S.linhas.map((l) => '<p class="' + (l.ok ? 'verde' : 'vermelho') + '"><b>' + (l.ok ? '✔' : '✘') + '</b> ' + esc(l.txt) + '</p>').join('') + '<p class="muted">Regra do edital: 50% nas Específicas, 50% nos Gerais e não zerar Português nem Inglês.</p></section>';
    h += '<section class="card"><h2>Por bloco do edital</h2>' + ORDEMBLOCO.filter((b) => N.blo[b]).map((b) => barra(NOMEBLOCO[b], pct(N.blo[b][0], N.blo[b][1]), N.blo[b][0] + '/' + N.blo[b][1])).join('') + '</section>';
    const errs = s.itens.filter((q) => s.resp[q] !== D.questoes[q].gab);
    h += '<section class="card"><h2>Gabarito</h2><div class="grade">' + s.itens.map((q, k) => '<button data-acao="vergab" data-k="' + k + '" class="' + (s.resp[q] === D.questoes[q].gab ? 'ok' : 'no') + '">' + (k + 1) + '</button>').join('') + '</div><p class="muted">Toque num número para ver a questão comentada. As ' + errs.length + ' erradas ou em branco já foram para o Revisar.</p></section>';
    if (s.ver != null) {
      const q = D.questoes[s.itens[s.ver]], m = s.resp[q.id];
      h += '<section class="card" id="vergab"><div class="muted">Questão ' + (s.ver + 1) + '</div>' + (q.texto ? htmlTexto(q.texto) : '') + '<p class="enun">' + md(q.enun) + '</p>' + q.alts.map((a, k) => '<div class="alt' + (k === q.gab ? ' certa' : k === m ? ' errada' : '') + '"><b>' + LET[k] + '</b><span>' + md(a) + '</span></div>').join('') + '<div class="com ' + (m === q.gab ? 'ok' : 'no') + '">' + md(q.com || '') + (q.pega ? '\n\n<b>Pegadinha:</b> ' + md(q.pega) : '') + '</div></section>';
    }
    return h + '<button class="bt" data-acao="fechar">Concluir</button>';
  }
  const barra = (nome, p, extra) => '<div style="margin:0 0 12px"><div style="display:flex;justify-content:space-between"><b>' + esc(nome) + '</b><span class="pct ' + (p == null ? '' : corPct(p)) + '">' + (p == null ? '—' : p + '%') + (extra ? ' <span class="muted">(' + extra + ')</span>' : '') + '</span></div><div class="barra"><i style="width:' + (p || 0) + '%;background:' + corHex(p || 0) + '"></i></div></div>';

  /* ---------------- SIMULADOS ---------------- */
  function linhaSim(s) {
    const h = G.sims[s.id] || []; const u = h[h.length - 1]; const p = u ? pct(u.ok, u.n) : null;
    const and = G.andamento && G.andamento.simId === s.id;
    return '<li><button class="item" data-acao="sim" data-id="' + s.id + '"><span class="nome">' + esc(s.titulo) + '<span class="sub">' + s.qids.length + ' questões · ' + s.min + ' min' + (u ? ' · feito ' + h.length + 'x' : '') + '</span></span>' + (and ? '<span class="tag media">em andamento</span>' : p != null ? '<span class="pct ' + corPct(p) + '">' + p + '%</span>' : '<span class="tag baixa">fazer</span>') + '</button></li>';
  }
  function telaSimulados() {
    let h = '';
    if (G.andamento) h += '<section class="card hoje"><h2>Simulado em andamento</h2><div class="muted">' + esc(G.andamento.titulo) + ' · ' + Object.keys(G.andamento.resp).length + '/' + G.andamento.itens.length + ' respondidas</div><button class="bt" data-acao="continuar">▶ Continuar</button></section>';
    h += '<section class="card"><h2>⚡ Treino curto</h2><p class="muted">10 questões com tempo, puxando primeiro as que você mais erra. Bom para os dias corridos.</p><div class="linha2"><button class="bt" data-acao="rapido">Todas</button>' + D.materias.filter((m) => Object.values(D.questoes).some((q) => q.mat === m.id)).map((m) => '<button class="bt sec" data-acao="rapido" data-id="' + m.id + '">' + esc(m.curto) + '</button>').join('') + '</div></section>';
    const grupos = [['mini', 'Mini simulados', 'Mais curtos: bons para o dia a dia.'], ['prova', 'Simulados completos', 'No formato da prova. Faça com calma, sem interrupções.'], ['antiga', 'Provas anteriores (reais)', 'Questões reais da Cesgranrio com gabarito oficial. As marcadas como atualizadas foram ajustadas ao edital de 2026.']];
    grupos.forEach(([tipo, tit, sub]) => {
      const l = D.simulados.filter((s) => s.tipo === tipo); if (!l.length) return;
      const f = l.filter((x) => (G.sims[x.id] || []).length).length;
      h += '<h2 style="margin-top:20px">' + tit + ' <span class="muted">(' + f + '/' + l.length + ' feitos)</span></h2><p class="muted" style="margin-top:-6px">' + sub + '</p><ul class="lista">' + l.map(linhaSim).join('') + '</ul>';
    });
    return h + '<p class="muted">Sem gabarito durante o simulado. No fim você vê a nota, o comentário de cada questão, e os erros vão para o Revisar.</p>';
  }

  /* ---------------- REVISAR ---------------- */
  function telaRevisar() {
    const e = errosHoje(), totalE = Object.keys(G.erros).length;
    const venc = Object.values(G.cart).filter((c) => c.due <= hoje()).length;
    let h = '<section class="card"><h2>❌ Erros para refazer</h2>';
    if (e.length) h += '<div class="grande vermelho">' + e.length + '</div><p class="muted">Acertou 3 vezes em dias diferentes, a questão sai da lista.</p><button class="bt" data-acao="erros">Refazer agora</button>';
    else h += '<p class="muted">' + (totalE ? 'Nada para hoje. Faltam ' + totalE + ' erro(s) agendado(s) para os próximos dias.' : 'Nenhum erro guardado. 🎉') + '</p>';
    h += '</section><section class="card"><h2>🔁 Revisão rápida</h2><p class="muted">10 itens curtos (cartões e questões), puxando primeiro o que você mais erra. Uns 10 minutos.' + (venc ? ' <b>' + venc + ' cartão(ões) vencido(s).</b>' : '') + '</p><button class="bt sec" data-acao="rapida">Começar revisão rápida</button></section>';
    const lista = Object.keys(G.erros).filter((q) => D.questoes[q]);
    if (lista.length) {
      const porTema = {}; lista.forEach((q) => { const t = D.questoes[q].tema; porTema[t] = (porTema[t] || 0) + 1; });
      h += '<section class="card"><h2>Onde estão os erros</h2><ul class="lista">' + Object.entries(porTema).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => '<li><button class="item" data-acao="tema" data-id="' + t + '"><span class="nome">' + esc(D.temas[t] ? D.temas[t].nome : t) + '<span class="sub">' + esc(D.temas[t] ? mat(D.temas[t].mat).curto : '') + '</span></span><span class="pct vermelho">' + n + '</span></button></li>').join('') + '</ul><p class="muted">Toque para ver o resumo do tema, quando houver.</p></section>';
    }
    return h;
  }

  /* ---------------- DESEMPENHO ---------------- */
  function telaDesempenho() {
    const tent = []; Object.entries(G.sims).forEach(([id, l]) => l.forEach((r) => { if (r.esp) tent.push({ id, r }); }));
    tent.sort((x, y) => (x.r.d < y.r.d ? -1 : 1));
    const tit = (id) => { const s = D.simulados.find((x) => x.id === id); return s ? s.titulo : 'Treino curto'; };
    let h = '';
    const comp = tent.filter((t) => t.r.esp[1] >= 20 && t.r.ger[1] >= 10);
    if (comp.length) {
      const u = comp[comp.length - 1], S = situacao(u.r);
      h += '<section class="card"><h2>🎯 Situação no corte <span class="muted">(último: ' + esc(tit(u.id)) + ')</span></h2>' + S.linhas.map((l) => '<p class="' + (l.ok ? 'verde' : 'vermelho') + '"><b>' + (l.ok ? '✔' : '✘') + '</b> ' + esc(l.txt) + '</p>').join('');
      const ult3 = comp.slice(-3); const soma = (k) => ult3.reduce((a, t) => [a[0] + t.r[k][0], a[1] + t.r[k][1]], [0, 0]);
      if (ult3.length > 1) { const e = soma('esp'), g = soma('ger'); h += '<p class="muted">Média dos ' + ult3.length + ' últimos: Específicas ' + pct(e[0], e[1]) + '% · Gerais ' + pct(g[0], g[1]) + '%</p>'; }
      h += '</section>';
    } else h += '<section class="card"><h2>🎯 Situação no corte</h2><p class="muted">Faça um simulado ou mini para ver se passaria no corte (50% nas Específicas, 50% nos Gerais e sem zerar Português ou Inglês).</p></section>';
    if (tent.length) h += '<section class="card"><h2>📈 Evolução nos simulados</h2>' + tent.slice(-10).map((t) => '<div style="margin:0 0 14px"><b>' + esc(tit(t.id)) + '</b> <span class="muted">' + t.r.d.slice(8) + '/' + t.r.d.slice(5, 7) + '</span>' + (t.r.esp[1] ? barra('Específicas', pct(t.r.esp[0], t.r.esp[1]), t.r.esp[0] + '/' + t.r.esp[1]) : '') + (t.r.ger[1] ? barra('Gerais', pct(t.r.ger[0], t.r.ger[1]), t.r.ger[0] + '/' + t.r.ger[1]) : '') + '</div>').join('') + '</section>';
    const ag = {}, sub = {}, tip = {};
    Object.entries(G.resp).forEach(([qid, r]) => {
      const q = D.questoes[qid]; if (!q) return;
      const add = (o, k) => { o[k] = o[k] || [0, 0]; o[k][0] += r.ok; o[k][1] += r.n; };
      add(ag, q.bloco || q.mat); if (q.sub) add(sub, q.sub); if (ehEsp(q)) add(tip, q.tipo || 'conceito');
    });
    h += '<section class="card"><h2>📚 Por bloco do edital</h2>' + ORDEMBLOCO.map((b) => barra(NOMEBLOCO[b], ag[b] ? pct(ag[b][0], ag[b][1]) : null, ag[b] ? ag[b][1] + ' resp.' : '')).join('') + '<p class="muted">Verde ≥ 80% (meta) · amarelo ≥ 50% (corte) · vermelho abaixo do corte.</p></section>';
    const fr = Object.entries(sub).filter(([, v]) => v[1] >= 3).sort((x, y) => x[1][0] / x[1][1] - y[1][0] / y[1][1]).slice(0, 6);
    if (fr.length) h += '<section class="card"><h2>🔎 Assuntos mais fracos</h2><ul class="lista">' + fr.map(([k, v]) => '<li><button class="item" data-acao="treinarsub" data-id="' + k + '"><span class="nome">' + esc(NOMESUB[k] || k) + '<span class="sub">' + v[1] + ' respostas · toque para treinar</span></span><span class="pct ' + corPct(pct(v[0], v[1])) + '">' + pct(v[0], v[1]) + '%</span></button></li>').join('') + '</ul></section>';
    if (Object.keys(tip).length) h += '<section class="card"><h2>🧩 Por tipo de questão</h2>' + Object.entries(tip).map(([k, v]) => barra(k === 'caso' ? 'Casos (situação-problema)' : 'Conceito / autor / norma', pct(v[0], v[1]), v[1] + ' resp.')).join('') + '</section>';
    const ts = tent.filter((t) => t.r.seg && t.r.n); if (ts.length) { const m = ts.reduce((a, t) => a + t.r.seg, 0) / ts.reduce((a, t) => a + t.r.n, 0) / 60; h += '<section class="card"><h2>⏱ Ritmo</h2><div class="grande ' + (m <= 3.9 ? 'verde' : 'amarelo') + '">' + m.toFixed(1) + ' min</div><p class="muted">por questão nos simulados · na prova real: 3,9 min (270 min para 70 questões)</p></section>'; }
    return h;
  }
  const NOMESUB = { 'codigo-etica': 'Código de Ética', 'res-06-2019': 'Documentos psicológicos (Res. 06/2019)', 'res-31-2022': 'Avaliação psicológica e SATEPSI (Res. 31/2022)', 'res-14-2023': 'Riscos psicossociais (Res. 14/2023)', 'res-08-2025': 'Avaliação em concurso (Res. 08/2025)', 'res-09-2024': 'Atendimento por TDICs (Res. 09/2024)', 'res-01-1999': 'Orientação sexual (Res. 01/1999)', 'res-18-2002': 'Relações raciais (Res. 18/2002)', 'res-08-2020': 'Violências de gênero (Res. 08/2020)', mudanca: 'Gestão de mudanças', transformacoes: 'Transformações no trabalho', 'gestao-estrategica': 'Gestão estratégica de pessoas', competencias: 'Gestão por competências', desempenho: 'Gestão de desempenho', conflitos: 'Gestão de conflitos', do: 'Desenvolvimento organizacional', aprendizagem: 'Aprendizagem organizacional', estrutura: 'Estrutura organizacional', rs: 'Recrutamento e seleção', desligamento: 'Desligamento', aposentadoria: 'Aposentadoria', td: 'Treinamento e desenvolvimento', 'cultura-clima': 'Cultura e clima', motivacao: 'Motivação', decisao: 'Tomada de decisão', diversidade: 'Diversidade', atitudes: 'Atitudes e atribuição', lideranca: 'Liderança', poder: 'Poder e influência', grupos: 'Processos grupais', equipes: 'Equipes', comunicacao: 'Comunicação', crise: 'Crise e emergência', dejours: 'Psicodinâmica (Dejours)', clinicas: 'Clínicas do trabalho', estresse: 'Estresse', burnout: 'Burnout', nr: 'Normas Regulamentadoras', nexo: 'Nexo causal e doenças do trabalho', psicopatologia: 'Psicopatologia do trabalho', processo: 'Processo saúde-doença', assedio: 'Assédio e violência', acidente: 'Acidente de trabalho', qvt: 'QVT e bem-estar', multi: 'Equipes multiprofissionais', 'saude-trab': 'Saúde do trabalhador' };

  /* ---------------- AJUSTES ---------------- */
  function telaAjustes() {
    const ub = G.ultBackup ? new Date(G.ultBackup).toLocaleDateString('pt-BR') : 'nunca';
    return '<section class="card"><h2>Você</h2><label class="fld">Seu nome<input data-set="nome" value="' + esc(G.nome) + '"></label><label class="fld">Data da prova<input type="date" data-set="prova" value="' + esc(G.prova) + '"></label></section>' +
      '<section class="card"><h2>💾 Backup do progresso</h2><p class="muted">O progresso fica guardado neste tablet. Salve um backup de vez em quando (no Drive ou no WhatsApp) para não perder nada. Último backup: <b>' + ub + '</b>.</p><button class="bt" data-acao="backup">Salvar backup</button><button class="bt sec" data-acao="restaurar">Restaurar backup</button><input type="file" id="arq" accept=".json,application/json" hidden></section>' +
      '<section class="card"><h2>📲 Instalar na tela inicial</h2><p class="muted">No Chrome: menu ⋮ → <b>Adicionar à tela inicial</b> (ou <b>Instalar app</b>). Depois abra sempre pelo ícone: o app fica em tela cheia e funciona sem internet.</p></section>' +
      '<section class="card"><h2>Zerar</h2><p class="muted">Apaga todo o progresso deste aparelho.</p><button class="bt sec" data-acao="zerar" style="color:var(--ruim)">Zerar progresso</button></section>' +
      '<p class="muted" style="text-align:center">Conteúdo v' + esc(D.versao) + '</p>';
  }
  function backup() {
    const b = new Blob([JSON.stringify({ app: 'psi', em: new Date().toISOString(), G })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'backup-psicologia-' + hoje() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    G.ultBackup = Date.now(); salvar(); toast('Backup salvo em Downloads.'); render();
  }
  function restaurar(f) {
    const r = new FileReader();
    r.onload = () => { try { const j = JSON.parse(r.result); if (j.app !== 'psi' || !j.G) throw 0; G = Object.assign(novo(), j.G); salvar(); toast('Progresso restaurado!'); render(); } catch (e) { toast('Este arquivo não é um backup deste app.'); } };
    r.readAsText(f);
  }

  /* ---------------- eventos ---------------- */
  document.addEventListener('click', (ev) => {
    const ab = ev.target.closest('#abas button'); if (ab) return trocarAba(ab.dataset.aba);
    const b = ev.target.closest('[data-acao]'); if (!b || b.disabled) return;
    const a = b.dataset.acao, id = b.dataset.id;
    switch (a) {
      case 'mat': G.ultMat = id; salvar(); render(); break;
      case 'tema': ir({ aba: V.aba, tema: id }); break;
      case 'voltar': history.back(); break;
      case 'lido': if (G.lidos[id]) delete G.lidos[id]; else { G.lidos[id] = hoje(); toast('Tema marcado como lido ✓'); } salvar(); render(); break;
      case 'treinar': treinoTema(id); break;
      case 'cartoes': cartoesTema(id); break;
      case 'rapida': revisaoRapida(); break;
      case 'erros': refazerErros(); break;
      case 'sim': abrirSimulado(id); break;
      case 'rapido': simuladoSorteado(id); break;
      case 'treinarsub': { const l = embaralhar(Object.keys(D.questoes).filter((q) => D.questoes[q].sub === id)).sort((a, b) => peso(a) - peso(b)).slice(0, 10); iniciar({ modo: 'treino', titulo: NOMESUB[id] || 'Treino', itens: l }); break; }
      case 'continuar': continuar(); break;
      case 'alt': responder(+b.dataset.k); break;
      case 'calt': { const s = V.sess, it = s.itens[s.i], cid = s.modo === 'misto' ? it.slice(2) : it, k = +b.dataset.k; s.resp[cid] = k; marcarCartao(cid, k === D.cartoes[cid].gab); s.resp[cid] = k; render(); break; }
      case 'virar': V.sess.virado = true; render(); break;
      case 'lembrei': { const s = V.sess, it = s.itens[s.i], cid = s.modo === 'misto' ? it.slice(2) : it; marcarCartao(cid, b.dataset.v === '1'); seguir(); break; }
      case 'seguir': seguir(); break;
      case 'ant': V.sess.i--; V.sess.textoAberto = !!document.querySelector('.texto-d[open]'); guardarAndamento(); render(); break;
      case 'prox': V.sess.i++; V.sess.textoAberto = !!document.querySelector('.texto-d[open]'); guardarAndamento(); render(); break;
      case 'ir': V.sess.i = +b.dataset.k; guardarAndamento(); render(); window.scrollTo(0, 0); break;
      case 'entregar': { const s = V.sess, f = s.itens.length - Object.keys(s.resp).length; if (confirm(f ? 'Faltam ' + f + ' questão(ões) em branco. Entregar mesmo assim?' : 'Entregar o simulado?')) entregar(); break; }
      case 'vergab': V.sess.ver = +b.dataset.k; render(); { const el = $('#vergab'); if (el) el.scrollIntoView({ behavior: 'smooth' }); } break;
      case 'sair': if (V.sess.modo === 'simulado') { V.sess.saindo = true; guardarAndamento(); toast('Simulado salvo. Continue quando quiser.'); } history.back(); break;
      case 'fechar': history.back(); break;
      case 'backup': backup(); break;
      case 'restaurar': $('#arq').click(); break;
      case 'zerar': if (confirm('Apagar TODO o progresso? Não dá para desfazer.') && confirm('Tem certeza?')) { G = novo(); salvar(); toast('Progresso zerado.'); render(); } break;
    }
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.id === 'arq' && t.files[0]) restaurar(t.files[0]);
    if (t.dataset.set) { G[t.dataset.set] = t.value; salvar(); toast('Salvo'); }
  });
  const fs = $('#bt-cheia');
  if (!document.documentElement.requestFullscreen) fs.style.display = 'none';
  fs.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('Tela cheia indisponível aqui.')); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) guardarAndamento(); });

  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(render, 200); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
})();
