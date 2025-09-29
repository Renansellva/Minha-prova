const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    // Para Vercel, usar banco em memória se não conseguir criar arquivo
    const dbPath = process.env.VERCEL ? ':memory:' : path.join(__dirname, 'prova_system.db');
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  init() {
    try {
      // Criar tabelas
      this.createTables();
      
      // Executar migrações
      this.runMigrations();
      
      // Inserir dados iniciais
      this.insertInitialData();
    } catch (error) {
      console.error('Erro ao inicializar banco de dados:', error);
    }
  }

  createTables() {
    // Tabela de professores
    this.db.run(`
      CREATE TABLE IF NOT EXISTS professores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de turmas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS turmas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        serie TEXT NOT NULL,
        professor_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (professor_id) REFERENCES professores (id)
      )
    `);

    // Tabela de alunos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT,
        turma_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (turma_id) REFERENCES turmas (id)
      )
    `);

    // Tabela de questões
    this.db.run(`
      CREATE TABLE IF NOT EXISTS questoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enunciado TEXT NOT NULL,
        opcoes TEXT NOT NULL,
        resposta_correta INTEGER NOT NULL,
        area TEXT NOT NULL,
        nivel_dificuldade TEXT DEFAULT 'medio',
        professor_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (professor_id) REFERENCES professores (id)
      )
    `);

    // Tabela de provas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS provas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        disciplina TEXT NOT NULL,
        descricao TEXT,
        tempo_limite INTEGER,
        turma_id INTEGER,
        professor_id INTEGER,
        tipo TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'ativa',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (turma_id) REFERENCES turmas (id),
        FOREIGN KEY (professor_id) REFERENCES professores (id)
      )
    `);

    // Tabela de questões da prova
    this.db.run(`
      CREATE TABLE IF NOT EXISTS prova_questoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prova_id INTEGER,
        questao_id INTEGER,
        ordem INTEGER,
        FOREIGN KEY (prova_id) REFERENCES provas (id),
        FOREIGN KEY (questao_id) REFERENCES questoes (id)
      )
    `);

    // Tabela de respostas dos alunos
    this.db.run(`
      CREATE TABLE IF NOT EXISTS respostas_alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        aluno_id INTEGER,
        prova_id INTEGER,
        questao_id INTEGER,
        resposta_escolhida INTEGER,
        tempo_gasto INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (aluno_id) REFERENCES alunos (id),
        FOREIGN KEY (prova_id) REFERENCES provas (id),
        FOREIGN KEY (questao_id) REFERENCES questoes (id)
      )
    `);
  }

  runMigrations() {
    // Migração: Adicionar coluna turma_nome se não existir
    this.db.run(`
      ALTER TABLE provas ADD COLUMN turma_nome TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro na migração turma_nome:', err);
      } else {
        console.log('✅ Migração: Coluna turma_nome adicionada ou já existe');
      }
    });

    // Migração: Adicionar coluna updated_at se não existir
    this.db.run(`
      ALTER TABLE provas ADD COLUMN updated_at DATETIME
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro na migração updated_at:', err);
      } else {
        console.log('✅ Migração: Coluna updated_at adicionada ou já existe');
      }
    });

    // Migração: Adicionar coluna imagem se não existir
    this.db.run(`
      ALTER TABLE provas ADD COLUMN imagem TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro na migração imagem:', err);
      } else {
        console.log('✅ Migração: Coluna imagem adicionada ou já existe');
      }
    });

    // Migração: Adicionar coluna texto_personalizado se não existir
    this.db.run(`
      ALTER TABLE provas ADD COLUMN texto_personalizado TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro na migração texto_personalizado:', err);
      } else {
        console.log('✅ Migração: Coluna texto_personalizado adicionada ou já existe');
      }
    });
  }

  async insertInitialData() {
    // Verificar se já existem dados
    this.db.get("SELECT COUNT(*) as count FROM professores", (err, row) => {
      if (row.count === 0) {
        // Inserir usuários padrão
        const usuarios = [
          { nome: 'Administrador', email: 'admin@escola.com', senha: 'admin123' },
          { nome: 'Maria Silva', email: 'maria@escola.com', senha: 'maria123' },
          { nome: 'João Santos', email: 'joao@escola.com', senha: 'joao123' },
          { nome: 'Ana Costa', email: 'ana@escola.com', senha: 'ana123' }
        ];

        usuarios.forEach(usuario => {
          const senhaHash = bcrypt.hashSync(usuario.senha, 10);
          this.db.run(`
            INSERT INTO professores (nome, email, senha) 
            VALUES (?, ?, ?)
          `, [usuario.nome, usuario.email, senhaHash]);
        });

        // Inserir turmas de exemplo
        this.db.run(`
          INSERT INTO turmas (nome, serie, professor_id) 
          VALUES ('9º Ano A', '9º Ano', 1)
        `);
        
        this.db.run(`
          INSERT INTO turmas (nome, serie, professor_id) 
          VALUES ('8º Ano B', '8º Ano', 1)
        `);

        // Inserir alunos de exemplo
        const alunos = [
          ['João Silva', 'joao@email.com', 1],
          ['Maria Santos', 'maria@email.com', 1],
          ['Pedro Oliveira', 'pedro@email.com', 1],
          ['Ana Costa', 'ana@email.com', 2],
          ['Carlos Lima', 'carlos@email.com', 2]
        ];

        alunos.forEach(aluno => {
          this.db.run(`
            INSERT INTO alunos (nome, email, turma_id) 
            VALUES (?, ?, ?)
          `, aluno);
        });

        // Inserir questões de exemplo
        const questoes = [
          ['Qual é o resultado de 15 + 27?', '["40", "42", "41", "43"]', 1, 'Matemática', 'facil', 1],
          ['Qual é a raiz quadrada de 64?', '["6", "7", "8", "9"]', 2, 'Matemática', 'medio', 1],
          ['Qual é a fórmula da área do círculo?', '["π × r²", "2 × π × r", "π × d", "r × r"]', 0, 'Matemática', 'facil', 1],
          ['Qual é o sinônimo de "alegre"?', '["triste", "feliz", "sério", "calmo"]', 1, 'Português', 'facil', 1],
          ['Qual é o plural de "cidadão"?', '["cidadãos", "cidadães", "cidadões", "cidadãoes"]', 0, 'Português', 'medio', 1],
          ['Qual é a capital do Brasil?', '["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"]', 2, 'Geografia', 'facil', 1],
          ['Quem descobriu o Brasil?', '["Cristóvão Colombo", "Pedro Álvares Cabral", "Vasco da Gama", "Fernão de Magalhães"]', 1, 'História', 'medio', 1],
          ['Qual é o elemento químico com símbolo "O"?', '["Ouro", "Oxigênio", "Ósmio", "Oganésson"]', 1, 'Química', 'facil', 1]
        ];

        questoes.forEach(questao => {
          this.db.run(`
            INSERT INTO questoes (enunciado, opcoes, resposta_correta, area, nivel_dificuldade, professor_id) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, questao);
        });
      }
    });
  }

  // Métodos para professores
  async loginProfessor(email, senha) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM professores WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else if (row && bcrypt.compareSync(senha, row.senha)) {
            resolve(row);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  // Métodos para turmas
  getTurmas(professorId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM turmas WHERE professor_id = ?',
        [professorId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Métodos para alunos
  getAlunosByTurma(turmaId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM alunos WHERE turma_id = ?',
        [turmaId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Métodos para questões
  getQuestoes(professorId, area = null, search = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM questoes WHERE professor_id = ?';
      let params = [professorId];
      
      if (area) {
        query += ' AND area = ?';
        params.push(area);
      }
      
      if (search) {
        query += ' AND enunciado LIKE ?';
        params.push(`%${search}%`);
      }
      
      query += ' ORDER BY created_at DESC';
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  addQuestao(questao) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO questoes (enunciado, opcoes, resposta_correta, area, nivel_dificuldade, professor_id) VALUES (?, ?, ?, ?, ?, ?)',
        [questao.enunciado, JSON.stringify(questao.opcoes), questao.respostaCorreta, questao.area, questao.nivelDificuldade, questao.professorId],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Métodos para provas
  addProva(prova) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO provas (titulo, disciplina, descricao, tempo_limite, turma_nome, professor_id, tipo, imagem, texto_personalizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [prova.titulo, prova.disciplina, prova.descricao, prova.tempoLimite, prova.turma_nome, prova.professorId, prova.tipo, prova.imagem, prova.textoPersonalizado],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getProvas(professorId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT p.*, COUNT(pq.questao_id) as total_questoes 
         FROM provas p 
         LEFT JOIN prova_questoes pq ON p.id = pq.prova_id 
         WHERE p.professor_id = ? 
         GROUP BY p.id 
         ORDER BY p.created_at DESC`,
        [professorId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getProvaById(provaId, professorId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT p.* 
         FROM provas p 
         WHERE p.id = ? AND p.professor_id = ?`,
        [provaId, professorId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  addQuestaoProva(provaId, questaoId, ordem) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO prova_questoes (prova_id, questao_id, ordem) VALUES (?, ?, ?)',
        [provaId, questaoId, ordem],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getQuestoesProva(provaId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT q.*, pq.ordem 
         FROM questoes q 
         INNER JOIN prova_questoes pq ON q.id = pq.questao_id 
         WHERE pq.prova_id = ? 
         ORDER BY pq.ordem`,
        [provaId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getAlunoById(alunoId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM alunos WHERE id = ?',
        [alunoId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  getProfessorById(professorId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM professores WHERE id = ?',
        [professorId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  getProfessorByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM professores WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  addProfessor(nome, email, senhaHash) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO professores (nome, email, senha) VALUES (?, ?, ?)',
        [nome, email, senhaHash],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  deleteProfessor(professorId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM professores WHERE id = ?',
        [professorId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  getAllProfessores() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, nome, email, created_at FROM professores ORDER BY nome',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getQuestaoById(questaoId, professorId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM questoes WHERE id = ? AND professor_id = ?',
        [questaoId, professorId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  updateQuestao(questaoId, enunciado, area, opcoes, respostaCorreta, nivelDificuldade) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE questoes SET enunciado = ?, area = ?, opcoes = ?, resposta_correta = ?, nivel_dificuldade = ?, updated_at = datetime("now") WHERE id = ?',
        [enunciado, area, JSON.stringify(opcoes), respostaCorreta, nivelDificuldade, questaoId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  deleteQuestao(questaoId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM questoes WHERE id = ?',
        [questaoId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Métodos para edição e exclusão de provas
  updateProva(provaId, dados) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE provas SET titulo = ?, disciplina = ?, descricao = ?, tempo_limite = ?, turma_nome = ?, imagem = ?, texto_personalizado = ?, updated_at = datetime("now") WHERE id = ?',
        [dados.titulo, dados.disciplina, dados.descricao, dados.tempoLimite, dados.turma_nome, dados.imagem, dados.textoPersonalizado, provaId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  removeQuestoesProva(provaId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM prova_questoes WHERE prova_id = ?',
        [provaId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  deleteProva(provaId) {
    return new Promise((resolve, reject) => {
      // Primeiro remove as questões da prova
      this.db.run('DELETE FROM prova_questoes WHERE prova_id = ?', [provaId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Depois remove a prova
        this.db.run('DELETE FROM provas WHERE id = ?', [provaId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
