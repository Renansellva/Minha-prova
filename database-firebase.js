// Banco de dados Firebase (Firestore)
const bcrypt = require('bcryptjs');

class FirebaseDatabase {
  constructor(dbFirebase) {
    this.db = dbFirebase;
    // Inicializar de forma assíncrona sem bloquear
    this.init().catch(err => console.error('Erro ao inicializar Firebase Database:', err));
  }

  async init() {
    console.log('🔥 Firebase Database inicializado!');
    await this.insertInitialData();
  }

  async insertInitialData() {
    try {
      // Verificar se já existe o admin
      const adminDoc = await this.db.collection('professores').doc('1').get();
      
      if (!adminDoc.exists) {
        // Inserir administrador padrão
        await this.db.collection('professores').doc('1').set({
          id: 1,
          nome: 'Administrador',
          email: 'admin@escola.com',
          senha: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
          created_at: new Date().toISOString()
        });
        console.log('✅ Admin inicial criado no Firebase');
      }
    } catch (error) {
      console.error('Erro ao inserir dados iniciais:', error);
    }
  }

  // ==================== PROFESSORES ====================

  async loginProfessor(email, senha) {
    try {
      const snapshot = await this.db.collection('professores')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const professor = { id: doc.id, ...doc.data() };

      if (bcrypt.compareSync(senha, professor.senha)) {
        return professor;
      }

      return null;
    } catch (error) {
      console.error('Erro no login:', error);
      return null;
    }
  }

  async getProfessorById(professorId) {
    try {
      const doc = await this.db.collection('professores').doc(String(professorId)).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Erro ao buscar professor:', error);
      return null;
    }
  }

  async getProfessorByEmail(email) {
    try {
      const snapshot = await this.db.collection('professores')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Erro ao buscar professor por email:', error);
      return null;
    }
  }

  async addProfessor(nome, email, senhaHash) {
    try {
      // Buscar próximo ID
      const snapshot = await this.db.collection('professores').orderBy('id', 'desc').limit(1).get();
      let nextId = 1;
      
      if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0];
        nextId = (lastDoc.data().id || 0) + 1;
      }

      const professorData = {
        id: nextId,
        nome,
        email,
        senha: senhaHash,
        created_at: new Date().toISOString()
      };

      await this.db.collection('professores').doc(String(nextId)).set(professorData);
      return nextId;
    } catch (error) {
      console.error('Erro ao adicionar professor:', error);
      throw error;
    }
  }

  async updateProfessor(professorId, dados) {
    try {
      const { nome, email } = dados;
      await this.db.collection('professores').doc(String(professorId)).update({
        nome,
        email
      });
      return { id: professorId };
    } catch (error) {
      console.error('Erro ao atualizar professor:', error);
      throw error;
    }
  }

  async updateProfessorFoto(professorId, fotoPath) {
    try {
      await this.db.collection('professores').doc(String(professorId)).update({
        foto: fotoPath
      });
      return { id: professorId };
    } catch (error) {
      console.error('Erro ao atualizar foto:', error);
      throw error;
    }
  }

  async deleteProfessor(professorId) {
    try {
      // Deletar questões do professor
      const questoesSnapshot = await this.db.collection('questoes')
        .where('professor_id', '==', parseInt(professorId))
        .get();
      
      const batch = this.db.batch();
      questoesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      // Deletar provas do professor
      const provasSnapshot = await this.db.collection('provas')
        .where('professor_id', '==', parseInt(professorId))
        .get();
      
      provasSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      // Deletar professor
      batch.delete(this.db.collection('professores').doc(String(professorId)));
      
      await batch.commit();
      return 1;
    } catch (error) {
      console.error('Erro ao deletar professor:', error);
      throw error;
    }
  }

  async getAllProfessores() {
    try {
      const snapshot = await this.db.collection('professores').orderBy('nome').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome,
        email: doc.data().email,
        created_at: doc.data().created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      return [];
    }
  }

  // ==================== QUESTÕES ====================

  async getQuestoes(professorId, area = null, search = null) {
    try {
      let query = this.db.collection('questoes')
        .where('professor_id', '==', parseInt(professorId));

      if (area) {
        query = query.where('area', '==', area);
      }

      const snapshot = await query.get();
      let questoes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtrar por busca (se necessário, já que Firestore tem limitações)
      if (search) {
        const searchLower = search.toLowerCase();
        questoes = questoes.filter(q => 
          q.enunciado?.toLowerCase().includes(searchLower) ||
          q.area?.toLowerCase().includes(searchLower)
        );
      }

      return questoes;
    } catch (error) {
      console.error('Erro ao buscar questões:', error);
      return [];
    }
  }

  async getQuestaoById(questaoId, professorId) {
    try {
      const doc = await this.db.collection('questoes').doc(String(questaoId)).get();
      if (!doc.exists) {
        return null;
      }
      
      const questao = { id: doc.id, ...doc.data() };
      
      // Verificar se pertence ao professor
      if (questao.professor_id !== parseInt(professorId)) {
        return null;
      }

      return questao;
    } catch (error) {
      console.error('Erro ao buscar questão:', error);
      return null;
    }
  }

  async addQuestao(questao) {
    try {
      const { enunciado, opcoes, respostaCorreta, area, nivelDificuldade, tipo_questao, professorId } = questao;

      // Buscar próximo ID
      const snapshot = await this.db.collection('questoes').orderBy('id', 'desc').limit(1).get();
      let nextId = 1;
      
      if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0];
        nextId = (lastDoc.data().id || 0) + 1;
      }

      const questaoData = {
        id: nextId,
        enunciado,
        opcoes: typeof opcoes === 'string' ? opcoes : JSON.stringify(opcoes),
        resposta_correta: respostaCorreta,
        area,
        nivel_dificuldade: nivelDificuldade || 'medio',
        tipo_questao: tipo_questao || 'multipla_escolha',
        professor_id: parseInt(professorId),
        created_at: new Date().toISOString()
      };

      await this.db.collection('questoes').doc(String(nextId)).set(questaoData);
      return nextId;
    } catch (error) {
      console.error('Erro ao adicionar questão:', error);
      throw error;
    }
  }

  async updateQuestao(questaoId, enunciado, area, opcoes, respostaCorreta, nivelDificuldade) {
    try {
      await this.db.collection('questoes').doc(String(questaoId)).update({
        enunciado,
        area,
        opcoes: typeof opcoes === 'string' ? opcoes : JSON.stringify(opcoes),
        resposta_correta: respostaCorreta,
        nivel_dificuldade: nivelDificuldade
      });
      return { id: questaoId };
    } catch (error) {
      console.error('Erro ao atualizar questão:', error);
      throw error;
    }
  }

  async deleteQuestao(questaoId) {
    try {
      // Deletar relações com provas
      const provaQuestoesSnapshot = await this.db.collection('prova_questoes')
        .where('questao_id', '==', parseInt(questaoId))
        .get();
      
      const batch = this.db.batch();
      provaQuestoesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Deletar questão
      batch.delete(this.db.collection('questoes').doc(String(questaoId)));
      
      await batch.commit();
      return 1;
    } catch (error) {
      console.error('Erro ao deletar questão:', error);
      throw error;
    }
  }

  // ==================== PROVAS ====================

  async getProvas(professorId) {
    try {
      const snapshot = await this.db.collection('provas')
        .where('professor_id', '==', parseInt(professorId))
        .orderBy('created_at', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar provas:', error);
      return [];
    }
  }

  async getProvaById(provaId, professorId) {
    try {
      const doc = await this.db.collection('provas').doc(String(provaId)).get();
      if (!doc.exists) {
        return null;
      }

      const prova = { id: doc.id, ...doc.data() };
      
      // Verificar se pertence ao professor
      if (prova.professor_id !== parseInt(professorId)) {
        return null;
      }

      return prova;
    } catch (error) {
      console.error('Erro ao buscar prova:', error);
      return null;
    }
  }

  async addProva(prova) {
    try {
      const { titulo, disciplina, descricao, tempoLimite, turma_nome, textoPersonalizado, imagem, professorId, tipo } = prova;

      // Buscar próximo ID
      const snapshot = await this.db.collection('provas').orderBy('id', 'desc').limit(1).get();
      let nextId = 1;
      
      if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0];
        nextId = (lastDoc.data().id || 0) + 1;
      }

      const provaData = {
        id: nextId,
        titulo,
        disciplina: disciplina || 'Não especificada',
        descricao,
        tempo_limite: parseInt(tempoLimite) || 0,
        turma_nome: turma_nome || 'Turma não especificada',
        texto_personalizado: textoPersonalizado || null,
        imagem: imagem || null,
        professor_id: parseInt(professorId),
        tipo: tipo || 'manual',
        created_at: new Date().toISOString()
      };

      await this.db.collection('provas').doc(String(nextId)).set(provaData);
      return nextId;
    } catch (error) {
      console.error('Erro ao adicionar prova:', error);
      throw error;
    }
  }

  async updateProva(provaId, dados) {
    try {
      const { titulo, disciplina, descricao, tempoLimite, turma_nome } = dados;
      
      await this.db.collection('provas').doc(String(provaId)).update({
        titulo,
        disciplina: disciplina || 'Não especificada',
        descricao,
        tempo_limite: parseInt(tempoLimite) || 0,
        turma_nome: turma_nome || 'Turma não especificada'
      });
      
      return { id: provaId };
    } catch (error) {
      console.error('Erro ao atualizar prova:', error);
      throw error;
    }
  }

  async deleteProva(provaId) {
    try {
      // Deletar questões da prova
      const provaQuestoesSnapshot = await this.db.collection('prova_questoes')
        .where('prova_id', '==', parseInt(provaId))
        .get();
      
      const batch = this.db.batch();
      provaQuestoesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Deletar prova
      batch.delete(this.db.collection('provas').doc(String(provaId)));
      
      await batch.commit();
      return 1;
    } catch (error) {
      console.error('Erro ao deletar prova:', error);
      throw error;
    }
  }

  // ==================== PROVA_QUESTOES ====================

  async addQuestaoProva(provaId, questaoId, ordem) {
    try {
      const provaQuestaoData = {
        prova_id: parseInt(provaId),
        questao_id: parseInt(questaoId),
        ordem: parseInt(ordem)
      };

      // Usar ID composto para evitar duplicatas
      const docId = `${provaId}_${questaoId}_${ordem}`;
      await this.db.collection('prova_questoes').doc(docId).set(provaQuestaoData);
      
      return 1;
    } catch (error) {
      console.error('Erro ao adicionar questão à prova:', error);
      throw error;
    }
  }

  async getQuestoesProva(provaId) {
    try {
      const snapshot = await this.db.collection('prova_questoes')
        .where('prova_id', '==', parseInt(provaId))
        .orderBy('ordem')
        .get();

      const questoesIds = snapshot.docs.map(doc => doc.data().questao_id);

      // Buscar questões
      const questoes = [];
      for (const questaoId of questoesIds) {
        const questaoDoc = await this.db.collection('questoes').doc(String(questaoId)).get();
        if (questaoDoc.exists) {
          questoes.push({
            id: questaoDoc.id,
            ...questaoDoc.data()
          });
        }
      }

      return questoes;
    } catch (error) {
      console.error('Erro ao buscar questões da prova:', error);
      return [];
    }
  }

  async removeQuestoesProva(provaId) {
    try {
      const snapshot = await this.db.collection('prova_questoes')
        .where('prova_id', '==', parseInt(provaId))
        .get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      return 1;
    } catch (error) {
      console.error('Erro ao remover questões da prova:', error);
      throw error;
    }
  }

  // ==================== TEMPLATES DE CABEÇALHO ====================

  async addHeaderTemplate(template) {
    try {
      const { nome, escola_nome, logo_path, campos_personalizados, professor_id } = template;

      // Buscar próximo ID
      const snapshot = await this.db.collection('header_templates').orderBy('id', 'desc').limit(1).get();
      let nextId = 1;
      
      if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0];
        nextId = (lastDoc.data().id || 0) + 1;
      }

      const templateData = {
        id: nextId,
        nome,
        escola_nome,
        logo_path: logo_path || null,
        campos_personalizados: typeof campos_personalizados === 'string' 
          ? campos_personalizados 
          : JSON.stringify(campos_personalizados || {}),
        professor_id: parseInt(professor_id),
        ativo: true,
        created_at: new Date().toISOString()
      };

      await this.db.collection('header_templates').doc(String(nextId)).set(templateData);
      return nextId;
    } catch (error) {
      console.error('Erro ao adicionar template:', error);
      throw error;
    }
  }

  async getHeaderTemplates(professorId) {
    try {
      const snapshot = await this.db.collection('header_templates')
        .where('professor_id', '==', parseInt(professorId))
        .orderBy('created_at', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          campos_personalizados: typeof data.campos_personalizados === 'string'
            ? JSON.parse(data.campos_personalizados)
            : data.campos_personalizados
        };
      });
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      return [];
    }
  }

  async getHeaderTemplateById(templateId, professorId) {
    try {
      const doc = await this.db.collection('header_templates').doc(String(templateId)).get();
      if (!doc.exists) {
        return null;
      }

      const template = { id: doc.id, ...doc.data() };
      
      // Verificar se pertence ao professor
      if (template.professor_id !== parseInt(professorId)) {
        return null;
      }

      // Parse campos_personalizados se for string
      if (typeof template.campos_personalizados === 'string') {
        template.campos_personalizados = JSON.parse(template.campos_personalizados);
      }

      return template;
    } catch (error) {
      console.error('Erro ao buscar template:', error);
      return null;
    }
  }

  async updateHeaderTemplate(templateId, template) {
    try {
      const { nome, escola_nome, logo_path, campos_personalizados } = template;
      
      await this.db.collection('header_templates').doc(String(templateId)).update({
        nome,
        escola_nome,
        logo_path: logo_path || null,
        campos_personalizados: typeof campos_personalizados === 'string'
          ? campos_personalizados
          : JSON.stringify(campos_personalizados || {})
      });
      
      return { id: templateId };
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      throw error;
    }
  }

  async deleteHeaderTemplate(templateId, professorId) {
    try {
      // Verificar se pertence ao professor
      const template = await this.getHeaderTemplateById(templateId, professorId);
      if (!template) {
        throw new Error('Template não encontrado');
      }

      await this.db.collection('header_templates').doc(String(templateId)).delete();
      return 1;
    } catch (error) {
      console.error('Erro ao deletar template:', error);
      throw error;
    }
  }

  // ==================== TURMAS E ALUNOS ====================

  async getTurmas(professorId) {
    try {
      const snapshot = await this.db.collection('turmas')
        .where('professor_id', '==', parseInt(professorId))
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      return [];
    }
  }

  async getAlunosByTurma(turmaId) {
    try {
      const snapshot = await this.db.collection('alunos')
        .where('turma_id', '==', parseInt(turmaId))
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      return [];
    }
  }

  async getAlunoById(alunoId) {
    try {
      const doc = await this.db.collection('alunos').doc(String(alunoId)).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Erro ao buscar aluno:', error);
      return null;
    }
  }

  // Método para compatibilidade (não usado, mas necessário)
  close() {
    // Firebase não precisa fechar conexão
    return Promise.resolve();
  }
}

module.exports = FirebaseDatabase;

