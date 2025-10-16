// Banco de dados em memória para Vercel
class MemoryDatabase {
  constructor() {
    this.data = {
      professores: [],
      questoes: [],
      provas: [],
      prova_questoes: [],
      header_templates: [],
      nextId: { professores: 1, questoes: 1, provas: 1, prova_questoes: 1, header_templates: 1 }
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
        tipo_questao: 'multipla_escolha',
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
        tipo_questao: 'multipla_escolha',
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
        tipo_questao: 'multipla_escolha',
        professor_id: 1,
        created_at: new Date().toISOString()
      }
    ];

    questoes.forEach(questao => {
      this.data.questoes.push(questao);
    });

    this.data.nextId.questoes = 4;

    // Inserir template de cabeçalho de exemplo
    const templatePadrao = {
      id: 1,
      nome: 'Colégio Imaculada Conceição',
      escola_nome: 'COLÉGIO IMACULADA CONCEIÇÃO - CIC',
      logo_path: null,
      campos_personalizados: {
        'Aluno(a)': 'Aluno(a):',
        'Professor(a)': 'Professor(a):',
        'Série': 'Série:',
        'Data': 'Data:',
        'Disciplina': 'Disciplina:',
        'Nota': 'Nota:'
      },
      professor_id: 1,
      ativo: true,
      created_at: new Date().toISOString()
    };

    this.data.header_templates.push(templatePadrao);
    this.data.nextId.header_templates = 2;

    // Inserir prova de exemplo com questões
    const provaExemplo = {
      id: 1,
      titulo: 'Prova de Matemática - Exemplo',
      disciplina: 'Matemática',
      descricao: 'Prova de exemplo com questões de matemática básica',
      tempo_limite: 60,
      turma_nome: '7º Ano A',
      texto_personalizado: null,
      imagem: null,
      professor_id: 1,
      tipo: 'manual',
      created_at: new Date().toISOString()
    };

    this.data.provas.push(provaExemplo);
    this.data.nextId.provas = 2;

    // Associar questões à prova de exemplo
    const provaQuestoes = [
      { id: 1, prova_id: 1, questao_id: 1, ordem: 1 },
      { id: 2, prova_id: 1, questao_id: 2, ordem: 2 }
    ];

    provaQuestoes.forEach(pq => {
      this.data.prova_questoes.push(pq);
    });
    this.data.nextId.prova_questoes = 3;
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
    const idNum = parseInt(id);
    return this.data.professores.find(p => p.id === idNum);
  }

  // Atualizar foto do professor
  updateProfessorFoto(professorId, fotoPath) {
    const professor = this.data.professores.find(p => p.id === parseInt(professorId));
    if (professor) {
      professor.foto = fotoPath;
      return Promise.resolve({ id: professorId });
    }
    return Promise.reject(new Error('Professor não encontrado'));
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
    const professorIdNum = parseInt(professorId);
    let questoes = this.data.questoes.filter(q => q.professor_id === professorIdNum);
    
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
      tipo_questao: questao.tipo_questao || 'multipla_escolha',
      professor_id: questao.professorId,
      created_at: new Date().toISOString()
    };
    this.data.questoes.push(novaQuestao);
    return id;
  }

  getQuestaoById(questaoId, professorId) {
    const questaoIdNum = parseInt(questaoId);
    const professorIdNum = parseInt(professorId);
    return this.data.questoes.find(q => q.id === questaoIdNum && q.professor_id === professorIdNum);
  }

  updateQuestao(questaoId, enunciado, area, opcoes, respostaCorreta, nivelDificuldade) {
    const questaoIdNum = parseInt(questaoId);
    const questao = this.data.questoes.find(q => q.id === questaoIdNum);
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
    const questaoIdNum = parseInt(questaoId);
    const index = this.data.questoes.findIndex(q => q.id === questaoIdNum);
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
    const professorIdNum = parseInt(professorId);
    const provas = this.data.provas.filter(p => p.professor_id === professorIdNum);
    return provas.map(prova => {
      const questoesCount = this.data.prova_questoes.filter(pq => pq.prova_id === prova.id).length;
      return {
        ...prova,
        total_questoes: questoesCount,
        status: 'ativa' // Status padrão para compatibilidade
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getProvaById(provaId, professorId) {
    const provaIdNum = parseInt(provaId);
    const professorIdNum = parseInt(professorId);
    return this.data.provas.find(p => p.id === provaIdNum && p.professor_id === professorIdNum);
  }

  addQuestaoProva(provaId, questaoId, ordem) {
    const id = this.data.nextId.prova_questoes++;
    this.data.prova_questoes.push({
      id,
      prova_id: parseInt(provaId),
      questao_id: parseInt(questaoId),
      ordem: parseInt(ordem)
    });
    return id;
  }

  getQuestoesProva(provaId) {
    const provaIdNum = parseInt(provaId);
    return this.data.prova_questoes
      .filter(pq => pq.prova_id === provaIdNum)
      .map(pq => {
        const questao = this.data.questoes.find(q => q.id === pq.questao_id);
        return questao ? { ...questao, ordem: pq.ordem } : null;
      })
      .filter(q => q !== null)
      .sort((a, b) => a.ordem - b.ordem);
  }

  updateProva(provaId, dados) {
    const provaIdNum = parseInt(provaId);
    const prova = this.data.provas.find(p => p.id === provaIdNum);
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
    const provaIdNum = parseInt(provaId);
    this.data.prova_questoes = this.data.prova_questoes.filter(pq => pq.prova_id !== provaIdNum);
    return 1;
  }

  deleteProva(provaId) {
    // Remove questões da prova
    this.removeQuestoesProva(provaId);
    
    // Remove a prova
    const provaIdNum = parseInt(provaId);
    const index = this.data.provas.findIndex(p => p.id === provaIdNum);
    if (index !== -1) {
      this.data.provas.splice(index, 1);
      return 1;
    }
    return 0;
  }

  deleteProfessor(professorId) {
    const professorIdNum = parseInt(professorId);
    // Remove questões do professor
    this.data.questoes = this.data.questoes.filter(q => q.professor_id !== professorIdNum);
    
    // Remove provas do professor
    this.data.provas = this.data.provas.filter(p => p.professor_id !== professorIdNum);
    
    // Remove o professor
    const index = this.data.professores.findIndex(p => p.id === professorIdNum);
    if (index !== -1) {
      this.data.professores.splice(index, 1);
      return 1;
    }
    return 0;
  }

  // Métodos para templates de cabeçalho
  addHeaderTemplate(template) {
    const id = this.data.nextId.header_templates++;
    const novoTemplate = {
      id,
      nome: template.nome,
      escola_nome: template.escola_nome,
      logo_path: template.logo_path,
      campos_personalizados: template.campos_personalizados,
      professor_id: template.professor_id,
      ativo: true,
      created_at: new Date().toISOString()
    };
    this.data.header_templates.push(novoTemplate);
    return id;
  }

  getHeaderTemplates(professorId) {
    const professorIdNum = parseInt(professorId);
    return this.data.header_templates
      .filter(t => t.professor_id === professorIdNum && t.ativo)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getHeaderTemplateById(templateId, professorId) {
    const templateIdNum = parseInt(templateId);
    const professorIdNum = parseInt(professorId);
    return this.data.header_templates.find(t => 
      t.id === templateIdNum && 
      t.professor_id === professorIdNum && 
      t.ativo
    );
  }

  updateHeaderTemplate(templateId, template) {
    const templateIdNum = parseInt(templateId);
    const index = this.data.header_templates.findIndex(t => t.id === templateIdNum);
    if (index !== -1) {
      this.data.header_templates[index] = {
        ...this.data.header_templates[index],
        nome: template.nome,
        escola_nome: template.escola_nome,
        logo_path: template.logo_path,
        campos_personalizados: template.campos_personalizados
      };
      return 1;
    }
    return 0;
  }

  deleteHeaderTemplate(templateId, professorId) {
    const templateIdNum = parseInt(templateId);
    const professorIdNum = parseInt(professorId);
    const index = this.data.header_templates.findIndex(t => 
      t.id === templateIdNum && 
      t.professor_id === professorIdNum
    );
    if (index !== -1) {
      this.data.header_templates[index].ativo = false;
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
