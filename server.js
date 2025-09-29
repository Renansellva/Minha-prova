const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('./database');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database();

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

// Middleware de autenticação
const requireAuth = (req, res, next) => {
  if (req.session.professorId) {
    next();
  } else {
    res.redirect('/login');
  }
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

// Criar diretório uploads se não existir
const createUploadsDir = async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
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
        email: professorAtual.email
      },
      stats,
      provasRecentes
    });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).send('Erro interno do servidor');
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
  try {
    const professorId = req.session.professorId;
    const questoes = await db.getQuestoes(professorId);
    
    res.render('provas/nova', {
      professor: { nome: req.session.professorNome },
      questoes
    });
  } catch (error) {
    console.error('Erro ao carregar nova prova:', error);
    res.status(500).send('Erro interno do servidor');
  }
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

app.post('/api/provas', requireAuth, provaImageUpload.single('imagem'), async (req, res) => {
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
      for (let i = 0; i < questoesArray.length; i++) {
        await db.addQuestaoProva(provaId, questoesArray[i], i + 1);
      }
    }
    
    res.json({ success: true, message: 'Prova criada com sucesso!', provaId });
  } catch (error) {
    console.error('Erro ao criar prova:', error);
    res.json({ success: false, message: 'Erro ao criar prova' });
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
app.post('/api/questoes', requireAuth, async (req, res) => {
  try {
    const { enunciado, opcoes, respostaCorreta, area, nivelDificuldade } = req.body;
    const professorId = req.session.professorId;
    
    const questaoId = await db.addQuestao({
      enunciado,
      opcoes: JSON.parse(opcoes),
      respostaCorreta: parseInt(respostaCorreta),
      area,
      nivelDificuldade: nivelDificuldade || 'medio',
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
    
    res.render('provas/visualizar', {
      professor: { nome: req.session.professorNome },
      prova,
      questoes
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
      questoes: questoesComQR
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