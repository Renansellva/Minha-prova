
const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const fsPromises = fs.promises;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('./database');
const MemoryDatabase = require('./database-memory');
const moment = require('moment');

// Firebase (só inicializa se tiver configurado)
let dbFirebase, authFirebase;
try {
  const firebase = require('./firebase');
  dbFirebase = firebase.dbFirebase;
  authFirebase = firebase.authFirebase;
  console.log('✅ Firebase inicializado com sucesso!');
} catch (error) {
  console.warn('⚠️ Firebase não configurado:', error.message);
  dbFirebase = null;
  authFirebase = null;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Detectar se está em ambiente de produção (Vercel)
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// Usar banco em memória na Vercel, SQLite localmente
const db = process.env.VERCEL ? new MemoryDatabase() : new Database();

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão
app.use(session({
  secret: 'minha-prova-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Helper para checar se o professor tem plano liberado em produção
// Neste primeiro momento usamos uma lista de e-mails em variável de ambiente (PAID_EMAILS)
async function hasPlanoMensalAtivo(professorId) {
  try {
    const professor = await db.getProfessorById(professorId);
    if (!professor) return false;

    // Admin sempre tem acesso
    if (professor.email === 'admin@escola.com') return true;

    const raw = process.env.PAID_EMAILS || '';
    const paidEmails = raw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    if (paidEmails.includes((professor.email || '').toLowerCase())) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('Erro ao verificar plano mensal:', err);
    return false;
  }
}

// Middleware de autenticação (páginas)
const requireAuth = async (req, res, next) => {
  if (!req.session.professorId) {
    return res.redirect('/login');
  }

  // Em desenvolvimento (localhost) não bloqueia pelo plano
  if (!IS_PROD) {
    return next();
  }

  const planoAtivo = await hasPlanoMensalAtivo(req.session.professorId);
  if (!planoAtivo) {
    return res.redirect('/plano-mensal');
  }

  next();
};

// Middleware de autenticação para APIs (sempre retorna JSON)
const requireAuthAPI = async (req, res, next) => {
  if (!req.session.professorId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Não autenticado. Faça login novamente.',
      redirect: '/login'
    });
  }

  // Em desenvolvimento (localhost) não bloqueia pelo plano
  if (!IS_PROD) {
    return next();
  }

  const planoAtivo = await hasPlanoMensalAtivo(req.session.professorId);
  if (!planoAtivo) {
    return res.status(402).json({
      success: false,
      message: 'Seu plano mensal não está ativo. Acesse o link de pagamento para continuar usando o sistema.',
      pagamento: process.env.PLANO_PIX_LINK || 'https://pag.ae/81fwV3eHJ',
      redirect: '/plano-mensal'
    });
  }

  next();
};

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + '_' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  }
});

// Configuração específica para upload de fotos de perfil
const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/profiles/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + '_' + file.originalname;
    cb(null, uniqueName);
  }
});

const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB para fotos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Criar diretório uploads se não existir
const createUploadsDir = async () => {
  try {
    await fsPromises.mkdir('uploads', { recursive: true });
  } catch (error) {
    console.error('Erro ao criar diretório uploads:', error);
  }
};
createUploadsDir();

// Função para gerar QR Code como string base64
async function gerarQRCode(data) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data);
    return qrCodeDataURL;
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    return null;
  }
}

// ==================== ROTAS PÚBLICAS ====================

// Rota principal - redireciona para login ou dashboard
// Rota de teste para Vercel
app.get('/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de teste do Firebase
app.get('/firebase-test', async (req, res) => {
  try {
    if (!dbFirebase) {
      return res.status(503).json({ 
        success: false, 
        message: 'Firebase não configurado. Configure FIREBASE_SERVICE_ACCOUNT ou o arquivo FIREBASE_SERVICE_ACCOUNT' 
      });
    }
    
    const docRef = dbFirebase.collection('test').doc('ping');
    await docRef.set({ 
      ok: true, 
      timestamp: new Date(),
      message: 'Firebase conectado e escrevendo no Firestore!'
    });
    
    res.json({ 
      success: true, 
      message: 'Firebase conectado e escrevendo no Firestore!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro Firebase:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

app.get('/', (req, res) => {
  if (req.session.professorId) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Rota de login
app.get('/login', (req, res) => {
  if (req.session.professorId) {
    res.redirect('/dashboard');
  } else {
    res.render('login');
  }
});

// Página informando sobre o plano mensal e link Pix
app.get('/plano-mensal', (req, res) => {
  const pixLink = process.env.PLANO_PIX_LINK || 'https://pag.ae/81fwV3eHJ';
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Plano Mensal - Provas</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#0f172a; color:#e5e7eb; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:16px; }
        .card { max-width:480px; width:100%; background:#020617; border-radius:16px; padding:24px 20px 20px; box-shadow:0 20px 45px rgba(15,23,42,0.7); border:1px solid rgba(148,163,184,0.25); }
        h1 { font-size:1.5rem; margin:0 0 8px; color:#f9fafb; }
        p { margin:0 0 10px; color:#cbd5f5; font-size:0.95rem; }
        .price { font-size:1.4rem; font-weight:600; color:#22c55e; margin:8px 0 16px; }
        .badge { display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; padding:3px 9px; border-radius:999px; background:rgba(34,197,94,0.15); color:#bbf7d0; margin-bottom:10px; }
        .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:10px 18px; border-radius:999px; background:linear-gradient(135deg,#22c55e,#16a34a); color:#022c22; font-weight:600; font-size:0.95rem; text-decoration:none; border:none; cursor:pointer; margin-top:4px; }
        .btn span.icon { font-size:1rem; }
        .info { font-size:0.8rem; color:#9ca3af; margin-top:10px; }
        .steps { margin-top:12px; padding-left:18px; font-size:0.85rem; color:#cbd5e1; }
        .steps li { margin-bottom:4px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Acesso completo às ferramentas de provas</div>
        <h1>Ative seu plano mensal</h1>
        <p>Para usar o sistema online (Vercel) é necessário um plano mensal ativo.</p>
        <div class="price">R$ 30,00 / mês</div>
        <p>Pagamento via Pix pelo PagSeguro. Clique no botão abaixo para abrir a página segura de pagamento:</p>
        <a class="btn" href="${pixLink}" target="_blank" rel="noopener noreferrer">
          <span class="icon">⚡</span>
          <span>Pagar plano mensal (Pix)</span>
        </a>
        <ul class="steps">
          <li>1. Clique no botão e faça o pagamento via Pix.</li>
          <li>2. Envie o comprovante para o suporte / contato informado por você.</li>
          <li>3. Após confirmação, seu e-mail será liberado para uso do sistema.</li>
        </ul>
        <p class="info">Enquanto estiver em desenvolvimento (localhost), o sistema funciona normalmente sem plano. Em produção, somente e-mails liberados pelo administrador conseguem acessar o painel.</p>
      </div>
    </body>
    </html>
  `);
});

// Rota de registro
app.get('/registro', (req, res) => {
  if (req.session.professorId) {
    res.redirect('/dashboard');
  } else {
    res.render('registro');
  }
});

// API de login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const professor = await db.loginProfessor(email, senha);
    
    if (professor) {
      req.session.professorId = professor.id;
      req.session.professorNome = professor.nome;
      res.json({ success: true, message: 'Login realizado com sucesso!' });
    } else {
      res.json({ success: false, message: 'E-mail ou senha incorretos.' });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.json({ success: false, message: 'Erro interno do servidor.' });
  }
});

// API de registro
app.post('/api/registro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    
    // Verificar se o email já existe
    const professorExistente = await db.getProfessorByEmail(email);
    if (professorExistente) {
      return res.json({ success: false, message: 'Este e-mail já está em uso.' });
    }
    
    // Hash da senha
    const senhaHash = bcrypt.hashSync(senha, 10);
    
    // Criar novo professor
    const professorId = await db.addProfessor(nome, email, senhaHash);
    
    if (professorId) {
      res.json({ success: true, message: 'Conta criada com sucesso!' });
    } else {
      res.json({ success: false, message: 'Erro ao criar conta.' });
    }
  } catch (error) {
    console.error('Erro no registro:', error);
    res.json({ success: false, message: 'Erro interno do servidor.' });
  }
});

// Rota de logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Middleware para verificar se é administrador
const requireAdmin = (req, res, next) => {
  if (req.session.professorId === 1) { // ID 1 é sempre o administrador
    next();
  } else {
    res.status(403).json({ success: false, message: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' });
  }
};

// Rota para listar usuários (apenas admin)
app.get('/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const usuarios = await db.getAllProfessores();
    res.render('usuarios/lista', {
      professor: { nome: req.session.professorNome },
      usuarios
    });
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// API para excluir usuário (apenas admin)
app.delete('/api/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const usuarioId = req.params.id;
    
    // Não permitir excluir o administrador (ID 1)
    if (usuarioId == 1) {
      return res.json({ success: false, message: 'Não é possível excluir o administrador do sistema.' });
    }
    
    // Verificar se o usuário existe
    const usuario = await db.getProfessorById(usuarioId);
    if (!usuario) {
      return res.json({ success: false, message: 'Usuário não encontrado.' });
    }
    
    // Excluir todas as provas do usuário primeiro
    const provas = await db.getProvas(usuarioId);
    for (const prova of provas) {
      await db.deleteProva(prova.id);
    }
    
    // Excluir todas as questões do usuário
    const questoes = await db.getQuestoes(usuarioId);
    for (const questao of questoes) {
      await db.deleteQuestao(questao.id);
    }
    
    // Excluir o usuário
    await db.deleteProfessor(usuarioId);
    
    res.json({ success: true, message: 'Usuário excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.json({ success: false, message: 'Erro ao excluir usuário' });
  }
});

// ==================== ROTAS PROTEGIDAS ====================

// Dashboard principal
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    
    // Buscar estatísticas
    const provas = await db.getProvas(professorId);
    const questoes = await db.getQuestoes(professorId);
    
    // Contar áreas únicas
    const areas = [...new Set(questoes.map(q => q.area))];
    
    // Contar total de usuários (apenas admin pode ver)
    const professorAtual = await db.getProfessorById(professorId);
    let totalUsuarios = 0;
    if (professorAtual.email === 'admin@escola.com') {
      const todosProfessores = await db.getAllProfessores();
      totalUsuarios = todosProfessores.length;
    }
    
    const stats = {
      totalProvas: provas.length,
      totalQuestoes: questoes.length,
      totalAreas: areas.length,
      totalUsuarios: totalUsuarios
    };
    
    const provasRecentes = provas.slice(0, 5);
    
    res.render('dashboard', {
      professor: {
        id: req.session.professorId,
        nome: req.session.professorNome,
        email: professorAtual.email,
        foto: professorAtual.foto || null
      },
      stats,
      provasRecentes
    });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Perfil do usuário
app.get('/perfil', requireAuth, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    
    // Buscar dados do professor
    const professor = await db.getProfessorById(professorId);
    
    // Buscar estatísticas detalhadas
    const provas = await db.getProvas(professorId);
    const questoes = await db.getQuestoes(professorId);
    const templates = await db.getHeaderTemplates(professorId);
    
    // Estatísticas por área
    const areasStats = {};
    questoes.forEach(questao => {
      if (!areasStats[questao.area]) {
        areasStats[questao.area] = {
          total: 0,
          multiplaEscolha: 0,
          abertas: 0
        };
      }
      areasStats[questao.area].total++;
      if (questao.tipo_questao === 'questao_aberta') {
        areasStats[questao.area].abertas++;
      } else {
        areasStats[questao.area].multiplaEscolha++;
      }
    });
    
    // Provas recentes
    const provasRecentes = provas.slice(0, 3);
    
    // Questões recentes
    const questoesRecentes = questoes.slice(0, 5);
    
    res.render('perfil', {
      professor: {
        id: professor.id,
        nome: professor.nome,
        email: professor.email,
        foto: professor.foto || null,
        created_at: professor.created_at
      },
      stats: {
        totalProvas: provas.length,
        totalQuestoes: questoes.length,
        totalTemplates: templates.length,
        areasStats: areasStats
      },
      provasRecentes,
      questoesRecentes
    });
  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Upload de foto de perfil
app.post('/perfil/foto', requireAuth, (req, res, next) => {
  profilePhotoUpload.single('foto')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.json({ success: false, message: 'Arquivo muito grande. Máximo 5MB.' });
      }
      return res.json({ success: false, message: 'Erro no upload: ' + err.message });
    } else if (err) {
      return res.json({ success: false, message: 'Erro no upload: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    
    if (!req.file) {
      return res.json({ success: false, message: 'Nenhuma foto foi enviada' });
    }
    
    // Salvar caminho da foto no banco
    const fotoPath = `/uploads/profiles/${req.file.filename}`;
    await db.updateProfessorFoto(professorId, fotoPath);
    
    res.json({ 
      success: true, 
      message: 'Foto atualizada com sucesso!',
      fotoPath: fotoPath
    });
  } catch (error) {
    console.error('Erro ao atualizar foto:', error);
    res.json({ success: false, message: 'Erro ao atualizar foto' });
  }
});

// Atualizar dados do perfil
app.post('/perfil/atualizar', requireAuth, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    const { nome, email } = req.body;
    
    // Validar dados
    if (!nome || !email) {
      return res.json({ success: false, message: 'Nome e email são obrigatórios' });
    }
    
    // Verificar se o email já existe para outro usuário
    const professorExistente = await db.getProfessorByEmail(email);
    if (professorExistente && professorExistente.id !== parseInt(professorId)) {
      return res.json({ success: false, message: 'Este email já está em uso por outro usuário' });
    }
    
    // Atualizar dados
    await db.updateProfessor(professorId, { nome, email });
    
    // Atualizar sessão
    req.session.professorNome = nome;
    
    res.json({ 
      success: true, 
      message: 'Dados atualizados com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao atualizar dados:', error);
    res.json({ success: false, message: 'Erro ao atualizar dados' });
  }
});

// Lista de provas
app.get('/provas', requireAuth, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    const provas = await db.getProvas(professorId);
    
    res.render('provas/lista', {
      professor: { nome: req.session.professorNome },
      provas
    });
  } catch (error) {
    console.error('Erro ao carregar provas:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Nova prova
app.get('/provas/nova', requireAuth, async (req, res) => {
  // Redirecionar para o novo sistema de criação de provas
  res.redirect('/templates-cabecalho/novo');
});

// Criar nova prova
// Configuração do Multer para upload de imagens de provas
const provaImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/provas/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + '_' + file.originalname;
    cb(null, uniqueName);
  }
});

const provaImageUpload = multer({
  storage: provaImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

// Configuração do Multer para upload de logos de escola
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/logos/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + '_' + file.originalname;
    cb(null, uniqueName);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos para logos!'), false);
    }
  }
});

app.post('/api/provas', requireAuthAPI, provaImageUpload.single('imagem'), async (req, res) => {
  try {
    const { titulo, disciplina, descricao, tempoLimite, turma_nome, textoPersonalizado, questoesIds } = req.body;
    const professorId = req.session.professorId;
    
    // Processar imagem se foi enviada
    let imagemPath = null;
    if (req.file) {
      imagemPath = `/uploads/provas/${req.file.filename}`;
    }
    
    // Processar questões se vieram como string JSON
    let questoesArray = [];
    if (questoesIds) {
      if (typeof questoesIds === 'string') {
        questoesArray = JSON.parse(questoesIds);
      } else {
        questoesArray = questoesIds;
      }
    }
    
    // Criar a prova com nome da turma como texto
    const provaId = await db.addProva({
      titulo,
      disciplina: disciplina || 'Não especificada',
      descricao,
      tempoLimite: parseInt(tempoLimite),
      turma_nome: turma_nome || 'Turma não especificada',
      textoPersonalizado: textoPersonalizado || null,
      imagem: imagemPath,
      professorId,
      tipo: 'manual'
    });
    
    // Adicionar questões à prova
    if (questoesArray && questoesArray.length > 0) {
      console.log(`Adicionando ${questoesArray.length} questões à prova ${provaId}:`, questoesArray);
      for (let i = 0; i < questoesArray.length; i++) {
        try {
          await db.addQuestaoProva(provaId, questoesArray[i], i + 1);
          console.log(`Questão ${questoesArray[i]} adicionada à prova ${provaId} na posição ${i + 1}`);
        } catch (error) {
          console.error(`Erro ao adicionar questão ${questoesArray[i]} à prova ${provaId}:`, error);
        }
      }
    } else {
      console.log('Nenhuma questão foi fornecida para a prova:', provaId);
    }
    
    res.json({ success: true, message: 'Prova criada com sucesso!', provaId });
  } catch (error) {
    console.error('Erro ao criar prova:', error);
    // Sempre retornar JSON, mesmo em caso de erro
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro ao criar prova',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Lista de questões
app.get('/questoes', requireAuth, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    const area = req.query.area;
    const search = req.query.search;
    const questoes = await db.getQuestoes(professorId, area, search);
    
    // Obter áreas únicas para filtro
    const todasQuestoes = await db.getQuestoes(professorId);
    const areas = [...new Set(todasQuestoes.map(q => q.area))];
    
    res.render('questoes/lista', {
      professor: { nome: req.session.professorNome },
      questoes,
      areas,
      areaSelecionada: area,
      searchTerm: search
    });
  } catch (error) {
    console.error('Erro ao carregar questões:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Nova questão
app.get('/questoes/nova', requireAuth, (req, res) => {
  res.render('questoes/nova', {
    professor: { nome: req.session.professorNome }
  });
});

// Criar nova questão
app.post('/api/questoes', requireAuthAPI, async (req, res) => {
  try {
    const { enunciado, opcoes, respostaCorreta, area, nivelDificuldade, tipo_questao } = req.body;
    const professorId = req.session.professorId;
    
    const questaoId = await db.addQuestao({
      enunciado,
      opcoes: JSON.parse(opcoes),
      respostaCorreta: parseInt(respostaCorreta),
      area,
      nivelDificuldade: nivelDificuldade || 'medio',
      tipo_questao: tipo_questao || 'multipla_escolha',
      professorId
    });
    
    res.json({ success: true, message: 'Questão criada com sucesso!', questaoId });
  } catch (error) {
    console.error('Erro ao criar questão:', error);
    res.json({ success: false, message: 'Erro ao criar questão' });
  }
});

// Rota para adicionar novo usuário (apenas admin)
app.post('/api/novo-usuario', requireAuth, async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    
    // Verificar se o usuário atual é admin
    const professorAtual = await db.getProfessorById(req.session.professorId);
    if (professorAtual.email !== 'admin@escola.com') {
      return res.status(403).json({
        success: false,
        message: 'Apenas o administrador pode criar novos usuários'
      });
    }
    
    // Verificar se o email já existe
    const usuarioExistente = await db.getProfessorByEmail(email);
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: 'E-mail já cadastrado'
      });
    }
    
    // Criar novo usuário
    const senhaHash = bcrypt.hashSync(senha, 10);
    const novoUsuarioId = await db.addProfessor(nome, email, senhaHash);
    
    res.json({
      success: true,
      message: 'Usuário criado com sucesso!',
      usuarioId: novoUsuarioId
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário'
    });
  }
});

// ==================== ROTAS DE TEMPLATES DE CABEÇALHO ====================

// Lista de templates de cabeçalho
app.get('/templates-cabecalho', requireAuth, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    const templates = await db.getHeaderTemplates(professorId);
    
    res.render('templates-cabecalho/lista', {
      professor: { nome: req.session.professorNome },
      templates
    });
  } catch (error) {
    console.error('Erro ao carregar templates:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Novo template de cabeçalho
app.get('/templates-cabecalho/novo', requireAuth, async (req, res) => {
  try {
    const professorId = req.session.professorId;
    // Buscar questões do banco para seleção
    const questoes = await db.getQuestoes(professorId);
    // Obter áreas únicas para filtro
    const areas = [...new Set(questoes.map(q => q.area))];
    
    res.render('templates-cabecalho/novo', {
      professor: { nome: req.session.professorNome },
      questoes,
      areas
    });
  } catch (error) {
    console.error('Erro ao carregar página de criação:', error);
    res.render('templates-cabecalho/novo', {
      professor: { nome: req.session.professorNome },
      questoes: [],
      areas: []
    });
  }
});

// Criar novo template de cabeçalho
app.post('/api/templates-cabecalho', requireAuth, logoUpload.single('logo'), async (req, res) => {
  try {
    const { nome, escola_nome, campos_personalizados } = req.body;
    const professorId = req.session.professorId;
    
    let logoPath = null;
    if (req.file) {
      logoPath = `/uploads/logos/${req.file.filename}`;
    }
    
    const template = {
      nome,
      escola_nome,
      logo_path: logoPath,
      campos_personalizados: JSON.parse(campos_personalizados || '{}'),
      professor_id: professorId
    };
    
    const templateId = await db.addHeaderTemplate(template);
    
    res.json({ success: true, message: 'Template criado com sucesso!', templateId });
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.json({ success: false, message: 'Erro ao criar template' });
  }
});

// Visualizar template de cabeçalho
app.get('/templates-cabecalho/:id/visualizar', requireAuth, async (req, res) => {
  try {
    const templateId = req.params.id;
    const professorId = req.session.professorId;
    
    const template = await db.getHeaderTemplateById(templateId, professorId);
    if (!template) {
      return res.status(404).send('Template não encontrado');
    }
    
    res.render('templates-cabecalho/visualizar', {
      professor: { nome: req.session.professorNome },
      template
    });
  } catch (error) {
    console.error('Erro ao carregar template:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Editar template de cabeçalho
app.get('/templates-cabecalho/:id/editar', requireAuth, async (req, res) => {
  try {
    const templateId = req.params.id;
    const professorId = req.session.professorId;
    
    const template = await db.getHeaderTemplateById(templateId, professorId);
    if (!template) {
      return res.status(404).send('Template não encontrado');
    }
    
    res.render('templates-cabecalho/editar', {
      professor: { nome: req.session.professorNome },
      template
    });
  } catch (error) {
    console.error('Erro ao carregar template:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Atualizar template de cabeçalho
app.post('/templates-cabecalho/:id/editar', requireAuth, logoUpload.single('logo'), async (req, res) => {
  try {
    const templateId = req.params.id;
    const professorId = req.session.professorId;
    const { nome, escola_nome, campos_personalizados } = req.body;
    
    // Verificar se o template pertence ao professor
    const templateExistente = await db.getHeaderTemplateById(templateId, professorId);
    if (!templateExistente) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }
    
    let logoPath = templateExistente.logo_path;
    if (req.file) {
      logoPath = `/uploads/logos/${req.file.filename}`;
    }
    
    const template = {
      nome,
      escola_nome,
      logo_path: logoPath,
      campos_personalizados: JSON.parse(campos_personalizados || '{}')
    };
    
    await db.updateHeaderTemplate(templateId, template);
    
    res.json({
      success: true,
      message: 'Template atualizado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar template'
    });
  }
});

// Excluir template de cabeçalho
app.delete('/templates-cabecalho/:id', requireAuth, async (req, res) => {
  try {
    const templateId = req.params.id;
    const professorId = req.session.professorId;
    
    // Verificar se o template pertence ao professor
    const template = await db.getHeaderTemplateById(templateId, professorId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template não encontrado'
      });
    }
    
    await db.deleteHeaderTemplate(templateId, professorId);
    
    res.json({ success: true, message: 'Template excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir template:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir template'
    });
  }
});

// ==================== ROTAS DE GERENCIAMENTO DE QUESTÕES ====================

// Visualizar questão individual
app.get('/questoes/:id', requireAuth, async (req, res) => {
  try {
    const questaoId = req.params.id;
    const professorId = req.session.professorId;
    
    const questao = await db.getQuestaoById(questaoId, professorId);
    if (!questao) {
      return res.status(404).send('Questão não encontrada');
    }
    
    res.render('questoes/visualizar', {
      professor: { nome: req.session.professorNome },
      questao
    });
  } catch (error) {
    console.error('Erro ao carregar questão:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Editar questão
app.get('/questoes/:id/editar', requireAuth, async (req, res) => {
  try {
    const questaoId = req.params.id;
    const professorId = req.session.professorId;
    
    const questao = await db.getQuestaoById(questaoId, professorId);
    if (!questao) {
      return res.status(404).send('Questão não encontrada');
    }
    
    res.render('questoes/editar', {
      professor: { nome: req.session.professorNome },
      questao
    });
  } catch (error) {
    console.error('Erro ao carregar questão para edição:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Atualizar questão
app.post('/questoes/:id/editar', requireAuth, async (req, res) => {
  try {
    const questaoId = req.params.id;
    const professorId = req.session.professorId;
    const { enunciado, area, opcoes, respostaCorreta, nivelDificuldade } = req.body;
    
    // Verificar se a questão pertence ao professor
    const questao = await db.getQuestaoById(questaoId, professorId);
    if (!questao) {
      return res.status(404).json({
        success: false,
        message: 'Questão não encontrada'
      });
    }
    
    // Atualizar questão
    await db.updateQuestao(questaoId, enunciado, area, opcoes, respostaCorreta, nivelDificuldade);
    
    res.json({
      success: true,
      message: 'Questão atualizada com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao atualizar questão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar questão'
    });
  }
});

// Excluir questão
app.delete('/questoes/:id', requireAuth, async (req, res) => {
  try {
    const questaoId = req.params.id;
    const professorId = req.session.professorId;
    
    // Verificar se a questão pertence ao professor
    const questao = await db.getQuestaoById(questaoId, professorId);
    if (!questao) {
      return res.status(404).json({
        success: false,
        message: 'Questão não encontrada'
      });
    }
    
    // Excluir questão
    await db.deleteQuestao(questaoId);
  
  res.json({
    success: true,
      message: 'Questão excluída com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao excluir questão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir questão'
    });
  }
});

// Visualizar prova
app.get('/provas/:id', requireAuth, async (req, res) => {
  try {
    const provaId = req.params.id;
    const professorId = req.session.professorId;
    
    // Buscar prova e verificar se pertence ao professor
    const prova = await db.getProvaById(provaId, professorId);
    if (!prova) {
      return res.status(404).send('Prova não encontrada');
    }
    
    // Buscar questões da prova
    const questoes = await db.getQuestoesProva(provaId);
    console.log(`Prova ${provaId}: ${questoes.length} questões encontradas:`, questoes.map(q => ({ id: q.id, enunciado: q.enunciado?.substring(0, 50) + '...' })));
    
    // Buscar template de cabeçalho padrão do professor
    const templates = await db.getHeaderTemplates(professorId);
    const templateCabecalho = templates && templates.length > 0 ? templates[0] : null;
    
    res.render('provas/visualizar', {
      professor: { nome: req.session.professorNome },
      prova,
      questoes,
      templateCabecalho
    });
  } catch (error) {
    console.error('Erro ao carregar prova:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Editar prova
app.get('/provas/:id/editar', requireAuth, async (req, res) => {
  try {
    const provaId = req.params.id;
    const professorId = req.session.professorId;
    
    // Buscar prova e verificar se pertence ao professor
    const prova = await db.getProvaById(provaId, professorId);
    if (!prova) {
      return res.status(404).send('Prova não encontrada');
    }
    
    // Buscar questões da prova
    const questoesProva = await db.getQuestoesProva(provaId);
    
    // Buscar todas as questões do professor para seleção
    const todasQuestoes = await db.getQuestoes(professorId);
    
    res.render('provas/editar', {
      professor: { nome: req.session.professorNome },
      prova,
      questoesProva,
      todasQuestoes
    });
  } catch (error) {
    console.error('Erro ao carregar prova para edição:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Atualizar prova
app.post('/provas/:id/editar', requireAuth, async (req, res) => {
  try {
    const provaId = req.params.id;
    const professorId = req.session.professorId;
    const { titulo, disciplina, descricao, tempoLimite, turma_nome, questoesIds } = req.body;
    
    // Verificar se a prova pertence ao professor
    const prova = await db.getProvaById(provaId, professorId);
    if (!prova) {
      return res.status(404).json({
        success: false,
        message: 'Prova não encontrada'
      });
    }
    
    // Atualizar prova
    await db.updateProva(provaId, {
      titulo,
      disciplina: disciplina || 'Não especificada',
      descricao,
      tempoLimite: parseInt(tempoLimite),
      turma_nome: turma_nome || 'Turma não especificada'
    });
    
    // Remover questões antigas
    await db.removeQuestoesProva(provaId);
    
    // Adicionar novas questões
    if (questoesIds && questoesIds.length > 0) {
      for (let i = 0; i < questoesIds.length; i++) {
        await db.addQuestaoProva(provaId, questoesIds[i], i + 1);
      }
    }
    
    res.json({ success: true, message: 'Prova atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar prova:', error);
    res.json({ success: false, message: 'Erro ao atualizar prova' });
  }
});

// Excluir prova
app.delete('/provas/:id', requireAuth, async (req, res) => {
  try {
    const provaId = req.params.id;
    const professorId = req.session.professorId;
    
    // Verificar se a prova pertence ao professor
    const prova = await db.getProvaById(provaId, professorId);
    if (!prova) {
      return res.status(404).json({
        success: false,
        message: 'Prova não encontrada'
      });
    }
    
    // Excluir prova (cascade delete das questões)
    await db.deleteProva(provaId);
    
    res.json({ success: true, message: 'Prova excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir prova:', error);
    res.json({ success: false, message: 'Erro ao excluir prova' });
  }
});

// Gerar prova para aluno
app.get('/provas/:provaId/aluno/:alunoId', requireAuth, async (req, res) => {
  try {
    const { provaId, alunoId } = req.params;
    const professorId = req.session.professorId;
    
    // Buscar prova e verificar se pertence ao professor
    const prova = await db.getProvaById(provaId, professorId);
    if (!prova) {
      return res.status(404).send('Prova não encontrada');
    }
    
    // Buscar aluno
    const aluno = await db.getAlunoById(alunoId);
    if (!aluno) {
      return res.status(404).send('Aluno não encontrado');
    }

    // Buscar questões da prova
    const questoes = await db.getQuestoesProva(provaId);
    
    // Buscar template de cabeçalho padrão do professor
    const templates = await db.getHeaderTemplates(professorId);
    const templateCabecalho = templates && templates.length > 0 ? templates[0] : null;
    
    // Embaralhar questões e opções
    const questoesEmbaralhadas = embaralharQuestoes(questoes);
    
    // Gerar QR codes para cada questão
    const questoesComQR = await Promise.all(
      questoesEmbaralhadas.map(async (questao, index) => {
        const qrCodeData = await gerarQRCode(`Prova: ${prova.titulo} - Questão: ${index + 1} - Aluno: ${aluno.nome}`);
        return {
          ...questao,
          qrCode: qrCodeData,
          numero: index + 1
        };
      })
    );

    res.render('provas/realizar', {
      professor: { nome: req.session.professorNome },
      prova,
      aluno,
      questoes: questoesComQR,
      templateCabecalho
    });
  } catch (error) {
    console.error('Erro ao gerar prova para aluno:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// API para gerar QR Code
app.post('/api/gerar-qr', async (req, res) => {
  try {
    const { data } = req.body;
    const qrCodeDataURL = await gerarQRCode(data);
    
    res.json({
      success: true,
      qrCode: qrCodeDataURL
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar QR Code'
    });
  }
});

// Rota de teste para QR code
app.get('/teste-qr/:provaId', async (req, res) => {
  try {
    const provaId = req.params.provaId;
    
    // Buscar prova pública
    let prova = null;
    if (process.env.VERCEL) {
      prova = db.data.provas.find(p => p.id === parseInt(provaId));
    } else {
      prova = await new Promise((resolve, reject) => {
        db.db.get(
          `SELECT * FROM provas WHERE id = ?`,
          [parseInt(provaId)],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }
    
    const questoes = prova ? await db.getQuestoesProva(provaId) : [];
    
    res.render('provas/teste-qr', {
      prova,
      questoes
    });
  } catch (error) {
    console.error('Erro no teste QR:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// Rota para visualizar gabarito via QR code (pública)
app.get('/qr-gabarito/:provaId', async (req, res) => {
  try {
    const provaId = req.params.provaId;
    
    // Buscar prova pública (buscar sem verificar professor)
    let prova = null;
    if (process.env.VERCEL) {
      // Para banco em memória, buscar qualquer prova com esse ID
      prova = db.data.provas.find(p => p.id === parseInt(provaId));
    } else {
      // Para SQLite, fazer query direta
      prova = await new Promise((resolve, reject) => {
        db.db.get(
          `SELECT * FROM provas WHERE id = ?`,
          [parseInt(provaId)],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }
    
    if (!prova) {
      return res.status(404).send('Prova não encontrada');
    }
    
    // Buscar questões da prova
    const questoes = await db.getQuestoesProva(provaId);
    console.log(`QR Code Gabarito - Prova ${provaId}: ${questoes.length} questões encontradas`);
    
    res.render('provas/qr-gabarito', {
      prova,
      questoes
    });
  } catch (error) {
    console.error('Erro ao carregar gabarito via QR:', error);
    res.status(500).send('Erro interno do servidor');
  }
});

// ==================== FUNÇÕES AUXILIARES ====================

// Função para embaralhar questões e opções
function embaralharQuestoes(questoes) {
  const questoesEmbaralhadas = [...questoes];
  
  // Embaralha as questões
  for (let i = questoesEmbaralhadas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questoesEmbaralhadas[i], questoesEmbaralhadas[j]] = [questoesEmbaralhadas[j], questoesEmbaralhadas[i]];
  }
  
  // Embaralha as opções de cada questão
  questoesEmbaralhadas.forEach(questao => {
    const opcoes = JSON.parse(questao.opcoes);
    const opcoesEmbaralhadas = [...opcoes];
    const respostaOriginal = questao.resposta_correta;
    
    // Embaralha as opções
    for (let i = opcoesEmbaralhadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opcoesEmbaralhadas[i], opcoesEmbaralhadas[j]] = [opcoesEmbaralhadas[j], opcoesEmbaralhadas[i]];
    }
    
    // Atualiza a resposta correta baseada na nova posição
    const respostaOriginalText = opcoes[respostaOriginal];
    const novaRespostaCorreta = opcoesEmbaralhadas.findIndex(opcao => opcao === respostaOriginalText);
    
    questao.opcoes = JSON.stringify(opcoesEmbaralhadas);
    questao.resposta_correta = novaRespostaCorreta;
  });
  
  return questoesEmbaralhadas;
}

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================

// Inicializar banco de dados e depois iniciar servidor
async function startServer() {
  try {
    // O banco já é inicializado automaticamente no construtor
    console.log('💾 Banco de dados inicializado com sucesso!');
    
    const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
      if (process.env.NODE_ENV !== 'production') {
  console.log(`📚 Acesse: http://localhost:${PORT}`);
        console.log(`🔑 Login: admin@escola.com / admin123`);
      }
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Para Vercel, exportar o app
module.exports = app;

// Iniciar servidor apenas se não estiver na Vercel
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  startServer();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  db.close();
  process.exit(0);
});