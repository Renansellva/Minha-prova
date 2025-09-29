// Banco de dados em memória para Vercel
class MemoryDatabase {
  constructor() {
    this.data = {
      professores: [],
      questoes: [],
      provas: [],
      prova_questoes: [],
      nextId: { professores: 1, questoes: 1, provas: 1, prova_questoes: 1 }
    };
    this.init();
  }

  init() {
    console.log('💾 Banco de dados em memória inicializado!');
    this.insertInitialData();
  }

  insertInitialData() {
    // Inserir administrador padrão
    this.data.professores.push({
      id: 1,
      nome: 'Administrador',
      email: 'admin@escola.com',
      senha: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
      created_at: new Date().toISOString()
    });

    // Inserir questões de exemplo
    const questoes = [
      {
        id: 1,
        enunciado: 'Qual é o resultado de 15 + 27?',
        opcoes: JSON.stringify(['40', '42', '41', '43']),
        resposta_correta: 1,
        area: 'Matemática',
        nivel_dificuldade: 'facil',
        professor_id: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        enunciado: 'Qual é a raiz quadrada de 64?',
        opcoes: JSON.stringify(['6', '7', '8', '9']),
        resposta_correta: 2,
        area: 'Matemática',
        nivel_dificuldade: 'medio',
        professor_id: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        enunciado: 'Qual é o sinônimo de "alegre"?',
        opcoes: JSON.stringify(['triste', 'feliz', 'sério', 'calmo']),
        resposta_correta: 1,
        area: 'Português',
        nivel_dificuldade: 'facil',
        professor_id: 1,
        created_at: new Date().toISOString()
      }
    ];

    questoes.forEach(questao => {
      this.data.questoes.push(questao);
    });

    this.data.nextId.questoes = 4;
  }

  // Métodos para professores
  async loginProfessor(email, senha) {
    const professor = this.data.professores.find(p => p.email === email);
    if (professor) {
      // Para admin, verificar senha simples
      if (email === 'admin@escola.com' && senha === 'admin123') {
        return professor;
      }
      // Para outros usuários, verificar hash
      const bcrypt = require('bcryptjs');
      if (bcrypt.compareSync(senha, professor.senha)) {
        return professor;
      }
    }
    return null;
  }

  async addProfessor(nome, email, senhaHash) {
    const id = this.data.nextId.professores++;
    const professor = {
      id,
      nome,
      email,
      senha: senhaHash,
      created_at: new Date().toISOString()
    };
    this.data.professores.push(professor);
    return id;
  }

  getProfessorByEmail(email) {
    return this.data.professores.find(p => p.email === email);
  }

  getProfessorById(id) {
    return this.data.professores.find(p => p.id === id);
  }

  getAllProfessores() {
    return this.data.professores.map(p => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      created_at: p.created_at
    }));
  }

  // Métodos para questões
  getQuestoes(professorId, area = null, search = null) {
    let questoes = this.data.questoes.filter(q => q.professor_id === professorId);
    
    if (area) {
      questoes = questoes.filter(q => q.area === area);
    }
    
    if (search) {
      questoes = questoes.filter(q => q.enunciado.toLowerCase().includes(search.toLowerCase()));
    }
    
    return questoes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  addQuestao(questao) {
    const id = this.data.nextId.questoes++;
    const novaQuestao = {
      id,
      enunciado: questao.enunciado,
      opcoes: JSON.stringify(questao.opcoes),
      resposta_correta: questao.respostaCorreta,
      area: questao.area,
      nivel_dificuldade: questao.nivelDificuldade,
      professor_id: questao.professorId,
      created_at: new Date().toISOString()
    };
    this.data.questoes.push(novaQuestao);
    return id;
  }

  getQuestaoById(questaoId, professorId) {
    return this.data.questoes.find(q => q.id === questaoId && q.professor_id === professorId);
  }

  updateQuestao(questaoId, enunciado, area, opcoes, respostaCorreta, nivelDificuldade) {
    const questao = this.data.questoes.find(q => q.id === questaoId);
    if (questao) {
      questao.enunciado = enunciado;
      questao.area = area;
      questao.opcoes = JSON.stringify(opcoes);
      questao.resposta_correta = respostaCorreta;
      questao.nivel_dificuldade = nivelDificuldade;
      questao.updated_at = new Date().toISOString();
      return 1;
    }
    return 0;
  }

  deleteQuestao(questaoId) {
    const index = this.data.questoes.findIndex(q => q.id === questaoId);
    if (index !== -1) {
      this.data.questoes.splice(index, 1);
      return 1;
    }
    return 0;
  }

  // Métodos para provas
  addProva(prova) {
    const id = this.data.nextId.provas++;
    const novaProva = {
      id,
      titulo: prova.titulo,
      disciplina: prova.disciplina,
      descricao: prova.descricao,
      tempo_limite: prova.tempoLimite,
      turma_nome: prova.turma_nome,
      professor_id: prova.professorId,
      tipo: prova.tipo || 'manual',
      imagem: prova.imagem || null,
      texto_personalizado: prova.textoPersonalizado || null,
      status: 'ativa',
      created_at: new Date().toISOString()
    };
    this.data.provas.push(novaProva);
    return id;
  }

  getProvas(professorId) {
    const provas = this.data.provas.filter(p => p.professor_id === professorId);
    return provas.map(prova => {
      const questoesCount = this.data.prova_questoes.filter(pq => pq.prova_id === prova.id).length;
      return {
        ...prova,
        total_questoes: questoesCount
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getProvaById(provaId, professorId) {
    return this.data.provas.find(p => p.id === provaId && p.professor_id === professorId);
  }

  addQuestaoProva(provaId, questaoId, ordem) {
    const id = this.data.nextId.prova_questoes++;
    this.data.prova_questoes.push({
      id,
      prova_id: provaId,
      questao_id: questaoId,
      ordem
    });
    return id;
  }

  getQuestoesProva(provaId) {
    return this.data.prova_questoes
      .filter(pq => pq.prova_id === provaId)
      .map(pq => {
        const questao = this.data.questoes.find(q => q.id === pq.questao_id);
        return questao ? { ...questao, ordem: pq.ordem } : null;
      })
      .filter(q => q !== null)
      .sort((a, b) => a.ordem - b.ordem);
  }

  updateProva(provaId, dados) {
    const prova = this.data.provas.find(p => p.id === provaId);
    if (prova) {
      prova.titulo = dados.titulo;
      prova.disciplina = dados.disciplina;
      prova.descricao = dados.descricao;
      prova.tempo_limite = dados.tempoLimite;
      prova.turma_nome = dados.turma_nome;
      prova.imagem = dados.imagem;
      prova.texto_personalizado = dados.textoPersonalizado;
      prova.updated_at = new Date().toISOString();
      return 1;
    }
    return 0;
  }

  removeQuestoesProva(provaId) {
    this.data.prova_questoes = this.data.prova_questoes.filter(pq => pq.prova_id !== provaId);
    return 1;
  }

  deleteProva(provaId) {
    // Remove questões da prova
    this.removeQuestoesProva(provaId);
    
    // Remove a prova
    const index = this.data.provas.findIndex(p => p.id === provaId);
    if (index !== -1) {
      this.data.provas.splice(index, 1);
      return 1;
    }
    return 0;
  }

  deleteProfessor(professorId) {
    // Remove questões do professor
    this.data.questoes = this.data.questoes.filter(q => q.professor_id !== professorId);
    
    // Remove provas do professor
    this.data.provas = this.data.provas.filter(p => p.professor_id !== professorId);
    
    // Remove o professor
    const index = this.data.professores.findIndex(p => p.id === professorId);
    if (index !== -1) {
      this.data.professores.splice(index, 1);
      return 1;
    }
    return 0;
  }

  close() {
    // Não precisa fazer nada para banco em memória
    console.log('💾 Banco de dados em memória fechado');
  }
}

module.exports = MemoryDatabase;
