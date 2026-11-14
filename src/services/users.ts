import pb from '@/lib/pocketbase/client'
import type { LocalValue, UserRecord, UserRole } from '@/types'

export const usersService = {
  async list() {
    return pb.collection<UserRecord>('users').getFullList({
      sort: 'name,email',
    })
  },

  async getById(id: string) {
    return pb.collection<UserRecord>('users').getOne(id)
  },

  /** Gerente cadastra novo colaborador (equipe) */
  async create(data: {
    name: string
    email: string
    password: string
    role: UserRole
    local?: LocalValue | ''
  }) {
    return pb.collection<UserRecord>('users').create({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      role: data.role,
      local: data.local || '',
    })
  },

  async updateRole(id: string, role: 'gerente' | 'colaborador') {
    // Gerente atualiza role de outro usuário
    return pb.collection<UserRecord>('users').update(id, { role })
  },

  /** Gerente define local e supervisor de um usuário */
  async updateLocalSupervisor(
    id: string,
    data: { local?: LocalValue | ''; supervisor?: string | '' },
  ) {
    return pb.collection<UserRecord>('users').update(id, {
      local: data.local || '',
      supervisor: data.supervisor || '',
    })
  },

  async updateProfile(id: string, data: { name?: string; avatarFile?: File | null }) {
    if (data.avatarFile) {
      const formData = new FormData()
      if (data.name !== undefined) formData.append('name', data.name)
      formData.append('avatar', data.avatarFile)
      return pb.collection<UserRecord>('users').update(id, formData)
    }
    return pb.collection<UserRecord>('users').update(id, { name: data.name })
  },

  /** Registra o momento em que o colaborador acessou suas tarefas (tela Hoje). */
  async touchUltimoAcesso(id: string) {
    try {
      await pb
        .collection<UserRecord>('users')
        .update(id, { ultimo_acesso: new Date().toISOString() })
    } catch {
      // silencioso: sinal de acesso é best-effort
    }
  },

  getFileUrl(
    record: { id: string; collectionId?: string; collectionName?: string },
    filename?: string,
  ) {
    if (!filename) return ''
    return pb.files.getURL(record, filename)
  },
}
